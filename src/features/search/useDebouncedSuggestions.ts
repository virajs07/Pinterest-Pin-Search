import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store';
import {
  suggest,
  SUGGESTION_DEBOUNCE_MS,
  SUGGESTION_MIN_CHARS,
} from '@/store/suggestionsSlice';

type AbortablePromise = { abort: (reason?: string) => void };

/**
 * Debounces input by `SUGGESTION_DEBOUNCE_MS` and only dispatches a `suggest`
 * thunk when the query has at least `SUGGESTION_MIN_CHARS` characters.
 * Aborts the previous in-flight call when a new query arrives (DR-15).
 */
export function useDebouncedSuggestions(query: string): void {
  const dispatch = useAppDispatch();
  const inFlightRef = useRef<AbortablePromise | null>(null);

  useEffect(() => {
    if (query.length < SUGGESTION_MIN_CHARS) {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
      return;
    }
    const handle = window.setTimeout(() => {
      inFlightRef.current?.abort();
      inFlightRef.current = dispatch(suggest(query)) as unknown as AbortablePromise;
    }, SUGGESTION_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, dispatch]);
}
