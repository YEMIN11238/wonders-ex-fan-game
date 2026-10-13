import { drawSprite, sampleAnimation, type SpriteFrame } from './sprites';
import {
  DRILL_PROJECTILE_SCALE,
  DRILL_TIMING,
  drillLandings,
  drillShots,
} from './drill-projectiles';
import type { Enemy } from './combat';

type Spec = [number, number, number, number, number, number, number];
function frames(
  sheet: HTMLImageElement,
  specs: Spec[],
  boss = false,
): SpriteFrame[] {
  return specs.map(([x, y, w, h, footX, footY, ms]) => {
    const image = document.createElement('canvas');
    // Padding separates every exterior matte region from the crop boundaries.
    image.width = w + 4;
    image.height = h + 4;
    const ctx = image.getContext('2d')!;
    ctx.drawImage(sheet, x - 2, y - 2, w + 4, h + 4, 0, 0, w + 4, h + 4);
    const pixels = ctx.getImageData(0, 0, image.width, image.height),
      d = pixels.data;
    if (boss) {
      for (let i = 0; i < d.length; i += 4) {
        const distance = Math.max(
          Math.abs(d[i] - 176),
          Math.abs(d[i + 1] - 176),
          Math.abs(d[i + 2] - 176),
        );
        d[i + 3] = Math.round(
          255 * Math.max(0, Math.min(1, (distance - 8) / 12)),
        );
      }
    } else {
      const seen = new Uint8Array(image.width * image.height),
        queue: number[] = [];
      const add = (i: number) => {
        const p = i * 4,
          r = d[p],
          g = d[p + 1],
          b = d[p + 2];
        if (
          seen[i] ||
          Math.max(r, g, b) - Math.min(r, g, b) > 28 ||
          Math.max(Math.abs(r - 176), Math.abs(g - 176), Math.abs(b - 176)) > 48
        )
          return;
        seen[i] = 1;
        queue.push(i);
      };
      for (let xx = 0; xx < image.width; xx++) {
        add(xx);
        add((image.height - 1) * image.width + xx);
      }
      for (let yy = 0; yy < image.height; yy++) {
        add(yy * image.width);
        add(yy * image.width + image.width - 1);
      }
      for (let head = 0; head < queue.length; head++) {
        const i = queue[head],
          xx = i % image.width,
          yy = Math.floor(i / image.width);
        d[i * 4 + 3] = 0;
        if (xx > 0) add(i - 1);
        if (xx < image.width - 1) add(i + 1);
        if (yy > 0) add(i - image.width);
        if (yy < image.height - 1) add(i + image.width);
      }
    }
    ctx.putImageData(pixels, 0, 0);
    return { image, x: footX + 2, y: footY + 2, ms };
  });
}
const timed = (spec: Spec, ms: number): Spec =>
  [...spec.slice(0, 6), ms] as Spec;

export function createSpikeSprites(sheet: HTMLImageElement) {
  function variant(gold: boolean) {
    const idle: Spec[] = gold
      ? [
          [29, 299, 66, 36, 28, 36, 180],
          [130, 297, 66, 38, 28, 38, 140],
          [237, 299, 66, 36, 27, 36, 180],
          [339, 297, 66, 38, 26, 38, 140],
        ]
      : [
          [25, 36, 66, 36, 28, 36, 180],
          [128, 34, 66, 38, 28, 38, 140],
          [229, 36, 66, 36, 27, 36, 180],
          [339, 34, 66, 38, 26, 38, 140],
        ];
    const spin: Spec[] = gold
      ? [
          [36, 375, 52, 54, 26, 54, 110],
          [137, 375, 52, 54, 26, 54, 110],
        ]
      : [
          [25, 113, 52, 54, 26, 54, 110],
          [137, 113, 52, 54, 26, 54, 110],
        ];
    return {
      idle: frames(sheet, idle),
      walk: frames(
        sheet,
        idle.map((s) => timed(s, 110)),
      ),
      attack: frames(sheet, [
        timed(idle[0], 180),
        ...spin,
        ...spin,
        timed(idle[0], 100),
      ]),
      death: frames(
        sheet,
        gold
          ? [[29, 468, 74, 50, 28, 50, 600]]
          : [[25, 210, 74, 50, 28, 50, 600]],
      ),
    };
  }
  return { spike: variant(false), spikeGold: variant(true) };
}

