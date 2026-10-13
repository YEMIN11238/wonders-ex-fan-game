import type { AttackKind } from './attacks';
import { removeBossWhiteFringe } from './sprite-matte';

// Each frame has its own feet anchor; sword/axe trails must not shift the body.
type Spec = [
  x: number,
  y: number,
  width: number,
  height: number,
  footX: number,
  footY: number,
  ms: number,
  // Optional outline in source coordinates, for interleaved poses on the sheet.
  outline?: [number, number][],
];
export type SpriteFrame = {
  image: HTMLCanvasElement;
  x: number;
  y: number;
  ms: number;
};
export type Animation = SpriteFrame[];
const run: Spec[] = [
  [26, 70, 52, 69, 28, 61, 92],
  [79, 70, 45, 70, 22, 61, 92],
  [125, 71, 54, 69, 28, 63, 92],
  [180, 72, 53, 69, 28, 64, 92],
  [235, 71, 51, 72, 29, 64, 92],
  [291, 71, 54, 73, 29, 67, 92],
  [347, 72, 57, 72, 30, 65, 92],
  [406, 72, 59, 73, 30, 66, 92],
];
const attacks: Record<AttackKind, Spec[]> = {
  slash: [
    [2, 615, 63, 85, 39, 73, 60],
    [
      67,
      615,
      51,
      85,
      22,
      74,
      60,
      [
        [67, 615],
        [118, 615],
        [118, 646],
        [107, 646],
        [107, 700],
        [67, 700],
      ],
    ],
    [
      107,
      618,
      133,
      82,
      63,
      70,
      100,
      [
        [116, 618],
        [240, 618],
        [240, 700],
        [107, 700],
        [107, 648],
        [116, 648],
      ],
    ],
    [244, 618, 81, 82, 24, 70, 70],
    [325, 620, 83, 80, 25, 71, 50],
    [413, 619, 64, 83, 22, 74, 40],
    [480, 619, 66, 83, 30, 74, 40],
  ],
  cleave: [
    [20, 394, 57, 84, 21, 68, 85],
    [
      77,
      390,
      51,
      88,
      26,
      76,
      70,
      [
        [77, 390],
        [123, 390],
        [123, 405],
        [128, 405],
        [128, 478],
        [77, 478],
      ],
    ],
    [
      124,
      393,
      65,
      85,
      33,
      74,
      65,
      [
        [124, 393],
        [189, 393],
        [189, 478],
        [130, 478],
        [130, 405],
        [124, 405],
      ],
    ],
    [189, 395, 65, 83, 29, 72, 65],
    [
      228,
      378,
      116,
      100,
      54,
      92,
      120,
      [
        [228, 378],
        [344, 378],
        [344, 478],
        [256, 478],
        [256, 395],
        [228, 395],
      ],
    ],
    [342, 402, 86, 76, 26, 68, 105],
    [431, 407, 57, 72, 20, 65, 85],
    [489, 405, 63, 74, 21, 66, 85],
  ],
  kick: [
    [24, 286, 40, 72, 19, 65, 55],
    [68, 286, 42, 72, 20, 66, 50],
    [112, 287, 39, 71, 23, 67, 70],
    [153, 287, 38, 71, 23, 67, 70],
    [195, 286, 39, 72, 20, 68, 65],
    [236, 286, 42, 72, 22, 69, 80],
  ],
  stab: [
    [14, 503, 44, 74, 18, 55, 110],
    [62, 503, 45, 79, 20, 57, 120],
    [110, 503, 50, 83, 26, 60, 115],
    [
      168,
      509,
      48,
      92,
      24,
      63,
      110,
      [
        [168, 509],
        [216, 509],
        [216, 601],
        [198, 601],
        [198, 582],
        [168, 582],
      ],
    ],
    [225, 509, 39, 92, 20, 64, 105],
  ],
};
const enemyAxe: Spec[] = [
  [0, 98, 56, 99, 24, 92, 150],
  [56, 98, 57, 99, 24, 92, 110],
  [113, 97, 54, 100, 24, 93, 100],
  [168, 95, 104, 103, 72, 96, 150],
  [273, 124, 103, 72, 68, 66, 110],
  [383, 124, 102, 68, 66, 66, 140],
];
// Explicit background holes enclosed by the boss's limbs and ground shadow.
// Keep the white axe highlights and the fourth frame's large slash trail.
const enemyAxeHoles: [number, number][][] = [
  [[23, 80]],
  [[19, 80]],
  [[18, 80]],
  [],
  [
    [36, 53],
    [69, 54],
  ],
  [
    [35, 52],
    [68, 53],
  ],
];

