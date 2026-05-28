import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from '@/store';
import { hydrate } from '@/store/feedSlice';
import type { PinRepository } from '@/data/PinRepository';
import type { Pin } from '@/types/Pin';
import { SearchBar } from './SearchBar';

function pin(id: string, description: string): Pin {
  const variant = { url: '', width: 1, height: 1, type: 'image/webp' as const };
  return {
    id,
    description,
    descriptionLower: description.toLowerCase(),
    width: 1,
    height: 1,
    dominantColor: '#000',
    createdAt: 1,
    responsive: { '170': variant, '236': variant, '474': variant, '736': variant, orig: variant },
  };
}

function makeRepo(pins: Pin[]): PinRepository {
  return {
    list: async () => ({ pins, nextCursor: undefined }),
    suggest: async () => {
      throw new Error('repo.suggest must not be called from SearchBar');
    },
    create: async () => {
      throw new Error('not implemented');
    },
    getById: async () => undefined,
  };
}

function Harness({ onCommit }: { onCommit: (q: string) => void }) {
  const [value, setValue] = useState('');
  return <SearchBar value={value} onChange={setValue} onCommit={onCommit} />;
}

async function renderWithStore(
  pins: Pin[],
  onCommit: (q: string) => void = () => {},
): Promise<{ store: AppStore }> {
  const store = makeStore(makeRepo(pins));
  await store.dispatch(hydrate());
  render(
    <Provider store={store}>
      <Harness onCommit={onCommit} />
    </Provider>,
  );
  return { store };
}

describe('SearchBar', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('renders no suggestions for queries shorter than 3 chars', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderWithStore([pin('1', 'cat photos'), pin('2', 'category')]);
    await user.type(screen.getByTestId('search-input'), 'ca');
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('renders matching suggestions after the debounce window', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderWithStore([pin('1', 'cat photos'), pin('2', 'category'), pin('3', 'dog')]);
    await user.type(screen.getByTestId('search-input'), 'cat');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options.sort()).toEqual(['cat photos', 'category']);
  });

  it('Enter on an arrowed-into suggestion commits that text', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderWithStore([pin('1', 'cat photos'), pin('2', 'category')], onCommit);
    await user.type(screen.getByTestId('search-input'), 'cat');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    // First ArrowDown moves from "no selection" to the first item, so two
    // presses are needed to land on "category".
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onCommit).toHaveBeenCalledWith('category');
  });

  it('Enter without arrowing into the list commits the raw input (no auto-highlight)', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderWithStore([pin('1', 'cat photos'), pin('2', 'category')], onCommit);
    await user.type(screen.getByTestId('search-input'), 'cat');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await user.keyboard('{Enter}');
    expect(onCommit).toHaveBeenCalledWith('cat');
  });

  it('Enter with no suggestions commits the raw input value', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderWithStore([], onCommit);
    await user.type(screen.getByTestId('search-input'), 'something else');
    await user.keyboard('{Enter}');
    expect(onCommit).toHaveBeenCalledWith('something else');
  });
});
