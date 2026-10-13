import {
  damageEnemy,
  type Enemy,
  type Fighter,
  type CombatEvent,
} from './combat';
import { ENEMY_TYPES } from './enemies';
import { GROUND_Y, WORLD_WIDTH } from './world';
import { reaperCasting, reaperHidden } from './reaper-attacks';

export const AKUMA_SCALE = 1.8;
export const AKUMA_SKILLS = {
  punch: {
    name: '连拳',
    key: 'J',
    duration: 280,
    cooldown: 190,
    damage: 16,
    tip: '三段拳；命中后可提前接拳脚或技能，第三拳重击',
  },
  kick: {
    name: '连踢',
    key: 'K',
    duration: 340,
    cooldown: 250,
    damage: 24,
    tip: '轻踢接高踢；蹲下接低踢、扫堂腿，空中变飞踢',
  },
  uppercut: {
    name: '升龙拳',
    key: 'L',
    duration: 650,
    cooldown: 1000,
    damage: 32,
    tip: '蓝焰升龙，将小怪击飞，可在空中接旋风腿或波动弹',
  },
  spin: {
    name: '旋风腿',
    key: 'I',
    duration: 720,
    cooldown: 1100,
    damage: 15,
    tip: '向前旋转突进，最多命中三次',
  },
  purpleWave: {
    name: '紫焰波',
    key: 'U',
    duration: 520,
    cooldown: 700,
    damage: 30,
    tip: '地面直射，空中向斜下方发射',
  },
  fireWave: {
    name: '灼热波',
    key: 'O',
    duration: 700,
    cooldown: 1500,
    damage: 46,
    tip: '火焰弹命中后爆燃',
  },
  chargedWave: {
    name: '蓄力波',
    key: 'P',
    duration: 800,
    cooldown: 1600,
    damage: 58,
    tip: '蓄力后发出中型紫焰波，空中可斜射',
  },
  giantWave: {
    name: '灭杀波',
    key: 'H',
    duration: 1000,
    cooldown: 2800,
    damage: 78,
    tip: '大型穿透波，能够击中沿途多个敌人',
  },
  airDive: {
    name: '空中强袭',
    key: 'Y',
    duration: 700,
    cooldown: 1200,
    damage: 38,
    tip: '起跳后斜向强袭；在空中直接俯冲',
  },
  teleport: {
    name: '闪身',
    key: 'F',
    duration: 470,
    cooldown: 1400,
    damage: 0,
    tip: '向前闪移，短暂无敌，不造成伤害',
  },
  blueRush: {
    name: '蓝焰突袭',
    key: 'G',
    duration: 780,
    cooldown: 2200,
    damage: 22,
    tip: '带蓝焰向前连斩，最多命中三次',
  },
  throw: {
    name: '近身摔投',
    key: 'T',
    duration: 650,
    cooldown: 1400,
    damage: 55,
    tip: '必须靠近敌人，摔投并击退',
  },
  powerBurst: {
    name: '爆气',
    key: 'B',
    duration: 800,
    cooldown: 2400,
    damage: 42,
    tip: '黑红气焰爆发，攻击身边两侧',
  },
  ragingDemon: {
    name: '瞬狱杀',
    key: 'R',
    duration: 1450,
    cooldown: 6000,
    damage: 16,
    tip: '残影锁敌，连续追击后爆发终结重击',
  },
} as const;
export type AkumaSkill = keyof typeof AKUMA_SKILLS;
export const AKUMA_KEYS = Object.keys(AKUMA_SKILLS) as AkumaSkill[];
export type AkumaPlayer = Fighter & {
  vy: number;
  grounded: boolean;
  facing: number;
};
export type AkumaAction = {
  skill: AkumaSkill;
  born: number;
  facing: number;
  pose: string;
  airborne: boolean;
  hits: Set<string>;
  launched: boolean;
  lifted: boolean;
  target: number | null;
};
export type ProjectileKind = 'purple' | 'fire' | 'charged' | 'giant';
export type AkumaProjectile = {
  id: number;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  born: number;
  damage: number;
  hits: Set<number>;
  dead: boolean;
  airborne: boolean;
};
export type AkumaHit = {
  x: number;
  y: number;
  born: number;
  kind: ProjectileKind | 'blue' | 'demon';
  facing: number;
};
export type AkumaState = {
  action: AkumaAction | null;
  cooldowns: Partial<Record<AkumaSkill, number>>;
  projectiles: AkumaProjectile[];
  impacts: AkumaHit[];
  nextProjectile: number;
  combo: number;
  lastComboAt: number;
  lastComboSkill: string;
};
export function createAkumaState(): AkumaState {
  return {
    action: null,
    cooldowns: {},
    projectiles: [],
    impacts: [],
    nextProjectile: 0,
    combo: 0,
    lastComboAt: -Infinity,
    lastComboSkill: '',
  };
}
export function canCancelAkuma(state: AkumaState, time: number) {
  const a = state.action;
  if (!a) return true;
  const age = time - a.born;
  if (age >= AKUMA_SKILLS[a.skill].duration) return true;
  if (a.hits.size === 0) return false;
  return (
    (a.skill === 'punch' && age >= 135) ||
    (a.skill === 'kick' && age >= 185) ||
    (a.skill === 'uppercut' && age >= 390) ||
    (a.skill === 'spin' && age >= 490)
  );
}
export function startAkumaSkill(
  state: AkumaState,
  skill: AkumaSkill,
  player: AkumaPlayer,
  time: number,
  crouching: boolean,
) {
  if (
    player.hp <= 0 ||
    (state.cooldowns[skill] ?? 0) > time ||
    !canCancelAkuma(state, time)
  )
    return false;
  const airborne = !player.grounded;
  if (
    (skill === 'punch' || skill === 'kick') &&
    state.lastComboSkill === skill &&
    time - state.lastComboAt < 1100
  )
    state.combo++;
  else state.combo = 0;
  state.lastComboSkill = skill;
  state.lastComboAt = time;
  let pose: string = skill;
  if (skill === 'punch')
    pose = airborne
      ? 'airPunch'
      : crouching
        ? 'lowPunch'
        : ['punchLight', 'punchMedium', 'punchHeavy'][state.combo % 3];
  if (skill === 'kick')
    pose = airborne
      ? state.combo % 2
        ? 'airKick'
        : 'airKickLight'
      : crouching
        ? state.combo % 2
          ? 'sweep'
          : 'lowKick'
        : state.combo % 2
          ? 'highKick'
          : 'kick';
  if (skill === 'spin') pose = airborne ? 'airSpin' : 'spin';
  if (skill === 'uppercut' && crouching) pose = 'lowUppercut';
  if (
    skill === 'purpleWave' ||
    skill === 'chargedWave' ||
    skill === 'giantWave'
  )
    pose = airborne ? 'airCast' : 'cast';
  if (skill === 'fireWave') pose = 'fireCast';
  if (skill === 'airDive') pose = 'airHeavy';
  state.action = {
    skill,
    born: time,
    facing: player.facing,
    pose,
    airborne,
    hits: new Set(),
    launched: false,
    lifted: false,
    target: null,
  };
  state.cooldowns[skill] = time + AKUMA_SKILLS[skill].cooldown;
  if (skill === 'teleport') player.invulnerableUntil = time + 430;
  if (skill === 'ragingDemon') player.invulnerableUntil = time + 1350;
  if (skill === 'powerBurst') player.invulnerableUntil = time + 420;
  if (skill === 'uppercut') player.invulnerableUntil = time + 210;
  return true;
}

