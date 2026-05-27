import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store';
import { fetchPage } from '@/store/feedSlice';

const SEARCH_DEBOUNCE_MS = 500;
const SEARCH_MIN_CHARS = 1;

/**
 * Debounces search input by `SEARCH_DEBOUNCE_MS` and dispatches `fetchPage`
 * when the query has at least `SEARCH_MIN_CHARS` characters.
 * Aborts the previous in-flight call when a new query arrives.
 */
export function useDebouncedSearch(query: string): void {
  const dispatch = useAppDispatch();
  const inFlightRef = useRef<{ abort: (reason?: string) => void } | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      // Only trigger if user has actually paused typing and query has changed
      if (query.trim().length >= SEARCH_MIN_CHARS) {
        inFlightRef.current?.abort();
        inFlightRef.current = dispatch(fetchPage()) as unknown as {
          abort: (reason?: string) => void;
        };
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, dispatch]);
}
