// audio — a zero-asset sound engine. Every sound effect is SYNTHESIZED at play time from oscillators,
// a single noise buffer, and gain envelopes via the Web Audio API. There are no files to load and no
// network — this module subscribes to the state store's semantic events (the same ones the render
// modules use) and turns each one into a short, distinct burst of juice. The server owns truth; this
// module owns the *sound* of feel: the thud of a hit, the rising zap of a bolt, the coin ding of loot.
//
// Browsers block audio until a user gesture, so the AudioContext is created LAZILY on the first
// pointerdown/keydown. Until then every play call is a silent no-op. If the AudioContext constructor
// itself throws (unsupported browser, hostile environment), the whole module quietly does nothing —
// the game still plays, just mute.

// --- module-scope state ------------------------------------------------------------------------
// Everything lives here so init() can be called once and the event handlers (and any future frame())
// can share the same context. `ac` is null until the first gesture wakes it.
let ctxRef = null; // the shared client ctx (for ME, on, etc.)
let ac = null; // the AudioContext, or null until the first user gesture / if construction failed
let master = null; // master GainNode → destination; keeps the whole engine at a polite volume
let noiseBuf = null; // one reusable mono buffer of white noise, sampled per-burst by `noise()`
let armed = false; // true once the wake listeners are attached (guards double init)
let dead = false; // true if AudioContext construction threw — we give up forever and stay silent

const MASTER_VOL = 0.22; // low, so a busy fight doesn't become a wall of noise

// --- public: init ------------------------------------------------------------------------------
// Called once by main with the shared ctx. We do NOT create the AudioContext here (autoplay policy);
// instead we arm one-time wake listeners and wire every state event to a synth call. The synth calls
// are safe to make before the context exists — they early-return while `ac` is null.
export function init(ctx) {
  ctxRef = ctx;
  if (!ctx || typeof ctx.on !== "function") return; // defensive: nothing to subscribe to

  arm(); // attach the first-gesture wake listeners

  const ME = ctx.ME;
  const isMe = (id) => id != null && id === ME; // tiny helper, used all over below

  // -- combat: swings & casts (only the local player's, to avoid a chorus from every actor) -------
  ctx.on("fx-swing", (e) => {
    if (!e || !isMe(e.id)) return;
    swing();
  });
  ctx.on("fx-cast", (e) => {
    if (!e || !isMe(e.id)) return;
    cast(e.ability);
  });

  // -- damage: a thud. Punchier & louder when it's ME getting hit, softer for everyone else. ------
  ctx.on("damage", (e) => {
    if (!e) return;
    hit(isMe(e.id));
  });

  // -- heal: a gentle ascending shimmer, only for the local player ---------------------------------
  ctx.on("heal", (e) => {
    if (!e || !isMe(e.id)) return;
    healShimmer();
  });

  // -- death: a descending minor tone; sadder (lower, longer) when it's ME -------------------------
  ctx.on("died", (e) => {
    if (!e) return;
    death(isMe(e.id));
  });

  // -- level up: a triumphant major arpeggio, only for the local player ----------------------------
  ctx.on("levelup", (e) => {
    if (!e || !isMe(e.id)) return;
    levelUp();
  });

  // -- status effect gained: poison / stun / might each get their own flavor (local player only) ---
  ctx.on("effect-gain", (e) => {
    if (!e || !isMe(e.id)) return;
    effect(e.name);
  });

  // -- an undead rising: an eerie reversed-feeling swell -------------------------------------------
  ctx.on("rose", (e) => {
    if (!e) return;
    rose();
  });

  // -- chat: a soft short blip so a new line is felt, not just seen --------------------------------
  ctx.on("chat", (e) => {
    if (!e) return;
    chatBlip();
  });

  // -- coins: state has no explicit 'gold' event, so we watch the local player's snapshot and ding
  //    whenever gold ticked up since the previous frame. `prev` may be undefined on the first 'me'. -
  ctx.on("me", (e) => {
    if (!e || !e.snap || !e.prev) return;
    const now = e.snap.gold ?? 0;
    const was = e.prev.gold ?? 0;
    if (now > was) coin();
  });
}

