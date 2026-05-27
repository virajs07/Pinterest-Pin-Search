import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store';
import { fetchPage } from '@/store/feedSlice';

const SEARCH_DEBOUNCE_MS = 500;

/**
 * Debounces search input by `SEARCH_DEBOUNCE_MS` and triggers callbacks.
 * - Calls onQueryChange when user pauses typing
 * - Fetches results via fetchPage when query changes (empty or with text)
 * Aborts the previous in-flight call when a new query arrives.
 */
export function useDebouncedSearch(
  query: string,
  onQueryChange: (value: string) => void,
): void {
  const dispatch = useAppDispatch();
  const inFlightRef = useRef<{ abort: (reason?: string) => void } | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmedQuery = query.trim();
      
      // Notify parent of query change
      onQueryChange(trimmedQuery);
      
      // Always fetch when query changes (empty or with text)
      inFlightRef.current?.abort();
      inFlightRef.current = dispatch(fetchPage()) as unknown as {
        abort: (reason?: string) => void;
      };
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, dispatch, onQueryChange]);
}
