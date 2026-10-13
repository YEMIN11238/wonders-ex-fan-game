import { ATTACKS, type AttackKind } from './attacks';
import { GROUND_Y } from './world';
import {
  ENEMY_TYPES,
  GOLEM_SLAM,
  DRILL_VOLLEY,
  DEMON_CLEAVE,
  ORACLE_SUMMON,
  type EnemyKind,
} from './enemies';
import { drillHitsPlayer } from './drill-projectiles';
import { demonHitsPlayer } from './demon-attacks';
import { oracleHitsPlayer } from './oracle-attacks';
import type { LevelId } from './levels';
import { REINFORCEMENTS, RUINS_ENCOUNTER } from './extended-encounters';
import { ruinsHitsPlayer } from './ruins-attacks';
import {
  REAPER_MOVES,
  reaperCasting,
  reaperHidden,
  reaperHitsPlayer,
  stepReaper,
} from './reaper-attacks';

export const PLAYER_HP = 100;
export type Enemy = {
  id: number;
  kind: EnemyKind;
  maxHp: number;
  idleUntil: number;
  x: number;
  y: number;
  home: number;
  minX: number;
  maxX: number;
  direction: number;
  hp: number;
  hurtUntil: number;
  deadAt: number;
  respawnAt: number;
  lastHitSwing: number;
  attackStartedAt: number;
  nextAttackAt: number;
  attackFacing: number;
  attackHit: boolean;
  floorY: number;
  knockVx: number;
  knockVy: number;
  stunUntil: number;
  attackVariant: 'punch' | 'slam' | 'shot' | 'volley';
  attackCycle: number;
  attackX: number;
  aimX: number;
  aimY: number;
};
export type Fighter = {
  x: number;
  y: number;
  vx: number;
  hp: number;
  hurtUntil: number;
  invulnerableUntil?: number;
  crouching?: boolean;
};
export type CombatEvent = {
  x: number;
  y: number;
  damage: number;
  target: 'enemy' | 'player';
  defeated: boolean;
  enemyId?: number;
  impactY?: number;
  force?: number;
  element?: 'purple' | 'blue' | 'fire' | 'demon';
  finisher?: boolean;
};
export type Swing = {
  id: number;
  age: number;
  facing: number;
  kind: AttackKind;
};

