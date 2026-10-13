import { actionCues, type AudioAction, type SoundKind } from './audio-cues';
import type { CombatEvent } from './combat';
import type { LevelId } from './levels';

export const MAP_MUSIC = {
  1: { title: 'Grasslands', mood: '竹林探索', file: 'forest.ogg' },
  2: { title: 'Home Town', mood: '秋日村庄', file: 'village.ogg' },
  3: { title: 'Where Time Stands Still', mood: '暮色旧城', file: 'dusk.ogg' },
  4: { title: 'Catacombs', mood: '幽冥废殿', file: 'ruins.ogg' },
} as const;
const BANK: Record<SoundKind, string[]> = {
  punch: ['punch-1.ogg', 'punch-2.ogg', 'punch-3.ogg'],
  heavy: ['heavy-1.ogg', 'heavy-2.ogg'],
  whoosh: ['whoosh-1.wav', 'whoosh-2.wav'],
  slash: ['slash.wav'],
  charge: ['charge.wav'],
  shot: ['shot.ogg'],
  beam: ['beam.ogg'],
  burst: ['burst.ogg'],
  warp: ['warp.wav'],
};
export type AudioSettings = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
};
const DEFAULTS: AudioSettings = {
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 0.8,
  musicVolume: 0.38,
};
const STORAGE = 'maple-adventure-audio-v1';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
type Voice = { source: AudioBufferSourceNode; gain: GainNode; tag: string };
type Deck = {
  audio: HTMLAudioElement;
  gain: GainNode;
  source: MediaElementAudioSourceNode;
  level: LevelId;
  retire?: ReturnType<typeof setTimeout>;
};

