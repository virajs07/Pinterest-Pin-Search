/**
 * Compute a dominant color from an ImageData buffer.
 *
 * Strategy: average over RGB, skipping fully transparent pixels.
 * Good enough as a placeholder background; revisit if pins look muddy. (SPEC §11)
 */
export function dominantColorFromImageData(imageData: ImageData): string {
  const { data } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === undefined || alpha === 0) continue;
    r += data[i] ?? 0;
    g += data[i + 1] ?? 0;
    b += data[i + 2] ?? 0;
    count += 1;
  }
  if (count === 0) return '#000000';
  const ri = Math.round(r / count);
  const gi = Math.round(g / count);
  const bi = Math.round(b / count);
  return rgbToHex(ri, gi, bi);
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Draws the given source to a 32×32 canvas and returns the dominant color hex.
 * Throws if the canvas 2D context is unavailable (e.g., headless test env).
 */
export function extractDominantColor(source: CanvasImageSource): string {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');
  ctx.drawImage(source, 0, 0, 32, 32);
  const data = ctx.getImageData(0, 0, 32, 32);
  return dominantColorFromImageData(data);
}
