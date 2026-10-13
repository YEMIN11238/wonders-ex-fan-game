import { ENEMY_TYPES } from './enemies';
import { PLAYER_HP, type Enemy } from './combat';
export const POTION_HEAL = 30;
const LIFETIME = 30000;
export type PotionDrop = {
  x: number;
  y: number;
  floorY: number;
  vx: number;
  vy: number;
  born: number;
  landed: boolean;
};

export function dropPotion(
  enemy: Enemy,
  time: number,
  random = Math.random,
): PotionDrop | null {
  if (!ENEMY_TYPES[enemy.kind].boss && random() >= 0.6) return null;
  return {
    x: enemy.x,
    y: Math.min(enemy.y - 22, enemy.floorY - 22),
    floorY: enemy.floorY,
    vx: (random() - 0.5) * 70,
    vy: -175,
    born: time,
    landed: false,
  };
}
export function stepPotions(
  drops: PotionDrop[],
  player: { x: number; y: number; hp: number },
  dt: number,
  time: number,
) {
  let healed = 0;
  for (let i = drops.length - 1; i >= 0; i--) {
    const p = drops[i],
      age = time - p.born;
    if (age >= LIFETIME) {
      drops.splice(i, 1);
      continue;
    }
    if (!p.landed) {
      p.vy += 820 * dt;
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      if (p.y >= p.floorY) {
        p.y = p.floorY;
        p.vy = p.vx = 0;
        p.landed = true;
      }
    }
    // Full-health and defeated players leave the bottle for later; no wasted pickups.
    if (
      age >= 350 &&
      player.hp > 0 &&
      player.hp < PLAYER_HP &&
      Math.abs(player.x - p.x) < 38 &&
      Math.abs(player.y - p.y) < 46
    ) {
      const amount = Math.min(POTION_HEAL, PLAYER_HP - player.hp);
      player.hp += amount;
      healed += amount;
      drops.splice(i, 1);
    }
  }
  return healed;
}
export function createPotionSprite(sheet: HTMLImageElement) {
  const image = document.createElement('canvas');
  image.width = 45;
  image.height = 51;
  const ctx = image.getContext('2d')!;
  ctx.drawImage(sheet, 180, 51, 45, 51, 0, 0, 45, 51);
  const outline = [
    [15, 0],
    [30, 0],
    [30, 3],
    [33, 3],
    [33, 9],
    [36, 9],
    [36, 18],
    [39, 18],
    [39, 21],
    [42, 21],
    [42, 27],
    [45, 27],
    [45, 39],
    [42, 39],
    [42, 45],
    [39, 45],
    [39, 48],
    [36, 48],
    [36, 51],
    [9, 51],
    [9, 48],
    [6, 48],
    [6, 45],
    [3, 45],
    [3, 39],
    [0, 39],
    [0, 27],
    [3, 27],
    [3, 21],
    [6, 21],
    [6, 18],
    [9, 18],
    [9, 9],
    [12, 9],
    [12, 3],
    [15, 3],
  ];
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  return image;
}
export function drawPotions(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  drops: PotionDrop[],
  time: number,
  camera: number,
  reducedMotion = false,
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const p of drops) {
    const age = time - p.born,
      x = Math.round(p.x - camera);
    const bob = p.landed && !reducedMotion ? Math.sin(age * 0.004) * 2 : 0;
    ctx.globalAlpha =
      age > LIFETIME - 4000 && Math.floor(age / 220) % 2 ? 0.35 : 1;
    ctx.fillStyle = 'rgba(14,12,27,.25)';
    ctx.beginPath();
    ctx.ellipse(x, p.floorY - 2, 11, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sprite, x - 13, Math.round(p.y - 32 + bob), 26, 30);
  }
  ctx.restore();
}