export function createGameAudio() {
  let settings = { ...DEFAULTS };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE) ?? '{}');
    for (const k of ['soundEnabled', 'musicEnabled'] as const)
      if (typeof stored[k] === 'boolean') settings[k] = stored[k];
    for (const k of ['soundVolume', 'musicVolume'] as const)
      if (typeof stored[k] === 'number' && Number.isFinite(stored[k]))
        settings[k] = clamp(stored[k]);
  } catch {
    /* Optional device-local preferences. */
  }
  let context: AudioContext | null = null;
  let sfxBus: GainNode, musicBus: GainNode, duckBus: GainNode;
  let paused = false,
    hidden = document.hidden,
    closed = false,
    stage: LevelId = 1;
  let current: Deck | null = null,
    previous: Deck | null = null;
  let actionId = '',
    actionAge = -1,
    cursor = 0,
    hitAt = -Infinity;
  let clipSequence = 0,
    lastCue = '',
    played = 0;
  const voices = new Set<Voice>(),
    buffers = new Map<string, AudioBuffer>();
  const errors = new Set<string>();
  const requests = new Map<string, Promise<ArrayBuffer | null>>();
  // Fetch small effects before the first input; decode only after audio unlock.
  for (const file of Object.values(BANK).flat())
    requests.set(
      file,
      fetch(`/assets/audio/sfx/${file}`)
        .then((r) => {
          if (!r.ok) throw new Error(file);
          return r.arrayBuffer();
        })
        .catch(() => {
          errors.add(file);
          return null;
        }),
    );
  const blocked = () => paused || hidden || closed;
  function ramp(param: AudioParam, value: number, seconds = 0.06) {
    if (!context) return;
    param.cancelScheduledValues(context.currentTime);
    param.setValueAtTime(param.value, context.currentTime);
    param.linearRampToValueAtTime(value, context.currentTime + seconds);
  }
  function disposeDeck(deck: Deck | null) {
    if (!deck) return;
    clearTimeout(deck.retire);
    deck.audio.pause();
    deck.audio.removeAttribute('src');
    deck.audio.load();
    deck.source.disconnect();
    deck.gain.disconnect();
  }
  function playDeck(deck: Deck) {
    if (blocked() || !settings.musicEnabled || !settings.musicVolume) return;
    void deck.audio.play().catch(() => {
      /* A later user gesture retries autoplay. */
    });
  }
  function startMusic() {
    if (
      !context ||
      blocked() ||
      !settings.musicEnabled ||
      !settings.musicVolume
    )
      return;
    if (current?.level === stage) {
      if (current.audio.paused) playDeck(current);
      return;
    }
    disposeDeck(previous);
    previous = current;
    const audio = new Audio(`/assets/audio/music/${MAP_MUSIC[stage].file}`);
    audio.loop = true;
    audio.preload = 'auto';
    const gain = context.createGain(),
      source = context.createMediaElementSource(audio);
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(musicBus);
    const deck: Deck = { audio, gain, source, level: stage };
    current = deck;
    audio.addEventListener('error', () =>
      errors.add(MAP_MUSIC[deck.level].file),
    );
    // Keep the old map audible until the incoming track can actually play.
    audio.addEventListener(
      'playing',
      () => {
        if (closed || current !== deck) return;
        ramp(deck.gain.gain, 1, 1.1);
        const outgoing = previous;
        if (outgoing) {
          ramp(outgoing.gain.gain, 0, 1.1);
          outgoing.retire = setTimeout(() => {
            disposeDeck(outgoing);
            if (previous === outgoing) previous = null;
          }, 1250);
        }
      },
      { once: true },
    );
    playDeck(deck);
  }
  function unlock() {
    if (closed || blocked()) return;
    try {
      if (!context) {
        context = new AudioContext({ latencyHint: 'interactive' });
        sfxBus = context.createGain();
        musicBus = context.createGain();
        duckBus = context.createGain();
        const limiter = context.createDynamicsCompressor(),
          master = context.createGain();
        limiter.threshold.value = -8;
        limiter.knee.value = 8;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.13;
        master.gain.value = 0.82;
        sfxBus.gain.value = settings.soundEnabled
          ? settings.soundVolume * 0.76
          : 0;
        musicBus.gain.value = settings.musicVolume * 0.52;
        sfxBus.connect(limiter);
        musicBus.connect(duckBus);
        duckBus.connect(limiter);
        limiter.connect(master);
        master.connect(context.destination);
        const decodingContext = context;
        for (const [file, request] of requests)
          void request.then(async (raw) => {
            if (!raw || closed) return;
            try {
              const data = await decodingContext.decodeAudioData(raw.slice(0));
              if (!closed) buffers.set(file, data);
            } catch {
              errors.add(file);
            }
          });
      }
      if (context.state === 'suspended') void context.resume().catch(() => {});
      startMusic();
    } catch {
      errors.add('audio-context');
    }
  }
  function stopVoice(voice: Voice) {
    if (!context) return;
    ramp(voice.gain.gain, 0, 0.025);
    try {
      voice.source.stop(context.currentTime + 0.03);
    } catch {
      /* Already ended. */
    }
  }
  function stopAction() {
    for (const voice of voices) if (voice.tag === 'action') stopVoice(voice);
  }
  function duck(power = 0.58, duration = 0.4) {
    if (!context) return;
    const now = context.currentTime,
      g = duckBus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(power, now + 0.018);
    g.setValueAtTime(power, now + duration);
    g.linearRampToValueAtTime(1, now + duration + 0.3);
  }
  function sample(
    kind: SoundKind,
    gain = 0.7,
    pan = 0,
    duration?: number,
    tag = 'impact',
  ) {
    if (
      blocked() ||
      !settings.soundEnabled ||
      !settings.soundVolume ||
      !context ||
      context.state !== 'running'
    )
      return;
    const files = BANK[kind],
      file = files[clipSequence++ % files.length],
      buffer = buffers.get(file);
    if (!buffer) return; // Never replay stale hits after a slow download.
    while (voices.size >= 18) {
      const oldest = voices.values().next().value!;
      stopVoice(oldest);
      voices.delete(oldest);
    }
    const now = context.currentTime,
      source = context.createBufferSource(),
      envelope = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = buffer;
    const rate =
      kind === 'charge' || kind === 'beam'
        ? 1
        : 0.96 + (clipSequence % 5) * 0.02;
    source.playbackRate.value = rate;
    source.loop = !!duration && (kind === 'charge' || kind === 'beam');
    const length =
      duration ??
      Math.min(buffer.duration / rate, kind === 'burst' ? 1.0 : 0.62);
    panner.pan.value = Math.max(-0.65, Math.min(0.65, pan));
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(gain, now + 0.003);
    envelope.gain.setValueAtTime(gain, now + Math.max(0.004, length - 0.045));
    envelope.gain.linearRampToValueAtTime(0, now + length);
    source.connect(envelope);
    envelope.connect(panner);
    panner.connect(sfxBus);
    const voice: Voice = { source, gain: envelope, tag };
    voices.add(voice);
    source.onended = () => {
      voices.delete(voice);
      source.disconnect();
      envelope.disconnect();
      panner.disconnect();
    };
    source.start(now);
    source.stop(now + length + 0.01);
    lastCue = kind;
    played++;
    if (kind === 'beam' || kind === 'burst') duck(0.45, length);
  }
  function syncAction(action: AudioAction | null) {
    if (!action) {
      if (actionId) stopAction();
      actionId = '';
      cursor = 0;
      actionAge = -1;
      return;
    }
    const changed = action.id !== actionId;
    if (changed) {
      stopAction();
      actionId = action.id;
      cursor = 0;
      actionAge = -1;
    }
    const cues = actionCues(action.hero, action.skill);
    while (cursor < cues.length && action.age >= cues[cursor].at) {
      const cue = cues[cursor++];
      // Mid-skill audio unlock must not play earlier charge/release cues in a burst.
      if (action.age - cue.at < 100)
        sample(cue.sound, cue.gain, action.pan, cue.duration, 'action');
    }
    actionAge = action.age;
  }
  function hit(event: CombatEvent, pan: number, hero: string, skill: string) {
    if (!context || blocked()) return;
    const force = event.force ?? 1;
    if (context.currentTime - hitAt < 0.045) return;
    hitAt = context.currentTime;
    const heavy = force >= 1.7 || event.finisher || event.defeated;
    sample(heavy ? 'heavy' : 'punch', heavy ? 0.95 : 0.78, pan);
    if (event.element && force >= 2) sample('burst', 0.23, pan, 0.28);
    else if (
      event.target === 'enemy' &&
      ((hero === 'samara' && skill !== 'kick') || skill === 'sword')
    )
      sample('slash', 0.25, pan, 0.16);
    if (heavy) duck(0.65, 0.13);
  }
  function applyPause() {
    if (!context) return;
    if (blocked()) {
      current?.audio.pause();
      previous?.audio.pause();
      void context.suspend().catch(() => {});
    } else {
      void context.resume().catch(() => {});
      startMusic();
      if (previous) playDeck(previous);
    }
  }
  const visibility = () => {
    hidden = document.hidden;
    applyPause();
  };
  document.addEventListener('visibilitychange', visibility);
  return {
    unlock,
    hit,
    syncAction,
    play: sample,
    setLevel(level: LevelId) {
      stage = level;
      stopAction();
      actionId = '';
      startMusic();
    },
    setSettings(next: Partial<AudioSettings>) {
      settings = { ...settings, ...next };
      settings.soundVolume = clamp(settings.soundVolume);
      settings.musicVolume = clamp(settings.musicVolume);
      try {
        localStorage.setItem(STORAGE, JSON.stringify(settings));
      } catch {
        /* Storage optional. */
      }
      if (context) {
        ramp(
          sfxBus.gain,
          settings.soundEnabled ? settings.soundVolume * 0.76 : 0,
        );
        ramp(musicBus.gain, settings.musicVolume * 0.52);
        if (!settings.musicEnabled || !settings.musicVolume) {
          current?.audio.pause();
          previous?.audio.pause();
        } else startMusic();
      }
      unlock();
    },
    settings: () => ({ ...settings }),
    setPaused(value: boolean) {
      paused = value;
      applyPause();
      if (!value) unlock();
    },
    snapshot: () => ({
      stage,
      settings: { ...settings },
      context: context?.state ?? 'locked',
      ready: buffers.size,
      errors: [...errors],
      voices: voices.size,
      played,
      lastCue,
      actionId,
      actionAge,
      music: current
        ? {
            level: current.level,
            time: current.audio.currentTime,
            paused: current.audio.paused,
            ready: current.audio.readyState,
            gain: current.gain.gain.value,
          }
        : null,
      outgoing: previous?.level ?? null,
    }),
    close() {
      closed = true;
      document.removeEventListener('visibilitychange', visibility);
      disposeDeck(current);
      disposeDeck(previous);
      current = previous = null;
      for (const voice of voices)
        try {
          voice.source.stop();
        } catch {
          /* Already stopped. */
        }
      if (context) void context.close().catch(() => {});
      buffers.clear();
      requests.clear();
    },
  };
}