export function createEnemies(level: LevelId = 1): Enemy[] {
  const openingSpawns =
    level === 3
      ? [
          { kind: 'spike' as const, x: 610, y: GROUND_Y, minX: 540, maxX: 690 },
          { kind: 'spikeGold' as const, x: 850, y: 290, minX: 765, maxX: 915 },
          {
            kind: 'spikeGold' as const,
            x: 1030,
            y: GROUND_Y,
            minX: 960,
            maxX: 1090,
          },
          { kind: 'spike' as const, x: 1190, y: 350, minX: 1135, maxX: 1255 },
          {
            kind: 'spikeGold' as const,
            x: 1540,
            y: 285,
            minX: 1485,
            maxX: 1630,
          },
          {
            kind: 'spike' as const,
            x: 1740,
            y: GROUND_Y,
            minX: 1670,
            maxX: 1790,
          },
          {
            kind: 'spikeGold' as const,
            x: 1930,
            y: 355,
            minX: 1845,
            maxX: 1995,
          },
          {
            kind: 'drillBoss' as const,
            x: 2370,
            y: GROUND_Y,
            minX: 2240,
            maxX: 2440,
          },
        ]
      : level === 2
        ? [
            {
              kind: 'bird' as const,
              x: 575,
              y: GROUND_Y,
              minX: 545,
              maxX: 650,
            },
            {
              kind: 'birdRed' as const,
              x: 900,
              y: GROUND_Y,
              minX: 820,
              maxX: 980,
            },
            { kind: 'bird' as const, x: 1170, y: 355, minX: 1090, maxX: 1240 },
            {
              kind: 'birdRed' as const,
              x: 1520,
              y: 295,
              minX: 1450,
              maxX: 1590,
            },
            { kind: 'bird' as const, x: 1845, y: 355, minX: 1800, maxX: 1965 },
            {
              kind: 'birdRed' as const,
              x: 2020,
              y: GROUND_Y,
              minX: 1970,
              maxX: 2110,
            },
            {
              kind: 'oracle' as const,
              x: 2370,
              y: GROUND_Y,
              minX: 2240,
              maxX: 2440,
            },
          ]
        : [
            {
              kind: 'totem' as const,
              x: 650,
              y: GROUND_Y,
              minX: 555,
              maxX: 710,
            },
            {
              kind: 'totemDark' as const,
              x: 945,
              y: GROUND_Y,
              minX: 845,
              maxX: 1060,
            },
            { kind: 'totem' as const, x: 1220, y: 365, minX: 1150, maxX: 1270 },
            {
              kind: 'totemDark' as const,
              x: 1770,
              y: GROUND_Y,
              minX: 1700,
              maxX: 1850,
            },
            { kind: 'totem' as const, x: 2020, y: 345, minX: 1930, maxX: 2080 },
            {
              kind: 'demon' as const,
              x: 2370,
              y: GROUND_Y,
              minX: 2240,
              maxX: 2460,
            },
          ];
  const spawns =
    level === 4
      ? RUINS_ENCOUNTER
      : [
          ...openingSpawns.filter((s) => !ENEMY_TYPES[s.kind].boss),
          ...REINFORCEMENTS[level],
          {
            ...openingSpawns[openingSpawns.length - 1],
            x: 4890,
            minX: 4660,
            maxX: 5040,
          },
        ];
  return spawns.map((spawn, id) => ({
    ...spawn,
    floorY: spawn.y,
    knockVx: 0,
    knockVy: 0,
    stunUntil: 0,
    attackVariant: 'punch',
    attackCycle: 0,
    attackX: spawn.x,
    aimX: spawn.x - 300,
    aimY: spawn.y - 34,
    id,
    home: spawn.x,
    direction: -1,
    hp: ENEMY_TYPES[spawn.kind].hp,
    maxHp: ENEMY_TYPES[spawn.kind].hp,
    idleUntil: !ENEMY_TYPES[spawn.kind].boss ? 700 + id * 120 : 0,
    hurtUntil: 0,
    deadAt: 0,
    respawnAt: 0,
    lastHitSwing: -1,
    attackStartedAt: -Infinity,
    nextAttackAt: 0,
    attackFacing: -1,
    attackHit: false,
  }));
}
export function enemyAttack(enemy: Enemy) {
  if (enemy.kind === 'reaper') {
    return REAPER_MOVES[enemy.attackVariant];
  }
  if (enemy.kind === 'demon' && enemy.attackVariant === 'slam')
    return DEMON_CLEAVE;
  if (enemy.kind === 'oracle' && enemy.attackVariant === 'slam')
    return ORACLE_SUMMON;
  if (enemy.kind === 'drillBoss' && enemy.attackVariant === 'volley')
    return DRILL_VOLLEY;
  return enemy.kind === 'golem' && enemy.attackVariant === 'slam'
    ? GOLEM_SLAM
    : ENEMY_TYPES[enemy.kind].attack;
}

export function isEnemyAttacking(enemy: Enemy, time: number) {
  return (
    enemy.hp > 0 &&
    time - enemy.attackStartedAt >= 0 &&
    time - enemy.attackStartedAt < enemyAttack(enemy).duration
  );
}

