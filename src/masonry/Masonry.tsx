import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Pin as PinModel } from '@/types/Pin';
import { Pin } from './Pin';
import { layoutPins } from './useMasonryLayout';
import { usePaintScheduler } from './usePaintScheduler';
import { getDomCap, useVirtualWindow } from './useVirtualWindow';
import { getColumnCount, MASONRY_GAP_PX } from './columns';
import styles from './Masonry.module.css';

const RESIZE_DEBOUNCE_MS = 150;
const FALLBACK_WIDTH = 1024;

export function Masonry({ pins }: { pins: PinModel[] }) {
  const sizerRef = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return FALLBACK_WIDTH;
    return window.innerWidth;
  });

  useEffect(() => {
    const el = sizerRef.current;
    if (!el) return;

    let handle: number | undefined;
    function applyMeasurement(width: number) {
      if (handle !== undefined) window.clearTimeout(handle);
      handle = window.setTimeout(() => {
        setAvailableWidth((prev) => {
          if (Math.abs(prev - width) < 0.5) return prev;
          // Recompute only when the column count would change.
          if (getColumnCount(prev) === getColumnCount(width)) return prev;
          return width;
        });
      }, RESIZE_DEBOUNCE_MS);
    }

    // Take an initial measurement immediately so first paint is correct.
    setAvailableWidth(el.getBoundingClientRect().width || FALLBACK_WIDTH);

    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applyMeasurement(entry.contentRect.width);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (handle !== undefined) window.clearTimeout(handle);
    };
  }, []);

  const columnCount = getColumnCount(availableWidth);
  const columnWidth = Math.max(
    100,
    Math.floor((availableWidth - (columnCount - 1) * MASONRY_GAP_PX) / columnCount),
  );
  const totalWidth = columnCount * columnWidth + (columnCount - 1) * MASONRY_GAP_PX;

  const { positions, containerHeight, pinById, ids } = useMemo(() => {
    const sizes = pins.map((p) => ({ id: p.id, width: p.width, height: p.height }));
    const layout = layoutPins(sizes, columnCount, columnWidth, MASONRY_GAP_PX);
    const map = new Map(pins.map((p) => [p.id, p]));
    const idsArr = pins.map((p) => p.id);
    return {
      positions: layout.positions,
      containerHeight: layout.containerHeight,
      pinById: map,
      ids: idsArr,
    };
  }, [pins, columnCount, columnWidth]);

  const cap = getDomCap(availableWidth);
  const visible = useVirtualWindow(positions, cap);

  // Gate in-order paint only for the pins currently in the visible window.
  // Anything outside is neither in the DOM nor known to the scheduler, so it
  // costs zero work until it scrolls into view.
  const visibleIds = useMemo(() => ids.filter((id) => visible.has(id)), [ids, visible]);
  const { isPaintReady, report } = usePaintScheduler(visibleIds);

  // Pins that have already been fully loaded stick around in the DOM even
  // after they scroll past the virtual window. Scrolling back to them is
  // then a pure scroll — no remount, no new <img> element, and therefore
  // no fresh "request" entry in DevTools (the browser doesn't re-fetch or
  // re-resolve the blob URL). The set is pruned to current feed members
  // (drops stale ids on search query change), so memory stays proportional
  // to what the user has actually seen in this feed.
  const [sticky, setSticky] = useState<ReadonlySet<string>>(() => new Set());

  const handleLoaded = useCallback(
    (id: string) => {
      report(id, 'loaded');
      setSticky((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [report],
  );

  const handleErrored = useCallback(
    (id: string) => {
      report(id, 'errored');
    },
    [report],
  );

  const rendered = useMemo(() => {
    const merged = new Set(visible);
    // Filter sticky against the current feed in case the user has switched
    // queries — stale ids stay in `sticky` (cheap memory) but are skipped
    // here so they don't appear in the rendered output.
    for (const id of sticky) {
      if (pinById.has(id)) merged.add(id);
    }
    return merged;
  }, [visible, sticky, pinById]);

  return (
    <div ref={sizerRef} className={styles.sizer} data-testid="masonry-sizer">
      <div
        className={styles.container}
        role="list"
        data-testid="masonry"
        style={{ width: totalWidth, height: containerHeight }}
      >
        {positions.map((pos) => {
          if (!rendered.has(pos.id)) return null;
          const pin = pinById.get(pos.id);
          if (!pin) return null;
          return (
            <div
              key={pin.id}
              className={styles.cell}
              role="presentation"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                width: columnWidth,
              }}
            >
              <Pin
                pin={pin}
                columnWidth={columnWidth}
                paintReady={isPaintReady(pin.id)}
                onLoaded={() => handleLoaded(pin.id)}
                onErrored={() => handleErrored(pin.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
