import { useCallback, useEffect, useRef } from 'react';

export type InfiniteLoaderProps = {
  onIntersect: () => void;
  /** Root margin in pixels for the IntersectionObserver. ~2 viewports (per DR-16). */
  rootMarginPx?: number;
};

/**
 * A 1×1 sentinel. When it enters the [scroll + 2 viewport] region it calls
 * `onIntersect`. Used by Feed to fetch the next page.
 */
export function InfiniteLoader({ onIntersect, rootMarginPx }: InfiniteLoaderProps) {
  const cbRef = useRef(onIntersect);
  useEffect(() => {
    cbRef.current = onIntersect;
  }, [onIntersect]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setNode = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;
      if (typeof IntersectionObserver === 'undefined') return;
      const margin = rootMarginPx ?? Math.round(window.innerHeight * 2);
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) cbRef.current();
          }
        },
        { rootMargin: `0px 0px ${margin}px 0px` },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [rootMarginPx],
  );

  return <div ref={setNode} aria-hidden="true" data-testid="infinite-sentinel" />;
}
