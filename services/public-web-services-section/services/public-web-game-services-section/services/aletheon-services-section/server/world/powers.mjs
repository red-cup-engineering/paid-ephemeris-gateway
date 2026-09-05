// [powers] powers — apply the Klein-four (K₄) gauge as player abilities, spending MARKS. The gauge
// itself is the REAL kernel: ⟨negate, conflate⟩ plus the two modal ops. Each power computes its
// outcome with the actual kernel charge function (server/world/kernel.mjs) — the powers ARE the
// gauge, not a re-skin of it. Spend is checked and debited against the conserved mark carrier the
// marks feature gave every entity (player.marks; costs in shared/constants MARK).
//
//   REFLECT  negate     — compute negate(target.charge); if it reads f (the living reflected to
//                         slain), kill the target (settleEntity → f).
//   BANISH   conflate    — only on a ⊤ Anomaly (isTop): conflate sends ⊤ → ⊥, so the Anomaly
//                         DISSOLVES (removed); the tension it pooled is knocked down nearby.
//   REVEAL   possibilize — a knowledge-raise: widen the caster's interest radius for a span (the
//                         session reads _revealUntil in sync()).
//   BIND     necessitate — a knowledge-lower read as rooting: target.boundUntil = tick + N; a bound
//                         creature does not move (ticking.mjs stepNpc early-returns while bound).

import { MARK, POWER, KIND } from "../../shared/constants.mjs";
import { POWERS } from "../../shared/powers.mjs";
import { negate, conflate, present, isTop } from "./kernel.mjs";
import { get, remove, settleEntity } from "./store.mjs";
import { dampenField } from "./field.mjs";
import { within } from "./spacetime.mjs";

const POWER_RANGE = 16; // world units — you must be near a creature to reach it with a power

// usePower — `caster` spends marks to use power `key` on `targetId`. Returns an outcome object
// `{ ok, outcome, line, refunded }`. On success the marks are debited and a combat/chat line is
// broadcast (so every nearby player sees the gauge act in the log). On a fizzle nothing is spent.
export function usePower(world, caster, key, targetId) {
  const spec = POWERS[key];
  if (!caster || !spec) return fail("no-such-power");
  const cost = spec.cost ?? 0;
  if ((caster.marks || 0) < cost) return fail("no-marks", `You lack the marks to ${spec.name}.`);

  const target = targetId ? get(world, targetId) : null;
  const out = apply(world, caster, spec, target);
  if (!out.ok) return out; // a fizzle never spends (refund / no debit)

  caster.marks = (caster.marks || 0) - cost;
  caster.dirty = true;
  return out;
}

// apply — dispatch one power to its kernel op. Range/validity are checked per power; a fizzle
// returns ok:false so usePower refunds (never debits) the marks.
function apply(world, caster, spec, target) {
  switch (spec.key) {
    case "reflect": {
      if (!reachable(caster, target)) return fizzle(spec, "no-target");
      if (target.kind === KIND.keeper || target.kind === KIND.cairn) return fizzle(spec, "warded");
      if (target.state === "dead") return fizzle(spec, "already-slain");
      // negate swaps the +/− evidence faces. The living t reflects to f.
      const reflected = negate(target.charge);
      const [pos, neg] = present(reflected);
      if (neg && !pos) {
        target.killed = true;
        target.hp = 0;
        target.diedTick = world.tick;
        settleEntity(world, target); // → f
        return done(spec, `${caster.name} reflects ${target.name}'s evidence — the living turns slain (f).`, caster, target, "reflect");
      }
      return fizzle(spec, "held"); // the reflection did not settle to f — no kill, no spend
    }
    case "banish": {
      if (!reachable(caster, target)) return fizzle(spec, "no-target");
      // conflate sends ⊤ → ⊥ — meaningful only on a ⊤ Anomaly.
      if (!isTop(target.charge)) return fizzle(spec, "not-anomaly");
      const sunk = conflate(target.charge);
      const [pos, neg] = present(sunk);
      if (!pos && !neg) {
        remove(world, target.id); // the contradiction is reflected to ⊥ — the Anomaly dissolves
        dampenField(world.field, target.x, target.z, 14, 0.35); // the tension it pooled subsides
        return done(spec, `${caster.name} banishes ${target.name} — ⊤ conflates to ⊥; it dissolves.`, caster, target, "banish");
      }
      return fizzle(spec, "held");
    }
    case "reveal": {
      // possibilize ◇ — a knowledge-raise: widen the caster's sight for a span (read in sync()).
      caster._revealUntil = Date.now() + POWER.revealMs;
      return done(spec, `${caster.name} reveals — sight widens; more of the world surfaces.`, caster, null, "reveal");
    }
    case "bind": {
      if (!reachable(caster, target)) return fizzle(spec, "no-target");
      if (target.kind === KIND.keeper || target.kind === KIND.cairn) return fizzle(spec, "warded");
      // necessitate □ — lower the target to stillness: it is rooted (ticking.mjs honours boundUntil).
      target.boundUntil = world.tick + POWER.bindTicks;
      target.dirty = true;
      return done(spec, `${caster.name} binds ${target.name} — it is rooted, lowered to stillness (□).`, caster, target, "bind");
    }
    default:
      return fail("no-such-power");
  }
}

const reachable = (caster, target) =>
  target && target.id !== caster.id && within(caster, target, POWER_RANGE);

function done(spec, line, caster, target, kind) {
  return { ok: true, outcome: kind, line, caster: caster?.id ?? null, target: target?.id ?? null };
}
function fizzle(spec, outcome) {
  return { ok: false, outcome, line: null, refunded: true };
}
function fail(outcome, line = null) {
  return { ok: false, outcome, line, refunded: false };
}

void MARK; // costs are read off POWERS (which read MARK); kept in scope for readers
