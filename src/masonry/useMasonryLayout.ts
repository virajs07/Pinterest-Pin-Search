export type PinSize = { id: string; width: number; height: number };

export type LayoutPosition = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columnIndex: number;
};

export type LayoutResult = {
  positions: LayoutPosition[];
  columnHeights: number[];
  containerHeight: number;
};

/**
 * Height-balancing placement (SPEC DR-8): each pin goes into the currently
 * shortest column; ties broken leftmost. Output positions are deterministic
 * for a given input order, so re-running for an extended list yields
 * identical positions for the prefix.
 */
export function layoutPins(
  pins: PinSize[],
  columnCount: number,
  columnWidth: number,
  gap: number,
): LayoutResult {
  const columnHeights: number[] = new Array(columnCount).fill(0);
  const positions: LayoutPosition[] = [];

  for (const pin of pins) {
    let shortest = 0;
    for (let i = 1; i < columnCount; i++) {
      if ((columnHeights[i] ?? 0) < (columnHeights[shortest] ?? 0)) shortest = i;
    }
    const renderedHeight = Math.max(
      1,
      Math.round((columnWidth / Math.max(1, pin.width)) * pin.height),
    );
    const x = shortest * (columnWidth + gap);
    const y = columnHeights[shortest] ?? 0;
    positions.push({
      id: pin.id,
      x,
      y,
      width: columnWidth,
      height: renderedHeight,
      columnIndex: shortest,
    });
    columnHeights[shortest] = y + renderedHeight + gap;
  }

  const tallest = columnHeights.length === 0 ? 0 : Math.max(...columnHeights);
  const containerHeight = positions.length === 0 ? 0 : Math.max(0, tallest - gap);
  return { positions, columnHeights, containerHeight };
}
