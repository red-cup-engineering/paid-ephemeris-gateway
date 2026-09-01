// effects — status effects, ported from legacy engine/effects.mjs. Each effect is ONE cell
// holding the tick it expires at; "is it active?" is `expiry > now`, and a re-apply simply
// overwrites the expiry (no stacking, no decrement loop — the tick clock is the source of truth).
//
//   OVER-TIME (poison/regen) — folded here, once per tick, onto health.
//   PASSIVE (stun/might/weaken) — read by other systems at the moment they matter.

import type { World, Entity, EffectName } from "#engine/world.mts";
import { view } from "#engine/world.mts";

export const EFFECTS: Record<EffectName, { kind: string; per?: number; attackDelta?: number }> = {
  poison: { kind: "dot", per: 2 },
  regen: { kind: "hot", per: 2 },
  stun: { kind: "cc" },
  might: { kind: "buff", attackDelta: +3 },
  weaken: { kind: "debuff", attackDelta: -2 },
};

function isActive(thing: Entity, name: EffectName, tick: number): boolean {
  const until = thing.effects[name];
  return until != null && until > tick;
}

// apply — land effect `name` on `target` for `durationTicks`, expiring at tick + durationTicks.
export function apply(world: World, targetId: string, name: EffectName, durationTicks: number, tick: number): { applied: boolean } {
  const target = view(world, targetId);
  if (!target) return { applied: false };
  target.effects[name] = tick + durationTicks;
  return { applied: true };
}

// tickEffects — fold the over-time effects on one subject for this tick. Returns the names that
// actually moved health, for telemetry/logging.
export function tickEffects(world: World, subjectId: string, tick: number): { ticked: EffectName[] } {
  const subject = view(world, subjectId);
  if (!subject) return { ticked: [] };
  const ticked: EffectName[] = [];

  let next = subject.health;
  if (isActive(subject, "poison", tick)) {
    next = Math.max(0, next - (EFFECTS.poison.per as number));
    ticked.push("poison");
  }
  if (isActive(subject, "regen", tick)) {
    next = Math.min(subject.maxHealth, next + (EFFECTS.regen.per as number));
    ticked.push("regen");
  }
  subject.health = next;
  return { ticked };
}

export function isStunned(thing: Entity, tick: number): boolean {
  return isActive(thing, "stun", tick);
}

// attackDelta — the net flat modifier this thing's active buffs/debuffs add to a swing.
export function attackDelta(thing: Entity, tick: number): number {
  let delta = 0;
  if (isActive(thing, "might", tick)) delta += EFFECTS.might.attackDelta as number;
  if (isActive(thing, "weaken", tick)) delta += EFFECTS.weaken.attackDelta as number;
  return delta;
}
