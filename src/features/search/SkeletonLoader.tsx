import styles from './Feed.module.css';

export function SkeletonLoader() {
  return (
    <div className={styles.skeletonContainer} data-testid="skeleton-loader">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.skeletonCard} />
      ))}
    </div>
  );
}
