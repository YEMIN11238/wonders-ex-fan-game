import { GROUND_Y, VIEW_H } from './world';
import type { LevelId } from './levels';

// Preserve every source pixel, including the uneven grass tips. Both pieces use
// one scale and one world-space scroll, so buildings/roots stay joined to soil.
export const BAMBOO_SCALE = GROUND_Y / 256;
export const BAMBOO_SURFACE_OFFSET = 4 * BAMBOO_SCALE;
export const RUINS_SCALE = GROUND_Y / (290 - 44);

function crop(
  source: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  scale = BAMBOO_SCALE,
) {
  const tile = document.createElement('canvas');
  tile.width = Math.round(w * scale);
  tile.height = Math.round(h * scale);
  const ctx = tile.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // Scale once, then scroll whole pixels to avoid fractional-scale shimmer.
  ctx.drawImage(source, x, y, w, h, 0, 0, tile.width, tile.height);
  return tile;
}

export function createScenery(source: HTMLImageElement, level: LevelId = 1) {
  if (level === 4) {
    const background = crop(source, 0, 44, 637, 240, RUINS_SCALE);
    return {
      background,
      ground: crop(source, 0, 284, 637, 50, RUINS_SCALE),
      backgroundY: 0,
      groundOffset: GROUND_Y - background.height,
    };
  }
  if (level === 3) {
    const scale = 960 / 735;
    const stone = crop(source, 0, 358, 735, 56, scale);
    const ground = document.createElement('canvas');
    ground.width = stone.width;
    ground.height = Math.ceil(VIEW_H - GROUND_Y + 2 * scale);
    const ctx = ground.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    // Continue the dark soil, excluding the source image's pale last-row border.
    ctx.fillStyle = '#120717';
    ctx.fillRect(0, 0, ground.width, ground.height);
    ctx.drawImage(stone, 0, 0);
    return {
      background: crop(source, 0, 0, 735, 358, scale),
      ground,
      backgroundY: GROUND_Y - 360 * scale,
      groundOffset: 2 * scale,
    };
  }
  if (level === 2)
    return {
      background: crop(source, 0, 0, 1200, 736, 0.8),
      ground: crop(source, 0, 736, 1200, 128, 0.8),
      backgroundY: GROUND_Y - 740 * 0.8,
      groundOffset: 4 * 0.8,
    };
  return {
    backgroundY: 0,
    groundOffset: GROUND_Y - Math.round(252 * BAMBOO_SCALE),
    background: crop(source, 0, 0, 785, 252),
    ground: crop(source, 0, 252, 785, 101),
  };
}

// Adjacent mirrored tiles share the same edge pixels without gaps or blending.
function drawTiles(
  ctx: CanvasRenderingContext2D,
  tile: HTMLCanvasElement,
  scale: number,
  scroll: number,
  y: number,
  viewWidth: number,
) {
  const width = tile.width * scale,
    height = tile.height * scale;
  const first = Math.floor(scroll / width);
  for (let index = first; index * width - scroll < viewWidth; index++) {
    const x = index * width - scroll;
    ctx.save();
    ctx.translate(x + (index % 2 ? width : 0), y);
    ctx.scale(index % 2 ? -1 : 1, 1);
    ctx.drawImage(tile, 0, 0, width, height);
    ctx.restore();
  }
}

export function drawScenery(
  ctx: CanvasRenderingContext2D,
  scenery: ReturnType<typeof createScenery>,
  camera: number,
  groundY: number,
  viewWidth: number,
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawTiles(ctx, scenery.background, 1, camera, scenery.backgroundY, viewWidth);
  // Terrain uses the exact same camera translation as platforms and characters.
  // Never apply background parallax to the walkable ground.
  drawTiles(
    ctx,
    scenery.ground,
    1,
    camera,
    groundY - scenery.groundOffset,
    viewWidth,
  );
  ctx.restore();
}
