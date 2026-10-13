import type { SpriteFrame } from './sprites';

export type FrameSpec = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export const withDuration = (spec: FrameSpec, ms: number): FrameSpec => [
  spec[0],
  spec[1],
  spec[2],
  spec[3],
  spec[4],
  spec[5],
  ms,
];

// These supplied pixel sheets share a neutral #b0b0b0 matte. Distance keying
// also removes enclosed background holes between wings, legs and roots.
export function grayFrames(
  sheet: HTMLImageElement,
  specs: FrameSpec[],
): SpriteFrame[] {
  return specs.map(([x, y, w, h, footX, footY, ms]) => {
    const image = document.createElement('canvas');
    image.width = w;
    image.height = h;
    const ctx = image.getContext('2d')!;
    ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h),
      d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      const distance = Math.max(
        Math.abs(d[i] - 176),
        Math.abs(d[i + 1] - 176),
        Math.abs(d[i + 2] - 176),
      );
      d[i + 3] = Math.round(
        255 * Math.max(0, Math.min(1, (distance - 8) / 14)),
      );
    }
    ctx.putImageData(pixels, 0, 0);
    return { image, x: footX, y: footY, ms };
  });
}
