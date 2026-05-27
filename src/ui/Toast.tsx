import { useEffect } from 'react';
import { useAppDispatch } from '@/store';
import { dismissToast, type Toast as ToastModel } from '@/store/toastsSlice';
import styles from './Toast.module.css';

export const TOAST_TIMEOUT_MS = 4000;

export function Toast({ toast }: { toast: ToastModel }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const handle = window.setTimeout(() => {
      dispatch(dismissToast(toast.id));
    }, TOAST_TIMEOUT_MS);
    return () => window.clearTimeout(handle);
  }, [toast.id, dispatch]);

  return (
    <div role="status" className={`${styles.toast} ${styles[toast.kind] ?? ''}`}>
      <span>{toast.message}</span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss notification"
        onClick={() => dispatch(dismissToast(toast.id))}
      >
        ×
      </button>
    </div>
  );
}
