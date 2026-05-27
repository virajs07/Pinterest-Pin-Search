import { describe, it, expect } from 'vitest';
import { makeStore } from './index';
import {
  suggest,
  SUGGESTION_MIN_CHARS,
  clearSuggestions,
} from './suggestionsSlice';
import type { PinRepository } from '@/data/PinRepository';

function makeFakeRepo(overrides: Partial<PinRepository> = {}): PinRepository {
  return {
    list: async () => ({ pins: [] }),
    suggest: async () => [],
    create: async () => {
      throw new Error('not implemented');
    },
    getById: async () => undefined,
    ...overrides,
  };
}

describe('suggestionsSlice', () => {
  it('condition blocks queries shorter than the threshold', async () => {
    let calls = 0;
    const repo = makeFakeRepo({
      suggest: async () => {
        calls += 1;
        return [];
      },
    });
    const store = makeStore(repo);
    await store.dispatch(suggest('a'));
    expect(calls).toBe(0);
    await store.dispatch(suggest('ab'));
    expect(calls).toBe(0);
    expect('cat'.length).toBeGreaterThanOrEqual(SUGGESTION_MIN_CHARS);
    await store.dispatch(suggest('cat'));
    expect(calls).toBe(1);
  });

  it('fulfilled fills items when query still matches', async () => {
    const repo = makeFakeRepo({
      suggest: async (prefix) => [`${prefix} photos`, `${prefix}egory`],
    });
    const store = makeStore(repo);
    await store.dispatch(suggest('cat'));
    const s = store.getState().suggestions;
    expect(s.query).toBe('cat');
    expect(s.items).toEqual(['cat photos', 'category']);
    expect(s.status).toBe('idle');
  });

  it('dropped result when query moved on (stale response)', async () => {
    let resolveFirst: ((items: string[]) => void) | null = null;
    let pending = 0;
    const repo = makeFakeRepo({
      suggest: (prefix) => {
        pending += 1;
        if (pending === 1) {
          return new Promise<string[]>((res) => (resolveFirst = res));
        }
        return Promise.resolve([`${prefix} second`]);
      },
    });
    const store = makeStore(repo);
    const first = store.dispatch(suggest('cat'));
    // Don't await first — start a second that lands first.
    await store.dispatch(suggest('cats'));
    expect(store.getState().suggestions.items).toEqual(['cats second']);
    // Now the late "cat" response arrives — should be ignored.
    resolveFirst!(['cat late']);
    await first;
    expect(store.getState().suggestions.items).toEqual(['cats second']);
    expect(store.getState().suggestions.query).toBe('cats');
  });

  it('condition skips re-querying the same idle query', async () => {
    let calls = 0;
    const repo = makeFakeRepo({
      suggest: async () => {
        calls += 1;
        return ['cat'];
      },
    });
    const store = makeStore(repo);
    await store.dispatch(suggest('cat'));
    expect(calls).toBe(1);
    await store.dispatch(suggest('cat'));
    expect(calls).toBe(1);
  });

  it('clear resets state', async () => {
    const repo = makeFakeRepo({ suggest: async () => ['cat photos'] });
    const store = makeStore(repo);
    await store.dispatch(suggest('cat'));
    store.dispatch(clearSuggestions());
    expect(store.getState().suggestions).toEqual({ query: '', items: [], status: 'idle' });
  });
});
