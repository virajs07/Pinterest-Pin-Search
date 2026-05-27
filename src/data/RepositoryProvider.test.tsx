import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { RepositoryProvider, useRepository } from './RepositoryProvider';
import type { PinRepository } from './PinRepository';

const stubRepo: PinRepository = {
  list: async () => ({ pins: [] }),
  suggest: async () => [],
  create: async () => {
    throw new Error('not implemented');
  },
  getById: async () => undefined,
};

describe('RepositoryProvider', () => {
  it('useRepository returns the injected instance', () => {
    const { result } = renderHook(() => useRepository(), {
      wrapper: ({ children }) => (
        <RepositoryProvider repo={stubRepo}>{children}</RepositoryProvider>
      ),
    });
    expect(result.current).toBe(stubRepo);
  });

  it('useRepository throws outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useRepository())).toThrow(
      /RepositoryProvider/,
    );
    spy.mockRestore();
  });
});