// --- waking the context ------------------------------------------------------------------------
// The first pointerdown OR keydown anywhere creates (or resumes) the AudioContext. We attach both
// because the player might click OR press a key first. The listeners are { once:false } but guarded by
// `ac` so the heavy work only happens once; we remove them after a successful wake.
function arm() {
  if (armed || dead) return;
  armed = true;
  const wake = () => {
    ensureContext();
    if (ac) {
      // success — we no longer need the wake listeners
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    }
  };
  try {
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
  } catch {
    // no window (e.g. node --check never runs this) — stay silent
  }
}

// Create the AudioContext on demand. Resumes it if a browser parked it in 'suspended'. If construction
// throws, we set `dead` so we never try again and every synth call stays a no-op.
function ensureContext() {
  if (ac || dead) {
    // already alive (or dead) — but a live context can drift to 'suspended', so nudge it on gesture
    if (ac && ac.state === "suspended") ac.resume?.().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { dead = true; return; }
    ac = new AC();
    master = ac.createGain();
    master.gain.value = MASTER_VOL;
    master.connect(ac.destination);
    noiseBuf = makeNoiseBuffer();
    if (ac.state === "suspended") ac.resume?.().catch(() => {});
  } catch {
    // unsupported / blocked — give up permanently, silently
    dead = true;
    ac = null;
    master = null;
  }
}

// Build one second of mono white noise we can re-slice for every percussive burst. Cheap to keep.
function makeNoiseBuffer() {
  const len = Math.floor(ac.sampleRate * 1.0);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// `now` is the current context time, the reference point for every envelope below. Returns null when
// the context isn't ready, which the synth helpers treat as "do nothing".
function tnow() {
  return ac ? ac.currentTime : null;
}

// --- low-level synth helpers -------------------------------------------------------------------
// Each helper schedules nodes, starts them, and stops them so they get garbage-collected — there is no
// pooling, just create/play/discard. All of them early-return if the context is missing.

// tone — one oscillator with an attack/decay gain envelope and an optional linear frequency slide.
//   freq    : starting frequency in Hz
//   dur     : total duration in seconds (envelope decays to ~0 by then)
//   opts.type    : oscillator type ('sine' | 'square' | 'sawtooth' | 'triangle')
//   opts.vol     : peak gain (relative; master scales everything down)
//   opts.slideTo : if set, frequency ramps linearly to this Hz over `dur`
//   opts.attack  : seconds to reach peak gain
//   opts.decay   : seconds of decay tail (defaults to filling the rest of `dur`)
//   opts.delay   : seconds to wait before starting (for chords/arps)
// Returns the scheduled stop time so callers can chain.
function tone(freq, dur, opts = {}) {
  if (!ac || !master) return null;
  const t0 = tnow();
  if (t0 == null) return null;
  const { type = "sine", vol = 1, slideTo, attack = 0.005, decay, delay = 0 } = opts;
  const start = t0 + Math.max(0, delay);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(1, freq), start);
  if (typeof slideTo === "number") {
    osc.frequency.linearRampToValueAtTime(Math.max(1, slideTo), start + dur);
  }
  // ADSR-ish: ramp up over `attack`, then exponential-ish decay to silence by `start + dur`.
  const peak = Math.max(0.0001, vol);
  const dec = typeof decay === "number" ? decay : Math.max(0.01, dur - attack);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  // exponentialRamp can't target 0, so aim at a tiny floor then hard-stop.
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + dec);
  osc.connect(g);
  g.connect(master);
  osc.start(start);
  const stop = start + dur + 0.02;
  osc.stop(stop);
  return stop;
}

