import { type AttackKind } from './attacks';
import { sampleAnimation, type SpriteFrame } from './sprites';

type Spec = [number, number, number, number, number, number, number];
export type ImpactEffect = {
  x: number;
  y: number;
  facing: number;
  born: number;
  kind: 'cleave' | 'stab';
};
export const IMPACT_LIFETIME = 420;

function crop(
  source: HTMLImageElement,
  spec: Spec,
  shadow = false,
): SpriteFrame {
  const [x, y, w, h, anchorX, anchorY, ms] = spec;
  const image = document.createElement('canvas');
  image.width = w;
  image.height = h;
  const ctx = image.getContext('2d')!;
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h);
  const p = pixels.data;
  for (let i = 0; i < p.length; i += 4) {
    if (shadow) {
      // The black effects are alpha masks on gray, including their inner holes.
      const alpha = Math.max(0, (127 - (p[i] + p[i + 1] + p[i + 2]) / 3) / 127);
      p[i] = p[i + 1] = p[i + 2] = 0;
      p[i + 3] = alpha < 0.06 ? 0 : Math.round(alpha * 255);
    } else {
      // Soft chroma key: preserve the gold/brown particles and antialiased edges.
      const distance = Math.max(
        Math.abs(p[i] - 126),
        Math.abs(p[i + 1] - 156),
        Math.abs(p[i + 2] - 44),
      );
      p[i + 3] = Math.round(
        255 * Math.max(0, Math.min(1, (distance - 24) / 24)),
      );
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return { image, x: anchorX, y: anchorY, ms };
}

export function createSkillEffects(
  sword: HTMLImageElement,
  shadow: HTMLImageElement,
) {
  const slash: Spec[] = [
    [5, 87, 73, 67, 36, 34, 50],
    [79, 87, 138, 67, 69, 34, 80],
    [221, 87, 125, 67, 63, 34, 80],
    [347, 87, 114, 67, 56, 34, 80],
  ];
  const impact: Spec[] = [
    [1, 482, 150, 103, 74, 102, 70],
    [152, 482, 195, 103, 97, 102, 100],
    [349, 482, 218, 103, 109, 102, 120],
    [570, 482, 223, 103, 111, 102, 130],
  ];
  const smoke: Spec[] = [
    [20, 500, 78, 78, 38, 66, 40],
    [141, 500, 72, 78, 33, 65, 45],
    [238, 500, 82, 78, 29, 66, 45],
    [335, 500, 80, 78, 25, 74, 50],
    [428, 500, 87, 78, 21, 74, 55],
    [518, 500, 67, 78, 19, 74, 55],
    [602, 500, 56, 78, 14, 74, 60],
  ];
  return {
    slash: slash.map((spec) => crop(sword, spec)),
    impact: impact.map((spec) => crop(sword, spec)),
    smoke: smoke.map((spec) => crop(shadow, spec, true)),
  };
}
type SkillEffects = ReturnType<typeof createSkillEffects>;

export function swordEffectProgress(kind: AttackKind, age: number) {
  if (kind === 'kick') return null;
  const [start, end] =
    kind === 'slash' ? [100, 390] : kind === 'cleave' ? [230, 560] : [210, 500];
  return age >= start && age < end ? (age - start) / (end - start) : null;
}

function paint(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  facing: number,
  scale: number,
  rotation: number,
  alpha: number,
) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing, 1);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame.image, -frame.x, -frame.y);
  ctx.restore();
}

export function drawSwordEffect(
  ctx: CanvasRenderingContext2D,
  effects: SkillEffects,
  kind: AttackKind,
  age: number,
  x: number,
  y: number,
  facing: number,
  grounded: boolean,
) {
  const progress = swordEffectProgress(kind, age);
  if (progress === null) return;
  const frame = sampleAnimation(effects.slash, progress * 290);
  const fade = Math.min(1, (1 - progress) / 0.22);
  const scale = kind === 'slash' ? 1.15 : kind === 'cleave' ? 1.2 : 0.78;
  const offsetX = kind === 'stab' ? 10 : kind === 'cleave' ? 53 : 48;
  const offsetY = kind === 'stab' ? (grounded ? -32 : 5) : -49;
  const rotation =
    kind === 'cleave'
      ? -0.85 + progress * 1.65
      : kind === 'stab'
        ? Math.PI / 2
        : 0;
  ctx.save();
  if (grounded) {
    // A planted sword may reach the floor, but its light must not shine through it.
    ctx.beginPath();
    ctx.rect(0, 0, ctx.canvas.width, y + 3);
    ctx.clip();
  }
  paint(
    ctx,
    frame,
    x + facing * offsetX,
    y + offsetY,
    facing,
    scale,
    rotation,
    fade,
  );
  ctx.restore();
}

export function drawImpactEffect(
  ctx: CanvasRenderingContext2D,
  effects: SkillEffects,
  impact: ImpactEffect,
  time: number,
  camera: number,
) {
  const age = time - impact.born;
  if (age < 0 || age >= IMPACT_LIFETIME) return;
  const scale = impact.kind === 'cleave' ? 0.8 : 0.52;
  const fade = Math.min(1, (IMPACT_LIFETIME - age) / 140);
  if (age < 350) {
    paint(
      ctx,
      sampleAnimation(effects.smoke, age),
      impact.x - camera,
      impact.y,
      impact.facing,
      scale,
      0,
      fade * 0.22,
    );
  }
  paint(
    ctx,
    sampleAnimation(effects.impact, age),
    impact.x - camera,
    impact.y,
    impact.facing,
    scale,
    0,
    fade * 0.95,
  );
}
