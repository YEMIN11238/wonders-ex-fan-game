'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  createGameAudio,
  MAP_MUSIC,
  type AudioSettings,
} from '../lib/game-audio';
import { createMenuArt } from '../lib/menu-art';
import { MAX_MANA, MANA_REGEN, SAMARA_MANA, AKUMA_MANA } from '../lib/mana';
import {
  createPotionSprite,
  dropPotion,
  stepPotions,
  drawPotions,
  type PotionDrop,
} from '../lib/loot';
import {
  createEnemies,
  stepCombat,
  isEnemyAttacking,
  enemyAttack,
  PLAYER_HP,
} from '../lib/combat';
import { ATTACKS, ATTACK_KEYS, type AttackKind } from '../lib/attacks';
import { createSprites, drawSprite, sampleAnimation } from '../lib/sprites';
import { createScenery, drawScenery } from '../lib/scenery';
import { WORLD_WIDTH, GROUND_Y, VIEW_W, VIEW_H } from '../lib/world';
import { createPlatformTexture, drawPlatform } from '../lib/platforms';
import { ENEMY_TYPES } from '../lib/enemies';
import { createMobSprites } from '../lib/mob-sprites';
import {
  createTotemSprites,
  createDemonSprites,
} from '../lib/level-one-sprites';
import { createOracleSprites, drawOracleAttack } from '../lib/oracle-sprites';
import { createRuinsMobs, drawRuinsAttack } from '../lib/level-four-sprites';
import {
  loadReaperReferences,
  reaperPose,
  drawReaperEffects,
  type ReaperReferences,
} from '../lib/reaper-reference-sprites';
import { reaperHidden, stepReaper } from '../lib/reaper-attacks';
import {
  VEGITO_SKILLS,
  VEGITO_KEYS,
  VEGITO_SCALE,
  FUSION_DURATION,
  createVegitoState,
  canStartVegito,
  startVegitoSkill,
  moveVegito,
  stepVegito,
  type VegitoSkill,
} from '../lib/vegito';
import {
  createVegitoSprites,
  vegitoActionFrame,
  drawVegitoEffects,
  drawVegitoFusion,
  createVegitoLocomotion,
  vegitoLocomotionFrame,
} from '../lib/vegito-sprites';
import { LEVELS, LEVEL_ORDER, nextLevel, type LevelId } from '../lib/levels';
import {
  createSpikeSprites,
  createDrillBossSprites,
  drawDrillAttack,
} from '../lib/level-three-sprites';
import {
  createBirdSprites,
  createGolemSprites,
  drawGolemWarning,
} from '../lib/level-two-sprites';
import {
  AKUMA_SKILLS,
  AKUMA_KEYS,
  AKUMA_SCALE,
  createAkumaState,
  startAkumaSkill,
  canCancelAkuma,
  moveAkuma,
  stepAkuma,
  type AkumaSkill,
} from '../lib/akuma';
import {
  createAkumaSprites,
  akumaActionFrame,
  drawAkumaEffects,
} from '../lib/akuma-sprites';
import {
  createFeedback,
  tickFeedback,
  recordImpact,
  announceSkill,
  createFeedbackAssets,
  drawSkillAtmosphere,
  drawHitSparks,
  drawCombatOverlay,
} from '../lib/combat-feedback';
import {
  createSkillEffects,
  drawSwordEffect,
  drawImpactEffect,
  swordEffectProgress,
  IMPACT_LIFETIME,
  type ImpactEffect,
} from '../lib/skill-effects';
import {
  createHealthBar,
  createManaBar,
  drawHealthBar,
  HEALTH_BAR_WIDTH,
  HEALTH_BAR_HEIGHT,
} from '../lib/health-bar';

