import { Link } from 'react-router-dom';
import styles from './AppHeader.module.css';
import container from './appContainer.module.css';

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={`${container.appContainer} ${styles.inner}`}>
        <a href="#main" className={styles.skipLink}>
          Skip to content
        </a>
        <Link to="/" className={styles.brand}>
          Pin Search &amp; Create
        </Link>
        <nav>
          <Link to="/create" className={styles.create}>
            Create
          </Link>
        </nav>
      </div>
    </header>
  );
}
