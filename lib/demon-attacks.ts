import type { Enemy } from './combat';

type ClawBox = readonly [
  left: number,
  top: number,
  right: number,
  bottom: number,
];

// World-pixel insets inside the pink claw trails at the demon's 1.5x scale.
// The next sweep frame retracts the claws; the raised arms and the large body
// rectangle must never inherit the attack's reach.
const sweepOut: readonly ClawBox[] = [
  [0, -73, 100, -50],
  [100, -77, 135, -52],
  [135, -93, 161, -65],
  [161, -104, 178, -80],
];
const sweepBack: readonly ClawBox[] = [
  [38, -88, 75, -77],
  [80, -80, 114, -64],
  [114, -93, 135, -72],
  [137, -100, 156, -87],
];
const cleaveLanding: readonly ClawBox[] = [
  [-25, -59, 4, -13],
  [90, -36, 117, -10],
  [118, -54, 129, -25],
];

export function demonHitsPlayer(
  enemy: Enemy,
  player: { x: number; y: number },
  time: number,
) {
  if (enemy.kind !== 'demon' || enemy.hp <= 0) return false;
  const age = time - enemy.attackStartedAt;
  const boxes =
    enemy.attackVariant === 'slam'
      ? age >= 740 && age < 860
        ? cleaveLanding
        : []
      : age >= 460 && age < 600
        ? sweepOut
        : age >= 600 && age < 740
          ? sweepBack
          : [];
  const x = (player.x - enemy.x) * enemy.attackFacing;
  const y = player.y - enemy.y;
  return boxes.some(
    ([left, top, right, bottom]) =>
      x + 18 > left && x - 18 < right && y > top && y - 68 < bottom,
  );
}
