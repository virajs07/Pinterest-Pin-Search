import { useCallback, useState } from 'react';
import type { ImageMime, NewImageVariant, NewResponsiveImages, ResponsiveSizeKey } from '@/types/Pin';
import { RESPONSIVE_SIZES } from '@/types/Pin';
import { extractDominantColor } from '@/lib/dominantColor';
import { variantSize } from '@/lib/imageSizing';
import { detectWebpSupport } from '@/lib/webpSupport';

export type ImageMetadata = {
  width: number;
  height: number;
  dominantColor: string;
  responsive: NewResponsiveImages;
};

export type ImageMetadataState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; metadata: ImageMetadata }
  | { status: 'error'; message: string };

// Bounds on the uploaded source image. The browser <input accept="image/*">
// is advisory only — the decoder will happily accept anything that looks like
// an image. These limits exist so an oversize file can't pin the main thread
// while canvas allocates and toBlob()-encodes five variants.
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_IMAGE_PIXELS = 40_000_000; // ~6324×6324 — caps canvas allocation

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error(`Image is too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const pixels = img.naturalWidth * img.naturalHeight;
      if (pixels > MAX_IMAGE_PIXELS) {
        reject(new Error('Image dimensions exceed the supported maximum'));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image failed to decode'));
    };
    img.src = url;
  });
}

async function renderVariant(
  source: HTMLImageElement,
  key: ResponsiveSizeKey,
  mime: ImageMime,
): Promise<NewImageVariant> {
  const { width, height } = variantSize(key, {
    width: source.naturalWidth,
    height: source.naturalHeight,
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, 0.85),
  );
  if (!blob) throw new Error('canvas.toBlob returned null');
  return { blob, width, height, type: mime };
}

export function useImageMetadata() {
  const [state, setState] = useState<ImageMetadataState>({ status: 'idle' });

  const extract = useCallback(async (file: File): Promise<ImageMetadata> => {
    setState({ status: 'loading' });
    try {
      const img = await loadImage(file);
      const dominantColor = extractDominantColor(img);
      const webp = await detectWebpSupport();
      const mime: ImageMime = webp ? 'image/webp' : 'image/jpeg';

      const responsive = {} as NewResponsiveImages;
      for (const key of RESPONSIVE_SIZES) {
        responsive[key] = await renderVariant(img, key, mime);
      }

      const metadata: ImageMetadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        dominantColor,
        responsive,
      };
      setState({ status: 'ready', metadata });
      return metadata;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ status: 'error', message });
      throw err;
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, extract, reset };
}
