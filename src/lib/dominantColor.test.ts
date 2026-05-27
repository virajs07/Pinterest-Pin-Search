import { describe, it, expect } from 'vitest';
import { dominantColorFromImageData } from './dominantColor';

function imageDataFrom(pixels: Array<[number, number, number, number]>): ImageData {
  const arr = new Uint8ClampedArray(pixels.length * 4);
  for (let i = 0; i < pixels.length; i++) {
    const px = pixels[i]!;
    arr[i * 4] = px[0];
    arr[i * 4 + 1] = px[1];
    arr[i * 4 + 2] = px[2];
    arr[i * 4 + 3] = px[3];
  }
  return { data: arr, width: pixels.length, height: 1, colorSpace: 'srgb' } as ImageData;
}

describe('dominantColorFromImageData', () => {
  it('returns red for an all-red opaque image', () => {
    const data = imageDataFrom([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [255, 0, 0, 255],
    ]);
    expect(dominantColorFromImageData(data)).toBe('#ff0000');
  });

  it('returns black when all pixels are transparent', () => {
    const data = imageDataFrom([
      [255, 255, 255, 0],
      [0, 255, 0, 0],
    ]);
    expect(dominantColorFromImageData(data)).toBe('#000000');
  });

  it('averages a half-red half-blue image to magenta-ish', () => {
    const data = imageDataFrom([
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ]);
    expect(dominantColorFromImageData(data)).toBe('#800080');
  });

  it('skips fully transparent pixels in the average', () => {
    const data = imageDataFrom([
      [255, 0, 0, 255],
      [0, 255, 0, 0], // transparent — ignored
      [255, 0, 0, 255],
    ]);
    expect(dominantColorFromImageData(data)).toBe('#ff0000');
  });
});
