import type { Enemy, Fighter } from './combat';

// The imp's source fireball and its hit test share one position/lifetime.
export function ruinsProjectile(enemy: Enemy, time: number) {
  if (enemy.kind !== 'impMage' || enemy.hp <= 0) return null;
  const age = time - enemy.attackStartedAt - 410;
  if (age < 0 || age >= 670) return null;
  return {
    x: enemy.attackX + enemy.attackFacing * (24 + age * 0.5),
    y: enemy.floorY - 34,
    rx: 13,
    ry: 13,
    age,
  };
}
export function ruinsHitsPlayer(enemy: Enemy, player: Fighter, time: number) {
  const shot = ruinsProjectile(enemy, time);
  return (
    !!shot &&
    Math.abs(player.x - shot.x) < shot.rx + 16 &&
    shot.y + shot.ry > player.y - 68 &&
    shot.y - shot.ry < player.y
  );
}
