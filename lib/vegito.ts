import {
  damageEnemy,
  type CombatEvent,
  type Enemy,
  type Fighter,
} from './combat';
import { ENEMY_TYPES } from './enemies';
import { reaperHidden } from './reaper-attacks';
import { WORLD_WIDTH } from './world';

export const VEGITO_SCALE = 2.1;
export const FUSION_DURATION = 3400;
export const VEGITO_SKILLS = {
  punch: {
    name: '连拳',
    key: 'J',
    duration: 420,
    cooldown: 230,
    cost: 0,
    damage: 19,
    tip: '连续按 J 接三段拳，第三拳击退',
  },
  kick: {
    name: '连踢',
    key: 'K',
    duration: 520,
    cooldown: 330,
    cost: 0,
    damage: 27,
    tip: '地面连踢，空中变为飞踢',
  },
  sword: {
    name: '气剑横斩',
    key: 'L',
    duration: 760,
    cooldown: 950,
    cost: 14,
    damage: 43,
    tip: '金色气剑向前横扫',
  },
  spin: {
    name: '旋风连踢',
    key: 'I',
    duration: 780,
    cooldown: 1200,
    cost: 14,
    damage: 15,
    tip: '向前旋转，最多命中三次',
  },
  ki: {
    name: '气弹',
    key: 'U',
    duration: 580,
    cooldown: 500,
    cost: 10,
    damage: 27,
    tip: '快速发射金色气弹',
  },
  barrage: {
    name: '连发气弹',
    key: 'O',
    duration: 900,
    cooldown: 1300,
    cost: 18,
    damage: 15,
    tip: '连续发射三枚气弹',
  },
  orb: {
    name: '螺旋气功弹',
    key: 'P',
    duration: 1100,
    cooldown: 1800,
    cost: 26,
    damage: 62,
    tip: '蓄力后发射大型蓝色气功弹',
  },
  beam: {
    name: '龟派气功',
    key: 'H',
    duration: 1600,
    cooldown: 2500,
    cost: 34,
    damage: 20,
    tip: '蓄力后持续发射，可穿透多个敌人',
  },
  finalBeam: {
    name: '终极龟派气功',
    key: 'G',
    duration: 2050,
    cooldown: 5000,
    cost: 52,
    damage: 28,
    tip: '更长蓄力、更宽光束，最多四次伤害',
  },
  airWave: {
    name: '空中气波',
    key: 'Y',
    duration: 760,
    cooldown: 1400,
    cost: 16,
    damage: 39,
    tip: '跳起向斜下方发射气功波',
  },
  teleport: {
    name: '瞬间移动',
    key: 'F',
    duration: 500,
    cooldown: 1600,
    cost: 12,
    damage: 0,
    tip: '向前闪移，短暂无敌',
  },
  burst: {
    name: '爆气',
    key: 'B',
    duration: 900,
    cooldown: 2400,
    cost: 20,
    damage: 42,
    tip: '气焰震退身边两侧的敌人',
  },
  awaken: {
    name: '赛亚爆发',
    key: 'R',
    duration: 1900,
    cooldown: 7000,
    cost: 55,
    damage: 95,
    tip: '金色觉醒气焰爆发，攻击周围敌人',
  },
  charge: {
    name: '蓄气',
    key: 'T',
    duration: 1450,
    cooldown: 1800,
    cost: 0,
    damage: 0,
    tip: '完成蓄气回复 30 点法力，被击中会中断',
  },
} as const;
export type VegitoSkill = keyof typeof VEGITO_SKILLS;
export const VEGITO_KEYS = Object.keys(VEGITO_SKILLS) as VegitoSkill[];
export type VegitoPlayer = Fighter & {
  vy: number;
  grounded: boolean;
  facing: number;
  mp: number;
};
export type VegitoAction = {
  skill: VegitoSkill;
  born: number;
  facing: number;
  combo: number;
  airborne: boolean;
  hits: Set<string>;
  releases: number;
  moved: boolean;
};
export type VegitoProjectile = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  born: number;
  facing: number;
  kind: 'ki' | 'orb' | 'air';
  damage: number;
  hits: Set<number>;
  dead: boolean;
};
export type VegitoState = {
  action: VegitoAction | null;
  cooldowns: Partial<Record<VegitoSkill, number>>;
  projectiles: VegitoProjectile[];
  impacts: { x: number; y: number; born: number }[];
  combo: number;
  lastPunchAt: number;
};
export function createVegitoState(): VegitoState {
  return {
    action: null,
    cooldowns: {},
    projectiles: [],
    impacts: [],
    combo: 0,
    lastPunchAt: -Infinity,
  };
}
export function canStartVegito(
  state: VegitoState,
  skill: VegitoSkill,
  time: number,
) {
  if (time < (state.cooldowns[skill] ?? 0)) return false;
  const a = state.action;
  return (
    !a ||
    ((a.skill === 'punch' || a.skill === 'kick') &&
      time - a.born >= 240 &&
      a.hits.size > 0)
  );
}
export function startVegitoSkill(
  state: VegitoState,
  skill: VegitoSkill,
  player: VegitoPlayer,
  time: number,
) {
  if (!canStartVegito(state, skill, time)) return false;
  const def = VEGITO_SKILLS[skill];
  if (player.mp < def.cost) return false;
  state.combo =
    skill === 'punch' && time - state.lastPunchAt < 900
      ? (state.combo + 1) % 3
      : 0;
  if (skill === 'punch') state.lastPunchAt = time;
  state.action = {
    skill,
    born: time,
    facing: player.facing,
    combo: state.combo,
    airborne: !player.grounded,
    hits: new Set(),
    releases: 0,
    moved: false,
  };
  state.cooldowns[skill] = time + def.cooldown;
  if (skill === 'airWave' && player.grounded) {
    player.vy = -570;
    player.grounded = false;
  }
  if (skill === 'teleport') player.invulnerableUntil = time + 400;
  return true;
}
export function moveVegito(
  state: VegitoState,
  player: VegitoPlayer,
  time: number,
) {
  const a = state.action;
  if (!a) return;
  const age = time - a.born;
  if (a.skill === 'spin' && age >= 180 && age < 650) player.vx = a.facing * 290;
  if (
    ['beam', 'finalBeam', 'charge', 'awaken'].includes(a.skill) &&
    player.grounded
  )
    player.vx *= 0.1;
  if (a.skill === 'teleport' && age >= 260 && !a.moved) {
    player.x = Math.max(
      35,
      Math.min(WORLD_WIDTH - 35, player.x + a.facing * 185),
    );
    a.moved = true;
  }
}
export function vegitoBeam(
  state: VegitoState,
  player: VegitoPlayer,
  time: number,
) {
  const a = state.action;
  if (!a || (a.skill !== 'beam' && a.skill !== 'finalBeam')) return null;
  const age = time - a.born,
    large = a.skill === 'finalBeam';
  const start = large ? 900 : 600,
    end = large ? 1580 : 1160;
  if (age < start || age >= end) return null;
  return {
    x: player.x + a.facing * 24,
    y: player.y - 40,
    facing: a.facing,
    length: large ? 860 : 730,
    halfHeight: large ? 44 : 23,
    large,
    phase: Math.floor((age - start) / (large ? 170 : 140)),
  };
}
export function stepVegito(
  state: VegitoState,
  player: VegitoPlayer,
  enemies: Enemy[],
  dt: number,
  time: number,
): CombatEvent[] {
  const events: CombatEvent[] = [];
  const hit = (
    enemy: Enemy,
    damage: number,
    facing: number,
    force: number,
    launch = 0,
  ) => {
    const event = damageEnemy(enemy, damage, facing, 28 + force * 10, time, {
      force,
      launch,
      stun: 240,
    });
    event.element = 'blue';
    event.finisher = force > 2.5;
    events.push(event);
    state.impacts.push({
      x: enemy.x,
      y: enemy.y - ENEMY_TYPES[enemy.kind].height * 0.6,
      born: time,
    });
  };
  const a = state.action;
  if (a) {
    const age = time - a.born,
      def = VEGITO_SKILLS[a.skill];
    let releases: readonly number[] = [],
      projectileKind: VegitoProjectile['kind'] = 'ki';
    if (a.skill === 'ki') releases = [240];
    if (a.skill === 'barrage') releases = [200, 340, 480];
    if (a.skill === 'orb') {
      releases = [700];
      projectileKind = 'orb';
    }
    if (a.skill === 'airWave') {
      releases = [300];
      projectileKind = 'air';
    }
    while (a.releases < releases.length && age >= releases[a.releases]) {
      const x = player.x + a.facing * 30,
        y = player.y - 40;
      state.projectiles.push({
        x,
        y,
        previousX: x,
        previousY: y,
        vx: a.facing * (projectileKind === 'ki' ? 630 : 560),
        vy: projectileKind === 'air' ? 350 : 0,
        born: time,
        facing: a.facing,
        kind: projectileKind,
        damage: def.damage,
        hits: new Set(),
        dead: false,
      });
      a.releases++;
    }
    if (a.skill === 'charge' && age >= 1200 && !a.moved) {
      player.mp = Math.min(100, player.mp + 30);
      a.moved = true;
    }
    const beam = vegitoBeam(state, player, time);
    let active = false,
      range = 42,
      top = -65,
      bottom = -5,
      both = false,
      phase = 0;
    if (a.skill === 'punch') {
      active = age >= 130 && age < 270;
      range = a.combo === 2 ? 42 : 36;
      top = -54;
      bottom = -26;
    }
    if (a.skill === 'kick') {
      active = age >= 180 && age < 340;
      range = 42;
    }
    if (a.skill === 'sword') {
      active = age >= 260 && age < 560;
      range = 96;
    }
    if (a.skill === 'spin') {
      active = age >= 220 && age < 660;
      range = 42;
      phase = Math.floor((age - 220) / 150);
    }
    if (a.skill === 'burst') {
      active = age >= 360 && age < 520;
      range = 125;
      top = -125;
      both = true;
    }
    if (a.skill === 'awaken') {
      active = age >= 1400 && age < 1590;
      range = 245;
      top = -240;
      both = true;
    }
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || reaperHidden(enemy, time)) continue;
      const ed = ENEMY_TYPES[enemy.kind];
      let overlaps = false,
        hitPhase = phase;
      if (beam) {
        const localX = (enemy.x - beam.x) * beam.facing;
        overlaps =
          localX + ed.halfWidth > 0 &&
          localX - ed.halfWidth < beam.length &&
          enemy.y > beam.y - beam.halfHeight &&
          enemy.y - ed.height < beam.y + beam.halfHeight;
        hitPhase = beam.phase;
      } else if (active) {
        const localX = (enemy.x - player.x) * a.facing;
        overlaps =
          localX + ed.halfWidth > (both ? -range : 0) &&
          localX - ed.halfWidth < range &&
          enemy.y > player.y + top &&
          enemy.y - ed.height < player.y + bottom;
      }
      const key = `${enemy.id}:${hitPhase}`;
      if (overlaps && !a.hits.has(key)) {
        a.hits.add(key);
        const heavy =
          a.skill === 'awaken' || (a.skill === 'punch' && a.combo === 2);
        hit(
          enemy,
          def.damage + (a.skill === 'punch' && heavy ? 10 : 0),
          both ? Math.sign(enemy.x - player.x) || a.facing : a.facing,
          heavy ? 3 : beam ? 1.7 : 1.5,
          a.skill === 'burst' ? 280 : 0,
        );
      }
    }
    if (age >= def.duration) state.action = null;
  }
  for (const p of state.projectiles) {
    p.previousX = p.x;
    p.previousY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const radius = p.kind === 'ki' ? 9 : 24;
    for (const enemy of enemies) {
      if (
        p.dead ||
        enemy.hp <= 0 ||
        p.hits.has(enemy.id) ||
        reaperHidden(enemy, time)
      )
        continue;
      const ed = ENEMY_TYPES[enemy.kind];
      if (
        Math.max(p.x, p.previousX) + radius > enemy.x - ed.halfWidth &&
        Math.min(p.x, p.previousX) - radius < enemy.x + ed.halfWidth &&
        Math.max(p.y, p.previousY) + radius > enemy.y - ed.height &&
        Math.min(p.y, p.previousY) - radius < enemy.y
      ) {
        p.hits.add(enemy.id);
        hit(enemy, p.damage, p.facing, p.kind === 'ki' ? 1.2 : 2.4);
        p.dead = true;
      }
    }
    if (
      time - p.born > 2000 ||
      p.y > 560 ||
      p.x < -80 ||
      p.x > WORLD_WIDTH + 80
    )
      p.dead = true;
  }
  state.projectiles = state.projectiles.filter((p) => !p.dead);
  state.impacts = state.impacts.filter((p) => time - p.born < 250).slice(-20);
  return events;
}
