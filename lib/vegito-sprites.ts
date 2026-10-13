import { VEGITO_FRAMES } from './vegito-frames';
import { VEGITO_EFFECT_FRAMES } from './vegito-effect-frames';
import { drawSprite, sampleAnimation, type SpriteFrame } from './sprites';
import {
  VEGITO_SCALE,
  FUSION_DURATION,
  vegitoBeam,
  type VegitoState,
  type VegitoPlayer,
} from './vegito';

type Spec = readonly [number, number, number, number, number, number, number];
export function createVegitoSprites(sheet: HTMLImageElement) {
  const crop = (spec: Spec): SpriteFrame => {
    const [x, y, w, h, ax, ay, ms] = spec;
    const image = document.createElement('canvas');
    image.width = w;
    image.height = h;
    const ctx = image.getContext('2d')!;
    ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h),
      d = pixels.data,
      matte = [57, 54, 85];
    for (let p = 0; p < d.length; p += 4) {
      const distance = Math.max(
        Math.abs(d[p] - 57),
        Math.abs(d[p + 1] - 54),
        Math.abs(d[p + 2] - 85),
      );
      let alpha = Math.max(0, Math.min(1, (distance - 12) / 16));
      alpha = alpha * alpha * (3 - 2 * alpha);
      if (alpha > 0 && alpha < 1)
        for (let c = 0; c < 3; c++)
          d[p + c] = Math.max(
            0,
            Math.min(255, (d[p + c] - (1 - alpha) * matte[c]) / alpha),
          );
      d[p + 3] = Math.round(alpha * 255);
    }
    ctx.putImageData(pixels, 0, 0);
    return { image, x: ax, y: ay, ms };
  };
  const frames = (specs: readonly Spec[]) => specs.map(crop);
  const actor = Object.fromEntries(
    Object.entries(VEGITO_FRAMES).map(([name, specs]) => [name, frames(specs)]),
  ) as Record<keyof typeof VEGITO_FRAMES, SpriteFrame[]>;
  const effects = VEGITO_EFFECT_FRAMES;
  return {
    ...actor,
    fusionFlash: frames(effects.fusionCenterAnchored),
    kiShot: frames(effects.yellowKi.shotHeadAnchored),
    kiMuzzle: frames(effects.yellowKi.muzzleRootAnchored),
    orbShot: frames(effects.missileHeadAnchored.horizontal),
    airShot: frames(effects.missileHeadAnchored.diagonalDownRight),
    beamParts: {
      start: frames(effects.beamAxisAnchored.start),
      body: frames(effects.beamAxisAnchored.body),
      end: frames(effects.beamAxisAnchored.end),
    },
    wideParts: {
      start: frames(effects.wideBeamAxisAnchored.start),
      body: frames(effects.wideBeamAxisAnchored.body),
      end: frames(effects.wideBeamAxisAnchored.end),
    },
  };
}
export type VegitoSprites = ReturnType<typeof createVegitoSprites>;
export type VegitoLocomotion = { mode: string; since: number; facing: number };
export const createVegitoLocomotion = (): VegitoLocomotion => ({
  mode: 'idle',
  since: 0,
  facing: 1,
});
export function vegitoLocomotionFrame(
  s: VegitoSprites,
  motion: VegitoLocomotion,
  player: VegitoPlayer,
  time: number,
  crouching: boolean,
) {
  const mode = !player.grounded
    ? player.vy < 0
      ? 'rise'
      : 'fall'
    : crouching
      ? 'crouch'
      : Math.abs(player.vx) > 28
        ? 'move'
        : 'idle';
  if (
    motion.mode !== mode ||
    (mode === 'move' && motion.facing !== player.facing)
  ) {
    motion.mode = mode;
    motion.since = time;
  }
  motion.facing = player.facing;
  const age = Math.max(0, time - motion.since);
  // These are launch poses, not a gait cycle. Never restart the crouch while moving.
  if (mode === 'move')
    return age < 80 ? s.run[0] : age < 160 ? s.run[1] : s.run[2];
  if (mode === 'crouch') return s.jump[0];
  if (mode === 'rise') return age < 110 ? s.jump[1] : s.jump[2];
  if (mode === 'fall') return s.jump[4];
  return sampleAnimation(s.idle, age, true);
}
const timed = (frame: SpriteFrame, ms: number) => ({ ...frame, ms });
const stretch = (frames: SpriteFrame[], age: number, duration: number) =>
  sampleAnimation(
    frames,
    (Math.max(0, age) * frames.reduce((s, f) => s + f.ms, 0)) / duration,
  );
