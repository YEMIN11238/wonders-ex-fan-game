import type { EnemyKind } from './enemies';
import type { LevelId } from './levels';
import { GROUND_Y } from './world';

type Spawn = {
  kind: EnemyKind;
  x: number;
  y: number;
  minX: number;
  maxX: number;
};
const ground = (kind: EnemyKind, x: number, radius = 80): Spawn => ({
  kind,
  x,
  y: GROUND_Y,
  minX: x - radius,
  maxX: x + radius,
});
const ledge = (kind: EnemyKind, x: number, y: number, radius = 65): Spawn => ({
  kind,
  x,
  y,
  minX: x - radius,
  maxX: x + radius,
});

// New encounters occupy the added route, leaving space before the boss arena.
export const REINFORCEMENTS: Record<LevelId, Spawn[]> = {
  1: [
    ground('totemDark', 2260),
    ledge('totem', 2485, 355),
    ledge('totemDark', 2810, 300),
    ground('totem', 2970),
    ledge('totem', 3170, 365),
    ground('totemDark', 3390),
    ledge('totemDark', 3510, 300),
    ground('totem', 3890),
    ledge('totemDark', 4225, 285),
    ground('totem', 4510),
  ],
  2: [
    ledge('birdRed', 2360, 360),
    ground('bird', 2500),
    ledge('bird', 2695, 300),
    ground('birdRed', 2870),
    ledge('birdRed', 3050, 355, 80),
    ground('bird', 3440),
    ledge('bird', 3745, 365),
    ledge('birdRed', 4085, 300, 75),
    ground('birdRed', 4280),
    ledge('bird', 4455, 355, 75),
  ],
  3: [
    ledge('spikeGold', 2360, 355),
    ground('spike', 2510),
    ledge('spike', 2700, 295),
    ground('spikeGold', 2870),
    ledge('spikeGold', 3045, 360),
    ledge('spike', 3390, 300),
    ground('spike', 3590),
    ledge('spikeGold', 3740, 355),
    ledge('spikeGold', 4100, 290, 80),
    ground('spike', 4460),
  ],
  4: [],
};

export const RUINS_ENCOUNTER: Spawn[] = [
  ground('horse', 650, 100),
  ledge('imp', 805, 300),
  ledge('impMage', 1160, 355),
  ground('horseBlue', 1290, 105),
  ledge('impBlade', 1495, 290),
  ground('imp', 1690),
  ledge('impMage', 1845, 355, 75),
  ground('horse', 2100, 100),
  ledge('impBlade', 2235, 360),
  ground('horseBlue', 2530, 110),
  ledge('impMage', 2920, 355),
  ground('imp', 3110),
  ledge('impBlade', 3270, 290),
  ground('horse', 3510, 100),
  ledge('impMage', 3620, 355),
  ledge('impBlade', 3975, 300, 75),
  ground('horseBlue', 4200, 100),
  ledge('imp', 4345, 355, 75),
  { kind: 'reaper', x: 4890, y: GROUND_Y, minX: 4620, maxX: 5040 },
];
