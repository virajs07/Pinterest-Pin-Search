import type { Pin as PinModel, ResponsiveSizeKey } from '@/types/Pin';
import { RESPONSIVE_SIZES } from '@/types/Pin';
import styles from './Pin.module.css';

export type PinProps = {
  pin: PinModel;
  columnWidth: number;
  paintReady: boolean;
};

function buildSrcSet(pin: PinModel): string {
  return RESPONSIVE_SIZES.map((size: ResponsiveSizeKey) => {
    const v = pin.responsive[size];
    return v.url ? `${v.url} ${v.width}w` : null;
  })
    .filter((s): s is string => s !== null)
    .join(', ');
}

export function Pin({ pin, columnWidth, paintReady }: PinProps) {
  const aspectRatio = `${pin.width} / ${pin.height}`;
  const orig = pin.responsive.orig;
  const showImage = paintReady && orig.url !== '';
  const srcSet = buildSrcSet(pin);

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
      {showImage && (
        <img
          className={styles.image}
          src={orig.url}
          srcSet={srcSet}
          sizes={`${columnWidth}px`}
          alt={pin.description}
          loading="auto"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ fetchpriority: 'auto' } as any)}
          width={orig.width}
          height={orig.height}
        />
      )}
    </div>
  );
}
