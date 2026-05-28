import { useEffect } from 'react';
import { useAppDispatch } from '@/store';
import {
  setSuggestionQuery,
  SUGGESTION_DEBOUNCE_MS,
  SUGGESTION_MIN_CHARS,
} from '@/store/suggestionsSlice';

/**
 * Debounces input and publishes the active query to `state.suggestions.query`.
 * The actual suggestion list is derived synchronously from the in-memory
 * description mirror via `selectSuggestions` (DR-14) — no network/IDB round
 * trip per keystroke.
 */
export function useDebouncedSuggestions(query: string): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (query.length < SUGGESTION_MIN_CHARS) {
      dispatch(setSuggestionQuery(''));
      return;
    }
    const handle = window.setTimeout(() => {
      dispatch(setSuggestionQuery(query));
    }, SUGGESTION_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, dispatch]);
}