type Control = 'left' | 'right' | 'down' | 'jump';
type Hero = 'samara' | 'akuma' | 'vegito';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const healthCanvasRef = useRef<HTMLCanvasElement>(null);
  const manaCanvasRef = useRef<HTMLCanvasElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const controls = useRef<Record<Control, boolean>>({
    left: false,
    right: false,
    down: false,
    jump: false,
  });
  const jumpRequest = useRef(false);
  const attackRequest = useRef<{ kind: AttackKind; expires: number } | null>(
    null,
  );
  const akumaRequest = useRef<{ kind: AkumaSkill; expires: number } | null>(
    null,
  );
  const switchRequest = useRef(false);
  const vegitoRequest = useRef<{ kind: VegitoSkill; expires: number } | null>(
    null,
  );
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [menuArt, setMenuArt] = useState<ReturnType<
    typeof createMenuArt
  > | null>(null);
  const [level, setLevel] = useState<LevelId>(1);
  const [hero, setHero] = useState<Hero>('vegito');
  const [started, setStarted] = useState(false);
  const [health, setHealth] = useState(PLAYER_HP);
  const [mana, setMana] = useState(MAX_MANA);
  const [manaNotice, setManaNotice] = useState('');
  const [assetError, setAssetError] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 0.8,
    musicVolume: 0.38,
  });
  const [motionEnabled, setMotionEnabled] = useState(true);
  const motionRef = useRef(true);
  const audioRef = useRef<ReturnType<typeof createGameAudio> | null>(null);
  const changeAudio = (next: Partial<AudioSettings>) => {
    audioRef.current?.setSettings(next);
    setAudioSettings((current) => ({ ...current, ...next }));
  };
  const changePause = useCallback((value: boolean) => {
    if (pausedRef.current === value) return;
    pausedRef.current = value;
    setPaused(value);
    setOptionsOpen(false);
    for (const key of Object.keys(controls.current) as Control[])
      controls.current[key] = false;
    jumpRequest.current = false;
    attackRequest.current = akumaRequest.current = null;
    vegitoRequest.current = null;
    switchRequest.current = false;
    audioRef.current?.setPaused(value);
    if (!value) canvasRef.current?.focus({ preventScroll: true });
  }, []);
  const requestAttack = useCallback((kind: AttackKind) => {
    if (pausedRef.current) return;
    audioRef.current?.unlock();
    attackRequest.current = { kind, expires: performance.now() + 360 };
  }, []);
  const requestAkuma = useCallback((kind: AkumaSkill) => {
    if (pausedRef.current) return;
    audioRef.current?.unlock();
    akumaRequest.current = { kind, expires: performance.now() + 360 };
  }, []);
  const requestSwitch = useCallback(() => {
    if (pausedRef.current) return;
    audioRef.current?.unlock();
    switchRequest.current = true;
  }, []);
  const requestVegito = useCallback((kind: VegitoSkill) => {
    if (pausedRef.current) return;
    audioRef.current?.unlock();
    vegitoRequest.current = { kind, expires: performance.now() + 360 };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current,
      ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const healthCtx = healthCanvasRef.current?.getContext('2d');
    const manaCtx = manaCanvasRef.current?.getContext('2d');
    pausedRef.current = false;
    setPaused(false);
    let raf = 0,
      lastTime = performance.now(),
      time = 0,
      label = '',
      camera = 0;
    let activeHero: Hero = 'vegito',
      jumpStartedAt = 0,
      victoryUntil = 0;
    let fusionStartedAt = 0,
      fusionUntil = Infinity;
    let attackStartedAt = -Infinity,
      nextAttackAt = 0,
      swingId = 0,
      attackFacing = 1,
      impactSwingId = -1,
      respawnAt = 0;
    let lastManaUse = -Infinity,
      lastManaUpdate = 0,
      manaNoticeUntil = 0;
    const lowMana = () => {
      manaNoticeUntil = time + 1000;
      setManaNotice('法力不足');
    };
    let kind: AttackKind = 'slash';
    const previewLevel =
      process.env.NODE_ENV === 'development'
        ? Number(new URLSearchParams(window.location.search).get('level'))
        : 1;
    const initialLevel: LevelId =
      previewLevel === 2 || previewLevel === 3 || previewLevel === 4
        ? previewLevel
        : 1;
    setLevel(initialLevel);
    let activeLevel: LevelId = initialLevel,
      cleared = false;
    let transition: {
      elapsed: number;
      next: LevelId;
      switched: boolean;
    } | null = null;
    let platforms: { x: number; y: number; w: number }[] = LEVELS[
      initialLevel
    ].platforms.map((p) => ({ ...p }));
    let enemies = createEnemies(initialLevel);
    const akuma = createAkumaState();
    const vegito = createVegitoState();
    const vegitoLocomotion = createVegitoLocomotion();
    const feedback = createFeedback();
    const audio = createGameAudio();
    audioRef.current = audio;
    audio.setLevel(initialLevel);
    setAudioSettings(audio.settings());
    const enemyAudio = new Map<number, string>();
    let fusionSounded = false;
    motionRef.current = !window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches;
    setMotionEnabled(motionRef.current);
    const impacts: ImpactEffect[] = [];
    const potions: PotionDrop[] = [];
    const numbers: {
      x: number;
      y: number;
      value: number;
      born: number;
      player: boolean;
      healed?: boolean;
    }[] = [];
    const player = {
      x:
        process.env.NODE_ENV === 'development' &&
        new URLSearchParams(window.location.search).get('arena') === '1'
          ? WORLD_WIDTH - 760
          : 220,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      grounded: true,
      airJumpsRemaining: 1,
      crouching: false,
      facing: 1,
      hp: PLAYER_HP,
      mp: MAX_MANA,
      hurtUntil: 0,
      invulnerableUntil: 0,
    };
    const bg = new Image(),
      totemSheet = new Image(),
      demonSheet = new Image(),
      oracleSheet = new Image(),
      ruinsBg = new Image(),
      horseSheet = new Image(),
      impSheet = new Image(),
      autumnBg = new Image(),
      birdSheet = new Image(),
      golemSheet = new Image(),
      duskBg = new Image(),
      spikeSheet = new Image(),
      drillSheet = new Image(),
      itemSheet = new Image(),
      menuSheet = new Image(),
      manaStar = new Image(),
      sheet = new Image(),
      enemySheet = new Image(),
      mobSheet = new Image(),
      healthSheet = new Image(),
      swordEffectsSheet = new Image(),
      shadowEffectsSheet = new Image(),
      akumaSheet = new Image(),
      vegitoSheet = new Image(),
      blueLightning = new Image(),
      purpleLightning = new Image(),
      blueFlames = new Image(),
      idleImage = new Image();
    let sprites: ReturnType<typeof createSprites> | null = null,
      totemSprites: ReturnType<typeof createTotemSprites> | null = null,
      demonSprites: ReturnType<typeof createDemonSprites> | null = null,
      oracleSprites: ReturnType<typeof createOracleSprites> | null = null,
      ruinsMobs: ReturnType<typeof createRuinsMobs> | null = null,
      reaperSprites: ReaperReferences | null = null,
      mobSprites: ReturnType<typeof createMobSprites> | null = null,
      birdSprites: ReturnType<typeof createBirdSprites> | null = null,
      golemSprites: ReturnType<typeof createGolemSprites> | null = null,
      spikeSprites: ReturnType<typeof createSpikeSprites> | null = null,
      drillSprites: ReturnType<typeof createDrillBossSprites> | null = null,
      potionSprite: HTMLCanvasElement | null = null,
      healthBar: ReturnType<typeof createHealthBar> | null = null,
      manaBar: ReturnType<typeof createManaBar> | null = null,
      skillEffects: ReturnType<typeof createSkillEffects> | null = null,
      akumaSprites: ReturnType<typeof createAkumaSprites> | null = null,
      vegitoSprites: ReturnType<typeof createVegitoSprites> | null = null,
      feedbackAssets: ReturnType<typeof createFeedbackAssets> | null = null,
      scenery: ReturnType<typeof createScenery> | null = null,
      disposed = false;
    let platformTextures: HTMLCanvasElement[] = [];
    const sceneryCache: Partial<
      Record<LevelId, ReturnType<typeof createScenery>>
    > = {};
    const terrainCache: Partial<Record<LevelId, HTMLCanvasElement[]>> = {};
    const load = (image: HTMLImageElement, src: string) =>
      new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = src;
      });
    Promise.all([
      load(bg, '/assets/bamboo-shrine.jpg'),
      load(totemSheet, '/assets/bamboo-totems.webp'),
      load(demonSheet, '/assets/crimson-demon.webp'),
      load(oracleSheet, '/assets/stone-oracle.webp'),
      load(ruinsBg, '/assets/ruined-hall.jpg'),
      load(horseSheet, '/assets/ruins-horses.webp'),
      load(impSheet, '/assets/ruins-imps.webp'),
      loadReaperReferences().then((value) => {
        reaperSprites = value;
      }),
      load(autumnBg, '/assets/autumn-village.jpg'),
      load(birdSheet, '/assets/autumn-birds.png'),
      load(golemSheet, '/assets/stone-golem.png'),
      load(duskBg, '/assets/dusk-street.jpg'),
      load(spikeSheet, '/assets/dusk-spikes.jpg'),
      load(drillSheet, '/assets/drill-lord.webp'),
      load(itemSheet, '/assets/item-sheet.jpg'),
      load(menuSheet, '/assets/menu-buttons.jpg'),
      load(manaStar, '/assets/mana-star-reference.png'),
      load(sheet, '/assets/samara-sprites.jpeg'),
      load(enemySheet, '/assets/axe-goblin.jpeg'),
      load(mobSheet, '/assets/white-swordsman-sheet.png'),
      load(healthSheet, '/assets/heart-health-sheet.png'),
      load(swordEffectsSheet, '/assets/sword-effects-sheet.png'),
      load(shadowEffectsSheet, '/assets/shadow-impact-sheet.png'),
      load(akumaSheet, '/assets/akuma-sheet.png'),
      load(vegitoSheet, '/assets/vegito-sheet.jpg'),
      load(blueLightning, '/assets/blue-lightning.png'),
      load(purpleLightning, '/assets/purple-lightning.png'),
      load(blueFlames, '/assets/blue-flames.png'),
      load(idleImage, '/assets/samara-idle.png'),
    ])
      .then(() => {
        if (disposed) return;
        sprites = createSprites(sheet, enemySheet, idleImage);
        totemSprites = createTotemSprites(totemSheet);
        demonSprites = createDemonSprites(demonSheet);
        oracleSprites = createOracleSprites(oracleSheet);
        ruinsMobs = createRuinsMobs(horseSheet, impSheet);
        mobSprites = createMobSprites(mobSheet);
        birdSprites = createBirdSprites(birdSheet);
        golemSprites = createGolemSprites(golemSheet);
        spikeSprites = createSpikeSprites(spikeSheet);
        drillSprites = createDrillBossSprites(drillSheet);
        potionSprite = createPotionSprite(itemSheet);
        setMenuArt(createMenuArt(menuSheet));
        healthBar = createHealthBar(healthSheet);
        manaBar = createManaBar(healthBar, menuSheet, manaStar);
        akumaSprites = createAkumaSprites(akumaSheet);
        vegitoSprites = createVegitoSprites(vegitoSheet);
        fusionStartedAt = time;
        fusionUntil = time + FUSION_DURATION;
        player.invulnerableUntil = fusionUntil + 600;
        feedbackAssets = createFeedbackAssets(
          blueLightning,
          purpleLightning,
          blueFlames,
        );
        skillEffects = createSkillEffects(
          swordEffectsSheet,
          shadowEffectsSheet,
        );
        for (const stage of LEVEL_ORDER) {
          const scene =
            stage === 1
              ? bg
              : stage === 2
                ? autumnBg
                : stage === 3
                  ? duskBg
                  : ruinsBg;
          sceneryCache[stage] = createScenery(scene, stage);
          terrainCache[stage] = LEVELS[stage].platforms.map((p, index) =>
            createPlatformTexture(scene, p.w, index, stage),
          );
        }
        scenery = sceneryCache[initialLevel]!;
        platformTextures = terrainCache[initialLevel]!;
        setStarted(true);
      })
      .catch(() => {
        if (!disposed) setAssetError(true);
      });

    const clearControls = () => {
      for (const key of Object.keys(controls.current) as Control[])
        controls.current[key] = false;
      jumpRequest.current = false;
      attackRequest.current = null;
      akumaRequest.current = null;
      vegitoRequest.current = null;
      switchRequest.current = false;
    };
    const enterLevel = (next: LevelId) => {
      activeLevel = next;
      audio.setLevel(next);
      enemyAudio.clear();
      cleared = false;
      setLevel(next);
      platforms = LEVELS[next].platforms.map((p) => ({ ...p }));
      scenery = sceneryCache[next]!;
      platformTextures = terrainCache[next]!;
      enemies = createEnemies(next);
      Object.assign(player, {
        x: 65,
        y: GROUND_Y,
        vx: 0,
        vy: 0,
        grounded: true,
        airJumpsRemaining: 1,
        crouching: false,
        facing: 1,
        hp: PLAYER_HP,
        mp: MAX_MANA,
        hurtUntil: time + 1200,
        invulnerableUntil: 0,
      });
      Object.assign(akuma, createAkumaState());
      Object.assign(vegito, createVegitoState());
      Object.assign(feedback, createFeedback());
      numbers.length = impacts.length = 0;
      potions.length = 0;
      camera = 0;
      attackStartedAt = -Infinity;
      nextAttackAt = time + 200;
      respawnAt = 0;
      victoryUntil = 0;
      setHealth(PLAYER_HP);
      setMana(MAX_MANA);
      setManaNotice('');
      lastManaUse = -Infinity;
      clearControls();
    };
    const onKey = (event: KeyboardEvent, pressed: boolean) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (pressed && !pausedRef.current) audio.unlock();
      if (key === 'escape' && pressed && !event.repeat && sprites) {
        event.preventDefault();
        changePause(!pausedRef.current);
        return;
      }
      if (pausedRef.current) return;
      if (time < fusionUntil) return;
      if (key === 'q') {
        event.preventDefault();
        if (pressed && !event.repeat) requestSwitch();
        return;
      }
      const movement: Record<string, Control> = {
        arrowleft: 'left',
        a: 'left',
        arrowright: 'right',
        d: 'right',
        arrowdown: 'down',
        s: 'down',
        ' ': 'jump',
        arrowup: 'jump',
        w: 'jump',
      };
      if (movement[key]) {
        event.preventDefault();
        controls.current[movement[key]] = pressed;
        if (movement[key] === 'jump' && pressed && !event.repeat)
          jumpRequest.current = true;
      }
      if (activeHero === 'vegito') {
        const skill = VEGITO_KEYS.find(
          (k) => VEGITO_SKILLS[k].key.toLowerCase() === key,
        );
        if (skill) {
          event.preventDefault();
          if (pressed && !event.repeat) requestVegito(skill);
        }
        return;
      }
      if (activeHero === 'akuma') {
        const skill = AKUMA_KEYS.find(
          (k) => AKUMA_SKILLS[k].key.toLowerCase() === key,
        );
        if (skill) {
          event.preventDefault();
          if (pressed && !event.repeat) requestAkuma(skill);
        }
        return;
      }
      const skill = ATTACK_KEYS.find(
        (k) => ATTACKS[k].key.toLowerCase() === key,
      );
      if (skill) {
        event.preventDefault();
        if (pressed && !event.repeat) requestAttack(skill);
      }
    };
    const keyDown = (e: KeyboardEvent) => onKey(e, true),
      keyUp = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clearControls);
    const debugWindow = window as Window & { __gameSnapshot?: () => unknown };
    if (process.env.NODE_ENV === 'development')
      debugWindow.__gameSnapshot = () => ({
        time,
        audio: audio.snapshot(),
        feedback: {
          clock: feedback.clock,
          stop: feedback.stop,
          combo: feedback.combo,
          damage: feedback.damage,
          sparks: feedback.sparks.length,
          shake: feedback.shake,
        },
        hero: activeHero,
        fusion: { active: time < fusionUntil, age: time - fusionStartedAt },
        vegito: {
          action: vegito.action
            ? { ...vegito.action, hits: [...vegito.action.hits] }
            : null,
          projectiles: vegito.projectiles.map((p) => ({
            ...p,
            hits: [...p.hits],
          })),
          cooldowns: { ...vegito.cooldowns },
        },
        level: activeLevel,
        worldWidth: WORLD_WIDTH,
        cleared,
        paused: pausedRef.current,
        potions: potions.map((p) => ({ ...p })),
        transition: transition ? { ...transition } : null,
        platforms: platforms.map((p) => ({ ...p })),
        akuma: {
          action: akuma.action
            ? { ...akuma.action, hits: [...akuma.action.hits] }
            : null,
          projectiles: akuma.projectiles.map((p) => ({
            ...p,
            hits: [...p.hits],
          })),
          impacts: akuma.impacts.map((p) => ({ ...p })),
          cooldowns: { ...akuma.cooldowns },
        },
        camera,
        player: { ...player },
        enemies: enemies.map((e) => ({ ...e })),
        kind,
        attackAge: time - attackStartedAt,
        swordEffect: swordEffectProgress(kind, time - attackStartedAt),
        impacts: impacts.map((effect) => ({ ...effect })),
        state: label,
      });

    const update = (dt: number) => {
      if (!sprites) return;
      if (time < fusionUntil) {
        if (!fusionSounded && time - fusionStartedAt >= 1450) {
          audio.play('burst', 0.45, 0, 0.7);
          fusionSounded = true;
        }
        clearControls();
        return;
      }
      if (player.hp === 0) {
        if (time < respawnAt) return;
        Object.assign(player, {
          x: 220,
          y: GROUND_Y,
          vx: 0,
          vy: 0,
          grounded: true,
          airJumpsRemaining: 1,
          hp: PLAYER_HP,
          mp: MAX_MANA,
          hurtUntil: time + 1500,
          invulnerableUntil: 0,
        });
        setHealth(PLAYER_HP);
        setMana(MAX_MANA);
        impacts.length = 0;
        akuma.action = null;
        akuma.projectiles.length = 0;
        akuma.impacts.length = 0;
        Object.assign(vegito, createVegitoState());
        Object.assign(feedback, { combo: 0, damage: 0, stop: 0, shake: 0 });
        feedback.sparks.length = 0;
        clearControls();
      }
      if (time - lastManaUse >= 650)
        player.mp = Math.min(MAX_MANA, player.mp + MANA_REGEN * dt);
      if (time - lastManaUpdate >= 100) {
        lastManaUpdate = time;
        setMana(Math.floor(player.mp));
        if (time >= manaNoticeUntil) setManaNotice('');
      }
      const keys = controls.current,
        direction = Number(keys.right) - Number(keys.left);
      player.crouching = keys.down && player.grounded;
      if (switchRequest.current) {
        switchRequest.current = false;
        const heroes: Hero[] = ['vegito', 'samara', 'akuma'];
        activeHero = heroes[(heroes.indexOf(activeHero) + 1) % heroes.length];
        setHero(activeHero);
        attackRequest.current = null;
        akumaRequest.current = null;
        vegitoRequest.current = null;
        attackStartedAt = -Infinity;
        akuma.action = null;
        akuma.projectiles.length = 0;
        akuma.impacts.length = 0;
        vegito.action = null;
        vegito.projectiles.length = vegito.impacts.length = 0;
        impacts.length = 0;
        feedback.sparks.length = 0;
        feedback.combo = feedback.damage = 0;
        feedback.titleAt = -Infinity;
        player.invulnerableUntil = 0;
        player.vx = Math.max(-250, Math.min(250, player.vx));
        nextAttackAt = Math.max(nextAttackAt, time + 200);
      }
      const request = attackRequest.current;
      if (request && request.expires < performance.now())
        attackRequest.current = null;
      if (
        request &&
        activeHero === 'samara' &&
        request.expires >= performance.now() &&
        time >= nextAttackAt
      ) {
        attackRequest.current = null;
        const cost = SAMARA_MANA[request.kind];
        if (player.mp < cost) lowMana();
        else {
          kind = request.kind;
          player.mp -= cost;
          if (cost) lastManaUse = time;
          setMana(Math.floor(player.mp));
          attackStartedAt = time;
          nextAttackAt = time + ATTACKS[kind].cooldown;
          swingId += 1;
          attackFacing = direction || player.facing;
          player.facing = attackFacing;
        }
      }
      const akumaInput = akumaRequest.current;
      if (akumaInput && akumaInput.expires < performance.now())
        akumaRequest.current = null;
      if (
        activeHero === 'akuma' &&
        akumaInput &&
        akumaInput.expires >= performance.now() &&
        (time >= nextAttackAt ||
          (!!akuma.action && canCancelAkuma(akuma, time)))
      ) {
        player.facing = direction || player.facing;
        const cost = AKUMA_MANA[akumaInput.kind];
        if (player.mp < cost) {
          akumaRequest.current = null;
          lowMana();
        } else if (
          startAkumaSkill(
            akuma,
            akumaInput.kind,
            player,
            time,
            keys.down && player.grounded,
          )
        ) {
          player.mp -= cost;
          if (cost) lastManaUse = time;
          setMana(Math.floor(player.mp));
          nextAttackAt = time + AKUMA_SKILLS[akumaInput.kind].duration;
          announceSkill(feedback, akumaInput.kind);
          akumaRequest.current = null;
        }
      }
      const vegitoInput = vegitoRequest.current;
      if (vegitoInput && vegitoInput.expires < performance.now())
        vegitoRequest.current = null;
      if (
        activeHero === 'vegito' &&
        vegitoInput &&
        vegitoInput.expires >= performance.now() &&
        canStartVegito(vegito, vegitoInput.kind, time)
      ) {
        player.facing = direction || player.facing;
        const def = VEGITO_SKILLS[vegitoInput.kind];
        if (player.mp < def.cost) {
          lowMana();
          vegitoRequest.current = null;
        } else if (startVegitoSkill(vegito, vegitoInput.kind, player, time)) {
          player.mp -= def.cost;
          if (def.cost) lastManaUse = time;
          setMana(Math.floor(player.mp));
          if (['beam', 'finalBeam', 'awaken'].includes(vegitoInput.kind)) {
            feedback.title = def.name;
            feedback.titleAt = feedback.clock;
            feedback.titlePower = 0.75;
          }
          vegitoRequest.current = null;
        }
      }
      const attacking =
        activeHero === 'vegito'
          ? !!vegito.action
          : activeHero === 'akuma'
            ? !!akuma.action &&
              time - akuma.action.born <
                AKUMA_SKILLS[akuma.action.skill].duration
            : time - attackStartedAt < ATTACKS[kind].duration;
      if (time >= player.hurtUntil - 850) {
        const speed =
          (keys.down ? 95 : 250) * (attacking && player.grounded ? 0.45 : 1);
        player.vx += (direction * speed - player.vx) * Math.min(1, dt * 13);
        if (!direction) player.vx *= Math.pow(0.0005, dt);
      }
      if (direction && !attacking) player.facing = direction;
      const jumpPressed = jumpRequest.current;
      jumpRequest.current = false;
      if (
        jumpPressed &&
        !keys.down &&
        (player.grounded || player.airJumpsRemaining > 0)
      ) {
        if (!player.grounded) player.airJumpsRemaining--;
        player.vy = -650;
        player.grounded = false;
        jumpStartedAt = time;
      }
      if (activeHero === 'akuma') moveAkuma(akuma, player, time);
      if (activeHero === 'vegito') moveVegito(vegito, player, time);
      const previousY = player.y;
      player.vy += 1720 * dt;
      player.x = Math.max(
        35,
        Math.min(
          cleared ? WORLD_WIDTH + 80 : WORLD_WIDTH - 35,
          player.x + player.vx * dt,
        ),
      );
      if (cleared && player.x > WORLD_WIDTH + 35) {
        transition = {
          elapsed: 0,
          next: nextLevel(activeLevel),
          switched: false,
        };
        clearControls();
        feedback.shake = feedback.stop = 0;
        return;
      }
      player.y += player.vy * dt;
      player.grounded = false;
      if (player.vy >= 0 && previousY <= GROUND_Y && player.y >= GROUND_Y) {
        player.y = GROUND_Y;
        player.vy = 0;
        player.grounded = true;
      }
      if (player.vy >= 0 && !keys.down)
        for (const p of platforms) {
          if (
            player.x > p.x - 18 &&
            player.x < p.x + p.w + 18 &&
            previousY <= p.y &&
            player.y >= p.y
          ) {
            player.y = p.y;
            player.vy = 0;
            player.grounded = true;
            break;
          }
        }
      if (player.y > VIEW_H + 160)
        Object.assign(player, {
          x: 220,
          y: GROUND_Y,
          vy: 0,
          grounded: true,
        });
      if (player.grounded) player.airJumpsRemaining = 1;
      const attackAge = time - attackStartedAt;
      if (
        activeHero === 'samara' &&
        (kind === 'cleave' || kind === 'stab') &&
        impactSwingId !== swingId &&
        attackAge >=
          ATTACKS[kind].activeStart + (kind === 'cleave' ? 60 : 30) &&
        attackAge < ATTACKS[kind].activeEnd
      ) {
        const x = player.x + attackFacing * (kind === 'cleave' ? 65 : 10);
        const reach = kind === 'stab' ? 65 : 20;
        const surfaces = [
          GROUND_Y,
          ...platforms
            .filter((p) => x >= p.x && x <= p.x + p.w)
            .map((p) => p.y),
        ];
        const surfaceY = surfaces
          .filter((y) => y >= player.y - 5 && y <= player.y + reach)
          .sort((a, b) => a - b)[0];
        if (surfaceY !== undefined) {
          // Anchor the impact once in world space; it must not slide with the player/camera.
          impacts.push({
            x,
            y: surfaceY,
            born: time,
            kind,
            facing: attackFacing,
          });
          impactSwingId = swingId;
        }
      }
      for (const enemy of enemies) stepReaper(enemy, time);
      const events = [
        ...stepAkuma(akuma, player, enemies, dt, time, platforms),
        ...stepVegito(vegito, player, enemies, dt, time),
        ...stepCombat(
          enemies,
          player,
          {
            id: swingId,
            age: activeHero === 'samara' ? time - attackStartedAt : Infinity,
            facing: attackFacing,
            kind,
          },
          dt,
          time,
        ),
      ];
      for (const event of events) {
        recordImpact(feedback, event);
        audio.hit(
          event,
          (event.x - camera - VIEW_W / 2) / (VIEW_W / 2),
          activeHero,
          activeHero === 'vegito'
            ? (vegito.action?.skill ?? '')
            : activeHero === 'akuma'
              ? (akuma.action?.skill ?? '')
              : kind,
        );
        numbers.push({
          x: event.x,
          y: event.y,
          value: event.damage,
          born: time,
          player: event.target === 'player',
        });
        if (event.target === 'enemy' && event.defeated) {
          victoryUntil = time + 750;
          const enemy = enemies.find((e) => e.id === event.enemyId);
          if (enemy) {
            const potion = dropPotion(enemy, time);
            if (potion) {
              potions.push(potion);
              if (potions.length > 48) potions.shift();
            }
          }
          if (enemy && ENEMY_TYPES[enemy.kind].boss) {
            enemy.respawnAt = Infinity;
            cleared = true;
          }
        }
        if (event.target === 'player') {
          setHealth(player.hp);
          attackStartedAt = -Infinity;
          attackRequest.current = null;
          akumaRequest.current = null;
          akuma.action = null;
          vegitoRequest.current = null;
          vegito.action = null;
          player.invulnerableUntil = 0;
          if (event.defeated) {
            respawnAt = time + 1400;
            akuma.projectiles.length = 0;
            akuma.impacts.length = 0;
            vegito.projectiles.length = vegito.impacts.length = 0;
          }
        }
      }
      const action =
        activeHero === 'vegito'
          ? vegito.action
          : activeHero === 'akuma'
            ? akuma.action
            : null;
      const audioSkill =
        action?.skill ??
        (activeHero === 'samara' &&
        time - attackStartedAt < ATTACKS[kind].duration
          ? kind
          : null);
      audio.syncAction(
        audioSkill && player.hp > 0
          ? {
              id: `${activeHero}:${action?.born ?? attackStartedAt}`,
              hero: activeHero,
              skill: audioSkill,
              age: time - (action?.born ?? attackStartedAt),
              pan: (player.x - camera - VIEW_W / 2) / (VIEW_W / 2),
            }
          : null,
      );
      // Enemy releases use the same active frame as collision, even on a miss.
      for (const enemy of enemies) {
        if (
          enemy.hp <= 0 ||
          !isEnemyAttacking(enemy, time) ||
          Math.abs(enemy.x - camera - VIEW_W / 2) > VIEW_W / 2 + 120
        )
          continue;
        const move = enemyAttack(enemy),
          age = time - enemy.attackStartedAt;
        const stamp = `${enemy.attackStartedAt}:${enemy.attackVariant}`;
        if (age >= move.activeStart && enemyAudio.get(enemy.id) !== stamp) {
          enemyAudio.set(enemy.id, stamp);
          if (age - move.activeStart < 100) {
            const boss = ENEMY_TYPES[enemy.kind].boss;
            const sound =
              enemy.attackVariant === 'shot' || enemy.attackVariant === 'volley'
                ? 'shot'
                : boss && enemy.attackVariant === 'slam'
                  ? 'burst'
                  : boss
                    ? 'slash'
                    : 'whoosh';
            audio.play(
              sound,
              boss ? 0.5 : 0.24,
              (enemy.x - camera - VIEW_W / 2) / (VIEW_W / 2),
            );
          }
        }
      }
      if (cleared) player.invulnerableUntil = time + 1000;
      const healed = stepPotions(potions, player, dt, time);
      if (healed) {
        setHealth(player.hp);
        numbers.push({
          x: player.x,
          y: player.y - 95,
          value: healed,
          born: time,
          player: false,
          healed: true,
        });
      }
    };

    const render = (now: number) => {
      const dt = Math.min(0.032, (now - lastTime) / 1000);
      lastTime = now;
      if (pausedRef.current) {
        raf = requestAnimationFrame(render);
        return;
      }
      // Feedback uses wall time; simulation pauses briefly on contact, never during a whiff.
      const feedbackDt = tickFeedback(feedback, dt);
      let fade = 0;
      if (transition) {
        transition.elapsed += dt * 1000;
        if (transition.elapsed >= 420 && !transition.switched) {
          enterLevel(transition.next);
          transition.switched = true;
        }
        const t = transition.elapsed;
        const progress =
          t < 420 ? t / 420 : t < 540 ? 1 : Math.max(0, (960 - t) / 420);
        fade = progress * progress * (3 - 2 * progress);
        if (t >= 960) {
          transition = null;
          clearControls();
        }
      }
      if (fadeRef.current) fadeRef.current.style.opacity = String(fade);
      const simulationDt = transition ? 0 : feedbackDt;
      time += simulationDt * 1000;
      if (simulationDt > 0) update(simulationDt);
      camera = Math.round(
        Math.max(0, Math.min(WORLD_WIDTH - VIEW_W, player.x - VIEW_W * 0.42)),
      );
      ctx.fillStyle =
        activeLevel === 1
          ? '#1d1127'
          : activeLevel === 2
            ? '#292223'
            : activeLevel === 3
              ? '#120717'
              : '#101516';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.save();
      if (motionRef.current && feedback.shake > 0.15) {
        const shake = feedback.shake;
        ctx.translate(
          Math.sin(feedback.clock * 0.09) * shake,
          Math.cos(feedback.clock * 0.13) * shake * 0.55,
        );
      }
      if (scenery) drawScenery(ctx, scenery, camera, GROUND_Y, VIEW_W);
      platforms.forEach((p, index) => {
        if (platformTextures[index])
          drawPlatform(
            ctx,
            platformTextures[index],
            p.x - camera,
            p.y,
            activeLevel >= 3 ? 0 : activeLevel === 2 ? 3.2 : undefined,
          );
      });
      if (potionSprite)
        drawPotions(
          ctx,
          potionSprite,
          potions,
          time,
          camera,
          !motionRef.current,
        );
      if (feedbackAssets && activeHero === 'akuma' && player.hp > 0)
        drawSkillAtmosphere(
          ctx,
          feedbackAssets,
          akuma,
          player,
          time,
          camera,
          false,
        );
      if (healthBar && healthCtx) {
        healthCtx.clearRect(0, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
        drawHealthBar(
          healthCtx,
          healthBar,
          0,
          0,
          HEALTH_BAR_WIDTH,
          player.hp,
          PLAYER_HP,
          time - (respawnAt - 1400),
        );
      }
      if (manaBar && manaCtx) {
        manaCtx.clearRect(0, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
        drawHealthBar(
          manaCtx,
          manaBar,
          0,
          0,
          HEALTH_BAR_WIDTH,
          player.mp,
          MAX_MANA,
        );
      }
      if (sprites && mobSprites && healthBar) {
        for (const enemy of enemies) {
          const def = ENEMY_TYPES[enemy.kind],
            boss = def.boss,
            dead = enemy.hp === 0,
            deathAge = time - enemy.deadAt,
            fade = dead
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    1 -
                      (deathAge -
                        (enemy.kind === 'demon'
                          ? 760
                          : enemy.kind === 'oracle' || enemy.kind === 'reaper'
                            ? 450
                            : enemy.kind === 'golem'
                              ? 900
                              : boss
                                ? 0
                                : 700)) /
                        450,
                  ),
                )
              : 1,
            sx = enemy.x - camera;
          // A ranged attack remains visible even while its caster is offscreen.
          if (ruinsMobs) drawRuinsAttack(ctx, ruinsMobs, enemy, time, camera);
          if (reaperSprites)
            drawReaperEffects(ctx, reaperSprites, enemy, time, camera);
          if (
            !fade ||
            sx < -400 ||
            sx > VIEW_W + 400 ||
            reaperHidden(enemy, time)
          )
            continue;
          const hurt = time < enemy.hurtUntil,
            attacking = isEnemyAttacking(enemy, time),
            age = time - enemy.attackStartedAt;
          let spriteOpacity = 1;
          let frame =
            enemy.kind === 'boss'
              ? attacking
                ? sampleAnimation(sprites.enemyAxe, age)
                : hurt || dead
                  ? sprites.enemyHurt
                  : sampleAnimation(
                      sprites.enemyWalk,
                      time + enemy.id * 100,
                      true,
                    )
              : dead
                ? sampleAnimation(mobSprites.death, deathAge)
                : attacking
                  ? sampleAnimation(mobSprites.attack, age)
                  : hurt || time < enemy.idleUntil
                    ? sampleAnimation(mobSprites.idle, time, true)
                    : sampleAnimation(
                        mobSprites.walk,
                        time + enemy.id * 100,
                        true,
                      );
          if (
            (enemy.kind === 'totem' || enemy.kind === 'totemDark') &&
            totemSprites
          ) {
            const s = totemSprites[enemy.kind];
            frame = dead
              ? sampleAnimation(s.death, deathAge)
              : attacking
                ? sampleAnimation(s.attack, age)
                : hurt
                  ? s.hurt[0]
                  : sampleAnimation(
                      time < enemy.idleUntil ? s.idle : s.walk,
                      time + enemy.id * 100,
                      true,
                    );
          }
          if (enemy.kind === 'demon' && demonSprites) {
            frame = dead
              ? sampleAnimation(demonSprites.death, deathAge)
              : attacking
                ? sampleAnimation(
                    enemy.attackVariant === 'slam'
                      ? demonSprites.cleave
                      : demonSprites.sweep,
                    age,
                  )
                : hurt
                  ? demonSprites.hurt[0]
                  : sampleAnimation(
                      time < enemy.idleUntil
                        ? demonSprites.idle
                        : demonSprites.walk,
                      time,
                      true,
                    );
            drawGolemWarning(ctx, enemy, time, camera);
          }
          if (enemy.kind === 'oracle' && oracleSprites) {
            frame = dead
              ? sampleAnimation(oracleSprites.death, deathAge)
              : attacking
                ? sampleAnimation(
                    enemy.attackVariant === 'slam'
                      ? oracleSprites.summon
                      : oracleSprites.cast,
                    age,
                  )
                : sampleAnimation(oracleSprites.idle, time, true);
            drawOracleAttack(ctx, oracleSprites, enemy, time, camera);
          }
          if (
            (enemy.kind === 'bird' || enemy.kind === 'birdRed') &&
            birdSprites
          ) {
            const s = birdSprites[enemy.kind];
            frame = dead
              ? sampleAnimation(s.death, deathAge)
              : attacking
                ? sampleAnimation(s.attack, age)
                : hurt
                  ? s.hurt[0]
                  : sampleAnimation(
                      time < enemy.idleUntil ? s.idle : s.walk,
                      time + enemy.id * 100,
                      true,
                    );
          }
          if (enemy.kind === 'golem' && golemSprites) {
            frame = dead
              ? sampleAnimation(golemSprites.death, deathAge)
              : attacking
                ? sampleAnimation(
                    golemSprites[
                      enemy.attackVariant === 'slam' ? 'slam' : 'punch'
                    ],
                    age,
                  )
                : hurt
                  ? sampleAnimation(
                      golemSprites.hurt,
                      time - (enemy.hurtUntil - def.stagger),
                    )
                  : sampleAnimation(
                      time < enemy.idleUntil
                        ? golemSprites.idle
                        : golemSprites.walk,
                      time,
                      true,
                    );
            drawGolemWarning(ctx, enemy, time, camera);
          }
          if (
            (enemy.kind === 'spike' || enemy.kind === 'spikeGold') &&
            spikeSprites
          ) {
            const s = spikeSprites[enemy.kind];
            frame = dead
              ? sampleAnimation(s.death, deathAge)
              : attacking
                ? sampleAnimation(s.attack, age)
                : sampleAnimation(
                    time < enemy.idleUntil || hurt ? s.idle : s.walk,
                    time + enemy.id * 100,
                    true,
                  );
          }
          if (enemy.kind === 'drillBoss' && drillSprites) {
            frame = attacking
              ? sampleAnimation(
                  drillSprites[
                    enemy.attackVariant === 'volley' ? 'volley' : 'shot'
                  ],
                  age,
                )
              : sampleAnimation(drillSprites.idle, time, true);
            drawDrillAttack(ctx, drillSprites, enemy, time, camera);
          }
          if (
            ruinsMobs &&
            (enemy.kind === 'horse' ||
              enemy.kind === 'horseBlue' ||
              enemy.kind === 'imp' ||
              enemy.kind === 'impMage' ||
              enemy.kind === 'impBlade')
          ) {
            const s = ruinsMobs[enemy.kind];
            frame = dead
              ? sampleAnimation(s.death, deathAge)
              : attacking
                ? sampleAnimation(s.attack, age)
                : hurt
                  ? s.hurt[0]
                  : sampleAnimation(
                      time < enemy.idleUntil ? s.idle : s.walk,
                      time + enemy.id * 100,
                      true,
                    );
          }
          if (enemy.kind === 'reaper' && reaperSprites) {
            const pose = reaperPose(reaperSprites, enemy, time);
            frame = pose.frame;
            spriteOpacity = pose.alpha;
          }
          const alpha = fade * spriteOpacity;
          ctx.save();
          if (hurt && enemy.kind !== 'reaper')
            ctx.filter = 'brightness(1.9) saturate(0.55)';
          drawSprite(
            ctx,
            frame,
            sx,
            enemy.y +
              (enemy.kind === 'oracle'
                ? dead
                  ? -120
                  : -10 + Math.sin(time * 0.003) * 3
                : 0) +
              (dead && boss ? (1 - fade) * 15 : 0),
            def.scale,
            def.nativeFacing *
              (attacking ? enemy.attackFacing : enemy.direction),
            alpha,
          );
          ctx.restore();
          if (!dead) {
            const barWidth = boss ? 160 : 82,
              barY =
                enemy.y -
                (boss
                  ? enemy.kind === 'reaper'
                    ? def.visualHeight
                    : Math.max(def.visualHeight, frame.y * def.scale)
                  : def.visualHeight) -
                20;
            drawHealthBar(
              ctx,
              healthBar,
              sx - barWidth / 2,
              barY,
              barWidth,
              enemy.hp,
              enemy.maxHp,
            );
            if (attacking && age < enemyAttack(enemy).activeStart) {
              ctx.font = '900 24px sans-serif';
              ctx.textAlign = 'center';
              ctx.lineWidth = 3;
              ctx.fillStyle = '#ffe78b';
              ctx.strokeStyle = '#813924';
              ctx.strokeText('!', sx, barY - 25);
              ctx.fillText('!', sx, barY - 25);
            }
          }
        }
        const moving = Math.abs(player.vx) > 28,
          crouching = controls.current.down && player.grounded;
        const attackAge = time - attackStartedAt,
          attacking =
            activeHero === 'vegito'
              ? !!vegito.action
              : activeHero === 'akuma'
                ? !!akuma.action
                : attackAge >= 0 && attackAge < ATTACKS[kind].duration;
        const nextLabel = !player.hp
          ? '返回起点…'
          : time < player.hurtUntil - 750
            ? '受击'
            : attacking
              ? activeHero === 'vegito' && vegito.action
                ? VEGITO_SKILLS[vegito.action.skill].name
                : activeHero === 'akuma' && akuma.action
                  ? AKUMA_SKILLS[akuma.action.skill].name
                  : ATTACKS[kind].name
              : !player.grounded
                ? '跳跃'
                : crouching
                  ? '下蹲'
                  : moving
                    ? '奔跑'
                    : '待机';
        if (nextLabel !== label) {
          label = nextLabel;
        }
        let frame = sprites.idle,
          scale = 0.66;
        if (moving) {
          frame = sampleAnimation(sprites.run, time, true);
          scale = 1.4;
        }
        if (crouching) {
          frame = sprites.crouch;
          scale = 1.15;
        }
        if (!player.grounded) {
          frame = sprites.run[3];
          scale = 1.4;
        }
        if (attacking && activeHero === 'samara') {
          frame = sampleAnimation(sprites.attacks[kind], attackAge);
          scale = 1.4;
        }
        if (activeHero === 'akuma' && akumaSprites) {
          scale = AKUMA_SCALE;
          frame = sampleAnimation(akumaSprites.idle, time, true);
          if (moving) frame = sampleAnimation(akumaSprites.run, time, true);
          if (crouching) frame = akumaSprites.crouch[0];
          if (!player.grounded)
            frame = sampleAnimation(
              akumaSprites[Math.abs(player.vx) > 90 ? 'jumpForward' : 'jump'],
              time - jumpStartedAt,
            );
          if (time < victoryUntil && !moving && !attacking && player.grounded)
            frame = sampleAnimation(
              akumaSprites.victory,
              time - (victoryUntil - 750),
            );
          if (akuma.action)
            frame = akumaActionFrame(akumaSprites, akuma.action, time);
          if (time < player.hurtUntil - 750)
            frame = sampleAnimation(
              akumaSprites[
                player.grounded
                  ? crouching
                    ? 'crouchHurt'
                    : 'hurt'
                  : 'airHurt'
              ],
              time - (player.hurtUntil - 1000),
            );
          if (player.hp === 0)
            frame = sampleAnimation(
              akumaSprites.knockdown,
              time - (respawnAt - 1400),
            );
        }
        if (activeHero === 'vegito' && vegitoSprites) {
          scale = VEGITO_SCALE;
          frame = vegitoLocomotionFrame(
            vegitoSprites,
            vegitoLocomotion,
            player,
            time,
            crouching,
          );
          if (vegito.action)
            frame = vegitoActionFrame(vegitoSprites, vegito, player, time);
          if (time < player.hurtUntil - 750)
            frame = sampleAnimation(
              vegitoSprites.hurt,
              time - (player.hurtUntil - 1000),
            );
          if (!player.hp) frame = vegitoSprites.hurt[3];
        }
        const sx = player.x - camera;
        if (activeHero === 'vegito' && vegitoSprites)
          drawVegitoEffects(
            ctx,
            vegitoSprites,
            vegito,
            player,
            time,
            camera,
            false,
          );
        ctx.fillStyle = 'rgba(11,31,22,.18)';
        ctx.beginPath();
        ctx.ellipse(sx, player.y + 3, 24, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        const teleportHidden =
          activeHero === 'vegito' &&
          vegito.action?.skill === 'teleport' &&
          time - vegito.action.born >= 120 &&
          time - vegito.action.born < 260;
        const alpha = teleportHidden
          ? 0
          : !player.hp
            ? 0.35
            : time < player.hurtUntil && Math.floor(time / 75) % 2 === 0
              ? 0.45
              : 1;
        if (time < fusionUntil && vegitoSprites)
          drawVegitoFusion(
            ctx,
            vegitoSprites,
            time - fusionStartedAt,
            sx,
            player.y,
            !motionRef.current,
          );
        else
          drawSprite(
            ctx,
            frame,
            sx,
            player.y,
            scale,
            activeHero === 'vegito'
              ? (vegito.action?.facing ?? player.facing)
              : activeHero === 'akuma'
                ? (akuma.action?.facing ?? player.facing)
                : attacking
                  ? attackFacing
                  : player.facing,
            alpha,
          );
        if (skillEffects && player.hp > 0 && activeHero === 'samara')
          drawSwordEffect(
            ctx,
            skillEffects,
            kind,
            attackAge,
            sx,
            player.y,
            attackFacing,
            player.grounded,
          );
        if (akumaSprites)
          drawAkumaEffects(ctx, akumaSprites, akuma, player, time, camera);
        if (activeHero === 'vegito' && vegitoSprites)
          drawVegitoEffects(
            ctx,
            vegitoSprites,
            vegito,
            player,
            time,
            camera,
            true,
          );
        if (feedbackAssets && activeHero === 'akuma' && player.hp > 0)
          drawSkillAtmosphere(
            ctx,
            feedbackAssets,
            akuma,
            player,
            time,
            camera,
            true,
          );
      }
      if (feedbackAssets) drawHitSparks(ctx, feedbackAssets, feedback, camera);
      for (let i = impacts.length - 1; i >= 0; i--) {
        if (time - impacts[i].born >= IMPACT_LIFETIME) impacts.splice(i, 1);
        else if (skillEffects)
          drawImpactEffect(ctx, skillEffects, impacts[i], time, camera);
      }
      for (let i = numbers.length - 1; i >= 0; i--) {
        const n = numbers[i],
          age = (time - n.born) / 850;
        if (age >= 1) {
          numbers.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = 1 - age;
        const pop = motionRef.current ? 1 + Math.max(0, 1 - age * 7) * 0.35 : 1;
        ctx.font = `900 ${Math.round(27 * pop)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = n.healed
          ? '#164d3b'
          : n.player
            ? '#6a1823'
            : '#75451c';
        ctx.fillStyle = n.healed ? '#99ffd2' : n.player ? '#ff8b88' : '#fff19b';
        const value = n.healed
          ? `+${n.value}`
          : n.player
            ? `−${n.value}`
            : String(n.value);
        ctx.strokeText(value, n.x - camera, n.y - age * 48);
        ctx.fillText(value, n.x - camera, n.y - age * 48);
        ctx.restore();
      }
      ctx.restore();
      drawCombatOverlay(ctx, feedback, !motionRef.current);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      disposed = true;
      audio.close();
      audioRef.current = null;
      cancelAnimationFrame(raf);
      clearControls();
      delete debugWindow.__gameSnapshot;
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clearControls);
    };
  }, [requestAttack, requestAkuma, requestVegito, requestSwitch, changePause]);

  return (
    <main
      className={`game-shell ${level === 4 ? 'ruins-stage' : level === 3 ? 'dusk-stage' : level === 2 ? 'autumn-stage' : ''}`}
    >
      <section className="game-stage" aria-label="2D 横版平台游戏试玩区">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          tabIndex={0}
          aria-label="游戏画面"
          onPointerDown={() => {
            audioRef.current?.unlock();
            canvasRef.current?.focus({ preventScroll: true });
          }}
        />
        {!started && (
          <div className="loading">
            {assetError
              ? '素材加载失败，请刷新页面重试。'
              : '正在装载角色与动作…'}
          </div>
        )}
        <div
          className="hud"
          aria-label={`角色生命 ${health}/${PLAYER_HP}，法力 ${mana}/${MAX_MANA}`}
        >
          <div>
            <div className="hud-name">
              {hero === 'vegito'
                ? '贝吉特'
                : hero === 'akuma'
                  ? '豪鬼'
                  : 'Samara'}{' '}
              <span>Lv. 1</span>
            </div>
            <canvas
              ref={healthCanvasRef}
              className="pixel-health"
              width={HEALTH_BAR_WIDTH}
              height={HEALTH_BAR_HEIGHT}
              aria-hidden="true"
            />
            <div className="health-value">
              HP {health} / {PLAYER_HP}
            </div>
            <canvas
              ref={manaCanvasRef}
              className="pixel-health pixel-mana"
              width={HEALTH_BAR_WIDTH}
              height={HEALTH_BAR_HEIGHT}
              aria-hidden="true"
            />
            <div
              className={`health-value mana-value ${manaNotice ? 'mana-low' : ''}`}
            >
              MP {mana} / {MAX_MANA}
              {manaNotice ? ` · ${manaNotice}` : ''}
            </div>
          </div>
        </div>
        <div className="keyboard-hint">
          <kbd>A</kbd>
          <kbd>D</kbd>移动 <kbd>Space</kbd>二段跳 <kbd>S</kbd>下蹲 / 下穿平台{' '}
          <kbd>Q</kbd>切换角色{' '}
          {hero === 'vegito' && (
            <>
              <kbd>J</kbd>拳 <kbd>K</kbd>踢 <kbd>L</kbd>气剑 <kbd>H</kbd>
              气功{' '}
            </>
          )}
          <kbd>Esc</kbd>暂停{hero === 'vegito' ? ' / 技能' : ''}
        </div>
        <div ref={fadeRef} className="level-fade" aria-hidden="true" />
      </section>
      <Dialog open={paused} onOpenChange={(open) => changePause(open)}>
        <DialogContent
          className="pause-dialog"
          showCloseButton={false}
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              changePause(false);
            }
          }}
        >
          <DialogTitle className="pause-title">游戏已暂停</DialogTitle>
          <DialogDescription className="pause-description">
            按 Esc 或 PLAY 继续冒险
          </DialogDescription>
          <button
            type="button"
            className="pixel-menu-button"
            aria-label="继续游戏"
            onClick={() => changePause(false)}
          >
            {menuArt ? (
              <img src={menuArt.play} alt="" draggable={false} />
            ) : (
              'PLAY'
            )}
          </button>
          <button
            type="button"
            className="pixel-menu-button"
            aria-label="游戏选项"
            aria-expanded={optionsOpen}
            aria-controls="pause-options"
            onClick={() => setOptionsOpen((v) => !v)}
          >
            {menuArt ? (
              <img src={menuArt.options} alt="" draggable={false} />
            ) : (
              'OPTIONS'
            )}
          </button>
          {hero === 'vegito' && (
            <details className="vegito-guide">
              <summary>贝吉特技能与按键</summary>
              <dl>
                {VEGITO_KEYS.map((key) => {
                  const skill = VEGITO_SKILLS[key];
                  return (
                    <div key={key}>
                      <dt>
                        <kbd>{skill.key}</kbd> {skill.name}
                        <span>{skill.cost ? `${skill.cost} MP` : '免费'}</span>
                      </dt>
                      <dd>{skill.tip}</dd>
                    </div>
                  );
                })}
              </dl>
            </details>
          )}
          {optionsOpen && (
            <div id="pause-options" className="pause-options">
              <label htmlFor="pause-sound">
                音效{' '}
                <Switch
                  id="pause-sound"
                  checked={audioSettings.soundEnabled}
                  onCheckedChange={(enabled) =>
                    changeAudio({ soundEnabled: enabled })
                  }
                />
              </label>
              <div className="audio-volume">
                <label id="sfx-volume-label">
                  音效音量{' '}
                  <span>{Math.round(audioSettings.soundVolume * 100)}%</span>
                </label>
                <Slider
                  aria-labelledby="sfx-volume-label"
                  value={[Math.round(audioSettings.soundVolume * 100)]}
                  onValueChange={(value) =>
                    changeAudio({
                      soundVolume:
                        (Array.isArray(value) ? value[0] : value) / 100,
                    })
                  }
                />
              </div>
              <label htmlFor="pause-music">
                背景音乐{' '}
                <Switch
                  id="pause-music"
                  checked={audioSettings.musicEnabled}
                  onCheckedChange={(enabled) =>
                    changeAudio({ musicEnabled: enabled })
                  }
                />
              </label>
              <div className="audio-volume">
                <label id="music-volume-label">
                  音乐音量{' '}
                  <span>{Math.round(audioSettings.musicVolume * 100)}%</span>
                </label>
                <Slider
                  aria-labelledby="music-volume-label"
                  value={[Math.round(audioSettings.musicVolume * 100)]}
                  onValueChange={(value) =>
                    changeAudio({
                      musicVolume:
                        (Array.isArray(value) ? value[0] : value) / 100,
                    })
                  }
                />
                <p>
                  {MAP_MUSIC[level].mood} · {MAP_MUSIC[level].title}
                </p>
              </div>
              <label htmlFor="pause-motion">
                画面震动{' '}
                <Switch
                  id="pause-motion"
                  checked={motionEnabled}
                  onCheckedChange={(enabled) => {
                    setMotionEnabled(enabled);
                    motionRef.current = enabled;
                  }}
                />
              </label>
              <a
                className="audio-credits"
                href="/assets/audio/CREDITS.txt"
                target="_blank"
                rel="noreferrer"
              >
                音乐与音效来源
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
