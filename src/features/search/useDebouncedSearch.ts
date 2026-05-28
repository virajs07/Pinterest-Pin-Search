import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchPage, setQuery } from '@/store/feedSlice';

const SEARCH_DEBOUNCE_MS = 500;

type AbortablePromise = { abort: (reason?: string) => void };

/**
 * Owns "the user paused typing → run the search" for SearchPage.
 *
 * - Debounces input by `SEARCH_DEBOUNCE_MS`; commits the trimmed value via
 *   `setQuery` and fires `fetchPage` when it changes.
 * - Returns `flush(value)` so callers (Enter, suggestion pick) can short-
 *   circuit the debounce and commit immediately.
 * - No-ops when the trimmed value equals the current `feed.query`, so the
 *   initial render and "type the same thing twice" don't trigger spurious
 *   refetches.
 */
export function useDebouncedSearch(value: string): (overrideValue?: string) => void {
  const dispatch = useAppDispatch();
  const currentQuery = useAppSelector((s) => s.feed.query);
  const inFlightRef = useRef<AbortablePromise | null>(null);
  const currentQueryRef = useRef(currentQuery);
  useEffect(() => {
    currentQueryRef.current = currentQuery;
  }, [currentQuery]);

  const run = useCallback(
    (trimmed: string) => {
      if (trimmed === currentQueryRef.current) return;
      inFlightRef.current?.abort();
      dispatch(setQuery(trimmed));
      inFlightRef.current = dispatch(fetchPage()) as unknown as AbortablePromise;
    },
    [dispatch],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => run(value.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, run]);

  return useCallback((overrideValue?: string) => run((overrideValue ?? value).trim()), [run, value]);
}
