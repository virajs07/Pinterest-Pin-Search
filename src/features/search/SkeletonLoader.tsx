import styles from './Feed.module.css';

export function SkeletonLoader() {
  return (
    <div
      className={styles.skeletonContainer}
      data-testid="skeleton-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading pins"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.skeletonCard} aria-hidden="true" />
      ))}
    </div>
  );
}
