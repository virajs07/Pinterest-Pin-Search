import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AppRoutes } from './AppRoutes';
import { makeStore } from '@/store';
import type { PinRepository } from '@/data/PinRepository';

const stubRepo: PinRepository = {
  list: async () => ({ pins: [] }),
  suggest: async () => [],
  create: async () => {
    throw new Error('not implemented');
  },
  getById: async () => undefined,
};

function renderAt(path: string) {
  return render(
    <Provider store={makeStore(stubRepo)}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
}

describe('AppRoutes', () => {
  it('renders SearchPage at /', () => {
    renderAt('/');
    expect(screen.getByTestId('search-page')).toBeInTheDocument();
  });

  // CreatePinPage is route-split via React.lazy, so initial render shows the
  // Suspense fallback and the page resolves asynchronously.
  it('lazily renders CreatePinPage at /create', async () => {
    renderAt('/create');
    expect(await screen.findByTestId('create-page')).toBeInTheDocument();
  });

  it('navigates from header Create link to /create', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: 'Create' }));
    expect(await screen.findByTestId('create-page')).toBeInTheDocument();
  });

  it('navigates back to / from the brand link', async () => {
    const user = userEvent.setup();
    renderAt('/create');
    await screen.findByTestId('create-page');
    await user.click(screen.getByRole('link', { name: /pin search/i }));
    expect(screen.getByTestId('search-page')).toBeInTheDocument();
  });
});