export function vegitoActionFrame(
  s: VegitoSprites,
  state: VegitoState,
  player: VegitoPlayer,
  time: number,
) {
  const a = state.action;
  if (!a) return sampleAnimation(s.idle, time, true);
  const age = time - a.born;
  if (a.skill === 'punch') {
    const poses = [s.punch, s.punchUpper, s.punchHeavy][a.combo];
    return sampleAnimation(
      [timed(poses[0], 130), timed(poses[1], 140), timed(poses[2], 150)],
      age,
    );
  }
  if (a.skill === 'kick') {
    const poses = a.airborne ? s.aerialStrike : s.kickHeavy;
    return sampleAnimation(
      [timed(poses[0], 180), timed(poses[1], 160), timed(poses[2], 180)],
      age,
    );
  }
  if (a.skill === 'spin')
    return age < 220
      ? s.kickRapid[0]
      : age < 660
        ? sampleAnimation(s.kickRapid.slice(2), age - 220, true)
        : s.kickRapid[1];
  if (a.skill === 'sword')
    return sampleAnimation(
      [
        timed(s.swordDraw[2], 130),
        timed(s.swordDraw[3], 130),
        timed(s.swordSlash[0], 150),
        timed(s.swordSlash[1], 150),
        timed(s.swordSlash[2], 100),
        timed(s.swordSlash[3], 100),
      ],
      age,
    );
  if (a.skill === 'ki' || a.skill === 'barrage' || a.skill === 'airWave') {
    const release =
      a.skill === 'barrage' ? 200 : a.skill === 'airWave' ? 300 : 240;
    return age < release
      ? stretch(s.kiCast.slice(0, 3), age, release)
      : s.kiCast[3];
  }
  if (a.skill === 'orb')
    return age < 700
      ? stretch(s.orbCharge, age, 700)
      : stretch(s.orbBurst, age - 700, 400);
  if (a.skill === 'beam')
    return age < 600 ? stretch(s.beamCharge, age, 600) : s.beamCast[0];
  if (a.skill === 'finalBeam')
    return age < 900
      ? stretch(s.energyCharge, age, 900)
      : sampleAnimation(s.energyCast, age - 900, true);
  if (a.skill === 'teleport')
    return age < 120
      ? s.teleport[3]
      : age < 260
        ? s.teleport[4]
        : age < 340
          ? s.teleport[5]
          : s.teleport[6];
  if (a.skill === 'awaken')
    return age < 1400
      ? stretch(s.transform.slice(0, 11), age, 1400)
      : sampleAnimation(s.transform.slice(11), age - 1400, true);
  if (a.skill === 'burst' || a.skill === 'charge')
    return age < 360
      ? stretch(s.powerUp.slice(0, 3), age, 360)
      : sampleAnimation(s.powerUp.slice(2), age - 360, true);
  return s.idle[0];
}
export function drawVegitoEffects(
  ctx: CanvasRenderingContext2D,
  s: VegitoSprites,
  state: VegitoState,
  player: VegitoPlayer,
  time: number,
  camera: number,
  foreground: boolean,
) {
  const a = state.action,
    age = a ? time - a.born : 0;
  if (!foreground) {
    const beam = vegitoBeam(state, player, time);
    if (beam) {
      const parts = beam.large ? s.wideParts : s.beamParts,
        index = Math.floor(age / 80) % 2;
      const start = parts.start[index],
        body = parts.body[index],
        end = parts.end[index];
      const scaleY = beam.large ? 1.5 : 1.15,
        capScale = beam.large ? 1.65 : 1.3;
      const startW = start.image.width * capScale,
        endW = end.image.width * capScale;
      ctx.save();
      ctx.translate(beam.x - camera, beam.y);
      ctx.scale(beam.facing, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        start.image,
        0,
        -start.y * scaleY,
        startW,
        start.image.height * scaleY,
      );
      for (
        let x = startW - 1;
        x < beam.length - endW;
        x += body.image.width * capScale - 1
      ) {
        const width = Math.min(
          body.image.width * capScale,
          beam.length - endW - x + 1,
        );
        ctx.drawImage(
          body.image,
          0,
          0,
          width / capScale,
          body.image.height,
          x,
          -body.y * scaleY,
          width,
          body.image.height * scaleY,
        );
      }
      ctx.drawImage(
        end.image,
        beam.length - endW,
        -end.y * scaleY,
        endW,
        end.image.height * scaleY,
      );
      ctx.restore();
    }
    if (
      a &&
      ((a.skill === 'burst' && age >= 360 && age < 620) ||
        (a.skill === 'awaken' && age >= 1400 && age < 1690))
    ) {
      const start = a.skill === 'burst' ? 360 : 1400,
        scale = a.skill === 'burst' ? 2.15 : 4.1;
      drawSprite(
        ctx,
        stretch(s.fusionFlash.slice(1, 5), age - start, 300),
        player.x - camera,
        player.y - 46,
        scale,
        1,
        0.76,
      );
    }
    return;
  }
  for (const p of state.projectiles) {
    const frames =
      p.kind === 'ki' ? s.kiShot : p.kind === 'air' ? s.airShot : s.orbShot;
    drawSprite(
      ctx,
      sampleAnimation(frames, time - p.born, true),
      p.x - camera,
      p.y,
      p.kind === 'ki' ? 1.3 : 1.25,
      p.facing,
    );
  }
  if (a && (a.skill === 'ki' || a.skill === 'barrage')) {
    const releases = a.skill === 'ki' ? [240] : [200, 340, 480];
    for (const release of releases)
      if (age >= release && age < release + 120)
        drawSprite(
          ctx,
          stretch(s.kiMuzzle, age - release, 120),
          player.x - camera + a.facing * 30,
          player.y - 40,
          1.15,
          a.facing,
        );
  }
  for (const p of state.impacts)
    drawSprite(
      ctx,
      sampleAnimation(s.fusionFlash.slice(3), time - p.born),
      p.x - camera,
      p.y,
      0.42,
      1,
      Math.max(0, 1 - (time - p.born) / 250),
    );
}
export function drawVegitoFusion(
  ctx: CanvasRenderingContext2D,
  s: VegitoSprites,
  age: number,
  x: number,
  y: number,
  reducedMotion: boolean,
) {
  if (age < 0 || age >= FUSION_DURATION) return;
  ctx.save();
  if (age < 950) {
    const p = Math.min(1, age / 950),
      distance = 115 * (1 - p * p);
    drawSprite(ctx, s.fusionOrange[0], x - distance, y, VEGITO_SCALE, 1);
    drawSprite(ctx, s.fusionOrange[1], x + distance, y, VEGITO_SCALE, -1);
  } else if (age < 1450) {
    drawSprite(
      ctx,
      stretch(s.fusionGhost, age - 950, 500),
      x,
      y,
      VEGITO_SCALE,
      1,
    );
  } else if (age < 2150) {
    drawSprite(
      ctx,
      stretch(s.fusionFlash, age - 1450, 700),
      x,
      y - 42,
      reducedMotion ? 1.8 : 2.45,
      1,
    );
  } else if (age < 2600) {
    drawSprite(
      ctx,
      stretch(s.fusionHalo, age - 2150, 450),
      x,
      y,
      VEGITO_SCALE,
      1,
    );
  } else
    drawSprite(
      ctx,
      sampleAnimation(s.idle, age - 2600, true),
      x,
      y,
      VEGITO_SCALE,
      1,
    );
  ctx.restore();
}
