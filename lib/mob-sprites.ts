import type { SpriteFrame } from './sprites';

type Spec = [number, number, number, number, number, number, number];

function crop(sheet: HTMLImageElement, spec: Spec): SpriteFrame {
  const [x, y, w, h, footX, footY, ms] = spec;
  const image = document.createElement('canvas');
  image.width = w;
  image.height = h;
  const ctx = image.getContext('2d')!;
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h);
  // This sheet has a green chroma key, including enclosed gaps around the sword.
  // Keep the white head and red scarf; tolerate compression noise in the green.
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (
      Math.max(
        Math.abs(pixels.data[i] - 107),
        Math.abs(pixels.data[i + 1] - 190),
        Math.abs(pixels.data[i + 2] - 48),
      ) <= 65
    )
      pixels.data[i + 3] = 0;
    else if (
      pixels.data[i + 1] >
      Math.max(pixels.data[i], pixels.data[i + 2]) + 8
    ) {
      // Remove green spill on antialiased black/white edges without erasing them.
      const gray = Math.round((pixels.data[i] + pixels.data[i + 2]) / 2);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return { image, x: footX, y: footY, ms };
}

export function createMobSprites(sheet: HTMLImageElement) {
  const frames = (specs: Spec[]) => specs.map((spec) => crop(sheet, spec));
  return {
    idle: frames([
      [16, 15, 32, 34, 16, 33, 650],
      [80, 15, 32, 34, 16, 33, 650],
      [464, 15, 32, 34, 16, 33, 120],
    ]),
    walk: frames([
      [14, 64, 32, 34, 18, 32, 135],
      [46, 64, 32, 34, 18, 31, 135],
      [78, 64, 32, 34, 18, 32, 135],
      [110, 64, 32, 34, 18, 31, 135],
    ]),
    attack: frames([
      [14, 159, 36, 35, 18, 33, 110],
      [50, 159, 36, 35, 18, 33, 110],
      [86, 159, 36, 35, 18, 33, 100],
      [122, 159, 36, 35, 18, 33, 100],
      [158, 159, 36, 35, 18, 33, 180],
    ]),
    death: frames(
      [16, 64, 112, 160, 208, 256, 304].map((x) => [
        x,
        367,
        48,
        35,
        16,
        33,
        100,
      ]),
    ),
  };
}
