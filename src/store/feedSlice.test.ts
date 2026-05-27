import { describe, it, expect } from 'vitest';
import { makeStore } from './index';
import { hydrate, createPin, fetchPage, setQuery } from './feedSlice';
import type { PinRepository } from '@/data/PinRepository';
import type { NewPin, Pin } from '@/types/Pin';

function pin(id: string, description: string, createdAt = 1): Pin {
  const variant = { url: '', width: 1, height: 1, type: 'image/webp' as const };
  return {
    id,
    description,
    descriptionLower: description.toLowerCase(),
    width: 1,
    height: 1,
    dominantColor: '#000',
    createdAt,
    responsive: { '170': variant, '236': variant, '474': variant, '736': variant, orig: variant },
  };
}

function makeFakeRepo(overrides: Partial<PinRepository> = {}): PinRepository {
  return {
    list: async () => ({ pins: [], nextCursor: undefined }),
    suggest: async () => [],
    create: async () => {
      throw new Error('not implemented');
    },
    getById: async () => undefined,
    ...overrides,
  };
}

describe('feedSlice hydrate', () => {
  it('seeds pins, feed order, and descIndex from repo.list', async () => {
    const samplePins = [pin('1', 'Cat photos', 2), pin('2', 'Dog photos', 1)];
    const repo = makeFakeRepo({
      list: async () => ({ pins: samplePins, nextCursor: 'next' }),
    });
    const store = makeStore(repo);

    await store.dispatch(hydrate());
    const state = store.getState();

    expect(state.pins.ids).toEqual(['1', '2']);
    expect(state.feed.order).toEqual(['1', '2']);
    expect(state.feed.nextCursor).toBe('next');
    expect(state.feed.status).toBe('idle');
    expect(state.feed.descIndex['cat photos']).toEqual(['1']);
    expect(state.feed.descIndex['dog photos']).toEqual(['2']);
  });

  it('sets status=end when repo returns no nextCursor', async () => {
    const repo = makeFakeRepo({ list: async () => ({ pins: [], nextCursor: undefined }) });
    const store = makeStore(repo);
    await store.dispatch(hydrate());
    expect(store.getState().feed.status).toBe('end');
  });

  it('sets status=error on repo rejection', async () => {
    const repo = makeFakeRepo({
      list: async () => {
        throw new Error('idb broken');
      },
    });
    const store = makeStore(repo);
    await store.dispatch(hydrate());
    expect(store.getState().feed.status).toBe('error');
  });

  const fakeVariant = { blob: new Blob(), width: 1, height: 1, type: 'image/webp' as const };
  const sampleNewPin: NewPin = {
    description: 'Sunset',
    width: 1,
    height: 1,
    dominantColor: '#000',
    responsive: {
      '170': fakeVariant,
      '236': fakeVariant,
      '474': fakeVariant,
      '736': fakeVariant,
      orig: fakeVariant,
    },
  };

  it('createPin inserts optimistically before the repo resolves', async () => {
    let resolveCreate: ((p: Pin) => void) | null = null;
    const repo = makeFakeRepo({
      list: async () => ({ pins: [], nextCursor: undefined }),
      create: () => new Promise<Pin>((res) => (resolveCreate = res)),
    });
    const store = makeStore(repo);
    await store.dispatch(hydrate());

    const promise = store.dispatch(createPin(sampleNewPin));

    // Before the repo resolves: optimistic pin is visible.
    const midflight = store.getState();
    expect(midflight.feed.order.length).toBe(1);
    const tempId = midflight.feed.order[0]!;
    expect(tempId.startsWith('tmp_')).toBe(true);
    expect(midflight.pins.entities[tempId]?.description).toBe('Sunset');
    expect(midflight.feed.descIndex['sunset']).toEqual([tempId]);

    // Resolve repo with the canonical pin.
    resolveCreate!(pin('confirmed-1', 'Sunset', 100));
    await promise;

    const after = store.getState();
    expect(after.feed.order).toEqual(['confirmed-1']);
    expect(after.pins.entities['confirmed-1']).toBeDefined();
    expect(after.pins.entities[tempId]).toBeUndefined();
    expect(after.feed.descIndex['sunset']).toEqual(['confirmed-1']);
  });

  it('createPin prepends the new pin to the feed (newest-first)', async () => {
    const repo = makeFakeRepo({
      list: async () => ({
        pins: [pin('existing-1', 'older', 1), pin('existing-2', 'newer', 2)],
        nextCursor: undefined,
      }),
      create: async () => pin('fresh', 'new pin', 99),
    });
    const store = makeStore(repo);
    await store.dispatch(hydrate());
    expect(store.getState().feed.order).toEqual(['existing-1', 'existing-2']);

    await store.dispatch(createPin(sampleNewPin));

    const after = store.getState();
    // The freshly-created pin appears at the BEGINNING of the feed,
    // matching the repo's newest-first hydration order.
    expect(after.feed.order).toEqual(['fresh', 'existing-1', 'existing-2']);
  });

  it('createPin rolls back and pushes a toast on repo failure', async () => {
    const repo = makeFakeRepo({
      list: async () => ({ pins: [], nextCursor: undefined }),
      create: async () => {
        throw new Error('idb broken');
      },
    });
    const store = makeStore(repo);
    await store.dispatch(hydrate());
    await store.dispatch(createPin(sampleNewPin));

    const state = store.getState();
    expect(state.feed.order).toEqual([]);
    expect(state.pins.ids.length).toBe(0);
    expect(state.feed.descIndex['sunset']).toBeUndefined();
    expect(state.toasts.items.length).toBe(1);
    expect(state.toasts.items[0]!.kind).toBe('error');
    expect(state.toasts.items[0]!.message).toContain('idb broken');
  });

  describe('fetchPage', () => {
    it('appends pins, advances nextCursor, sets status=idle when more pages exist', async () => {
      const initialPins = [pin('a', 'first', 5)];
      const moreCalls: Array<{ cursor?: string }> = [];
      const repo = makeFakeRepo({
        list: async (opts) => {
          if (!opts.cursor) return { pins: initialPins, nextCursor: 'cur-1' };
          moreCalls.push({ cursor: opts.cursor });
          return { pins: [pin('b', 'second', 4), pin('c', 'third', 3)], nextCursor: 'cur-2' };
        },
      });
      const store = makeStore(repo);
      await store.dispatch(hydrate());

      await store.dispatch(fetchPage());

      expect(moreCalls).toEqual([{ cursor: 'cur-1' }]);
      const s = store.getState();
      expect(s.feed.order).toEqual(['a', 'b', 'c']);
      expect(s.feed.nextCursor).toBe('cur-2');
      expect(s.feed.status).toBe('idle');
    });

    it('sets status=end when repo returns no nextCursor', async () => {
      const repo = makeFakeRepo({
        list: async (opts) => {
          if (!opts.cursor) return { pins: [pin('a', 'one', 1)], nextCursor: 'cur-1' };
          return { pins: [pin('b', 'two', 0)], nextCursor: undefined };
        },
      });
      const store = makeStore(repo);
      await store.dispatch(hydrate());
      await store.dispatch(fetchPage());
      expect(store.getState().feed.status).toBe('end');
    });

    it('condition: skips when status is already loading', async () => {
      let listCallCount = 0;
      let resolveList: ((p: { pins: Pin[]; nextCursor?: string }) => void) | null = null;
      const repo = makeFakeRepo({
        list: (opts) => {
          listCallCount += 1;
          if (!opts.cursor) return Promise.resolve({ pins: [pin('a', 'one', 1)], nextCursor: 'c1' });
          return new Promise<{ pins: Pin[]; nextCursor?: string }>((res) => {
            resolveList = res;
          });
        },
      });
      const store = makeStore(repo);
      await store.dispatch(hydrate());
      expect(listCallCount).toBe(1);

      const inFlight = store.dispatch(fetchPage());
      expect(store.getState().feed.status).toBe('loading');
      expect(listCallCount).toBe(2);

      // Second dispatch while loading should be a no-op (condition blocks).
      await store.dispatch(fetchPage());
      expect(listCallCount).toBe(2);

      resolveList!({ pins: [], nextCursor: undefined });
      await inFlight;
    });

    it('condition: skips when status is end', async () => {
      let listCallCount = 0;
      const repo = makeFakeRepo({
        list: async () => {
          listCallCount += 1;
          return { pins: [], nextCursor: undefined };
        },
      });
      const store = makeStore(repo);
      await store.dispatch(hydrate());
      expect(store.getState().feed.status).toBe('end');
      expect(listCallCount).toBe(1);
      await store.dispatch(fetchPage());
      expect(listCallCount).toBe(1);
    });
  });

  describe('setQuery', () => {
    it('clears feed and a subsequent fetchPage filters by the new query', async () => {
      const listCalls: Array<{ query?: string; cursor?: string }> = [];
      const repo = makeFakeRepo({
        list: async (opts) => {
          listCalls.push({ ...(opts.query ? { query: opts.query } : {}), ...(opts.cursor ? { cursor: opts.cursor } : {}) });
          if (opts.query === 'cat') {
            return { pins: [pin('c1', 'Cat photos', 1)], nextCursor: undefined };
          }
          return { pins: [pin('a', 'unfiltered', 1)], nextCursor: undefined };
        },
      });
      const store = makeStore(repo);
      await store.dispatch(hydrate());
      expect(store.getState().feed.order).toEqual(['a']);

      store.dispatch(setQuery('cat'));
      expect(store.getState().feed.query).toBe('cat');
      expect(store.getState().feed.order).toEqual([]);
      expect(store.getState().feed.status).toBe('idle');

      await store.dispatch(fetchPage());
      expect(listCalls[listCalls.length - 1]).toEqual({ query: 'cat' });
      expect(store.getState().feed.order).toEqual(['c1']);
    });

    it('drops a stale response when query has moved on', async () => {
      let resolveCat: ((r: { pins: Pin[]; nextCursor?: string }) => void) | null = null;
      const repo = makeFakeRepo({
        list: (opts) => {
          if (opts.query === 'cat') {
            return new Promise((res) => (resolveCat = res));
          }
          if (opts.query === 'dog') {
            return Promise.resolve({ pins: [pin('d1', 'Dog photos', 1)], nextCursor: undefined });
          }
          return Promise.resolve({ pins: [], nextCursor: undefined });
        },
      });
      const store = makeStore(repo);
      await store.dispatch(hydrate());

      store.dispatch(setQuery('cat'));
      const inFlight = store.dispatch(fetchPage());

      store.dispatch(setQuery('dog'));
      await store.dispatch(fetchPage());

      expect(store.getState().feed.query).toBe('dog');
      expect(store.getState().feed.order).toEqual(['d1']);

      // Late response from the cat query — should be dropped.
      resolveCat!({ pins: [pin('c1', 'Cat', 1)], nextCursor: undefined });
      await inFlight;
      expect(store.getState().feed.order).toEqual(['d1']);
    });
  });

  it('groups same-description pins into the same descIndex bucket', async () => {
    const repo = makeFakeRepo({
      list: async () => ({
        pins: [pin('1', 'Cat', 2), pin('2', 'cat', 1)],
        nextCursor: undefined,
      }),
    });
    const store = makeStore(repo);
    await store.dispatch(hydrate());
    expect(store.getState().feed.descIndex['cat']).toEqual(['1', '2']);
  });
});
