import { SPECIAL_CROPS } from './akuma-special-frames';
import {
  sampleAnimation,
  drawSprite,
  type Animation,
  type SpriteFrame,
} from './sprites';
import {
  AKUMA_SKILLS,
  AKUMA_SCALE,
  type AkumaAction,
  type AkumaState,
  type AkumaPlayer,
} from './akuma';

const BODY_CROPS = {
  idle: [
    [13, 6, 36, 53, 18, 51],
    [53, 6, 36, 53, 18, 51],
    [93, 7, 36, 52, 18, 50],
    [133, 8, 38, 51, 19, 49],
  ],
  walk: [
    [9, 64, 37, 52, 18, 50],
    [53, 64, 33, 52, 16, 50],
    [89, 62, 34, 54, 17, 52],
    [125, 63, 34, 53, 17, 51],
  ],
  run: [
    [310, 66, 42, 50, 24, 48],
    [356, 67, 34, 49, 18, 47],
    [399, 67, 43, 49, 23, 47],
    [449, 67, 37, 49, 20, 47],
  ],
  crouch: [[16, 248, 37, 45, 16, 43]],
  punchLight: [
    [15, 122, 43, 52, 17, 50],
    [59, 122, 54, 52, 17, 50],
  ],
  punchMedium: [
    [126, 125, 43, 49, 19, 47],
    [176, 130, 64, 44, 23, 42],
    [241, 126, 61, 48, 21, 46],
  ],
  punchHeavy: [
    [15, 187, 41, 50, 17, 48],
    [61, 190, 53, 47, 18, 45],
    [117, 193, 59, 44, 27, 42],
  ],
  kick: [
    [333, 123, 35, 51, 15, 49],
    [373, 124, 56, 50, 21, 48],
  ],
  highKick: [
    [457, 128, 44, 46, 26, 44],
    [501, 125, 66, 49, 30, 47],
    [569, 124, 41, 50, 18, 48],
  ],
  spin: [
    [220, 180, 33, 57, 16, 55],
    [259, 185, 30, 48, 16, 50],
    [299, 177, 45, 60, 17, 58],
  ],
  lowPunch: [
    [12, 314, 40, 45, 17, 43],
    [57, 314, 51, 45, 16, 43],
  ],
  lowUppercut: [
    [126, 313, 43, 46, 16, 44],
    [171, 297, 37, 62, 16, 60],
    [212, 308, 44, 51, 16, 49],
  ],
  lowKick: [
    [274, 314, 40, 45, 21, 43],
    [316, 314, 50, 45, 17, 43],
  ],
  sweep: [
    [390, 317, 36, 42, 16, 40],
    [433, 316, 62, 43, 13, 41],
    [501, 316, 36, 43, 18, 41],
    [543, 315, 34, 44, 17, 42],
  ],
  jump: [
    [13, 371, 33, 62, 16, 60],
    [47, 377, 35, 52, 17, 54],
    [86, 371, 36, 62, 17, 60],
  ],
  jumpForward: [
    [180, 371, 33, 62, 16, 60],
    [217, 380, 52, 27, 26, 51],
    [271, 365, 32, 52, 16, 66],
    [307, 377, 58, 29, 29, 54],
    [364, 374, 36, 62, 18, 57],
  ],
  airPunch: [
    [14, 451, 35, 50, 18, 48],
    [54, 452, 46, 47, 20, 47],
    [124, 452, 50, 49, 20, 47],
  ],
  airKickLight: [[197, 452, 35, 48, 17, 47]],
  airKick: [
    [267, 443, 33, 57, 17, 56],
    [310, 440, 45, 60, 16, 59],
  ],
  airHeavy: [
    [377, 445, 53, 50, 18, 54],
    [434, 439, 43, 59, 20, 60],
  ],
  guard: [
    [16, 1216, 33, 46, 16, 45],
    [59, 1213, 37, 49, 19, 48],
  ],
  hurt: [
    [109, 1214, 36, 48, 20, 47],
    [152, 1228, 41, 33, 14, 32],
    [198, 1217, 39, 46, 16, 45],
  ],
  knockdown: [
    [241, 1225, 54, 35, 27, 34],
    [296, 1230, 51, 30, 26, 29],
    [350, 1238, 56, 22, 28, 21],
  ],
  recover: [
    [412, 1217, 28, 43, 16, 42],
    [448, 1227, 50, 26, 25, 33],
  ],
  airGuard: [[506, 1209, 35, 60, 12, 59]],
  crouchGuard: [[554, 1226, 33, 41, 18, 40]],
  crouchHurt: [[590, 1227, 46, 40, 22, 39]],
  airHurt: [[646, 1218, 33, 48, 22, 47]],
  taunt: [
    [692, 1222, 36, 48, 16, 47],
    [730, 1223, 37, 47, 16, 46],
    [770, 1222, 37, 48, 18, 47],
  ],
  victory: [
    [13, 1281, 34, 57, 17, 56],
    [55, 1288, 41, 50, 22, 49],
    [99, 1290, 53, 48, 25, 47],
    [156, 1289, 55, 49, 26, 48],
    [217, 1288, 41, 50, 22, 49],
  ],
  kneel: [[263, 1302, 46, 38, 23, 37]],
} as const;
export function createAkumaSprites(
  sheet: HTMLImageElement,
): Record<string, Animation> {
  return Object.fromEntries(
    Object.entries({ ...BODY_CROPS, ...SPECIAL_CROPS }).map(([name, specs]) => [
      name,
      specs.map(([x, y, w, h, footX, footY]) => {
        const image = document.createElement('canvas');
        image.width = w;
        image.height = h;
        const ctx = image.getContext('2d')!;
        ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
        const pixels = ctx.getImageData(0, 0, w, h),
          data = pixels.data;
        for (let i = 0; i < data.length; i += 4) {
          const distance = Math.max(
            Math.abs(data[i] - 128),
            Math.abs(data[i + 1] - 128),
            Math.abs(data[i + 2] - 128),
          );
          data[i + 3] = Math.round(
            255 * Math.max(0, Math.min(1, (distance - 20) / 16)),
          );
        }
        ctx.putImageData(pixels, 0, 0);
        return { image, x: footX, y: footY, ms: name === 'idle' ? 160 : 90 };
      }),
    ]),
  );
}
type Sprites = ReturnType<typeof createAkumaSprites>;
function timed(
  s: Sprites,
  name: string,
  age: number,
  duration: number,
): SpriteFrame {
  const frames = s[name];
  return sampleAnimation(
    frames,
    (Math.max(0, age) / duration) * frames.reduce((sum, f) => sum + f.ms, 0),
  );
}
export function akumaActionFrame(
  s: Sprites,
  a: AkumaAction,
  time: number,
): SpriteFrame {
  const age = time - a.born,
    duration = AKUMA_SKILLS[a.skill].duration;
  if (a.skill === 'purpleWave')
    return timed(s, a.airborne ? 'purpleAirCast' : 'purpleCast', age, duration);
  if (a.skill === 'chargedWave')
    return timed(
      s,
      a.airborne ? 'mediumAirCast' : 'mediumChargeCast',
      age,
      duration,
    );
  if (a.skill === 'giantWave')
    return timed(
      s,
      a.airborne ? 'largeAirCast' : 'largeChargeCast',
      age,
      duration,
    );
  if (a.skill === 'fireWave') return timed(s, 'fireCast', age, duration);
  if (a.skill === 'uppercut')
    return timed(
      s,
      a.pose === 'lowUppercut' ? 'lowUppercut' : 'uppercut',
      age,
      duration,
    );
  if (a.skill === 'spin')
    return sampleAnimation(s[a.airborne ? 'airSpinKick' : 'spin'], age, true);
  if (a.skill === 'blueRush')
    return age < 120
      ? timed(s, 'blueSlashWindup', age, 120)
      : timed(s, 'blueSlash', age - 120, duration - 120);
  if (a.skill === 'teleport') return timed(s, 'dashTumble', age, duration);
  if (a.skill === 'throw') return timed(s, 'throwBody', age, duration);
  if (a.skill === 'powerBurst')
    return age < 560
      ? timed(s, 'demonBurst', age, 560)
      : timed(s, 'specialRecovery', age - 560, 240);
  if (a.skill === 'ragingDemon')
    return age > 1040
      ? s.demonIdle[0]
      : sampleAnimation(s.demonAfterimage, age, true);
  return timed(s, a.pose, age, duration);
}
export function drawAkumaEffects(
  ctx: CanvasRenderingContext2D,
  s: Sprites,
  state: AkumaState,
  player: AkumaPlayer,
  time: number,
  camera: number,
) {
  const a = state.action;
  if (
    a &&
    (a.skill === 'ragingDemon' ||
      a.skill === 'teleport' ||
      a.skill === 'blueRush')
  ) {
    const age = time - a.born;
    const frame =
      a.skill === 'ragingDemon'
        ? sampleAnimation(s.demonAfterimage, age, true)
        : akumaActionFrame(s, a, time);
    for (let i = 3; i > 0; i--)
      drawSprite(
        ctx,
        frame,
        player.x - camera - a.facing * i * 21,
        player.y,
        AKUMA_SCALE,
        a.facing,
        0.07 * (4 - i),
      );
    if (a.skill === 'ragingDemon' && a.target !== null && age > 900) {
      drawSprite(
        ctx,
        s.heavenGlyph[0],
        player.x - camera,
        player.y - 112,
        1.15,
        1,
        Math.min(1, (age - 900) / 100),
      );
    }
  }
  for (const p of state.projectiles) {
    const name =
      p.kind === 'purple'
        ? p.airborne
          ? 'purpleAirProjectile'
          : 'purpleFlight'
        : p.kind === 'fire'
          ? 'fireFlight'
          : p.kind === 'charged'
            ? p.airborne
              ? 'mediumAirProjectile'
              : 'mediumChargeFlight'
            : p.airborne
              ? 'largeAirProjectile'
              : 'largeChargeFlight';
    drawSprite(
      ctx,
      sampleAnimation(s[name], time - p.born, true),
      p.x - camera,
      p.y,
      p.kind === 'giant' ? 2.35 : p.kind === 'charged' ? 1.95 : 1.65,
      p.facing,
    );
  }
  for (const p of state.impacts) {
    const age = time - p.born;
    const name =
      p.kind === 'fire'
        ? 'fireBurst'
        : p.kind === 'charged'
          ? 'mediumChargeHit'
          : p.kind === 'giant'
            ? 'largeChargeHit'
            : p.kind === 'demon'
              ? 'fireBurst'
              : 'purpleHit';
    drawSprite(
      ctx,
      timed(s, name, age, 380),
      p.x - camera,
      p.y,
      1.5,
      p.facing,
      Math.min(1, (380 - age) / 100),
    );
  }
}
