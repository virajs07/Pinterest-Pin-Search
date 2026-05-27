/**
 * Column counts per device class.
 *   < 640 px  (mobile)        → 1 column
 *   < 1024 px (tablet)        → 2 columns
 *   >= 1024 px (desktop/wide) → 3 columns
 *
 * Within a breakpoint the column count is fixed; layout recomputes only when
 * crossing a boundary (SPEC DR-9).
 */
export function getColumnCount(width: number): number {
  if (width < 640) return 1;
  if (width < 1024) return 2;
  return 3;
}

export const MASONRY_GAP_PX = 12;
