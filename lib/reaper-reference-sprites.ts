import { decodeGif, type GifFrame } from './gif-frames';
import { drawSprite, sampleAnimation, type SpriteFrame } from './sprites';
import {
  REAPER_BEAM,
  REAPER_SCALE,
  REAPER_TIMING,
  reaperBeamOrigin,
  reaperCasting,
  reaperTeleportX,
} from './reaper-attacks';
import type { Enemy } from './combat';

type Rect = [number, number, number, number];
function gifSprite(
  frame: GifFrame,
  rect: Rect,
  anchor: [number, number],
  matte: number,
  baseline?: GifFrame,
  removeSwatch?: GifFrame,
): SpriteFrame {
  const [x, y, w, h] = rect,
    image = document.createElement('canvas');
  image.width = w;
  image.height = h;
  const ctx = image.getContext('2d')!,
    pixels = ctx.createImageData(w, h);
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const sx = x + xx,
        sy = y + yy,
        p = (sy * frame.width + sx) * 4,
        out = (yy * w + xx) * 4;
      const r = frame.data[p],
        g = frame.data[p + 1],
        b = frame.data[p + 2];
      const same = (other: GifFrame) =>
        r === other.data[p] &&
        g === other.data[p + 1] &&
        b === other.data[p + 2];
      if (
        Math.max(
          Math.abs(r - matte),
          Math.abs(g - matte),
          Math.abs(b - matte),
        ) <= 1 ||
        (baseline && same(baseline)) ||
        (removeSwatch &&
          sx >= 118 &&
          sx < 162 &&
          sy >= 221 &&
          sy < 243 &&
          same(removeSwatch))
      )
        continue;
      pixels.data[out] = r;
      pixels.data[out + 1] = g;
      pixels.data[out + 2] = b;
      pixels.data[out + 3] = frame.data[p + 3];
    }
  ctx.putImageData(pixels, 0, 0);
  return { image, x: anchor[0] - x, y: anchor[1] - y, ms: frame.ms };
}
const duration = (frame: SpriteFrame, ms: number) => ({ ...frame, ms });

// The source's sample swatch overlaps only the faint lower glow of frame 4.
// Reconstruct that small halo from its clean boundary; never crop the crescent.
function cleanScytheSwatch(frame: GifFrame): GifFrame {
  const width = 46,
    height = 24,
    size = width * height * 3;
  let current = new Float32Array(size),
    next = new Float32Array(size);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 3; c++) {
        const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
        const value = edge
          ? frame.data[((y + 220) * frame.width + x + 117) * 4 + c]
          : 52;
        current[(y * width + x) * 3 + c] = value;
        next[(y * width + x) * 3 + c] = value;
      }
  for (let pass = 0; pass < 160; pass++) {
    for (let y = 1; y < height - 1; y++)
      for (let x = 1; x < width - 1; x++)
        for (let c = 0; c < 3; c++) {
          const p = (y * width + x) * 3 + c;
          next[p] =
            (current[p - 3] +
              current[p + 3] +
              current[p - width * 3] +
              current[p + width * 3] +
              0.16 * 52) /
            4.16;
        }
    [current, next] = [next, current];
  }
  const data = frame.data.slice();
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++)
      for (let c = 0; c < 3; c++)
        data[((y + 220) * frame.width + x + 117) * 4 + c] = Math.round(
          current[(y * width + x) * 3 + c],
        );
  return { ...frame, data };
}