// Motion is applied before gravity/platform resolution, so special moves obey the same world.
export function moveAkuma(
  state: AkumaState,
  player: AkumaPlayer,
  time: number,
) {
  const a = state.action;
  if (!a || player.hp <= 0) return;
  const age = time - a.born;
  if (age >= AKUMA_SKILLS[a.skill].duration) {
    state.action = null;
    return;
  }
  if (!a.lifted && a.skill === 'uppercut' && age >= 95) {
    player.vy = -570;
    player.grounded = false;
    a.lifted = true;
  }
  if (!a.lifted && a.skill === 'airDive') {
    if (player.grounded) player.vy = -490;
    player.grounded = false;
    a.lifted = true;
  }
  if (a.skill === 'airDive' && age > 270 && age < 550) {
    player.vx = a.facing * 320;
    player.vy = Math.max(player.vy, 320);
  }
  if (
    (a.skill === 'punch' || a.skill === 'kick') &&
    player.grounded &&
    age > 45 &&
    age < 140
  )
    player.vx = a.facing * (a.skill === 'punch' ? 145 : 190);
  if (a.skill === 'uppercut' && age < 230) player.vx = a.facing * 130;
  if (a.skill === 'spin' && age > 100 && age < 620) player.vx = a.facing * 250;
  if (a.skill === 'blueRush' && age > 120 && age < 650)
    player.vx = a.facing * (a.target !== null && age < 530 ? 80 : 470);
  if (a.skill === 'teleport')
    player.vx = age > 60 && age < 370 ? a.facing * 630 : 0;
  if (a.skill === 'ragingDemon')
    player.vx = a.target !== null ? 0 : age < 550 ? a.facing * 440 : 0;
}

