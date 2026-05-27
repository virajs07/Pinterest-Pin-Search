import { describe, it, expect } from 'vitest';
import { computePaintReady } from './usePaintScheduler';

describe('computePaintReady', () => {
  it('marks all pins ready when all are non-pending', () => {
    const ready = computePaintReady(['a', 'b', 'c'], {
      a: 'loaded',
      b: 'loaded',
      c: 'loaded',
    });
    expect(Array.from(ready)).toEqual(['a', 'b', 'c']);
  });

  it('first pin is always ready (no prior dependency)', () => {
    const ready = computePaintReady(['a', 'b'], { a: 'pending', b: 'loaded' });
    expect(ready.has('a')).toBe(true);
    expect(ready.has('b')).toBe(false);
  });

  it('a pending pin gates all later pins', () => {
    const ready = computePaintReady(['a', 'b', 'c', 'd'], {
      a: 'loaded',
      b: 'pending',
      c: 'loaded',
      d: 'loaded',
    });
    expect(ready.has('a')).toBe(true);
    expect(ready.has('b')).toBe(true); // b itself can mount
    expect(ready.has('c')).toBe(false); // c gated by b
    expect(ready.has('d')).toBe(false);
  });

  it('errored prior pin does not block downstream', () => {
    const ready = computePaintReady(['a', 'b', 'c'], {
      a: 'errored',
      b: 'loaded',
      c: 'loaded',
    });
    expect(Array.from(ready)).toEqual(['a', 'b', 'c']);
  });

  it('undefined state is treated like pending', () => {
    const ready = computePaintReady(['a', 'b'], { a: 'loaded' });
    expect(ready.has('a')).toBe(true);
    expect(ready.has('b')).toBe(true); // b is still allowed because a is loaded
    const ready2 = computePaintReady(['a', 'b'], {});
    expect(ready2.has('a')).toBe(true);
    expect(ready2.has('b')).toBe(false);
  });

  it('empty input returns empty set', () => {
    expect(computePaintReady([], {}).size).toBe(0);
  });
});
