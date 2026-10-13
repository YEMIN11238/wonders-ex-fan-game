import type { CombatEvent } from './combat';
import {
  AKUMA_SKILLS,
  type AkumaState,
  type AkumaPlayer,
  type AkumaSkill,
} from './akuma';
import { VIEW_W, VIEW_H } from './world';

type Crop = readonly [number, number, number, number];
const AURA: Crop[] = [
  [96, 16, 152, 160],
  [438, 16, 152, 160],
  [96, 208, 152, 160],
  [438, 208, 152, 160],
  [780, 208, 152, 160],
  [96, 400, 152, 160],
  [780, 400, 152, 160],
  [96, 592, 152, 160],
  [438, 592, 152, 160],
];
const RING: Crop[] = [
  [0, 0, 96, 96],
  [96, 0, 96, 96],
  [192, 0, 96, 96],
  [288, 0, 96, 96],
  [384, 0, 96, 96],
  [0, 96, 96, 96],
  [96, 96, 96, 96],
  [192, 96, 96, 96],
  [288, 96, 96, 96],
  [384, 96, 96, 96],
];
const BOLT: Crop[] = [
  [0, 192, 96, 96],
  [96, 192, 96, 96],
  [192, 192, 96, 96],
  [288, 192, 96, 96],
  [384, 192, 96, 96],
];
const IMPACT: Crop[] = [
  [0, 288, 96, 96],
  [96, 288, 96, 96],
  [192, 288, 96, 96],
  [288, 288, 96, 96],
  [384, 288, 96, 96],
  [0, 384, 96, 96],
  [96, 384, 96, 96],
  [192, 384, 96, 96],
  [288, 384, 96, 96],
];
const PILLAR: Crop[] = [
  [300, 140, 106, 162],
  [409, 140, 106, 162],
  [515, 140, 106, 162],
  [620, 140, 102, 162],
];
const VORTEX: Crop[] = [
  [0, 494, 140, 190],
  [140, 494, 140, 190],
  [280, 494, 140, 190],
];

