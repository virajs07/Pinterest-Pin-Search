import type { ResponsiveSizeKey } from '@/types/Pin';

export const TARGET_WIDTH_BY_KEY: Record<ResponsiveSizeKey, number> = {
  '170': 170,
  '236': 236,
  '474': 474,
  '736': 736,
  orig: Number.POSITIVE_INFINITY,
};

/**
 * Compute the rendered size for a responsive variant. We never upscale —
 * if the requested target is larger than the source, we clamp to source.
 */
export function variantSize(
  key: ResponsiveSizeKey,
  source: { width: number; height: number },
): { width: number; height: number } {
  const target = TARGET_WIDTH_BY_KEY[key];
  const width = target === Number.POSITIVE_INFINITY || target > source.width ? source.width : target;
  const height = Math.round((width / source.width) * source.height);
  return { width, height };
}
