import type { Enemy } from './combat';

export const ORACLE_HAND_RISE = 760;
export const ORACLE_HAND_CONTACT = 880;
export const ORACLE_HAND_CLOSE = 1000;
export const ORACLE_HAND_END = 1320;

// Bounds use the same tightly cropped hand frames, anchor and 1.1x scale as
// the renderer. Keep the original damage reach inside the visible silhouette.
export function oracleHand(enemy: Enemy, time: number) {
  const age = time - enemy.attackStartedAt;
  if (
    enemy.hp <= 0 ||
    enemy.attackVariant !== 'slam' ||
    age < ORACLE_HAND_RISE ||
    age >= ORACLE_HAND_END
  )
    return null;
  const frame = age < ORACLE_HAND_CONTACT ? 0 : age < ORACLE_HAND_CLOSE ? 1 : 2;
  const [width, height, anchorX] = [
    [62, 64, 36],
    [106, 143, 62],
    [111, 112, 80],
  ][frame];
  const left = (enemy.attackFacing > 0 ? anchorX - width : -anchorX) * 1.1;
  const right = (enemy.attackFacing > 0 ? anchorX : width - anchorX) * 1.1;
  return {
    frame,
    left: enemy.aimX + Math.max(-46, left),
    right: enemy.aimX + Math.min(46, right),
    top: enemy.floorY - Math.min(122, height * 1.1),
    bottom: enemy.floorY,
    damaging: age >= ORACLE_HAND_CONTACT && age < 1120,
  };
}

// Rendering and collision consume the same projectile positions.
export function oracleProjectiles(enemy: Enemy, time: number) {
  const age = time - enemy.attackStartedAt;
  if (enemy.hp <= 0 || enemy.attackVariant === 'slam') return [];
  const originX = enemy.attackX + enemy.attackFacing * 52;
  const originY = enemy.floorY - 151;
  const targetX =
    enemy.attackX +
    enemy.attackFacing * Math.max(110, Math.abs(enemy.aimX - enemy.attackX));
  const dx = targetX - originX,
    dy = enemy.aimY - originY;
  const distance = Math.hypot(dx, dy),
    angle = Math.atan2(dy, dx);
  return [460, 700].flatMap((born, index) => {
    const flight = age - born;
    if (flight < 0 || flight > 850 || age >= 1320) return [];
    const rock = enemy.attackVariant === 'volley' && index === 0;
    const travel = (flight / 1000) * (rock ? 480 : 620);
    return [
      {
        x: originX + (dx / distance) * travel,
        y: originY + (dy / distance) * travel,
        angle,
        age: flight,
        rock,
        blue: enemy.attackVariant === 'volley',
      },
    ];
  });
}

export function oracleHitsPlayer(
  enemy: Enemy,
  player: { x: number; y: number },
  time: number,
) {
  if (enemy.attackVariant === 'slam') {
    const hand = oracleHand(enemy, time);
    return (
      !!hand?.damaging &&
      player.x + 16 > hand.left &&
      player.x - 16 < hand.right &&
      player.y > hand.top &&
      player.y - 68 < hand.bottom
    );
  }
  return oracleProjectiles(enemy, time).some(
    (shot) =>
      Math.abs(player.x - shot.x) < (shot.rock ? 49 : 34) &&
      shot.y > player.y - 82 &&
      shot.y < player.y + 12,
  );
}