export type FeedbackAssets = {
  blue: CanvasImageSource;
  purple: CanvasImageSource;
  flame: CanvasImageSource;
};
export function createFeedbackAssets(
  blue: HTMLImageElement,
  purple: HTMLImageElement,
  flame: HTMLImageElement,
): FeedbackAssets {
  // Black sprite-sheet backgrounds are discarded only at runtime; originals remain intact.
  const clean = (source: HTMLImageElement) => {
    const c = document.createElement('canvas');
    c.width = source.width;
    c.height = source.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]) < 18)
        pixels.data[i + 3] = 0;
    }
    ctx.putImageData(pixels, 0, 0);
    return c;
  };
  return { blue: clean(blue), purple: clean(purple), flame: clean(flame) };
}
type Spark = {
  x: number;
  y: number;
  born: number;
  force: number;
  element: string;
  seed: number;
};
export function createFeedback() {
  return {
    clock: 0,
    stop: 0,
    shake: 0,
    combo: 0,
    damage: 0,
    lastHit: -Infinity,
    serial: 0,
    sparks: [] as Spark[],
    title: '',
    titleAt: -Infinity,
    titlePower: 0,
  };
}
export type Feedback = ReturnType<typeof createFeedback>;
export function tickFeedback(f: Feedback, dt: number) {
  f.clock += dt * 1000;
  const frozen = Math.min(f.stop, dt * 1000);
  f.stop = Math.max(0, f.stop - dt * 1000);
  f.shake *= Math.exp(-15 * dt);
  f.sparks = f.sparks.filter((s) => f.clock - s.born < 430);
  if (f.clock - f.lastHit > 1600) {
    f.combo = 0;
    f.damage = 0;
  }
  return Math.max(0, dt - frozen / 1000);
}
export function recordImpact(f: Feedback, e: CombatEvent) {
  const force = e.force ?? (e.target === 'player' ? 1.3 : 1);
  f.stop = Math.max(
    f.stop,
    e.target === 'player' ? 40 : Math.min(105, 22 + force * 23),
  );
  f.shake = Math.max(f.shake, Math.min(9, 1.5 + force * 2.6));
  f.sparks.push({
    x: e.x,
    y: e.impactY ?? e.y + 35,
    born: f.clock,
    force,
    element: e.element ?? (e.target === 'player' ? 'fire' : 'purple'),
    seed: ++f.serial,
  });
  if (f.sparks.length > 20) f.sparks.shift();
  if (e.target === 'enemy') {
    f.combo++;
    f.damage += e.damage;
    f.lastHit = f.clock;
  } else {
    f.combo = 0;
    f.damage = 0;
  }
}
export function announceSkill(f: Feedback, skill: AkumaSkill) {
  if (['giantWave', 'ragingDemon', 'powerBurst'].includes(skill)) {
    f.title = AKUMA_SKILLS[skill].name;
    f.titleAt = f.clock;
    f.titlePower = skill === 'ragingDemon' ? 1 : 0.65;
  }
}
function fx(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  frames: Crop[],
  age: number,
  ms: number,
  x: number,
  y: number,
  width: number,
  alpha = 1,
  facing = 1,
  rotation = 0,
  red = false,
) {
  const [sx, sy, w, h] =
    frames[Math.max(0, Math.floor(age / ms)) % frames.length];
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(facing, 1);
  if (red) ctx.filter = 'hue-rotate(72deg) saturate(1.5)';
  ctx.drawImage(
    sheet,
    sx,
    sy,
    w,
    h,
    -width / 2,
    (-width * h) / w / 2,
    width,
    (width * h) / w,
  );
  ctx.restore();
}
export function drawSkillAtmosphere(
  ctx: CanvasRenderingContext2D,
  assets: FeedbackAssets,
  state: AkumaState,
  player: AkumaPlayer,
  time: number,
  camera: number,
  foreground: boolean,
) {
  const a = state.action;
  if (a) {
    const age = time - a.born,
      x = player.x - camera,
      y = player.y,
      face = a.facing;
    const remaining = AKUMA_SKILLS[a.skill].duration - age;
    const fade = Math.min(1, Math.max(0, remaining / 140));
    if (!foreground) {
      if (
        ['chargedWave', 'giantWave', 'powerBurst', 'ragingDemon'].includes(
          a.skill,
        )
      ) {
        const dark =
          a.skill === 'ragingDemon' && a.target !== null
            ? 0.63
            : a.skill === 'giantWave'
              ? 0.4
              : 0.22;
        ctx.fillStyle = `rgba(13,7,28,${dark * Math.min(1, age / 100) * fade})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      if (a.skill === 'uppercut' && age > 65) {
        fx(
          ctx,
          assets.flame,
          PILLAR,
          age - 65,
          75,
          x + face * 12,
          y - 92,
          152,
          0.92 * fade,
          face,
        );
      }
      if (a.skill === 'spin' && age > 95) {
        fx(
          ctx,
          assets.flame,
          VORTEX,
          age,
          70,
          x,
          y - 57,
          162,
          0.73 * fade,
          face,
          Math.PI / 2,
        );
      }
      if (a.skill === 'blueRush' && age > 80) {
        fx(
          ctx,
          assets.flame,
          PILLAR,
          age,
          60,
          x - face * 30,
          y - 40,
          132,
          0.9 * fade,
          face,
          (face * -Math.PI) / 2,
        );
      }
      if (a.skill === 'powerBurst') {
        fx(
          ctx,
          assets.purple,
          RING,
          age,
          55,
          x,
          y - 45,
          95 + Math.min(200, age * 0.65),
          fade,
          face,
          0,
          true,
        );
      }
      if (a.skill === 'ragingDemon') {
        fx(
          ctx,
          assets.purple,
          RING,
          age,
          48,
          x,
          y - 48,
          a.target !== null ? 230 : 135,
          0.8 * fade,
          face,
          0,
          true,
        );
        if (age > 990 && a.target !== null)
          fx(
            ctx,
            assets.flame,
            VORTEX,
            age - 990,
            65,
            x + face * 38,
            y - 118,
            205,
            fade,
            face,
            0,
            true,
          );
      }
      if (a.skill === 'airDive' && age > 200)
        fx(
          ctx,
          assets.flame,
          PILLAR,
          age,
          70,
          x - face * 20,
          y - 65,
          106,
          fade,
          face,
          face * -0.65,
        );
    } else {
      if (['uppercut', 'spin', 'blueRush', 'teleport'].includes(a.skill))
        fx(
          ctx,
          assets.blue,
          AURA,
          age,
          52,
          x,
          y - 42,
          a.skill === 'blueRush' ? 140 : 110,
          0.85 * fade,
          face,
        );
      if (
        ['purpleWave', 'fireWave', 'chargedWave', 'giantWave'].includes(a.skill)
      ) {
        const release =
          a.skill === 'giantWave'
            ? 480
            : a.skill === 'chargedWave'
              ? 360
              : a.skill === 'fireWave'
                ? 420
                : 220;
        if (age < release + 100) {
          const charge = Math.min(1, age / release);
          fx(
            ctx,
            assets.purple,
            RING,
            age,
            38,
            x + face * 38,
            y - 44,
            40 + charge * (a.skill === 'giantWave' ? 135 : 75),
            Math.min(1, age / 60),
            face,
            0,
            a.skill === 'fireWave',
          );
        }
      }
      if (['punch', 'kick', 'throw'].includes(a.skill) && age > 55 && age < 235)
        fx(
          ctx,
          assets.purple,
          BOLT,
          age - 55,
          38,
          x + face * 49,
          y - 40,
          a.skill === 'kick' ? 107 : 82,
          0.8 * fade,
          face,
          -0.65,
        );
    }
  }
  if (!foreground) return;
  for (const p of state.projectiles) {
    const width = p.kind === 'giant' ? 165 : p.kind === 'charged' ? 106 : 72;
    fx(
      ctx,
      assets.purple,
      RING,
      time - p.born,
      46,
      p.x - camera,
      p.y,
      width,
      0.9,
      p.facing,
      0,
      p.kind === 'fire',
    );
    fx(
      ctx,
      assets.purple,
      BOLT,
      time - p.born,
      40,
      p.x - camera - p.facing * width * 0.48,
      p.y,
      width * 1.3,
      0.5,
      p.facing,
      -0.65,
      p.kind === 'fire',
    );
  }
}
export function drawHitSparks(
  ctx: CanvasRenderingContext2D,
  assets: FeedbackAssets,
  f: Feedback,
  camera: number,
) {
  for (const s of f.sparks) {
    const age = f.clock - s.born,
      t = age / 430,
      x = s.x - camera,
      y = s.y;
    const color =
      s.element === 'blue'
        ? '#88edff'
        : s.element === 'fire'
          ? '#ffb264'
          : s.element === 'demon'
            ? '#ff397d'
            : '#e3b0ff';
    fx(
      ctx,
      s.element === 'blue' ? assets.blue : assets.purple,
      s.element === 'blue' ? AURA : IMPACT,
      age,
      45,
      x,
      y,
      70 + s.force * 33,
      (1 - t) * 0.95,
      1,
      0,
      s.element === 'demon' || s.element === 'fire',
    );
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (1 - t) * (1 - t);
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + s.seed * 1.7;
      const inner = 8 + t * (35 + s.force * 14),
        outer = inner + 10 + (1 - t) * s.force * 13;
      ctx.lineWidth = (i % 3 === 0 ? 4 : 2) * (1 - t);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * 0.7);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer * 0.7);
      ctx.stroke();
    }
    if (age < 95) {
      ctx.fillStyle = '#fff8e4';
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        (12 + s.force * 6) * (1 - age / 130),
        (5 + s.force * 3) * (1 - age / 130),
        -0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }
}
export function drawCombatOverlay(
  ctx: CanvasRenderingContext2D,
  f: Feedback,
  reducedMotion: boolean,
) {
  if (f.combo > 1) {
    const t = f.clock - f.lastHit,
      pop = reducedMotion ? 1 : 1 + Math.max(0, 1 - t / 160) * 0.18;
    ctx.save();
    ctx.translate(VIEW_W - 75, 139);
    ctx.scale(pop, pop);
    ctx.globalAlpha = Math.min(1, (1600 - t) / 250);
    ctx.textAlign = 'right';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#30113e';
    ctx.font = 'italic 900 43px sans-serif';
    ctx.fillStyle = '#ffe6a3';
    ctx.strokeText(String(f.combo), 0, 0);
    ctx.fillText(String(f.combo), 0, 0);
    ctx.font = '900 14px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('HITS', 0, 22);
    ctx.font = '700 12px sans-serif';
    ctx.fillStyle = '#eec8ff';
    ctx.fillText(`${f.damage} DAMAGE`, 0, 40);
    ctx.restore();
  }
  const age = f.clock - f.titleAt;
  if (age < 760) {
    const alpha = Math.min(1, age / 80, (760 - age) / 180);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'italic 900 28px sans-serif';
    ctx.shadowColor = f.titlePower === 1 ? '#ff206c' : '#a12bff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fff0ff';
    ctx.strokeStyle = '#35113e';
    ctx.lineWidth = 5;
    const x =
      VIEW_W / 2 + (reducedMotion ? 0 : Math.max(0, 1 - age / 130) * 40);
    ctx.strokeText(f.title, x, 88);
    ctx.fillText(f.title, x, 88);
    ctx.restore();
  }
}
