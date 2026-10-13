import { grayFrames, withDuration, type FrameSpec } from './gray-sheet';
import { drawSprite, sampleAnimation } from './sprites';
import type { Enemy } from './combat';
import {
  oracleHand,
  oracleProjectiles,
  ORACLE_HAND_RISE,
  ORACLE_HAND_END,
} from './oracle-attacks';

export function createOracleSprites(sheet: HTMLImageElement) {
  const idle: FrameSpec[] = [
    [37, 16, 92, 256, 62.5, 256, 180],
    [199, 17, 89, 253, 58.5, 253, 180],
    [37, 309, 92, 254, 62.5, 254, 180],
    [199, 309, 90, 252, 58.5, 252, 180],
  ];
  const rocks: FrameSpec[] = [
    [20, 592, 170, 141, 85, 70.5, 120],
    [213, 608, 136, 107, 68, 53.5, 120],
    [373, 617, 106, 91, 53, 45.5, 120],
    [500, 616, 86, 91, 43, 45.5, 180],
  ];
  return {
    idle: grayFrames(sheet, idle),
    cast: grayFrames(sheet, [
      withDuration(idle[0], 200),
      withDuration(idle[1], 260),
      [329, 306, 147, 255, 116.5, 255, 720],
      withDuration(idle[0], 240),
    ]),
    summon: grayFrames(sheet, [
      withDuration(idle[0], 180),
      [28, 769, 126, 254, 96.5, 254, 260],
      [181, 769, 124, 252, 94.5, 252, 320],
      [315, 768, 138, 255, 108.5, 255, 560],
      withDuration(idle[0], 200),
    ]),
    blueCards: grayFrames(sheet, [
      [373, 11, 95, 56, 21, 28, 90],
      [371, 83, 57, 58, 23, 29, 90],
      [371, 153, 48, 56, 23, 28, 90],
      [373, 225, 43, 50, 21, 25, 90],
    ]),
    redCards: grayFrames(sheet, [
      [492, 11, 95, 56, 21, 28, 90],
      [491, 83, 56, 58, 22, 29, 90],
      [491, 153, 46, 56, 22, 28, 90],
      [492, 225, 40, 50, 21, 25, 90],
    ]),
    hands: grayFrames(sheet, [
      [28, 1216, 62, 64, 36, 64, 120],
      [117, 1137, 106, 143, 62, 143, 120],
      [256, 1168, 111, 112, 80, 112, 240],
    ]),
    circles: grayFrames(sheet, [
      [38, 1085, 55, 21, 27.5, 10.5, 130],
      [123, 1082, 77, 24, 38.5, 12, 130],
      [230, 1074, 99, 32, 49.5, 16, 130],
      [353, 1077, 100, 27, 50, 13.5, 130],
      [496, 1078, 58, 23, 29, 11.5, 130],
    ]),
    rocks: grayFrames(sheet, rocks),
    death: grayFrames(sheet, [...rocks].reverse()),
    heldCards: grayFrames(sheet, [
      [482, 944, 44, 54, 22, 54, 150],
      [541, 943, 46, 56, 23, 56, 150],
    ]),
    risingStone: grayFrames(sheet, [
      [492, 768, 78, 79, 39, 0, 140],
      [497, 880, 78, 30, 39, 0, 140],
    ]),
    blueFlash: grayFrames(sheet, [
      [514, 307, 59, 48, 29.5, 24, 90],
      [525, 355, 36, 32, 18, 16, 90],
      [531, 400, 24, 12, 12, 6, 90],
    ]),
    redFlash: grayFrames(sheet, [
      [514, 436, 58, 48, 29, 24, 90],
      [525, 497, 36, 24, 18, 12, 90],
      [531, 541, 23, 14, 11.5, 7, 90],
    ]),
  };
}

export function drawOracleAttack(
  ctx: CanvasRenderingContext2D,
  sprites: ReturnType<typeof createOracleSprites>,
  enemy: Enemy,
  time: number,
  camera: number,
) {
  const age = time - enemy.attackStartedAt;
  if (enemy.hp <= 0 || age < 0 || age > 1520) return;
  const facing = enemy.attackFacing;
  if (enemy.attackVariant === 'slam') {
    const x = enemy.aimX - camera;
    const hand = oracleHand(enemy, time);
    if (age < ORACLE_HAND_END) {
      // The marker is fixed at the original target; walking away avoids the hand.
      drawSprite(
        ctx,
        sampleAnimation(sprites.circles, age, true),
        x,
        enemy.floorY - 2,
        1.35,
        1,
        age < ORACLE_HAND_RISE ? 0.55 + (0.4 * age) / ORACLE_HAND_RISE : 1,
      );
      if (hand)
        drawSprite(
          ctx,
          sprites.hands[hand.frame],
          x,
          enemy.floorY,
          1.1,
          -facing,
          Math.min(1, (ORACLE_HAND_END - age) / 180),
        );
    }
    if (age >= 440 && age < 1100) {
      const handX = enemy.x - camera + facing * 68;
      drawSprite(
        ctx,
        sampleAnimation(sprites.heldCards, age, true),
        handX,
        enemy.y - 123,
        0.8,
        -facing,
      );
      if (age >= 760)
        drawSprite(
          ctx,
          sampleAnimation(sprites.risingStone, age - 760),
          handX,
          enemy.y - 110,
          0.8,
          -facing,
        );
    }
  } else {
    const blue = enemy.attackVariant === 'volley';
    if (age < 460) {
      drawSprite(
        ctx,
        sampleAnimation(blue ? sprites.blueFlash : sprites.redFlash, age, true),
        enemy.x - camera + facing * 54,
        enemy.y - 150,
        0.9,
        1,
      );
      if (blue && age > 100)
        drawSprite(
          ctx,
          sampleAnimation(sprites.rocks, age - 100),
          enemy.x - camera + facing * 83,
          enemy.y - 125,
          0.55,
          1,
        );
    }
    for (const shot of oracleProjectiles(enemy, time)) {
      ctx.save();
      ctx.translate(shot.x - camera, shot.y);
      ctx.rotate(shot.angle);
      drawSprite(
        ctx,
        shot.rock
          ? sprites.rocks[3]
          : sampleAnimation(
              shot.blue ? sprites.blueCards : sprites.redCards,
              shot.age,
              true,
            ),
        0,
        0,
        0.85,
        -1,
      );
      ctx.restore();
    }
  }
}