function spawnProjectile(
  state: AkumaState,
  a: AkumaAction,
  player: AkumaPlayer,
  time: number,
) {
  const kind: ProjectileKind =
    a.skill === 'fireWave'
      ? 'fire'
      : a.skill === 'chargedWave'
        ? 'charged'
        : a.skill === 'giantWave'
          ? 'giant'
          : 'purple';
  const airborne = a.airborne && kind !== 'fire';
  const speed =
    kind === 'giant'
      ? 460
      : kind === 'charged'
        ? 520
        : kind === 'fire'
          ? 470
          : 580;
  state.projectiles.push({
    id: state.nextProjectile++,
    kind,
    x: player.x + a.facing * 39,
    y: player.y - (airborne ? 38 : 44),
    vx: a.facing * speed,
    vy: airborne ? speed * 0.65 : 0,
    facing: a.facing,
    born: time,
    damage: AKUMA_SKILLS[a.skill].damage,
    hits: new Set(),
    dead: false,
    airborne,
  });
}

export function stepAkuma(
  state: AkumaState,
  player: AkumaPlayer,
  enemies: Enemy[],
  dt: number,
  time: number,
  surfaces: { x: number; y: number; w: number }[] = [],
): CombatEvent[] {
  const events: CombatEvent[] = [];
  const a = state.action;
  if (a && player.hp > 0) {
    const def = AKUMA_SKILLS[a.skill],
      age = time - a.born;
    const ranged = [
      'purpleWave',
      'fireWave',
      'chargedWave',
      'giantWave',
    ].includes(a.skill);
    const release =
      a.skill === 'giantWave'
        ? 480
        : a.skill === 'chargedWave'
          ? 360
          : a.skill === 'fireWave'
            ? 420
            : 220;
    if (ranged && !a.launched && age >= release && age < def.duration) {
      spawnProjectile(state, a, player, time);
      a.launched = true;
    }
    let active = false,
      phase = 0,
      range = 75,
      top = -84,
      bottom = -6,
      both = false,
      knockback = 14;
    if (a.skill === 'punch') {
      active = age >= 65 && age < 180;
      range = a.pose === 'punchMedium' ? 105 : 78;
      if (a.pose === 'lowPunch') {
        top = -53;
        bottom = 0;
      }
    }
    if (a.skill === 'kick') {
      active = age >= 95 && age < 240;
      range = 100;
      knockback = 24;
      if (a.pose === 'sweep' || a.pose === 'lowKick') {
        top = -44;
        bottom = 0;
      }
    }
    if (a.skill === 'uppercut') {
      active = age >= 100 && age < 460;
      range = 96;
      top = -116;
      bottom = 15;
    }
    if (a.skill === 'spin') {
      active = age >= 130 && age < 640;
      phase = Math.floor((age - 130) / 170);
      both = true;
      range = 98;
    }
    if (a.skill === 'blueRush') {
      active = age >= 160 && age < 700;
      phase = Math.floor((age - 160) / 180);
      range = 132;
    }
    if (a.skill === 'airDive') {
      active = age >= 280 && age < 580;
      range = 65;
      top = -60;
      bottom = 35;
      knockback = 35;
    }
    if (a.skill === 'throw') {
      active = age >= 180 && age < 420;
      range = 54;
      knockback = 95;
    }
    if (a.skill === 'powerBurst') {
      active = age >= 260 && age < 530;
      range = 155;
      both = true;
      top = -100;
      bottom = 4;
      knockback = 45;
    }
    if (a.skill === 'ragingDemon') {
      if (a.target === null && age < 550) {
        const target = enemies.find(
          (e) =>
            e.hp > 0 &&
            !reaperHidden(e, time) &&
            Math.abs(e.x - player.x) < 65 &&
            Math.abs(e.y - player.y) < 90,
        );
        if (target) a.target = target.id;
      }
      active = a.target !== null && age >= 320 && age < 1170;
      phase = Math.min(6, Math.floor((age - 320) / 115));
      range = 85;
      both = true;
      knockback = 0;
      const locked = enemies.find((e) => e.id === a.target);
      if (locked && locked.hp > 0 && !reaperCasting(locked, time)) {
        locked.stunUntil = Math.max(locked.stunUntil, time + 180);
        locked.knockVx = 0;
        if (age < 1010)
          locked.x = Math.max(
            locked.minX,
            Math.min(locked.maxX, player.x + a.facing * 38),
          );
      }
    }
    if (active)
      for (const enemy of enemies) {
        const ed = ENEMY_TYPES[enemy.kind],
          key = enemy.id + ':' + phase;
        const left = both
          ? player.x - range
          : a.facing > 0
            ? player.x
            : player.x - range;
        const right = both
          ? player.x + range
          : a.facing > 0
            ? player.x + range
            : player.x;
        if (
          enemy.hp <= 0 ||
          reaperHidden(enemy, time) ||
          a.hits.has(key) ||
          (a.skill === 'ragingDemon' && enemy.id !== a.target)
        )
          continue;
        if (
          left < enemy.x + ed.halfWidth &&
          right > enemy.x - ed.halfWidth &&
          player.y + top < enemy.y &&
          player.y + bottom > enemy.y - ed.height
        ) {
          a.hits.add(key);
          // Briefly stay with the first struck target so the rush reads as a three-hit sequence.
          if (a.skill === 'blueRush' && a.target === null) a.target = enemy.id;
          const finisher =
            (a.skill === 'punch' && a.pose === 'punchHeavy') ||
            (a.skill === 'kick' &&
              (a.pose === 'highKick' || a.pose === 'sweep')) ||
            (a.skill === 'ragingDemon' && phase === 6);
          const force =
            a.skill === 'ragingDemon'
              ? finisher
                ? 3.3
                : 0.65
              : a.skill === 'powerBurst' || a.skill === 'throw'
                ? 2.5
                : a.skill === 'uppercut' || finisher
                  ? 1.9
                  : a.skill === 'blueRush'
                    ? 1.15
                    : a.skill === 'spin'
                      ? 0.75
                      : 1;
          const launch =
            a.skill === 'uppercut'
              ? 610
              : a.skill === 'throw'
                ? 360
                : finisher
                  ? 220
                  : a.skill === 'powerBurst'
                    ? 320
                    : 0;
          const damage =
            a.skill === 'ragingDemon' && finisher
              ? 70
              : finisher
                ? Math.round(def.damage * 1.55)
                : def.damage;
          const push = finisher ? 52 : a.skill === 'uppercut' ? 18 : knockback;
          const event = damageEnemy(enemy, damage, a.facing, push, time, {
            force,
            launch,
            stun: a.skill === 'uppercut' ? 600 : 320,
          });
          event.element =
            a.skill === 'uppercut' ||
            a.skill === 'blueRush' ||
            a.skill === 'spin'
              ? 'blue'
              : a.skill === 'ragingDemon' || a.skill === 'powerBurst'
                ? 'demon'
                : 'purple';
          event.finisher = finisher;
          events.push(event);
          if (
            a.skill === 'blueRush' ||
            a.skill === 'ragingDemon' ||
            a.skill === 'powerBurst'
          )
            state.impacts.push({
              x: enemy.x,
              y: enemy.y - ed.height * 0.5,
              born: time,
              kind: a.skill === 'blueRush' ? 'blue' : 'demon',
              facing: a.facing,
            });
        }
      }
  }
  for (const p of state.projectiles) {
    const previousY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const radius = p.kind === 'giant' ? 43 : p.kind === 'charged' ? 28 : 19;
    for (const enemy of enemies) {
      const ed = ENEMY_TYPES[enemy.kind];
      if (
        enemy.hp <= 0 ||
        reaperHidden(enemy, time) ||
        p.hits.has(enemy.id) ||
        Math.abs(p.x - enemy.x) > radius + ed.halfWidth ||
        p.y + radius < enemy.y - ed.height ||
        p.y - radius > enemy.y
      )
        continue;
      p.hits.add(enemy.id);
      const force = p.kind === 'giant' ? 2.7 : p.kind === 'charged' ? 2 : 1.35;
      const event = damageEnemy(
        enemy,
        p.damage,
        p.facing,
        p.kind === 'giant' ? 65 : 30,
        time,
        { force, launch: p.kind === 'giant' ? 220 : 80, stun: 400 },
      );
      event.element = p.kind === 'fire' ? 'fire' : 'purple';
      events.push(event);
      state.impacts.push({
        x: p.x,
        y: p.y,
        born: time,
        kind: p.kind,
        facing: p.facing,
      });
      if (p.kind !== 'giant') {
        p.dead = true;
        break;
      }
    }
    const floor =
      p.y + radius >= GROUND_Y ||
      surfaces.some(
        (s) =>
          p.x >= s.x &&
          p.x <= s.x + s.w &&
          previousY + radius <= s.y &&
          p.y + radius >= s.y,
      );
    if (!p.dead && floor) {
      p.dead = true;
      state.impacts.push({
        x: p.x,
        y: Math.min(p.y, GROUND_Y - 10),
        born: time,
        kind: p.kind,
        facing: p.facing,
      });
    }
    if (time - p.born > 2300 || p.x < 0 || p.x > WORLD_WIDTH) p.dead = true;
  }
  state.projectiles = state.projectiles.filter((p) => !p.dead);
  state.impacts = state.impacts.filter((p) => time - p.born < 380);
  return events;
}
