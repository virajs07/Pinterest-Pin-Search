import { useAppSelector } from '@/store';
import { Toast } from './Toast';
import styles from './Toaster.module.css';

export function Toaster() {
  const items = useAppSelector((s) => s.toasts.items);
  if (items.length === 0) return null;
  // Each <Toast> declares its own live region (alert/status), so this
  // container is purely a positional stack — adding aria-live here would
  // cause screen readers to announce the same message twice.
  return (
    <div className={styles.stack}>
      {items.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