export function damageEnemy(
  enemy: Enemy,
  damage: number,
  facing: number,
  knockback: number,
  time: number,
  reaction?: { force: number; launch?: number; stun?: number },
): CombatEvent {
  const def = ENEMY_TYPES[enemy.kind];
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.hurtUntil = time + def.stagger;
  if (!def.boss) {
    enemy.attackStartedAt = -Infinity;
    enemy.nextAttackAt = Math.max(enemy.nextAttackAt, time + 700);
  }
  // This boss takes full damage during a cast, but ordinary hit-stun cannot
  // erase its whole move set. Recovery flinches never postpone its next turn.
  if (enemy.kind === 'reaper') {
    enemy.knockVx = enemy.knockVy = 0;
    enemy.stunUntil = reaperCasting(enemy, time)
      ? 0
      : Math.min(time + 160, enemy.nextAttackAt);
  } else if (reaction) {
    const resistance = def.boss ? 0.22 : 1;
    enemy.knockVx = facing * knockback * 8 * resistance;
    enemy.knockVy = Math.min(
      enemy.knockVy,
      -(reaction.launch ?? 0) * resistance,
    );
    enemy.stunUntil = Math.max(
      enemy.stunUntil,
      time + (reaction.stun ?? 280) * (def.boss ? 0.5 : 1),
    );
    enemy.attackStartedAt = -Infinity;
    enemy.nextAttackAt = Math.max(enemy.nextAttackAt, enemy.stunUntil + 250);
  } else
    enemy.x = Math.max(
      enemy.minX,
      Math.min(
        enemy.maxX,
        enemy.x + facing * (def.boss ? Math.min(5, knockback) : knockback),
      ),
    );
  if (!enemy.hp) {
    enemy.deadAt = time;
    enemy.respawnAt = time + def.respawn;
  }
  return {
    x: enemy.x,
    y: enemy.y - def.height - 14,
    damage,
    target: 'enemy',
    defeated: enemy.hp === 0,
    enemyId: enemy.id,
    impactY: enemy.y - def.height * 0.55,
    force: reaction?.force,
  };
}

