import { useEffect, useMemo, useRef, useState } from 'react';

export type PaintState = 'pending' | 'loaded' | 'errored';

/**
 * Pure paint-gate logic (SPEC DR-11). Pin K is paint-ready iff every prior
 * pin is in a non-pending state (loaded or errored). Errors do not stall
 * downstream — they unblock the next pin.
 */
export function computePaintReady(
  ids: readonly string[],
  states: Readonly<Record<string, PaintState | undefined>>,
): Set<string> {
  const ready = new Set<string>();
  let allowed = true;
  for (const id of ids) {
    if (allowed) ready.add(id);
    const s = states[id];
    if (s === undefined || s === 'pending') allowed = false;
  }
  return ready;
}

/**
 * Kick off `new Image()` preloads in parallel for the given ids; track the
 * load state per id; expose `isPaintReady(id)` for callers to gate their
 * `<img>` mount.
 *
 * Single retry on error, then advance (DR-11).
 */
export function usePaintScheduler(
  ids: readonly string[],
  urlById: Map<string, string>,
) {
  // Only terminal states are tracked; absence = pending.
  const [terminal, setTerminal] = useState<Record<string, 'loaded' | 'errored'>>({});
  const startedRef = useRef<Set<string>>(new Set());
  const retriedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const markLoaded = (id: string) =>
      queueMicrotask(() => setTerminal((s) => ({ ...s, [id]: 'loaded' })));
    const markErrored = (id: string) =>
      queueMicrotask(() => setTerminal((s) => ({ ...s, [id]: 'errored' })));

    function preload(url: string, id: string) {
      const img = new Image();
      img.onload = () => markLoaded(id);
      img.onerror = () => {
        if (retriedRef.current.has(id)) {
          markErrored(id);
        } else {
          retriedRef.current.add(id);
          preload(url, id);
        }
      };
      img.src = url;
    }

    for (const id of ids) {
      if (startedRef.current.has(id)) continue;
      startedRef.current.add(id);
      const url = urlById.get(id);
      if (!url) {
        markErrored(id);
        continue;
      }
      preload(url, id);
    }
  }, [ids, urlById]);

  const ready = useMemo(() => {
    const states: Record<string, PaintState> = {};
    for (const id of ids) states[id] = terminal[id] ?? 'pending';
    return computePaintReady(ids, states);
  }, [ids, terminal]);

  return {
    isPaintReady(id: string): boolean {
      return ready.has(id);
    },
  };
}
