// slots-audio.mjs — "Tideline Treasures"'s sound: @red-cup-engineering/resonator for procedural
// synthesis (zero audio asset files, per the house doctrine — see resonator's own README), wired
// through @red-cup-engineering/qwzspace's `audio-cues` seam exactly the way both packages'
// READMEs describe: `toPlayerInterface(gameAudio)` satisfies audio-cues' injected
// `{ play(cueId, opts) }` player shape directly, no adapter needed.
//
// Two ways sound gets triggered from `slots.mjs`, both real:
//   1. `fireCue(eventKind, opts)` — the generic seam: `registerCue(eventKind, cueId, intensity)`
//      below maps a game moment ("a major win", "the jackpot hit") to a resonator cue name, and
//      `dispatcher.dispatch({k: eventKind, ...opts})` looks it up and calls the player. This is
//      the audio-cues contract exactly as its own header describes it (a wire-event-shaped frame
//      in, a `player.play(cueId, {intensity, source})` call out).
//   2. A couple of direct `gameAudio.play(name, {seed, ...})` calls (the spin-start riser, each
//      reel's own stop tick) so those specific sounds vary per spin/per reel — the dispatcher
//      seam above only ever forwards `{intensity, source}`, never a per-call `seed` (see this
//      module's own comment at `fireCue`), so a moment that benefits from real seeded variety
//      goes straight to `gameAudio` instead.
//
// Silent degradation is real and free: `createAudioEngine()` (resonator/web) already no-ops every
// play/schedule call when no `AudioContext` is available (headless test runners, browsers with
// audio blocked) — this module adds nothing on top of that, per resonator's own header.

import { createAudioEngine } from '/vendor/resonator/web/webaudio-adapter.mjs';
import { createGameAudio, toPlayerInterface } from '/vendor/resonator/game/index.mjs';
import { registerCue, createDispatcher } from '/vendor/qwzspace/audio-cues.mjs';

const MIXER_STORAGE_KEY = 'cowrie-casino-slots-mixer';
const SOUND_ENABLED_KEY = 'cowrie-casino-slots-sound-enabled';

const engine = createAudioEngine({ channels: ['sfx', 'music', 'ambient'], storage: window.localStorage, storageKey: MIXER_STORAGE_KEY });
const gameAudio = createGameAudio({ engine });
const player = toPlayerInterface(gameAudio);

registerCue('spin-start', 'riser', 0.35);
registerCue('reel-stop', 'tick', 0.4);
registerCue('anticipation', 'whoosh', 0.6);
registerCue('win-minor', 'chime-minor', 0.4);
registerCue('win-major', 'chime-major', 0.7);
registerCue('win-epic', 'chime-epic', 1.0);
registerCue('coin-shower', 'coin-shower', 0.7);
registerCue('free-spins-triggered', 'success', 0.75);
registerCue('jackpot', 'fanfare', 1.0);

const dispatcher = createDispatcher(player);

let ambientHandles = null;
let muted = false;

function readSoundPreference() {
  try {
    return window.localStorage.getItem(SOUND_ENABLED_KEY) !== 'false'; // sound on by default
  } catch {
    return true;
  }
}

/** Call from inside a real user-gesture handler (the page's own "tap to start" affordance is the
 *  first Spin click) — safe to call redundantly, per resonator's own `ensureStarted()` contract. */
export function ensureAudioStarted() {
  const started = engine.ensureStarted();
  muted = !readSoundPreference();
  if (started && !muted && ambientHandles === null) {
    const result = gameAudio.play('ambient-bed', { seed: 'tideline-treasures-floor', channel: 'ambient' });
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

/** The generic audio-cues seam — see this module's header, way 1. */
export function fireCue(eventKind, opts = {}) {
  return dispatcher.dispatch({ k: eventKind, ...opts });
}

/** The direct, seeded calls — see this module's header, way 2. */
export function playSpinRiser(spinId, durationSec) {
  gameAudio.play('riser', { seed: `${spinId}-spin`, durationSec });
}

export function playReelStopTick(spinId, reelIndex) {
  gameAudio.play('tick', { seed: `${spinId}-reel-${reelIndex}`, index: reelIndex });
}

/** Ducks the ambient floor bed under a cue about to play, sized to that cue's own duration — the
 *  exact `duckForCue` pattern resonator's own README worked example uses for a slot spin. */
export function duckAmbientFor(cueName, opts = {}) {
  const cueRender = gameAudio.resolve(cueName, opts);
  gameAudio.duckForCue(cueRender);
  return cueRender;
}

export { gameAudio, engine as audioEngine };
