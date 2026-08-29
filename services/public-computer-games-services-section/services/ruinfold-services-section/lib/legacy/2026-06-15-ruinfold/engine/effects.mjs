// effects — status effects, folded onto the tick. A status effect (poison, regen, stun, might,
// weaken) is the canonical fit for an event-sourced world: it is wholly described by the TICK at
// which it expires. So each effect is ONE functional cell — `effect-<name>` holding the expiry
// tick — and "is it active?" is just `expiry > now`. There is no per-effect stack, no decrement
// loop, no countdown to drift out of sync; the clock is the source of truth and a re-`apply`
// simply supersedes the old expiry. The trace stays append-only and a replay is exact.
//
// Two FAMILIES of effect, distinguished by who reads the cell:
//   • OVER-TIME (poison/regen) — read HERE: tickEffects folds health each tick the effect is live.
//   • PASSIVE (stun/might/weaken) — read by OTHER systems at the moment they matter: combat skips a
//     stunned attacker (isStunned) and folds might/weaken into the swing (attackDelta). This module
//     only LANDS those effects; it never mutates state for them.
//
// Mutation convention (root, ...args, t, dirty): t is a () => string clock thunk that orders the
// rows appended this tick; dirty is a Set the caller collects touched subjects in (for the
// snapshot). The over-time fold goes through `changing` on `health` (FUNCTIONAL → latest-t wins,
// so the value actually moves), exactly like combat/regen.

import changing from "#changing";
import { view, numOf } from "#engine/_world.mjs";

// EFFECTS — the data table. Behaviour is data: each name maps to its functional predicate and its
// kind, plus the fixed, deterministic magnitudes the over-time and passive systems read. DoT/HoT
// `per` is health per active tick; buff/debuff `attackDelta` is the flat swing modifier.
export const EFFECTS = {
  poison: { predicate: "effect-poison", kind: "dot", per: 2 },
  regen: { predicate: "effect-regen", kind: "hot", per: 2 },
  stun: { predicate: "effect-stun", kind: "cc" },
  might: { predicate: "effect-might", kind: "buff", attackDelta: +3 },
  weaken: { predicate: "effect-weaken", kind: "debuff", attackDelta: -2 },
};

// predicateOf — the `effect-<name>` cell name for an effect, or null if `name` is not an effect.
function predicateOf(name) {
  return EFFECTS[name] ? EFFECTS[name].predicate : null;
}

// expiryOf — the integer expiry tick currently held in a thing's `effect-<name>` cell, or null if
// the effect is absent. The cell holds a tick NUMBER; numOf(...,-1) sentinels "no cell", which we
// map to null so callers can distinguish "never applied" from "expires at tick 0".
function expiryOf(thing, name) {
  const p = predicateOf(name);
  if (!p) return null;
  const v = numOf(thing, p, -1);
  return v < 0 ? null : v;
}

// isActive — an effect is live while its expiry is STRICTLY AFTER the current tick. At the expiry
// tick itself the effect is over (it lasted `durationTicks` ticks, then stops). Single rule, used
// everywhere, so "active" means the same thing to the fold, to combat, and to the HUD.
function isActive(thing, name, tick) {
  const until = expiryOf(thing, name);
  return until != null && until > tick;
}

// apply — land effect `name` on `target` for `durationTicks`, expiring at tick + durationTicks.
// Writing the absolute expiry (not the duration) is what makes a re-apply a clean supersede: the
// new `effect-<name>` row's later-t value simply wins, refreshing the timer with no stacking math.
export async function apply(root, target, name, durationTicks, tick, t, dirty) {
  const p = predicateOf(name);
  if (!p) return { applied: false, name };
  const until = tick + durationTicks;
  await changing({ root, subject: target, predicate: p, object: until, t: t() });
  dirty.add(target);
  return { applied: true, name, until };
}

// tickEffects — fold the OVER-TIME effects on one subject for this tick. For each live effect:
//   poison (dot): health down by `per`, floored at 0 (death.mjs decides what 0 MEANS; we never
//                 push health negative and never resurrect).
//   regen  (hot): health up by `per`, capped at max-health.
// stun/might/weaken are passive — read elsewhere — so they are NOT folded here. Returns the list of
// effect names that ticked (i.e. actually moved health), for logging/telemetry. Health is read
// ONCE and the net delta applied in a single `changing`, so two simultaneous DoT/HoT cannot race.
export async function tickEffects(root, subjectId, tick, t, dirty) {
  const subject = await view(root, subjectId);
  const ticked = [];

  const health = numOf(subject, "health", 0);
  const maxHealth = numOf(subject, "max-health", health);
  let next = health;

  if (isActive(subject, "poison", tick)) {
    next = Math.max(0, next - EFFECTS.poison.per);
    ticked.push("poison");
  }
  if (isActive(subject, "regen", tick)) {
    next = Math.min(maxHealth, next + EFFECTS.regen.per);
    ticked.push("regen");
  }

  if (next !== health) {
    await changing({ root, subject: subjectId, predicate: "health", object: next, t: t() });
    dirty.add(subjectId);
  }
  return { ticked };
}

// isStunned — is this thing crowd-controlled right now? combat/ai read this and SKIP the attacker's
// swing while true. Pure: a read of the settled `thing` against the current tick, no trace write.
export function isStunned(thing, tick) {
  return isActive(thing, "stun", tick);
}

// attackDelta — the NET flat modifier this thing's ACTIVE buffs/debuffs add to a swing. might
// (+3) and weaken (-2) sum, so both at once is +1; neither is 0. combat adds this to attack-power
// before striking. Pure read against the current tick.
export function attackDelta(thing, tick) {
  let delta = 0;
  if (isActive(thing, "might", tick)) delta += EFFECTS.might.attackDelta;
  if (isActive(thing, "weaken", tick)) delta += EFFECTS.weaken.attackDelta;
  return delta;
}

// activeEffects — every effect currently live on a thing, as [{name, until}], for the client HUD to
// render timers/icons. Pure read; order follows the EFFECTS table for a stable display.
export function activeEffects(thing, tick) {
  const out = [];
  for (const name of Object.keys(EFFECTS)) {
    if (isActive(thing, name, tick)) out.push({ name, until: expiryOf(thing, name) });
  }
  return out;
}