export async function loadReaperReferences() {
  const [scythe, teleport, cast, hurt] = await Promise.all(
    ['scythe', 'teleport', 'cast', 'hurt'].map(async (name) => {
      const response = await fetch(`/assets/reaper-${name}.gif`);
      if (!response.ok) throw new Error(`Cannot load reaper ${name}`);
      return decodeGif(await response.arrayBuffer());
    }),
  );
  if (
    scythe.length !== 8 ||
    teleport.length !== 14 ||
    cast.length !== 20 ||
    hurt.length !== 16
  )
    throw new Error('Unexpected reference animation');
  const idle = hurt
    .slice(0, 4)
    .map((f) => gifSprite(f, [38, 30, 140, 175], [140, 201], 176));
  const swing = scythe.map((f, index) =>
    gifSprite(
      index === 4 ? cleanScytheSwatch(f) : f,
      [0, 0, 298, 244],
      [140, 205],
      52,
      undefined,
      scythe[0],
    ),
  );
  const blink = teleport.map((f, index) => {
    // Fade the original clear pose instead of baking its dark matte into edges.
    const source = index >= 2 && index <= 4 ? teleport[0] : f;
    return gifSprite(
      source,
      [0, 0, 356, 220],
      index < 8 ? [226, 209] : [128, 209],
      59,
    );
  });
  const bare = [cast[0], cast[1], cast[2], cast[11]];
  const castBody = bare.map((f) =>
    gifSprite(f, [8, 300, 158, 188], [100, 488], 58),
  );
  const beamRects: Rect[] = [
    [123, 316, 121, 159],
    [117, 308, 343, 174],
    [117, 302, 343, 186],
    [118, 300, 342, 189],
    [131, 336, 329, 120],
    [134, 348, 212, 86],
    [134, 368, 100, 52],
  ];
  const pillarRects: Rect[] = [
    [235, 406, 161, 120],
    [226, 2, 176, 524],
    [214, 2, 202, 524],
    [202, 2, 226, 528],
    [244, 2, 142, 528],
    [262, 306, 106, 220],
    [278, 416, 72, 110],
  ];
  return {
    idle,
    hurt: hurt
      .slice(8)
      .map((f) => gifSprite(f, [44, 23, 132, 166], [140, 201], 176)),
    sweep: [
      duration(idle[0], REAPER_TIMING.sweepLead),
      ...swing,
      duration(idle[0], 260),
    ],
    teleport: [...blink, duration(idle[0], 360)],
    cast: castBody,
    beam: beamRects.map((rect, n) =>
      gifSprite(cast[n + 3], rect, [160, 395], 58, bare[(n + 3) % 4]),
    ),
    pillar: pillarRects.map((rect, n) =>
      gifSprite(cast[n + 12], rect, [314.5, 526], 58, bare[(n + 12) % 4]),
    ),
  };
}
export type ReaperReferences = Awaited<ReturnType<typeof loadReaperReferences>>;

export function reaperPose(
  sprites: ReaperReferences,
  enemy: Enemy,
  time: number,
) {
  const age = time - enemy.attackStartedAt;
  let frame: SpriteFrame,
    alpha = 1;
  if (enemy.hp <= 0) frame = sprites.hurt[1];
  else if (reaperCasting(enemy, time)) {
    if (enemy.attackVariant === 'punch')
      frame = sampleAnimation(sprites.sweep, age);
    else if (enemy.attackVariant === 'slam') {
      frame = sampleAnimation(sprites.teleport, age);
      const index = Math.floor(age / 90);
      if (index >= 2 && index <= 4) alpha = [0.7, 0.4, 0.2][index - 2];
      if (index >= 5 && index <= 7) alpha = 0;
    } else frame = sampleAnimation(sprites.cast, age, true);
  } else if (time < enemy.hurtUntil)
    frame = sampleAnimation(sprites.hurt, time - (enemy.hurtUntil - 360));
  else frame = sampleAnimation(sprites.idle, time, true);
  return { frame, alpha };
}

export function drawReaperEffects(
  ctx: CanvasRenderingContext2D,
  sprites: ReaperReferences,
  enemy: Enemy,
  time: number,
  camera: number,
) {
  if (!reaperCasting(enemy, time)) return;
  const age = time - enemy.attackStartedAt;
  ctx.save();
  const pillar = enemy.attackVariant === 'volley';
  if ((pillar && age < 740) || (enemy.attackVariant === 'slam' && age < 720)) {
    const x = pillar ? enemy.aimX : reaperTeleportX(enemy);
    ctx.globalAlpha = 0.3 + 0.35 * Math.min(1, age / 720);
    ctx.strokeStyle = '#ffe2a0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(
      x - camera,
      enemy.floorY - 3,
      pillar ? 74 : 42,
      9,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (enemy.attackVariant === 'shot') {
    const effectAge = age - REAPER_TIMING.beamLead - 270;
    if (effectAge >= 0 && effectAge < 630) {
      const frame = sampleAnimation(sprites.beam, effectAge),
        origin = reaperBeamOrigin(enemy);
      ctx.translate(origin.x - camera, origin.y);
      ctx.scale(enemy.attackFacing * REAPER_BEAM.scaleX, REAPER_BEAM.scaleY);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame.image, -frame.x, -frame.y);
    }
  }
  if (pillar) {
    const effectAge = age - REAPER_TIMING.pillarLead;
    if (effectAge >= 0 && effectAge < 630)
      drawSprite(
        ctx,
        sampleAnimation(sprites.pillar, effectAge),
        enemy.aimX - camera,
        enemy.floorY,
        REAPER_SCALE,
        1,
      );
  }
  ctx.restore();
}