function frame(
  source: HTMLImageElement,
  [x, y, w, h, footX, footY, ms, outline]: Spec,
  backgroundHoles: [number, number][] = [],
  boss = false,
): SpriteFrame {
  const image = document.createElement('canvas');
  image.width = w;
  image.height = h;
  const ctx = image.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h),
    data = pixels.data;
  const seen = new Uint8Array(w * h),
    queue: number[] = [];
  const add = (i: number) => {
    const p = i * 4;
    if (!seen[i] && Math.min(data[p], data[p + 1], data[p + 2]) > 226) {
      seen[i] = 1;
      queue.push(i);
    }
  };
  for (let xx = 0; xx < w; xx++) {
    add(xx);
    add((h - 1) * w + xx);
  }
  for (let yy = 0; yy < h; yy++) {
    add(yy * w);
    add(yy * w + w - 1);
  }
  for (const [xx, yy] of backgroundHoles) add(yy * w + xx);
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head],
      xx = i % w,
      yy = Math.floor(i / w);
    data[i * 4 + 3] = 0;
    if (xx > 0) add(i - 1);
    if (xx < w - 1) add(i + 1);
    if (yy > 0) add(i - w);
    if (yy < h - 1) add(i + w);
  }
  if (boss) removeBossWhiteFringe(pixels);
  ctx.putImageData(pixels, 0, 0);
  if (outline) {
    // Apply after removing the exterior white, preserving white clothes/blades.
    // A rectangle alone can include the neighboring pose's body or sword arc.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    outline.forEach(([px, py], index) => {
      if (index === 0) ctx.moveTo(px - x, py - y);
      else ctx.lineTo(px - x, py - y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  return { image, x: footX, y: footY, ms };
}

export function createSprites(
  player: HTMLImageElement,
  enemy: HTMLImageElement,
  idle: HTMLImageElement,
) {
  return {
    // Exact neutral pose supplied by the user, including the original relaxed arms.
    idle: frame(idle, [0, 0, 100, 180, 39, 169, 1000]),
    run: run.map((s) => frame(player, s)),
    crouch: frame(player, [300, 187, 53, 69, 25, 62, 1000]),
    attacks: Object.fromEntries(
      Object.entries(attacks).map(([key, specs]) => [
        key,
        specs.map((s) => frame(player, s)),
      ]),
    ) as Record<AttackKind, Animation>,
    enemyWalk: [
      [0, 590, 62, 75, 30, 67, 170],
      [62, 590, 64, 75, 30, 67, 170],
    ].map((s, i) => frame(enemy, s as Spec, [[i === 0 ? 29 : 27, 55]], true)),
    enemyHurt: frame(enemy, [1, 522, 58, 66, 29, 59, 1000], [], true),
    enemyAxe: enemyAxe.map((s, i) => frame(enemy, s, enemyAxeHoles[i], true)),
  };
}

export function sampleAnimation(
  animation: Animation,
  age: number,
  loop = false,
): SpriteFrame {
  const duration = animation.reduce((sum, f) => sum + f.ms, 0);
  let remaining = loop ? Math.max(0, age) % duration : Math.max(0, age);
  for (const f of animation) {
    if (remaining < f.ms) return f;
    remaining -= f.ms;
  }
  return animation[animation.length - 1];
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  scale: number,
  facing: number,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing * scale, scale);
  ctx.drawImage(frame.image, -frame.x, -frame.y);
  ctx.restore();
}
