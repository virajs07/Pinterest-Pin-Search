import { useCallback } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector, type RootState } from '@/store';
import { fetchPage } from '@/store/feedSlice';
import type { Pin } from '@/types/Pin';
import { Masonry } from '@/masonry/Masonry';
import { InfiniteLoader } from './InfiniteLoader';
import { SkeletonLoader } from './SkeletonLoader';
import styles from './Feed.module.css';

const selectFeedPins = createSelector(
  [(s: RootState) => s.feed.order, (s: RootState) => s.pins.entities],
  (order, entities): Pin[] => {
    const out: Pin[] = [];
    for (const id of order) {
      const pin = entities[id];
      if (pin) out.push(pin);
    }
    return out;
  },
);

export function Feed() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.feed.status);
  const pins = useAppSelector(selectFeedPins);
  const errorMessage = useAppSelector((s) => s.feed.errorMessage);
  const nextCursor = useAppSelector((s) => s.feed.nextCursor);

  const onIntersect = useCallback(() => {
    void dispatch(fetchPage());
  }, [dispatch]);

  // While loading, distinguish a fresh first-page request (e.g. a new search)
  // from pagination. During a fresh request we keep stale pins on screen and
  // show a subtle top indicator instead of a bottom skeleton.
  const isPaginating = status === 'loading' && nextCursor !== undefined;
  const isFreshLoading = status === 'loading' && nextCursor === undefined && pins.length > 0;

  // Show skeleton loader while loading
  if (status === 'loading' && pins.length === 0) {
    return <SkeletonLoader />;
  }

  // Show error state
  if (status === 'api_error') {
    return (
      <div className={styles.feed} data-testid="feed">
        <div className={styles.error} role="alert">
          {errorMessage || 'Failed to load results. Please try again.'}
        </div>
        {pins.length > 0 && <Masonry pins={pins} />}
      </div>
    );
  }

  // Show no results state
  if (status === 'no_results') {
    return (
      <div className={styles.empty} role="status">
        No pins found. Try a different search.
      </div>
    );
  }

  // Show empty state when no pins and not loading
  if (pins.length === 0 && status !== 'loading') {
    return (
      <div className={styles.empty} role="status">
        No pins yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className={styles.feed} data-testid="feed">
      {isFreshLoading && (
        <div className={styles.searchingBar} role="status" aria-live="polite">
          Searching…
        </div>
      )}
      <Masonry pins={pins} />
      {isPaginating && <SkeletonLoader />}
      {status !== 'end' && status !== 'loading' && <InfiniteLoader onIntersect={onIntersect} />}
      {status === 'end' && pins.length > 0 && (
        <p className={styles.empty} role="status">
          End of feed.
        </p>
      )}
    </div>
  );
}
