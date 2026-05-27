import { describe, it, expect } from 'vitest';
import { layoutPins, type PinSize } from './useMasonryLayout';
import { getColumnCount } from './columns';

const W = 200;
const GAP = 10;

function square(id: string, side: number): PinSize {
  return { id, width: side, height: side };
}

describe('layoutPins', () => {
  it('returns no positions for empty input', () => {
    const out = layoutPins([], 3, W, GAP);
    expect(out.positions).toEqual([]);
    expect(out.containerHeight).toBe(0);
    expect(out.columnHeights).toEqual([0, 0, 0]);
  });

  it('places three equal-size pins one per column at y=0', () => {
    const pins = [square('a', 100), square('b', 100), square('c', 100)];
    const out = layoutPins(pins, 3, W, GAP);
    expect(out.positions[0]).toMatchObject({ id: 'a', columnIndex: 0, x: 0, y: 0 });
    expect(out.positions[1]).toMatchObject({ id: 'b', columnIndex: 1, x: W + GAP, y: 0 });
    expect(out.positions[2]).toMatchObject({ id: 'c', columnIndex: 2, x: 2 * (W + GAP), y: 0 });
  });

  it('places a fourth pin in the leftmost (currently shortest) column', () => {
    const pins = [square('a', 100), square('b', 100), square('c', 100), square('d', 100)];
    const out = layoutPins(pins, 3, W, GAP);
    expect(out.positions[3]).toMatchObject({ id: 'd', columnIndex: 0, x: 0 });
    expect(out.positions[3]!.y).toBe(W + GAP);
  });

  it('puts the next pin into the genuinely shortest column when one is tall', () => {
    // First pin is tall (2× aspect), should make column 0 much taller.
    // Following short pins should fill columns 1 and 2 before going back to 0.
    const pins: PinSize[] = [
      { id: 'tall', width: 100, height: 400 },
      { id: 's1', width: 100, height: 50 },
      { id: 's2', width: 100, height: 50 },
      { id: 's3', width: 100, height: 50 },
    ];
    const out = layoutPins(pins, 3, W, GAP);
    expect(out.positions[1]!.columnIndex).toBe(1);
    expect(out.positions[2]!.columnIndex).toBe(2);
    // s3: col 1 and col 2 should both be ~100 + GAP tall; col 0 is ~800 + GAP.
    // Tie between 1 and 2 -> leftmost wins -> col 1.
    expect(out.positions[3]!.columnIndex).toBe(1);
  });

  it('computes container height as the tallest column minus the trailing gap', () => {
    const pins = [{ id: 'a', width: 100, height: 200 }];
    const out = layoutPins(pins, 1, W, GAP);
    expect(out.containerHeight).toBe(2 * W); // height 200 scales to columnWidth=W: 2*W
  });

  it('prefix is stable when appending a second batch (re-run with extended pins)', () => {
    const first = [square('a', 100), square('b', 100), square('c', 100)];
    const r1 = layoutPins(first, 3, W, GAP);
    const second = [...first, square('d', 100), square('e', 100)];
    const r2 = layoutPins(second, 3, W, GAP);
    // First three positions identical.
    for (let i = 0; i < 3; i++) {
      expect(r2.positions[i]).toEqual(r1.positions[i]);
    }
  });
});

describe('getColumnCount', () => {
  it('returns 1 below 640px (mobile)', () => {
    expect(getColumnCount(320)).toBe(1);
    expect(getColumnCount(639)).toBe(1);
  });
  it('returns 2 at 640..1023 (tablet)', () => {
    expect(getColumnCount(640)).toBe(2);
    expect(getColumnCount(1023)).toBe(2);
  });
  it('returns 3 at 1024+ (desktop and wider)', () => {
    expect(getColumnCount(1024)).toBe(3);
    expect(getColumnCount(1440)).toBe(3);
    expect(getColumnCount(1920)).toBe(3);
    expect(getColumnCount(3840)).toBe(3);
  });
});
