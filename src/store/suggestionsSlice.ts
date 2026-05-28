import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

export const SUGGESTION_MIN_CHARS = 3;
export const SUGGESTION_LIMIT = 8;
export const SUGGESTION_DEBOUNCE_MS = 250;

export type SuggestionsState = {
  /**
   * The debounced query the user is currently asking about. Items are derived
   * synchronously from `feed.descIndex` via `selectSuggestions` (SPEC DR-14)
   * — no thunk, no IDB read per keystroke.
   */
  query: string;
};

const initialState: SuggestionsState = { query: '' };

const suggestionsSlice = createSlice({
  name: 'suggestions',
  initialState,
  reducers: {
    setSuggestionQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    clear(state) {
      state.query = '';
    },
  },
});

export const { setSuggestionQuery, clear: clearSuggestions } = suggestionsSlice.actions;
export default suggestionsSlice.reducer;

/**
 * Suggestions derived from the in-memory description mirror. The mirror is
 * populated on hydrate + fetchPage.fulfilled + optimistic create, so the
 * suggestion set reflects every pin currently known to the client. No async
 * round-trip; safe to call at keystroke rate (DR-14).
 *
 * Match policy is substring + case-insensitive, matching the repo contract.
 */
export const selectSuggestions = createSelector(
  [
    (s: RootState) => s.suggestions.query,
    (s: RootState) => s.feed.descIndex,
    (s: RootState) => s.pins.entities,
  ],
  (query, descIndex, entities): string[] => {
    if (query.length < SUGGESTION_MIN_CHARS) return [];
    const needle = query.toLowerCase();
    const out: string[] = [];
    for (const key of Object.keys(descIndex)) {
      if (!key.includes(needle)) continue;
      const ids = descIndex[key];
      const firstId = ids?.[0];
      const pin = firstId !== undefined ? entities[firstId] : undefined;
      if (pin === undefined) continue;
      out.push(pin.description);
      if (out.length >= SUGGESTION_LIMIT) break;
    }
    return out;
  },
);
