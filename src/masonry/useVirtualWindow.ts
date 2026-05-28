import { useEffect, useMemo, useState } from 'react';
import type { LayoutPosition } from './useMasonryLayout';

/** SPEC DR-10: 40 desktop / 20 mobile-tablet. */
export function getDomCap(viewportWidth: number): number {
  return viewportWidth >= 1024 ? 40 : 20;
}

/**
 * Lazy-loading buffer around the current viewport.
 *
 * Anything outside [scrollTop − LOOKBEHIND_PX, scrollTop + viewportHeight +
 * LOOKAHEAD_PX] is skipped from the DOM (and therefore skipped from network
 * preload by the paint scheduler). The lookahead is intentionally small —
 * just enough to fetch the next row before it scrolls into view — so users
 * never pay network cost for pins they can't see.
 */
export const LOOKBEHIND_PX = 200;
export const LOOKAHEAD_PX = 400;

/**
 * Pin ids whose box overlaps the current viewport plus a small lazy-loading
 * buffer, capped by the device-class maximum.
 */
export function computeVisibleIds(
  positions: readonly LayoutPosition[],
  scrollTop: number,
  viewportHeight: number,
  cap: number,
): Set<string> {
  if (positions.length === 0) return new Set();
  const windowTop = scrollTop - LOOKBEHIND_PX;
  const windowBottom = scrollTop + viewportHeight + LOOKAHEAD_PX;
  const inWindow = positions.filter(
    (p) => p.y + p.height >= windowTop && p.y <= windowBottom,
  );
  if (inWindow.length <= cap) return new Set(inWindow.map((p) => p.id));

  const center = scrollTop + viewportHeight / 2;
  const ranked = [...inWindow].sort((a, b) => {
    const da = Math.abs(a.y + a.height / 2 - center);
    const db = Math.abs(b.y + b.height / 2 - center);
    return da - db;
  });
  return new Set(ranked.slice(0, cap).map((p) => p.id));
}

export function useVirtualWindow(
  positions: readonly LayoutPosition[],
  cap: number,
): Set<string> {
  const [scrollTop, setScrollTop] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : window.scrollY,
  );
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight,
  );

  useEffect(() => {
    let raf: number | null = null;
    const onScroll = () => {
      if (raf !== null) return;
      raf = window.requestAnimationFrame(() => {
        setScrollTop(window.scrollY);
        raf = null;
      });
    };
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return useMemo(
    () => computeVisibleIds(positions, scrollTop, viewportHeight, cap),
    [positions, scrollTop, viewportHeight, cap],
  );
}
