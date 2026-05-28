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

  // Errors interrupt (role="alert" → assertive); info/success wait their turn
  // (role="status" → polite). Each toast owns its own live region so the
  // <Toaster> wrapper doesn't need to (and shouldn't, to avoid double announce).
  const isError = toast.kind === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`${styles.toast} ${styles[toast.kind] ?? ''}`}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss notification"
        onClick={() => dispatch(dismissToast(toast.id))}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
