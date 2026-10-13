import { grayFrames, withDuration, type FrameSpec } from './gray-sheet';
import { drawSprite, sampleAnimation } from './sprites';
import { ruinsProjectile } from './ruins-attacks';
import type { Enemy } from './combat';

export function createRuinsMobs(
  horses: HTMLImageElement,
  imps: HTMLImageElement,
) {
  const variant = (
    sheet: HTMLImageElement,
    idle: FrameSpec[],
    attack: FrameSpec[],
    hurt: FrameSpec,
  ) => ({
    idle: grayFrames(sheet, idle),
    walk: grayFrames(
      sheet,
      idle.map((s) => withDuration(s, 110)),
    ),
    attack: grayFrames(sheet, [...attack, withDuration(idle[0], 160)]),
    hurt: grayFrames(sheet, [hurt]),
    death: grayFrames(sheet, [withDuration(hurt, 600)]),
  });
  return {
    horse: variant(
      horses,
      [
        [16, 26, 126, 88, 60, 88, 160],
        [160, 30, 126, 84, 60, 84, 160],
        [312, 24, 128, 90, 57, 90, 160],
        [459, 29, 125, 85, 56, 85, 160],
      ],
      [
        [17, 184, 165, 59, 65, 57, 300],
        [212, 131, 128, 115, 30, 110, 100],
        [372, 131, 90, 115, 30, 110, 170],
      ],
      [21, 280, 107, 83, 55, 83, 180],
    ),
    horseBlue: variant(
      horses,
      [
        [20, 392, 124, 95, 56, 91, 160],
        [165, 400, 123, 87, 55, 83, 160],
        [312, 393, 120, 91, 57, 90, 160],
        [458, 400, 125, 85, 57, 83, 160],
      ],
      [
        [22, 552, 156, 63, 60, 58, 300],
        [211, 504, 129, 106, 31, 106, 100],
        [371, 504, 92, 106, 31, 106, 170],
      ],
      [21, 651, 107, 81, 55, 81, 180],
    ),
    imp: variant(
      imps,
      [
        [36, 27, 67, 69, 30, 68, 160],
        [129, 24, 70, 71, 33, 71, 160],
        [234, 27, 70, 69, 34, 68, 160],
        [336, 24, 72, 72, 34, 71, 160],
      ],
      [
        [25, 131, 63, 73, 40, 72, 300],
        [127, 120, 78, 88, 26, 83, 90],
        [231, 136, 80, 72, 26, 67, 150],
      ],
      [35, 232, 69, 72, 41, 70, 180],
    ),
    impMage: variant(
      imps,
      [
        [41, 328, 51, 72, 31, 71, 160],
        [132, 330, 52, 70, 32, 69, 160],
        [234, 331, 54, 68, 34, 68, 160],
        [336, 329, 56, 71, 34, 70, 160],
      ],
      [
        [39, 432, 56, 76, 32, 73, 320],
        [120, 434, 87, 74, 50, 71, 90],
        [240, 448, 60, 60, 24, 57, 150],
      ],
      [42, 532, 54, 70, 40, 70, 180],
    ),
    impBlade: variant(
      imps,
      [
        [40, 640, 68, 65, 34, 65, 160],
        [136, 634, 65, 77, 31, 71, 160],
        [233, 640, 69, 70, 35, 65, 160],
        [342, 633, 66, 75, 29, 72, 160],
      ],
      [
        [32, 738, 62, 75, 39, 75, 300],
        [136, 736, 80, 84, 27, 77, 90],
        [247, 752, 81, 68, 26, 61, 150],
      ],
      [38, 841, 66, 75, 40, 75, 180],
    ),
    fireball: grayFrames(imps, [
      [154, 552, 22, 24, 11, 12, 80],
      [187, 552, 22, 24, 11, 12, 80],
      [226, 552, 22, 24, 11, 12, 80],
      [267, 552, 22, 24, 11, 12, 80],
    ]),
  };
}

export function drawRuinsAttack(
  ctx: CanvasRenderingContext2D,
  sprites: ReturnType<typeof createRuinsMobs>,
  enemy: Enemy,
  time: number,
  camera: number,
) {
  const shot = ruinsProjectile(enemy, time);
  if (!shot) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#ffb73d';
  ctx.shadowBlur = 12;
  drawSprite(
    ctx,
    sampleAnimation(sprites.fireball, shot.age, true),
    shot.x - camera,
    shot.y,
    1.5,
    enemy.attackFacing,
  );
  ctx.restore();
}
