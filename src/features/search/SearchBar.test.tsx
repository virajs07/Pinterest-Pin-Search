import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import type { PinRepository } from '@/data/PinRepository';
import { SearchBar } from './SearchBar';

function repo(suggestImpl: PinRepository['suggest']): PinRepository {
  return {
    list: async () => ({ pins: [] }),
    suggest: suggestImpl,
    create: async () => {
      throw new Error('not implemented');
    },
    getById: async () => undefined,
  };
}

function render_(node: React.ReactNode, suggestImpl: PinRepository['suggest']) {
  const store = makeStore(repo(suggestImpl));
  return {
    store,
    ...render(<Provider store={store}>{node}</Provider>),
  };
}

describe('SearchBar', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('does not call repo.suggest for queries shorter than 3 chars', async () => {
    const suggestSpy = vi.fn().mockResolvedValue([]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render_(<SearchBar onCommit={() => {}} />, suggestSpy);
    await user.type(screen.getByTestId('search-input'), 'ca');
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(suggestSpy).not.toHaveBeenCalled();
  });

  it('calls repo.suggest after 250 ms when at least 3 chars are typed', async () => {
    const suggestSpy = vi.fn().mockResolvedValue(['cat photos', 'category']);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render_(<SearchBar onCommit={() => {}} />, suggestSpy);
    await user.type(screen.getByTestId('search-input'), 'cat');
    expect(suggestSpy).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(suggestSpy).toHaveBeenCalledWith('cat', 8, expect.any(AbortSignal));
  });

  it('renders suggestions as listbox options', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render_(<SearchBar onCommit={() => {}} />, async () => ['cat photos', 'category']);
    await user.type(screen.getByTestId('search-input'), 'cat');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['cat photos', 'category']);
  });

  it('Enter on a suggestion commits that text', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render_(<SearchBar onCommit={onCommit} />, async () => ['cat photos', 'category']);
    await user.type(screen.getByTestId('search-input'), 'cat');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onCommit).toHaveBeenCalledWith('category');
  });

  it('Enter with no suggestions commits the raw input value', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render_(<SearchBar onCommit={onCommit} />, async () => []);
    await user.type(screen.getByTestId('search-input'), 'something else');
    await user.keyboard('{Enter}');
    expect(onCommit).toHaveBeenCalledWith('something else');
  });
});
