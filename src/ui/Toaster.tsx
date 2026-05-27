import { useAppSelector } from '@/store';
import { Toast } from './Toast';
import styles from './Toaster.module.css';

export function Toaster() {
  const items = useAppSelector((s) => s.toasts.items);
  if (items.length === 0) return null;
  return (
    <div className={styles.stack} aria-live="polite" aria-relevant="additions">
      {items.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
