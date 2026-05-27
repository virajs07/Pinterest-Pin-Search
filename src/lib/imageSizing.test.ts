import { describe, it, expect } from 'vitest';
import { variantSize } from './imageSizing';

describe('variantSize', () => {
  it('downscales preserving aspect ratio', () => {
    expect(variantSize('236', { width: 1000, height: 500 })).toEqual({ width: 236, height: 118 });
  });

  it('does not upscale: smaller-than-target source returns source size', () => {
    expect(variantSize('474', { width: 200, height: 400 })).toEqual({ width: 200, height: 400 });
  });

  it('orig returns the source size verbatim', () => {
    expect(variantSize('orig', { width: 1600, height: 900 })).toEqual({ width: 1600, height: 900 });
  });

  it('rounds the height to integer pixels', () => {
    expect(variantSize('170', { width: 333, height: 222 })).toEqual({ width: 170, height: 113 });
  });

  it('handles square images', () => {
    expect(variantSize('736', { width: 2000, height: 2000 })).toEqual({ width: 736, height: 736 });
  });
});
