import { BAMBOO_SCALE, BAMBOO_SURFACE_OFFSET, RUINS_SCALE } from './scenery';
import type { LevelId } from './levels';

// Cut a moss-covered ledge from the new bamboo scene, clear of roots/altars.
const SOURCE_TOP = 252;
export const PLATFORM_SURFACE_OFFSET = BAMBOO_SURFACE_OFFSET;
const SOURCE_HEIGHT = 34;
const SOURCE_X = [48, 76, 100];

export function createPlatformTexture(
  source: HTMLImageElement,
  width: number,
  variant: number,
  level: LevelId = 1,
) {
  if (level === 3 || level === 4) {
    const scale = level === 4 ? RUINS_SCALE : 960 / 735,
      height = 28;
    const patch = document.createElement('canvas');
    patch.width = Math.ceil(width / scale);
    patch.height = height;
    const ctx = patch.getContext('2d')!;
    ctx.drawImage(
      source,
      level === 4
        ? Math.min(637 - patch.width, [32, 218, 420][variant % 3])
        : 96 + ((variant * 11) % (193 - patch.width)),
      level === 4 ? 300 : 360,
      patch.width,
      height,
      0,
      0,
      patch.width,
      height,
    );
    const pixels = ctx.getImageData(0, 0, patch.width, height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < patch.width; x++) {
        const bottom = height - 4 + ((Math.floor(x / 9) + variant) % 4);
        const inset = y < 13 ? 0 : Math.floor((y - 13) / 5);
        if (y >= bottom || x < inset || x >= patch.width - inset)
          pixels.data[(y * patch.width + x) * 4 + 3] = 0;
      }
    ctx.putImageData(pixels, 0, 0);
    const texture = document.createElement('canvas');
    texture.width = width;
    texture.height = Math.round(height * scale);
    const target = texture.getContext('2d')!;
    target.imageSmoothingEnabled = false;
    target.drawImage(patch, 0, 0, patch.width * scale, height * scale);
    return texture;
  }
  if (level === 2) {
    const scale = 0.8,
      height = 74,
      sourceTop = 736;
    const patch = document.createElement('canvas');
    patch.width = Math.ceil(width / scale);
    patch.height = height;
    const ctx = patch.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(
      source,
      Math.min(1200 - patch.width, variant * 225),
      sourceTop,
      patch.width,
      height,
      0,
      0,
      patch.width,
      height,
    );
    const pixels = ctx.getImageData(0, 0, patch.width, height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < patch.width; x++) {
        const i = (y * patch.width + x) * 4,
          bottom = height - 7 + ((Math.floor(x / 12) + variant) % 6);
        const inset = y > 30 ? Math.floor((y - 30) / 8) : 0;
        const grass =
          pixels.data[i] > 80 &&
          pixels.data[i + 1] > 70 &&
          pixels.data[i + 2] < pixels.data[i + 1] * 0.8;
        if (
          (y < 4 && !grass) ||
          y >= bottom ||
          x < inset ||
          x >= patch.width - inset
        )
          pixels.data[i + 3] = 0;
      }
    ctx.putImageData(pixels, 0, 0);
    const texture = document.createElement('canvas');
    texture.width = width;
    texture.height = Math.round(height * scale);
    const target = texture.getContext('2d')!;
    target.imageSmoothingEnabled = false;
    target.drawImage(patch, 0, 0, patch.width * scale, height * scale);
    return texture;
  }
  const patch = document.createElement('canvas');
  patch.width = Math.ceil(width / BAMBOO_SCALE);
  patch.height = SOURCE_HEIGHT;
  const ctx = patch.getContext('2d', { willReadFrequently: true })!;
  const sourceX = SOURCE_X[variant % SOURCE_X.length];
  ctx.drawImage(
    source,
    sourceX,
    SOURCE_TOP,
    patch.width,
    SOURCE_HEIGHT,
    0,
    0,
    patch.width,
    SOURCE_HEIGHT,
  );
  const pixels = ctx.getImageData(0, 0, patch.width, patch.height);
  const { data } = pixels;

  // Retain only moss connected to the collision surface, not scenery above it.
  const fringeRows = 4;
  const connected = new Uint8Array(patch.width * (fringeRows + 1));
  const queue: number[] = [];
  const addGrass = (x: number, y: number) => {
    if (x < 0 || x >= patch.width || y < 0 || y > fringeRows) return;
    const n = y * patch.width + x,
      p = n * 4;
    if (connected[n]) return;
    const r = data[p],
      g = data[p + 1],
      b = data[p + 2];
    if (g < 55 || r < 35 || b > g * 0.8 || g < r * 0.82) return;
    connected[n] = 1;
    queue.push(n);
  };
  for (let x = 0; x < patch.width; x++) addGrass(x, fringeRows);
  for (let head = 0; head < queue.length; head++) {
    const n = queue[head],
      x = n % patch.width,
      y = Math.floor(n / patch.width);
    addGrass(x - 1, y);
    addGrass(x + 1, y);
    addGrass(x, y - 1);
    addGrass(x, y + 1);
  }

  // Cut the existing rock texture into a shallow, chipped ledge. No painted
  // brown backing or stretched stones: every retained pixel is from the scene.
  const underside = [31, 30, 28, 32, 29, 33, 31, 29, 32, 28, 30, 33];
  for (let y = 0; y < patch.height; y++) {
    const inset = y < 16 ? 0 : 1 + Math.floor((y - 16) / 6);
    for (let x = 0; x < patch.width; x++) {
      const n = y * patch.width + x;
      const bottom =
        underside[(Math.floor(x / 8) + variant * 3) % underside.length];
      if (
        (y < fringeRows && !connected[n]) ||
        x < inset ||
        x >= patch.width - inset ||
        y >= bottom
      )
        data[n * 4 + 3] = 0;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = document.createElement('canvas');
  texture.width = width;
  texture.height = Math.round(SOURCE_HEIGHT * BAMBOO_SCALE);
  const textureCtx = texture.getContext('2d')!;
  textureCtx.imageSmoothingEnabled = false;
  // Bake at the ground's exact scale once; never resize to fit a platform.
  textureCtx.drawImage(patch, 0, 0, patch.width * BAMBOO_SCALE, texture.height);
  return texture;
}

export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  texture: HTMLCanvasElement,
  x: number,
  surfaceY: number,
  surfaceOffset = PLATFORM_SURFACE_OFFSET,
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(texture, Math.round(x), Math.round(surfaceY - surfaceOffset));
  ctx.restore();
}
