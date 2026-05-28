import { describe, it, expect } from 'vitest';
import { computeVisibleIds, getDomCap } from './useVirtualWindow';
import type { LayoutPosition } from './useMasonryLayout';

function pos(id: string, y: number, height = 200): LayoutPosition {
  return { id, x: 0, y, width: 200, height, columnIndex: 0 };
}

describe('computeVisibleIds', () => {
  it('returns empty when there are no positions', () => {
    expect(computeVisibleIds([], 0, 800, 40).size).toBe(0);
  });

  it('includes pins within viewport + small buffer (200px above, 400px below)', () => {
    // scrollTop=1000, viewportHeight=800 → window y ∈ [800, 2200].
    const positions = [
      pos('a', 0, 200), // ends at 200 — below window (800); excluded
      pos('b', 700, 200), // ends at 900 — overlaps window; included
      pos('c', 1500), // entirely in viewport; included
      pos('d', 2150), // just inside lookahead; included
      pos('e', 2400), // beyond lookahead; excluded
    ];
    const visible = computeVisibleIds(positions, 1000, 800, 40);
    expect(visible.has('a')).toBe(false);
    expect(visible.has('b')).toBe(true);
    expect(visible.has('c')).toBe(true);
    expect(visible.has('d')).toBe(true);
    expect(visible.has('e')).toBe(false);
  });

  it('honors the cap — keeps pins closest to the viewport center', () => {
    // 10 pins (each 80px tall) at y = i*100; all inside the buffered window.
    const positions = Array.from({ length: 10 }, (_, i) => pos(`p${i}`, i * 100, 80));
    // scrollTop=450, viewportHeight=800 → center=850. Pin mid-ys: 40,140,...,940.
    // Closest 3: p8 (mid 840, dist 10), p9 (940, 90), p7 (740, 110).
    const visible = computeVisibleIds(positions, 450, 800, 3);
    expect(visible.size).toBe(3);
    expect(visible.has('p7')).toBe(true);
    expect(visible.has('p8')).toBe(true);
    expect(visible.has('p9')).toBe(true);
  });

  it('excludes pins entirely above the window', () => {
    const positions = [pos('a', 0, 100), pos('b', 5000)];
    const visible = computeVisibleIds(positions, 5000, 800, 40);
    expect(visible.has('a')).toBe(false);
    expect(visible.has('b')).toBe(true);
  });
});

describe('getDomCap', () => {
  it('40 for desktop widths (>= 1024)', () => {
    expect(getDomCap(1024)).toBe(40);
    expect(getDomCap(1920)).toBe(40);
  });
  it('20 for mobile/tablet widths (< 1024)', () => {
    expect(getDomCap(320)).toBe(20);
    expect(getDomCap(768)).toBe(20);
    expect(getDomCap(1023)).toBe(20);
  });
});
