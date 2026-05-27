import { describe, it, expect } from 'vitest';
import reducer, { pushToast, dismissToast } from './toastsSlice';

describe('toastsSlice', () => {
  it('push appends a toast with a generated id', () => {
    const next = reducer(undefined, pushToast({ kind: 'error', message: 'boom' }));
    expect(next.items.length).toBe(1);
    expect(next.items[0]!.id).toMatch(/.+/);
    expect(next.items[0]!.kind).toBe('error');
    expect(next.items[0]!.message).toBe('boom');
  });

  it('dismiss removes by id', () => {
    let state = reducer(undefined, pushToast({ kind: 'info', message: 'a' }));
    state = reducer(state, pushToast({ kind: 'info', message: 'b' }));
    const idToRemove = state.items[0]!.id;
    state = reducer(state, dismissToast(idToRemove));
    expect(state.items.length).toBe(1);
    expect(state.items[0]!.message).toBe('b');
  });

  it('dismiss is a no-op for unknown id', () => {
    const state = reducer(undefined, pushToast({ kind: 'info', message: 'a' }));
    const next = reducer(state, dismissToast('nope'));
    expect(next.items.length).toBe(1);
  });
});
