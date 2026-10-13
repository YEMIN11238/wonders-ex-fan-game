import type { Enemy, Fighter } from './combat';

export const REAPER_SCALE = 1.5;
export const REAPER_TIMING = {
  sweepLead: 320,
  beamLead: 350,
  pillarLead: 650,
  vanish: 450,
  appear: 720,
} as const;
export const REAPER_MOVES = {
  punch: {
    duration: 1300,
    activeStart: 680,
    activeEnd: 770,
    cooldown: 1950,
    range: 220,
    damage: 25,
  },
  slam: {
    duration: 1620,
    activeStart: 900,
    activeEnd: 990,
    cooldown: 2350,
    range: 300,
    damage: 27,
  },
  shot: {
    duration: 1550,
    activeStart: 710,
    activeEnd: 1070,
    cooldown: 2400,
    range: 765,
    damage: 25,
  },
  volley: {
    duration: 1670,
    activeStart: 740,
    activeEnd: 1100,
    cooldown: 2500,
    range: 650,
    damage: 29,
  },
} as const;

export function reaperCasting(enemy: Enemy, time: number) {
  const age = time - enemy.attackStartedAt;
  return (
    enemy.kind === 'reaper' &&
    enemy.hp > 0 &&
    age >= 0 &&
    age < REAPER_MOVES[enemy.attackVariant].duration
  );
}
export function reaperHidden(enemy: Enemy, time: number) {
  const age = time - enemy.attackStartedAt;
  return (
    reaperCasting(enemy, time) &&
    enemy.attackVariant === 'slam' &&
    age >= REAPER_TIMING.vanish &&
    age < REAPER_TIMING.appear
  );
}
export function reaperTeleportX(enemy: Enemy) {
  return Math.max(
    enemy.minX,
    Math.min(enemy.maxX, enemy.aimX - enemy.attackFacing * 125),
  );
}
export function stepReaper(enemy: Enemy, time: number) {
  if (!reaperCasting(enemy, time)) return;
  enemy.knockVx = enemy.knockVy = enemy.stunUntil = 0;
  if (
    enemy.attackVariant === 'slam' &&
    time - enemy.attackStartedAt >= REAPER_TIMING.appear
  )
    enemy.x = reaperTeleportX(enemy);
}

export const REAPER_BEAM = {
  sourceX: 160,
  sourceY: 395,
  scaleX: 2.25,
  scaleY: 1.75,
} as const;
export function reaperBeamOrigin(enemy: Enemy) {
  return {
    x: enemy.x + enemy.attackFacing * 60 * REAPER_SCALE,
    y: enemy.floorY - 93 * REAPER_SCALE,
  };
}

export function reaperHitBox(enemy: Enemy, time: number) {
  if (!reaperCasting(enemy, time)) return null;
  const age = time - enemy.attackStartedAt,
    move = REAPER_MOVES[enemy.attackVariant];
  if (age < move.activeStart || age >= move.activeEnd) return null;
  const f = enemy.attackFacing;
  if (enemy.attackVariant === 'shot') {
    const origin = reaperBeamOrigin(enemy);
    return {
      x: origin.x + f * 150 * REAPER_BEAM.scaleX,
      y: origin.y + (394.5 - REAPER_BEAM.sourceY) * REAPER_BEAM.scaleY,
      rx: 150 * REAPER_BEAM.scaleX,
      ry: 44.5 * REAPER_BEAM.scaleY,
    };
  }
  if (enemy.attackVariant === 'volley')
    return { x: enemy.aimX, y: enemy.floorY - 320, rx: 66, ry: 330 };
  if (enemy.attackVariant === 'slam')
    return { x: enemy.x + f * 184, y: enemy.y - 119, rx: 112, ry: 75 };
  return { x: enemy.x + f * 90, y: enemy.y - 65, rx: 130, ry: 120 };
}
export function reaperHitsPlayer(enemy: Enemy, player: Fighter, time: number) {
  const box = reaperHitBox(enemy, time);
  const height = player.crouching ? 42 : 68;
  return (
    !!box &&
    player.x + 16 > box.x - box.rx &&
    player.x - 16 < box.x + box.rx &&
    player.y > box.y - box.ry &&
    player.y - height < box.y + box.ry
  );
}