// noise — a short burst sampled from the shared noise buffer, run through a biquad lowpass. Great for
// thuds, hits, and whooshes.
//   opts.vol     : peak gain
//   opts.lowpass : cutoff Hz of the lowpass (static), OR
//   opts.lpFrom/opts.lpTo : sweep the cutoff over `dur` (e.g. descending for a whoosh)
//   opts.delay   : seconds before starting
function noise(dur, opts = {}) {
  if (!ac || !master || !noiseBuf) return null;
  const t0 = tnow();
  if (t0 == null) return null;
  const { vol = 1, lowpass = 1800, lpFrom, lpTo, attack = 0.002, delay = 0 } = opts;
  const start = t0 + Math.max(0, delay);
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  // random offset into the buffer so repeated hits don't sound identical
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  if (typeof lpFrom === "number" && typeof lpTo === "number") {
    filter.frequency.setValueAtTime(Math.max(40, lpFrom), start);
    filter.frequency.linearRampToValueAtTime(Math.max(40, lpTo), start + dur);
  } else {
    filter.frequency.setValueAtTime(Math.max(40, lowpass), start);
  }
  const g = ac.createGain();
  const peak = Math.max(0.0001, vol);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  // start at a random position in the loop for variety
  const offset = Math.random() * 0.9;
  src.start(start, offset);
  const stop = start + dur + 0.02;
  src.stop(stop);
  return stop;
}

// chord — several `tone()`s started together. Convenience over calling tone() N times.
function chord(freqs, dur, opts = {}) {
  if (!Array.isArray(freqs)) return;
  for (const f of freqs) tone(f, dur, opts);
}

// arp — the same tones but staggered by `step` seconds each, for level-up flourishes.
function arp(freqs, step, opts = {}) {
  if (!Array.isArray(freqs)) return;
  freqs.forEach((f, i) => tone(f, opts.dur ?? step * 1.8, { ...opts, delay: (opts.delay ?? 0) + i * step }));
}

// --- the sounds --------------------------------------------------------------------------------
// Each is a tiny "instrument": a handful of helper calls tuned to feel good and stay short (~60–300ms)
// and distinct. They all no-op gracefully when the context isn't awake.

// swing — an airy whoosh: a noise burst whose lowpass cutoff slides DOWN (bright→dark) like air parting.
function swing() {
  noise(0.18, { vol: 0.5, lpFrom: 5200, lpTo: 700, attack: 0.01 });
}

// cast — branches by ability into four distinct shapes.
function cast(ability) {
  switch (ability) {
    case "bolt":
      // a quick rising zap: a sawtooth sliding up fast
      tone(420, 0.16, { type: "sawtooth", vol: 0.5, slideTo: 1500, attack: 0.004 });
      break;
    case "heavy":
      // a low whump: a noise body + a deep sine impact under it
      noise(0.16, { vol: 0.6, lowpass: 500, attack: 0.004 });
      tone(70, 0.22, { type: "sine", vol: 0.8, slideTo: 45 });
      break;
    case "cleave":
      // a wide sweep: a triangle gliding across a broad band, plus an airy noise sweep
      tone(300, 0.26, { type: "triangle", vol: 0.5, slideTo: 900 });
      noise(0.24, { vol: 0.35, lpFrom: 900, lpTo: 4200, attack: 0.02 });
      break;
    case "second-wind":
      // a soft shimmer: two sines slightly detuned, gentle attack
      tone(660, 0.3, { type: "sine", vol: 0.4, attack: 0.04 });
      tone(666, 0.3, { type: "sine", vol: 0.4, attack: 0.05 }); // slight detune → beating shimmer
      break;
    default:
      // unknown ability — a neutral soft tone so it's not silent but not jarring
      tone(500, 0.12, { type: "sine", vol: 0.3 });
  }
}

