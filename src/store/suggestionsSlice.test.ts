import { describe, it, expect } from 'vitest';
import { makeStore } from './index';
import {
  selectSuggestions,
  setSuggestionQuery,
  clearSuggestions,
  SUGGESTION_LIMIT,
} from './suggestionsSlice';
import { hydrate } from './feedSlice';
import type { PinRepository } from '@/data/PinRepository';
import type { Pin } from '@/types/Pin';

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

function repoWithPins(pins: Pin[]): PinRepository {
  return {
    list: async () => ({ pins, nextCursor: undefined }),
    suggest: async () => {
      throw new Error('repo.suggest should never be called — selector serves suggestions');
    },
    create: async () => {
      throw new Error('not implemented');
    },
    getById: async () => undefined,
  };
}

describe('suggestionsSlice / selectSuggestions', () => {
  it('returns [] when query is shorter than the minimum threshold', async () => {
    const store = makeStore(repoWithPins([pin('1', 'Cat photos')]));
    await store.dispatch(hydrate());
    store.dispatch(setSuggestionQuery('ca'));
    expect(selectSuggestions(store.getState())).toEqual([]);
  });

  it('returns substring matches from the in-memory descIndex', async () => {
    const seeded = [pin('1', 'Cat photos'), pin('2', 'Category'), pin('3', 'Dog')];
    const store = makeStore(repoWithPins(seeded));
    await store.dispatch(hydrate());
    store.dispatch(setSuggestionQuery('cat'));
    const items = selectSuggestions(store.getState());
    expect(items.sort()).toEqual(['Cat photos', 'Category']);
  });

  it('is case-insensitive', async () => {
    const seeded = [pin('1', 'Cat'), pin('2', 'cATEGORY')];
    const store = makeStore(repoWithPins(seeded));
    await store.dispatch(hydrate());
    store.dispatch(setSuggestionQuery('CAT'));
    const items = selectSuggestions(store.getState());
    expect(items.sort()).toEqual(['Cat', 'cATEGORY']);
  });

  it('caps results at SUGGESTION_LIMIT', async () => {
    const many = Array.from({ length: SUGGESTION_LIMIT + 5 }, (_, i) =>
      pin(`id-${i}`, `cat ${i}`, SUGGESTION_LIMIT + 5 - i),
    );
    const store = makeStore(repoWithPins(many));
    await store.dispatch(hydrate());
    store.dispatch(setSuggestionQuery('cat'));
    expect(selectSuggestions(store.getState())).toHaveLength(SUGGESTION_LIMIT);
  });

  it('clear resets the query', async () => {
    const store = makeStore(repoWithPins([pin('1', 'Cat')]));
    await store.dispatch(hydrate());
    store.dispatch(setSuggestionQuery('cat'));
    store.dispatch(clearSuggestions());
    expect(store.getState().suggestions.query).toBe('');
    expect(selectSuggestions(store.getState())).toEqual([]);
  });
});
