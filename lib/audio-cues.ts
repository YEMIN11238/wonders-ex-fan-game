// Times are animation/simulation milliseconds, not wall-clock timers.
export type SoundKind =
  | 'punch'
  | 'heavy'
  | 'slash'
  | 'whoosh'
  | 'charge'
  | 'shot'
  | 'beam'
  | 'burst'
  | 'warp';
export type SoundCue = {
  at: number;
  sound: SoundKind;
  gain?: number;
  duration?: number;
  rate?: number;
};
export type AudioAction = {
  id: string;
  hero: string;
  skill: string;
  age: number;
  pan: number;
};
const cue = (
  at: number,
  sound: SoundKind,
  gain = 0.7,
  duration?: number,
): SoundCue => ({ at, sound, gain, duration });
export function actionCues(hero: string, skill: string): SoundCue[] {
  if (hero === 'samara')
    return (
      {
        slash: [cue(100, 'slash')],
        cleave: [cue(235, 'slash', 0.9)],
        kick: [cue(75, 'whoosh')],
        stab: [cue(190, 'slash', 0.75)],
      }[skill] ?? []
    );
  if (hero === 'vegito')
    return (
      {
        punch: [cue(95, 'whoosh', 0.48)],
        kick: [cue(130, 'whoosh', 0.7)],
        sword: [cue(210, 'slash', 0.85)],
        spin: [cue(170, 'whoosh'), cue(340, 'whoosh'), cue(510, 'whoosh')],
        ki: [cue(240, 'shot', 0.65)],
        barrage: [
          cue(200, 'shot', 0.56),
          cue(340, 'shot', 0.56),
          cue(480, 'shot', 0.56),
        ],
        orb: [cue(0, 'charge', 0.48, 0.68), cue(700, 'shot', 0.95)],
        beam: [cue(0, 'charge', 0.5, 0.58), cue(600, 'beam', 0.85, 0.56)],
        finalBeam: [cue(0, 'charge', 0.6, 0.88), cue(900, 'beam', 1, 0.68)],
        airWave: [cue(300, 'shot', 0.8)],
        teleport: [cue(120, 'warp', 0.6), cue(260, 'warp', 0.45)],
        burst: [cue(0, 'charge', 0.35, 0.34), cue(360, 'burst', 0.85)],
        awaken: [cue(0, 'charge', 0.6, 1.38), cue(1400, 'burst', 1)],
        charge: [cue(0, 'charge', 0.45, 1.2)],
      }[skill] ?? []
    );
  if (hero === 'akuma')
    return (
      {
        punch: [cue(40, 'whoosh', 0.48)],
        kick: [cue(65, 'whoosh', 0.65)],
        uppercut: [cue(95, 'whoosh', 0.85)],
        spin: [cue(105, 'whoosh'), cue(280, 'whoosh'), cue(450, 'whoosh')],
        purpleWave: [cue(220, 'shot', 0.65)],
        fireWave: [cue(0, 'charge', 0.4, 0.4), cue(420, 'shot', 0.9)],
        chargedWave: [cue(0, 'charge', 0.45, 0.34), cue(360, 'shot', 0.85)],
        giantWave: [cue(0, 'charge', 0.55, 0.46), cue(480, 'beam', 0.95, 0.5)],
        airDive: [cue(270, 'whoosh', 0.9)],
        teleport: [cue(65, 'warp', 0.7)],
        blueRush: [
          cue(120, 'warp', 0.55),
          cue(260, 'slash'),
          cue(440, 'slash'),
        ],
        throw: [cue(170, 'whoosh', 0.6)],
        powerBurst: [cue(0, 'charge', 0.4, 0.24), cue(260, 'burst', 0.85)],
        ragingDemon: [
          cue(60, 'warp', 0.65),
          cue(320, 'whoosh'),
          cue(640, 'whoosh'),
          cue(1010, 'burst', 1),
        ],
      }[skill] ?? []
    );
  return [];
}
