import type { SpriteFrame } from './sprites';
import { removeBossWhiteFringe } from './sprite-matte';
import { enemyAttack, type Enemy } from './combat';
type Spec = [number, number, number, number, number, number, number];
function frames(
  sheet: HTMLImageElement,
  specs: Spec[],
  gray = false,
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
      if (gray) {
        const distance = Math.max(
          Math.abs(d[i] - 176),
          Math.abs(d[i + 1] - 176),
          Math.abs(d[i + 2] - 176),
        );
        d[i + 3] = Math.round(
          255 * Math.max(0, Math.min(1, (distance - 22) / 20)),
        );
      } else if (Math.min(d[i], d[i + 1], d[i + 2]) > 225) d[i + 3] = 0;
    }
    if (!gray) removeBossWhiteFringe(pixels, true);
    ctx.putImageData(pixels, 0, 0);
    return { image, x: footX, y: footY, ms };
  });
}
export function createBirdSprites(sheet: HTMLImageElement) {
  function bird(red: boolean) {
    const idle: Spec[] = red
      ? [
          [34, 365, 72, 70, 48, 70, 180],
          [149, 363, 78, 72, 52, 72, 140],
          [267, 363, 78, 72, 49, 72, 180],
          [383, 363, 72, 72, 45, 72, 140],
        ]
      : [
          [33, 34, 72, 70, 48, 70, 180],
          [147, 32, 78, 72, 52, 72, 140],
          [267, 32, 78, 72, 49, 72, 180],
          [383, 32, 72, 72, 45, 72, 140],
        ];
    const attack: Spec[] = red
      ? [
          [42, 476, 58, 66, 32, 66, 200],
          [147, 482, 110, 60, 48, 60, 80],
          [290, 482, 110, 60, 49, 60, 80],
          [42, 476, 58, 66, 32, 66, 220],
        ]
      : [
          [42, 148, 58, 66, 32, 66, 200],
          [147, 154, 110, 60, 48, 60, 80],
          [290, 154, 110, 60, 49, 60, 80],
          [42, 148, 58, 66, 32, 66, 220],
        ];
    const hurt: Spec[] = red
      ? [[34, 581, 76, 80, 42, 80, 600]]
      : [[33, 248, 76, 80, 42, 80, 600]];
    return {
      idle: frames(sheet, idle, true),
      walk: frames(
        sheet,
        idle.map((s) => [s[0], s[1], s[2], s[3], s[4], s[5], 110]),
        true,
      ),
      attack: frames(sheet, attack, true),
      hurt: frames(sheet, hurt, true),
      death: frames(sheet, hurt, true),
    };
  }
  return { bird: bird(false), birdRed: bird(true) };
}
export function createGolemSprites(sheet: HTMLImageElement) {
  return {
    idle: frames(sheet, [
      [66, 5, 71, 78, 39, 77, 180],
      [139, 5, 71, 78, 39.5, 77, 180],
      [213, 5, 71, 78, 39, 77, 180],
      [139, 5, 71, 78, 39.5, 77, 180],
    ]),
    walk: frames(sheet, [
      [63, 86, 64, 78, 39.5, 77, 120],
      [129, 86, 62, 77, 36.5, 76, 120],
      [193, 84, 61, 80, 31.5, 79, 120],
      [254, 84, 65, 80, 32.5, 79, 120],
      [318, 86, 68, 77, 34.5, 76, 120],
    ]),
    punch: frames(sheet, [
      [66, 5, 71, 78, 39, 77, 130],
      [63, 258, 75, 73, 38, 72, 230],
      [140, 261, 82, 70, 43, 69, 170],
      [63, 258, 75, 73, 38, 72, 320],
    ]),
    slam: frames(sheet, [
      [298, 243, 68, 89, 35.5, 88, 200],
      [370, 245, 68, 86, 26, 85, 200],
      [444, 245, 66, 86, 25.5, 85, 220],
      [518, 255, 74, 76, 27, 75, 220],
      [66, 5, 71, 78, 39, 77, 340],
    ]),
    hurt: frames(sheet, [
      [71, 339, 70, 71, 34.5, 70, 100],
      [147, 340, 63, 70, 30, 69, 130],
    ]),
    death: frames(sheet, [
      [299, 350, 66, 59, 32, 58, 130],
      [366, 351, 76, 59, 35.5, 58, 120],
      [443, 344, 78, 66, 37, 65, 140],
      [525, 355, 90, 56, 42, 55, 900],
    ]),
  };
}
export function drawGolemWarning(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  time: number,
  camera: number,
) {
  const age = time - e.attackStartedAt,
    move = enemyAttack(e);
  if (e.hp <= 0 || age < 0 || age > move.activeEnd + 200) return;
  const slam = e.attackVariant === 'slam';
  ctx.save();
  if (age < move.activeStart) {
    const x = e.x - camera + (e.attackFacing > 0 ? 0 : -move.range);
    ctx.fillStyle = `rgba(245,120,58,${0.12 + Math.min(1, age / move.activeStart) * 0.12})`;
    ctx.fillRect(x, e.floorY - 7, move.range, 7);
    ctx.strokeStyle = '#ffd58a';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(x, e.floorY - 7);
    ctx.lineTo(x + move.range, e.floorY - 7);
    ctx.stroke();
  } else if (slam) {
    const t =
      (age - move.activeStart) / (move.activeEnd + 200 - move.activeStart);
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = '#ffe4ad';
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.beginPath();
    ctx.ellipse(
      e.x - camera + e.attackFacing * 120,
      e.floorY,
      40 + t * 100,
      8 + t * 18,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.restore();
}
