import type { Enemy, Fighter } from './combat';

export const DRILL_TIMING = {
  shotRelease: 560,
  volleyRelease: 620,
  volleySpacing: 160,
  volleyFlight: 780,
  volleyDuration: 1900,
} as const;
export const DRILL_PROJECTILE_SCALE = 1.1;
const BOSS_SCALE = 1.95;
const VOLLEY_RISE_SPEED = 700;

export type DrillShot = {
  // The leading tip is both the sprite anchor and the collision reference.
  x: number;
  y: number;
  angle: number;
  diagonal: boolean;
  age: number;
  falling: boolean;
};

const volleyTargetX = (enemy: Enemy, index: number) =>
  enemy.aimX + enemy.attackFacing * index * 65;

// Body poses, telegraphs, rendering and collision all use this attack clock.
// Volley drills leave the raised arms, rise, then fall at the locked targets.
export function drillShots(enemy: Enemy, time: number): DrillShot[] {
  if (enemy.kind !== 'drillBoss' || enemy.hp <= 0) return [];
  const diagonal = enemy.attackVariant === 'volley';
  const age =
    time -
    enemy.attackStartedAt -
    (diagonal ? DRILL_TIMING.volleyRelease : DRILL_TIMING.shotRelease);
  const result: DrillShot[] = [];
  for (let index = 0; index < (diagonal ? 2 : 1); index++) {
    const flightAge = age - index * DRILL_TIMING.volleySpacing;
    const elapsed = flightAge / 1000;
    if (!Number.isFinite(elapsed) || elapsed < 0) continue;
    if (diagonal) {
      const duration = DRILL_TIMING.volleyFlight / 1000;
      if (elapsed >= duration) continue;
      const originX =
        enemy.attackX + enemy.attackFacing * (16 + index * 40) * BOSS_SCALE;
      const originY = enemy.floorY - 164 * BOSS_SCALE;
      const velocityX = (volleyTargetX(enemy, index) - originX) / duration;
      const gravity =
        (2 * (enemy.floorY - originY + VOLLEY_RISE_SPEED * duration)) /
        (duration * duration);
      const velocityY = -VOLLEY_RISE_SPEED + gravity * elapsed;
      result.push({
        x: originX + velocityX * elapsed,
        y:
          originY -
          VOLLEY_RISE_SPEED * elapsed +
          0.5 * gravity * elapsed * elapsed,
        angle: Math.atan2(velocityY, velocityX),
        diagonal: true,
        age: flightAge,
        falling: velocityY > 0,
      });
      continue;
    }
    if (elapsed >= 0.8) continue;
    const originX = enemy.attackX + enemy.attackFacing * 132 * BOSS_SCALE;
    const originY = enemy.floorY - 63 * BOSS_SCALE;
    const dx =
      enemy.attackFacing *
      Math.max(90, (enemy.aimX - originX) * enemy.attackFacing);
    const dy = enemy.aimY - originY;
    const angle = Math.atan2(dy, dx);
    const x = originX + Math.cos(angle) * 850 * elapsed;
    const y = originY + Math.sin(angle) * 850 * elapsed;
    if (y > enemy.floorY) continue;
    result.push({
      x,
      y,
      angle,
      diagonal: false,
      age: flightAge,
      falling: true,
    });
  }
  return result;
}

export function drillLandings(enemy: Enemy, time: number) {
  if (
    enemy.kind !== 'drillBoss' ||
    enemy.hp <= 0 ||
    enemy.attackVariant !== 'volley'
  )
    return [];
  const age = time - enemy.attackStartedAt;
  if (!Number.isFinite(age) || age < 0) return [];
  return [0, 1].flatMap((index) => {
    const impactAt =
      DRILL_TIMING.volleyRelease +
      index * DRILL_TIMING.volleySpacing +
      DRILL_TIMING.volleyFlight;
    if (age >= impactAt + 160) return [];
    return [
      {
        x: volleyTargetX(enemy, index),
        y: enemy.floorY,
        remaining: impactAt - age,
        progress: Math.min(1, age / impactAt),
      },
    ];
  });
}

// A small oriented box follows the visible drill head behind its leading tip.
// The long motion streak and cyan sparks do not enlarge the damaging area.
export function drillHitsPlayer(enemy: Enemy, player: Fighter, time: number) {
  const playerHalfWidth = 16;
  const playerHalfHeight = (player.crouching ? 40 : 68) / 2;
  const halfLength = 15 * DRILL_PROJECTILE_SCALE;
  const halfWidth = 9 * DRILL_PROJECTILE_SCALE;
  return drillShots(enemy, time).some((shot) => {
    if (shot.diagonal && !shot.falling) return false;
    const cos = Math.cos(shot.angle),
      sin = Math.sin(shot.angle);
    const dx = player.x - (shot.x - cos * halfLength);
    const dy = player.y - playerHalfHeight - (shot.y - sin * halfLength);
    // Separating axes of the player rectangle and rotated drill head.
    return (
      Math.abs(dx) <
        playerHalfWidth +
          halfLength * Math.abs(cos) +
          halfWidth * Math.abs(sin) &&
      Math.abs(dy) <
        playerHalfHeight +
          halfLength * Math.abs(sin) +
          halfWidth * Math.abs(cos) &&
      Math.abs(dx * cos + dy * sin) <
        halfLength +
          playerHalfWidth * Math.abs(cos) +
          playerHalfHeight * Math.abs(sin) &&
      Math.abs(-dx * sin + dy * cos) <
        halfWidth +
          playerHalfWidth * Math.abs(sin) +
          playerHalfHeight * Math.abs(cos)
    );
  });
}
