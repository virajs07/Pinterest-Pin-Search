import { useCallback } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector, type RootState } from '@/store';
import { fetchPage } from '@/store/feedSlice';
import type { Pin } from '@/types/Pin';
import { Masonry } from '@/masonry/Masonry';
import { InfiniteLoader } from './InfiniteLoader';
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

  const onIntersect = useCallback(() => {
    void dispatch(fetchPage());
  }, [dispatch]);

  if (pins.length === 0 && status !== 'loading') {
    return (
      <div className={styles.empty} role="status">
        No pins yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className={styles.feed} data-testid="feed">
      <Masonry pins={pins} />
      {status !== 'end' && <InfiniteLoader onIntersect={onIntersect} />}
      {status === 'end' && pins.length > 0 && (
        <p className={styles.empty} role="status">
          End of feed.
        </p>
      )}
    </div>
  );
}