// Coordinates are world pixels, with each character anchored at their feet.
export function stepCombat(
  enemies: Enemy[],
  player: Fighter,
  swing: Swing,
  dt: number,
  time: number,
): CombatEvent[] {
  const events: CombatEvent[] = [];
  const attack = ATTACKS[swing.kind];
  const strikeDirection = swing.facing * attack.direction;
  const left =
    swing.kind === 'stab'
      ? player.x - 30
      : strikeDirection > 0
        ? player.x + 10
        : player.x - attack.range;
  const right =
    swing.kind === 'stab'
      ? player.x + 30
      : strikeDirection > 0
        ? player.x + attack.range
        : player.x - 10;
  for (const enemy of enemies) {
    const def = ENEMY_TYPES[enemy.kind];
    // Keep launched enemies on their own platform, including after death.
    if (enemy.knockVy !== 0 || enemy.y < enemy.floorY) {
      enemy.knockVy += 1450 * dt;
      enemy.y += enemy.knockVy * dt;
      if (enemy.y >= enemy.floorY) {
        enemy.y = enemy.floorY;
        enemy.knockVy = 0;
      }
    }
    if (Math.abs(enemy.knockVx) > 1) {
      enemy.x = Math.max(
        enemy.minX,
        Math.min(enemy.maxX, enemy.x + enemy.knockVx * dt),
      );
      enemy.knockVx *= Math.exp(-7 * dt);
    }
    if (enemy.hp <= 0) {
      if (time < enemy.respawnAt) continue;
      enemy.hp = enemy.maxHp;
      enemy.x = enemy.home;
      enemy.y = enemy.floorY;
      enemy.knockVx = enemy.knockVy = enemy.stunUntil = 0;
      enemy.hurtUntil = time + 300;
      enemy.attackStartedAt = -Infinity;
      enemy.nextAttackAt = time + 800;
      enemy.attackHit = false;
      enemy.idleUntil = time + 400;
    }
    const hit =
      player.hp > 0 &&
      !reaperHidden(enemy, time) &&
      swing.age >= attack.activeStart &&
      swing.age < attack.activeEnd &&
      enemy.lastHitSwing !== swing.id &&
      left < enemy.x + def.halfWidth &&
      right > enemy.x - def.halfWidth &&
      player.y + attack.top < enemy.y &&
      player.y + attack.bottom > enemy.y - def.height;
    if (hit) {
      enemy.lastHitSwing = swing.id;
      events.push(
        damageEnemy(
          enemy,
          attack.damage,
          strikeDirection,
          swing.kind === 'kick' ? 35 : 22,
          time,
        ),
      );
    }
    if (
      !enemy.hp ||
      (!reaperCasting(enemy, time) &&
        (time < enemy.stunUntil || enemy.y < enemy.floorY)) ||
      (!def.boss && time < enemy.hurtUntil)
    )
      continue;
    const sameLevel = Math.abs(player.y - enemy.y) < def.attackHeight;
    if (
      !isEnemyAttacking(enemy, time) &&
      player.hp > 0 &&
      sameLevel &&
      Math.abs(enemy.x - player.x) <= def.triggerRange &&
      time >= enemy.nextAttackAt
    ) {
      enemy.attackStartedAt = time;
      enemy.attackCycle++;
      enemy.attackVariant =
        enemy.kind === 'reaper'
          ? (['slam', 'punch', 'shot', 'volley'] as const)[
              (enemy.attackCycle - 1) % 4
            ]
          : enemy.kind === 'oracle'
            ? enemy.attackCycle % 3 === 0
              ? 'slam'
              : enemy.attackCycle % 3 === 1
                ? 'shot'
                : 'volley'
            : enemy.kind === 'drillBoss'
              ? enemy.attackCycle % 2
                ? 'shot'
                : 'volley'
              : (enemy.kind === 'golem' || enemy.kind === 'demon') &&
                  enemy.attackCycle % 2
                ? 'slam'
                : 'punch';
      enemy.nextAttackAt = time + enemyAttack(enemy).cooldown;
      enemy.attackFacing = player.x < enemy.x ? -1 : 1;
      enemy.attackX = enemy.x;
      enemy.aimX = player.x;
      enemy.aimY = player.y - 34;
      enemy.direction = enemy.attackFacing;
      enemy.attackHit = false;
    }
    if (isEnemyAttacking(enemy, time)) {
      const move = enemyAttack(enemy);
      const age = time - enemy.attackStartedAt;
      stepReaper(enemy, time);
      const axeLeft = enemy.attackFacing > 0 ? enemy.x : enemy.x - move.range;
      const axeRight = enemy.attackFacing > 0 ? enemy.x + move.range : enemy.x;
      const inRange =
        enemy.kind === 'reaper'
          ? reaperHitsPlayer(enemy, player, time)
          : enemy.kind === 'impMage'
            ? ruinsHitsPlayer(enemy, player, time)
            : enemy.kind === 'demon'
              ? demonHitsPlayer(enemy, player, time)
              : enemy.kind === 'oracle'
                ? oracleHitsPlayer(enemy, player, time)
                : enemy.kind === 'drillBoss'
                  ? drillHitsPlayer(enemy, player, time)
                  : player.x + 18 > axeLeft &&
                    player.x - 18 < axeRight &&
                    player.y > enemy.y - def.attackHeight &&
                    player.y - 68 < enemy.y;
      if (
        age >= move.activeStart &&
        age < move.activeEnd &&
        !enemy.attackHit &&
        player.hp > 0 &&
        time >= player.hurtUntil &&
        time >= (player.invulnerableUntil ?? 0) &&
        inRange
      ) {
        enemy.attackHit = true;
        player.hp = Math.max(0, player.hp - move.damage);
        player.hurtUntil = time + 1000;
        player.vx = enemy.attackFacing * def.knockback;
        events.push({
          x: player.x,
          y: player.y - 94,
          damage: move.damage,
          force:
            enemy.kind === 'reaper'
              ? 2.5
              : enemy.kind === 'drillBoss'
                ? 2.2
                : enemy.kind === 'golem'
                  ? enemy.attackVariant === 'slam'
                    ? 2.4
                    : 1.8
                  : 1.3,
          target: 'player',
          defeated: player.hp === 0,
        });
      }
    } else if (time >= enemy.idleUntil && time >= enemy.hurtUntil) {
      enemy.x += enemy.direction * def.speed * dt;
      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.direction = 1;
        enemy.idleUntil = time + 450;
      }
      if (enemy.x >= enemy.maxX) {
        enemy.x = enemy.maxX;
        enemy.direction = -1;
        enemy.idleUntil = time + 450;
      }
    }
  }
  return events;
}