// hit — a thud. `mine` = true means the local player got hit: punchier, louder, lower.
function hit(mine) {
  if (mine) {
    noise(0.16, { vol: 0.8, lowpass: 900, attack: 0.001 }); // a meaty smack
    tone(110, 0.18, { type: "sine", vol: 0.7, slideTo: 60 }); // a low-gut impact under it
  } else {
    noise(0.1, { vol: 0.35, lowpass: 1400, attack: 0.001 }); // softer, brighter, shorter for others
    tone(180, 0.1, { type: "sine", vol: 0.3, slideTo: 120 });
  }
}

// healShimmer — a gentle ascending shimmer: two sines sliding upward.
function healShimmer() {
  tone(520, 0.22, { type: "sine", vol: 0.4, slideTo: 780, attack: 0.03 });
  tone(780, 0.26, { type: "sine", vol: 0.3, slideTo: 1040, attack: 0.05, delay: 0.05 });
}

// death — a descending minor tone. `mine` = true → lower & longer, for a sadder fall.
function death(mine) {
  if (mine) {
    tone(330, 0.6, { type: "triangle", vol: 0.5, slideTo: 110, attack: 0.02 }); // A4 → A2-ish, slow
    tone(392, 0.6, { type: "sine", vol: 0.25, slideTo: 131, attack: 0.04 }); // a minor-third companion
  } else {
    tone(440, 0.3, { type: "triangle", vol: 0.3, slideTo: 220, attack: 0.01 });
  }
}

// levelUp — a triumphant 4-note major arpeggio (C-E-G-C, a major chord climbing an octave).
function levelUp() {
  arp([523.25, 659.25, 783.99, 1046.5], 0.085, { type: "triangle", vol: 0.45, dur: 0.22, attack: 0.005 });
}

// effect — poison / stun / might each get a signature.
function effect(name) {
  switch (name) {
    case "poison":
      // a bubbly low blip: a couple of quick low blips that wobble downward
      tone(180, 0.09, { type: "square", vol: 0.35, slideTo: 130 });
      tone(150, 0.09, { type: "square", vol: 0.3, slideTo: 100, delay: 0.08 });
      break;
    case "stun":
      // a dizzy two-tone: two close, wobbling tones that feel off-balance
      tone(620, 0.14, { type: "sine", vol: 0.35, slideTo: 560 });
      tone(560, 0.16, { type: "sine", vol: 0.35, slideTo: 640, delay: 0.07 });
      break;
    case "might":
      // a rising power tone: a confident sweep up
      tone(220, 0.26, { type: "sawtooth", vol: 0.4, slideTo: 520, attack: 0.02 });
      break;
    case "regen":
      // (in the contract's effect set) a soft warm pulse upward
      tone(400, 0.2, { type: "sine", vol: 0.3, slideTo: 540, attack: 0.04 });
      break;
    case "weaken":
      // (in the contract's effect set) a sagging tone downward
      tone(360, 0.2, { type: "sine", vol: 0.3, slideTo: 220, attack: 0.02 });
      break;
    default:
      tone(440, 0.1, { type: "sine", vol: 0.25 });
  }
}

// rose — an undead rising: an eerie swell. We fake a "reversed" feel by ramping the gain UP into a soft
// peak (slow attack) while a low tone slides upward beneath a brighter, opening noise sweep.
function rose() {
  tone(90, 0.5, { type: "sine", vol: 0.4, slideTo: 200, attack: 0.3 }); // slow swell up = reversed feel
  noise(0.5, { vol: 0.25, lpFrom: 300, lpTo: 2600, attack: 0.3 }); // an opening, breathy rise
}

// chatBlip — a soft short blip so a new chat line registers in the ear.
function chatBlip() {
  tone(880, 0.06, { type: "sine", vol: 0.22, attack: 0.003 });
}

// coin — a bright loot ding: two quick high tones (a little fifth jump up).
function coin() {
  tone(1320, 0.08, { type: "square", vol: 0.3, attack: 0.002 });
  tone(1760, 0.1, { type: "square", vol: 0.3, attack: 0.002, delay: 0.06 });
}

// No frame() is exported — every sound is event-driven, so there is nothing to do per animation frame.
