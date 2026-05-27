import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { pushToast } from '@/store/toastsSlice';
import { Toaster } from './Toaster';
import { TOAST_TIMEOUT_MS } from './Toast';
import type { PinRepository } from '@/data/PinRepository';

const stubRepo: PinRepository = {
  list: async () => ({ pins: [] }),
  suggest: async () => [],
  create: async () => {
    throw new Error('not implemented');
  },
  getById: async () => undefined,
};

describe('Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when there are no toasts', () => {
    const store = makeStore(stubRepo);
    render(
      <Provider store={store}>
        <Toaster />
      </Provider>,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders a toast when one is pushed', () => {
    const store = makeStore(stubRepo);
    render(
      <Provider store={store}>
        <Toaster />
      </Provider>,
    );
    act(() => {
      store.dispatch(pushToast({ kind: 'error', message: 'boom' }));
    });
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('auto-dismisses a toast after the timeout', () => {
    const store = makeStore(stubRepo);
    render(
      <Provider store={store}>
        <Toaster />
      </Provider>,
    );
    act(() => {
      store.dispatch(pushToast({ kind: 'info', message: 'temporary' }));
    });
    expect(screen.getByText('temporary')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(TOAST_TIMEOUT_MS + 10);
    });
    expect(screen.queryByText('temporary')).toBeNull();
  });
});
