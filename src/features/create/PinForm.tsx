import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { createPin } from '@/store/feedSlice';
import { useImageMetadata } from './useImageMetadata';
import styles from './PinForm.module.css';

const MAX_DESCRIPTION_LENGTH = 500;

export function PinForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { state, extract, reset } = useImageMetadata();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onFileChange(file: File | null) {
    if (!file) {
      reset();
      return;
    }
    try {
      await extract(file);
    } catch {
      // useImageMetadata captures into state
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (state.status !== 'ready' || !description.trim()) return;
    setSubmitting(true);
    const result = await dispatch(
      createPin({
        description: description.trim(),
        width: state.metadata.width,
        height: state.metadata.height,
        dominantColor: state.metadata.dominantColor,
        responsive: state.metadata.responsive,
      }),
    );
    setSubmitting(false);
    if (createPin.fulfilled.match(result)) {
      navigate('/');
    }
    // On rejection the createPin thunk has already pushed the error toast.
  }

  const ready = state.status === 'ready';

  return (
    <form
      className={styles.form}
      onSubmit={onSubmit}
      data-testid="pin-form"
      aria-busy={submitting || undefined}
    >
      <label className={styles.field}>
        <span>Image</span>
        <input
          type="file"
          accept="image/*"
          required
          aria-required="true"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {state.status === 'loading' && (
        <p className={styles.preview} role="status">
          Reading image…
        </p>
      )}
      {state.status === 'error' && (
        <p className={styles.preview} role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'ready' && (
        <p className={styles.preview}>
          {state.metadata.width}×{state.metadata.height} · dominant color{' '}
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              background: state.metadata.dominantColor,
              borderRadius: 2,
              verticalAlign: 'middle',
            }}
          />{' '}
          {state.metadata.dominantColor}
        </p>
      )}
      <label className={styles.field}>
        <span>Description</span>
        <textarea
          required
          aria-required="true"
          maxLength={MAX_DESCRIPTION_LENGTH}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </label>
      <button
        type="submit"
        className={styles.submit}
        disabled={!ready || !description.trim() || submitting}
      >
        {submitting ? 'Saving…' : 'Create pin'}
      </button>
    </form>
  );
}
