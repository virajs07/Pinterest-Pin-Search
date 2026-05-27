import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PinRepository } from '@/data/PinRepository';

export const SUGGESTION_MIN_CHARS = 3;
export const SUGGESTION_LIMIT = 8;
export const SUGGESTION_DEBOUNCE_MS = 250;

export type SuggestionStatus = 'idle' | 'loading' | 'error';

export type SuggestionsState = {
  query: string;
  items: string[];
  status: SuggestionStatus;
};

const initialState: SuggestionsState = { query: '', items: [], status: 'idle' };

type ThunkExtra = { repo: PinRepository };
type StateLike = { suggestions: SuggestionsState };

export const suggest = createAsyncThunk<
  { query: string; items: string[] },
  string,
  { extra: ThunkExtra }
>(
  'suggestions/suggest',
  async (query, { extra, signal }) => {
    const items = await extra.repo.suggest(query, SUGGESTION_LIMIT, signal);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return { query, items };
  },
  {
    condition: (query, { getState }) => {
      if (query.length < SUGGESTION_MIN_CHARS) return false;
      const s = getState() as StateLike;
      // Skip when we already have the result for this exact query.
      return !(s.suggestions.query === query && s.suggestions.status === 'idle');
    },
  },
);

const suggestionsSlice = createSlice({
  name: 'suggestions',
  initialState,
  reducers: {
    clear(state) {
      state.query = '';
      state.items = [];
      state.status = 'idle';
    },
  },
  extraReducers: (b) => {
    b.addCase(suggest.pending, (state, action) => {
      state.status = 'loading';
      state.query = action.meta.arg;
    });
    b.addCase(suggest.fulfilled, (state, action) => {
      if (state.query !== action.payload.query) return; // stale
      state.items = action.payload.items;
      state.status = 'idle';
    });
    b.addCase(suggest.rejected, (state, action) => {
      if (state.query !== action.meta.arg) return;
      state.status = 'error';
    });
  },
});

export const { clear: clearSuggestions } = suggestionsSlice.actions;
export default suggestionsSlice.reducer;
