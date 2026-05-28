import { useEffect } from 'react';
import type { Pin as PinModel, ResponsiveSizeKey } from '@/types/Pin';
import { RESPONSIVE_SIZES } from '@/types/Pin';
import styles from './Pin.module.css';

export type PinProps = {
  pin: PinModel;
  columnWidth: number;
  paintReady: boolean;
  onLoaded?: () => void;
  onErrored?: () => void;
};

function buildSrcSet(pin: PinModel): string {
  return RESPONSIVE_SIZES.map((size: ResponsiveSizeKey) => {
    const v = pin.responsive[size];
    return v.url ? `${v.url} ${v.width}w` : null;
  })
    .filter((s): s is string => s !== null)
    .join(', ');
}

export function Pin({ pin, columnWidth, paintReady, onLoaded, onErrored }: PinProps) {
  const aspectRatio = `${pin.width} / ${pin.height}`;
  const orig = pin.responsive.orig;
  const hasImage = orig.url !== '';
  const srcSet = buildSrcSet(pin);

  // Optimistic pins (created locally but not yet persisted) have no blob URLs
  // yet. Treat them as "resolved with no paint" so the in-order scheduler
  // doesn't block every pin behind them forever.
  useEffect(() => {
    if (!hasImage) onErrored?.();
  }, [hasImage, onErrored]);

  return (
    <div
      className={styles.pin}
      role="listitem"
      data-pin-id={pin.id}
      style={{
        width: columnWidth,
        aspectRatio,
        backgroundColor: pin.dominantColor,
      }}
    >
      {hasImage && (
        // The <img> always mounts (when we have a URL) so the browser does
        // the loading exactly once and the result lives in its cache. Paint
        // ordering is enforced by opacity rather than by withholding the
        // request — keeps in-order paint, avoids dupe fetches, and lets a
        // remount (e.g. scroll-out/scroll-in) be an instant cache hit.
        <img
          className={styles.image}
          src={orig.url}
          srcSet={srcSet}
          sizes={`${columnWidth}px`}
          alt={pin.description}
          loading="lazy"
          decoding="async"
          width={orig.width}
          height={orig.height}
          style={{
            opacity: paintReady ? 1 : 0,
            transition: 'opacity 80ms ease-out',
          }}
          onLoad={() => onLoaded?.()}
          onError={() => onErrored?.()}
        />
      )}
      {hasImage && (
        // aria-hidden because the description is already exposed via the
        // image's alt text — duplicating it would make AT read it twice.
        <div className={styles.caption} aria-hidden="true">
          <span className={styles.captionText}>{pin.description}</span>
        </div>
      )}
    </div>
  );
}
