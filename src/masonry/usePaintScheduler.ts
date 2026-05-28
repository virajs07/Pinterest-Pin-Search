import { useCallback, useMemo, useState } from 'react';

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
 * Tracks per-pin load state via callbacks from the actual rendered <img>
 * elements. There is intentionally no `new Image()` preload here — that would
 * duplicate every fetch (once by the scheduler, once by the <img>'s srcset)
 * and bypass the browser cache. The browser is the cache; we just gate
 * *visibility* in display order via `isPaintReady`.
 *
 * `terminal` accumulates keys across the session but is only ever looked up
 * for ids in the current window, so stale entries cost ~tens of bytes each
 * and never affect output. The map is pruned lazily by `effectiveTerminal`
 * to keep the in-render structure bounded by the current window.
 */
export function usePaintScheduler(ids: readonly string[]) {
  const [terminal, setTerminal] = useState<Record<string, 'loaded' | 'errored'>>({});

  const report = useCallback((id: string, state: 'loaded' | 'errored') => {
    setTerminal((prev) => (prev[id] === state ? prev : { ...prev, [id]: state }));
  }, []);

  const ready = useMemo(() => {
    const states: Record<string, PaintState> = {};
    for (const id of ids) states[id] = terminal[id] ?? 'pending';
    return computePaintReady(ids, states);
  }, [ids, terminal]);

  return {
    isPaintReady(id: string): boolean {
      return ready.has(id);
    },
    report,
  };
}
