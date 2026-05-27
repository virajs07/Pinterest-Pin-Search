let cached: Promise<boolean> | null = null;

/**
 * One-time async feature detection for WebP encode support.
 * Cached for the session. (DR-13)
 */
export function detectWebpSupport(): Promise<boolean> {
  if (cached) return cached;
  cached = (async () => {
    if (typeof document === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const url = canvas.toDataURL('image/webp');
      return url.startsWith('data:image/webp');
    } catch {
      return false;
    }
  })();
  return cached;
}

/** Test helper. */
export function _resetWebpDetection(): void {
  cached = null;
}
