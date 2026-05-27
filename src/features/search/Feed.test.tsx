import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { upsertPins } from '@/store/pinsSlice';
import { hydrate } from '@/store/feedSlice';
import { Feed } from './Feed';
import type { Pin } from '@/types/Pin';
import type { PinRepository } from '@/data/PinRepository';

function makePin(id: string, description: string): Pin {
  const v = { url: `https://example.test/${id}.jpg`, width: 1, height: 1, type: 'image/webp' as const };
  return {
    id,
    description,
    descriptionLower: description.toLowerCase(),
    width: 1,
    height: 1,
    dominantColor: '#abcdef',
    createdAt: 1,
    responsive: { '170': v, '236': v, '474': v, '736': v, orig: v },
  };
}

function repoWith(pins: Pin[]): PinRepository {
  return {
    list: async () => ({ pins, nextCursor: undefined }),
    suggest: async () => [],
    create: async () => {
      throw new Error('not implemented');
    },
    getById: async () => undefined,
  };
}

describe('Feed', () => {
  it('shows empty state when there are no pins', () => {
    const store = makeStore(repoWith([]));
    render(
      <Provider store={store}>
        <Feed />
      </Provider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/no pins yet/i);
  });

  it('renders pins from feed order', async () => {
    const pins = [makePin('a', 'Cat'), makePin('b', 'Dog')];
    const store = makeStore(repoWith(pins));
    store.dispatch(upsertPins(pins));
    await store.dispatch(hydrate());
    render(
      <Provider store={store}>
        <Feed />
      </Provider>,
    );
    expect(screen.getByTestId('feed')).toBeInTheDocument();
    expect(screen.getByTestId('masonry')).toBeInTheDocument();
    // Both pins render as list items, even though only the first is paint-ready immediately.
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });
});
