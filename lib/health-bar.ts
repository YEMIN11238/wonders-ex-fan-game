export const HEALTH_BAR_WIDTH = 368;
export const HEALTH_BAR_HEIGHT = 88;
type Skin = { filled: HTMLCanvasElement; empty: HTMLCanvasElement };
export type HealthBar = Skin[];

export function createManaBar(
  health: HealthBar,
  reference: HTMLImageElement,
  starReference: HTMLImageElement,
): HealthBar {
  const star = document.createElement('canvas');
  star.width = 188;
  star.height = 198;
  const starCtx = star.getContext('2d')!;
  starCtx.drawImage(starReference, 24, 24, 188, 198, 0, 0, 188, 198);
  const starPixels = starCtx.getImageData(0, 0, 188, 198);
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  // Key the screenshot's neutral gray backdrop, preserving the black outline,
  // blue glow and white center instead of carrying a rectangular screenshot.
  for (let i = 0; i < starPixels.data.length; i += 4) {
    const [r, g, b] = starPixels.data.subarray(i, i + 3);
    const dark = clamp((68 - Math.max(r, g, b)) / 24);
    const blue = clamp((b - Math.max(r, g) - 12) / 24);
    const white = clamp((Math.min(r, g, b) - 125) / 45);
    starPixels.data[i + 3] *= Math.max(dark, blue, white);
  }
  starCtx.putImageData(starPixels, 0, 0);
  const palette = document.createElement('canvas');
  palette.width = 1;
  palette.height = 2;
  const c = palette.getContext('2d')!;
  c.drawImage(reference, 80, 85, 1, 1, 0, 0, 1, 1);
  c.drawImage(reference, 90, 180, 1, 1, 0, 1, 1, 1);
  const colors = c.getImageData(0, 0, 1, 2).data;
  const recolor = (source: HTMLCanvasElement) => {
    const image = document.createElement('canvas');
    image.width = source.width;
    image.height = source.height;
    const ctx = image.getContext('2d')!;
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height),
      d = pixels.data;
    for (let i = 0; i < d.length; i += 4)
      if (d[i] > 80 && d[i] > d[i + 1] * 1.45 && d[i] > d[i + 2] * 1.45) {
        const t = Math.max(0, Math.min(1, (d[i] - 95) / 100));
        for (let k = 0; k < 3; k++)
          d[i + k] = Math.round(colors[k + 4] * (1 - t) + colors[k] * t);
      }
    ctx.putImageData(pixels, 0, 0);
    // Replace the whole heart badge, leaving the horizontal MP slot intact.
    // Both skins include the star so it stays visible even at zero mana.
    ctx.clearRect(0, 0, 68, HEALTH_BAR_HEIGHT);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(star, 3, 8, 62, 65);
    return image;
  };
  const skin = {
    filled: recolor(health[0].filled),
    empty: recolor(health[0].empty),
  };
  // Running out of mana drains the slot; it must not use the HP death/crumble frames.
  return [skin, skin, skin, skin, skin];
}

export function createHealthBar(sheet: HTMLImageElement): HealthBar {
  // Align the slot's left edge and center, not the ragged outer silhouettes.
  const rows = [
    [4, 74, 67, 38],
    [86, 74, 67, 37],
    [167, 74, 67, 37],
    [257, 86, 63, 41],
    [354, 86, 63, 41],
  ];
  return rows.map(([y, h, anchorX, anchorY]) => {
    const filled = document.createElement('canvas');
    filled.width = HEALTH_BAR_WIDTH;
    filled.height = HEALTH_BAR_HEIGHT;
    const ctx = filled.getContext('2d')!;
    ctx.drawImage(sheet, 8, y, 362, h, 71 - anchorX, 42 - anchorY, 362, h);
    const pixels = ctx.getImageData(0, 0, filled.width, filled.height);
    const data = pixels.data;
    const seen = new Uint8Array(filled.width * filled.height);
    const queue: number[] = [];
    const visit = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= filled.width || y >= filled.height) return;
      const i = y * filled.width + x,
        p = i * 4;
      if (seen[i]) return;
      seen[i] = 1;
      if (
        data[p + 3] === 0 ||
        (data[p] >= 235 && data[p + 1] >= 235 && data[p + 2] >= 235)
      ) {
        data[p + 3] = 0;
        queue.push(i);
      }
    };
    for (let x = 0; x < filled.width; x++) {
      visit(x, 0);
      visit(x, filled.height - 1);
    }
    for (let y = 0; y < filled.height; y++) {
      visit(0, y);
      visit(filled.width - 1, y);
    }
    for (let i = 0; i < queue.length; i++) {
      const x = queue[i] % filled.width,
        y = Math.floor(queue[i] / filled.width);
      visit(x - 1, y);
      visit(x + 1, y);
      visit(x, y - 1);
      visit(x, y + 1);
    }
    ctx.putImageData(pixels, 0, 0);
    const empty = document.createElement('canvas');
    empty.width = filled.width;
    empty.height = filled.height;
    // Only clear red pixels inside the horizontal slot, never the heart.
    for (let y = 25; y <= 57; y++)
      for (let x = 71; x < 350; x++) {
        const p = (y * filled.width + x) * 4;
        if (
          data[p] > 80 &&
          data[p] > data[p + 1] * 1.45 &&
          data[p] > data[p + 2] * 1.45
        ) {
          data[p] = data[p + 1] = data[p + 2] = 0;
        }
      }
    empty.getContext('2d')!.putImageData(pixels, 0, 0);
    return { filled, empty };
  });
}

export function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  skins: HealthBar,
  x: number,
  y: number,
  width: number,
  hp: number,
  maxHp: number,
  deathAge = Infinity,
) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const skin =
    skins[
      ratio > 0.476
        ? 0
        : ratio > 0.236
          ? 1
          : ratio > 0
            ? 2
            : deathAge < 350
              ? 3
              : 4
    ];
  const scale = width / HEALTH_BAR_WIDTH;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(skin.empty, 0, 0);
  ctx.beginPath();
  ctx.rect(0, 0, 71 + Math.floor(275 * ratio), HEALTH_BAR_HEIGHT);
  ctx.clip();
  ctx.drawImage(skin.filled, 0, 0);
  ctx.restore();
}
