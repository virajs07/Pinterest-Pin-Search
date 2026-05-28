import { Link } from 'react-router-dom';
import { loadCreatePinPage } from '@/features/create/lazy';
import styles from './AppHeader.module.css';
import container from './appContainer.module.css';

export function AppHeader() {
  // Warm the lazy /create chunk on intent (hover/focus), so the click feels
  // instant. Safe to call repeatedly — dynamic imports are cached.
  const prefetch = () => {
    void loadCreatePinPage();
  };
  return (
    <header className={styles.header}>
      <div className={`${container.appContainer} ${styles.inner}`}>
        <a href="#main" className={styles.skipLink}>
          Skip to content
        </a>
        <Link to="/" className={styles.brand} aria-label="Pin Search and Create — home">
          Pin Search &amp; Create
        </Link>
        <nav aria-label="Primary">
          <Link
            to="/create"
            className={styles.create}
            onMouseEnter={prefetch}
            onFocus={prefetch}
            onTouchStart={prefetch}
          >
            Create
          </Link>
        </nav>
      </div>
    </header>
  );
}
