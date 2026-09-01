// floor-audio.mjs — the living floor's sound: the identical resonator + qwzspace/audio-cues wiring
// `slots-audio.mjs` establishes (see that file's own header for the full rationale), scoped to the
// floor's own moments instead of a spin's. `MIXER_STORAGE_KEY`/`SOUND_ENABLED_KEY` are the exact
// same localStorage key STRINGS `slots-audio.mjs` uses (neither module exports them as a shared
// constant today, so this is a deliberate literal duplication, not independent state) — per the
// build brief's "sound toggle shared with the games' persisted preference," muting sound on the
// floor mutes it on Tideline Treasures too, and vice versa, because both read/write the identical
// keys. A future pass could hoist these into a small shared module; two static pages with no
// bundler duplicating two string literals is an honest, small enough cost to leave for that pass.

import { createAudioEngine } from '/vendor/resonator/web/webaudio-adapter.mjs';
import { createGameAudio, toPlayerInterface } from '/vendor/resonator/game/index.mjs';
import { registerCue, createDispatcher } from '/vendor/qwzspace/audio-cues.mjs';

const MIXER_STORAGE_KEY = 'cowrie-casino-slots-mixer';
const SOUND_ENABLED_KEY = 'cowrie-casino-slots-sound-enabled';

const engine = createAudioEngine({ channels: ['sfx', 'music', 'ambient'], storage: window.localStorage, storageKey: MIXER_STORAGE_KEY });
const gameAudio = createGameAudio({ engine });
const player = toPlayerInterface(gameAudio);

registerCue('floor-win', 'chime-minor', 0.4);
registerCue('floor-big-win', 'chime-major', 0.75);
registerCue('floor-jackpot', 'fanfare', 1.0);
registerCue('floor-chat', 'ui-tap', 0.2);

const dispatcher = createDispatcher(player);

let ambientHandles = null;
let muted = false;

function readSoundPreference() {
  try {
    return window.localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** Call from inside a real user-gesture handler — safe to call redundantly. */
export function ensureAudioStarted() {
  const started = engine.ensureStarted();
  muted = !readSoundPreference();
  if (started && !muted && ambientHandles === null) {
    const result = gameAudio.play('ambient-bed', { seed: 'cowrie-casino-floor', channel: 'ambient' });
    ambientHandles = result?.handles ?? null;
  }
  applyMuteToChannels();
  return started;
}

function applyMuteToChannels() {
  engine.setChannelMuted?.('sfx', muted);
  engine.setChannelMuted?.('music', muted);
  engine.setChannelMuted?.('ambient', muted);
}

export function isSoundEnabled() {
  return !muted;
}

export function setSoundEnabled(enabled) {
  muted = !enabled;
  try {
    window.localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    /* storage unavailable — the preference just won't survive a reload; not fatal */
  }
  applyMuteToChannels();
}

/** The generic audio-cues seam, exactly `slots-audio.mjs`'s own `fireCue`. */
export function fireCue(eventKind, opts = {}) {
  return dispatcher.dispatch({ k: eventKind, ...opts });
}

/** Ducks the ambient floor bed under a cue about to play, sized to that cue's own duration. */
export function duckAmbientFor(cueName, opts = {}) {
  const cueRender = gameAudio.resolve(cueName, opts);
  gameAudio.duckForCue(cueRender);
  return cueRender;
}

export { gameAudio, engine as audioEngine };