export function createDrillBossSprites(sheet: HTMLImageElement) {
  const idle: Spec[] = [
    [16, 17, 164, 126, 76, 124, 140],
    [220, 18, 160, 125, 70, 123, 140],
    [418, 18, 158, 125, 66, 121, 140],
    [22, 166, 158, 126, 68, 122, 140],
  ];
  const windup: Spec[] = [
    [16, 310, 164, 126, 76, 124, 90],
    [219, 309, 160, 128, 68, 126, 90],
    [416, 310, 158, 128, 63, 126, 80],
    [22, 454, 158, 130, 66, 128, 120],
    [214, 446, 138, 142, 67, 140, 150],
  ];
  const forward: Spec[] = [
    [7, 601, 190, 135, 88, 132, 140],
    [198, 597, 190, 141, 90, 136, 160],
    [390, 619, 206, 110, 72, 108, 360],
  ];
  const double: Spec[] = [
    [7, 840, 140, 164, 76, 162, 150],
    [188, 834, 140, 170, 78, 168, 200],
    [364, 894, 206, 110, 72, 108, 420],
  ];
  return {
    idle: frames(sheet, idle, true),
    shot: frames(
      sheet,
      [
        ...windup.slice(0, 3),
        ...forward,
        timed(forward[0], 160),
        timed(idle[0], 400),
      ],
      true,
    ),
    volley: frames(
      sheet,
      [
        ...windup.slice(3),
        timed(double[0], 220),
        // Both releases (620/780 ms) occur with the drills visibly raised.
        timed(double[1], 440),
        timed(double[2], 420),
        timed(idle[0], DRILL_TIMING.volleyDuration - 1350),
      ],
      true,
    ),
    horizontal: frames(
      sheet,
      [
        [20, 759, 196, 55, 194, 28, 70],
        [243, 760, 137, 53, 135, 27, 90],
      ],
      true,
    ),
    diagonal: frames(
      sheet,
      [
        [22, 1040, 137, 113, 129, 107, 70],
        [224, 1090, 77, 62, 73, 58, 90],
      ],
      true,
    ),
  };
}

export function drawDrillAttack(
  ctx: CanvasRenderingContext2D,
  sprites: ReturnType<typeof createDrillBossSprites>,
  enemy: Enemy,
  time: number,
  camera: number,
) {
  if (enemy.hp <= 0) return;
  const age = time - enemy.attackStartedAt,
    windup = DRILL_TIMING.shotRelease;
  if (enemy.attackVariant !== 'volley' && age >= 0 && age < windup) {
    ctx.save();
    ctx.strokeStyle = `rgba(117,241,235,${0.25 + (0.45 * age) / windup})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(
      enemy.aimX - camera,
      enemy.floorY - 3,
      32,
      7,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }
  for (const landing of drillLandings(enemy, time)) {
    ctx.save();
    const impacted = landing.remaining <= 0;
    const fade = impacted ? 1 + landing.remaining / 160 : 1;
    ctx.strokeStyle = `rgba(117,241,235,${fade * (0.3 + 0.55 * landing.progress)})`;
    ctx.lineWidth = landing.remaining < 260 ? 3 : 2;
    if (!impacted) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(
      landing.x - camera,
      landing.y - 3,
      impacted ? 18 + (1 - fade) * 25 : 24,
      impacted ? 6 + (1 - fade) * 8 : 6,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }
  for (const shot of drillShots(enemy, time)) {
    const frame = sampleAnimation(
      shot.diagonal ? sprites.diagonal : sprites.horizontal,
      shot.age,
      true,
    );
    ctx.save();
    ctx.translate(shot.x - camera, shot.y);
    ctx.rotate(shot.angle - (shot.diagonal ? Math.PI / 4 : 0));
    drawSprite(ctx, frame, 0, 0, DRILL_PROJECTILE_SCALE, 1);
    ctx.restore();
  }
}
