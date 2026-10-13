import type { AttackKind } from './attacks';
import type { AkumaSkill } from './akuma';
export const MAX_MANA = 100;
export const MANA_REGEN = 6;
export const SAMARA_MANA: Record<AttackKind, number> = {
  slash: 0,
  cleave: 10,
  kick: 0,
  stab: 8,
};
export const AKUMA_MANA: Record<AkumaSkill, number> = {
  punch: 0,
  kick: 0,
  uppercut: 12,
  spin: 14,
  purpleWave: 12,
  fireWave: 18,
  chargedWave: 24,
  giantWave: 32,
  airDive: 14,
  teleport: 12,
  blueRush: 24,
  throw: 10,
  powerBurst: 26,
  ragingDemon: 50,
};
