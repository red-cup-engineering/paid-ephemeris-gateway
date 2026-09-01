// combat — the deep pillar. Combat is EVIDENCE: a landed blow appends NEGATIVE evidence to the
// target's `alive` cell; when negative overwhelms positive (hp ≤ 0) the cell settles to f and the
// creature dies. The bilattice does the deciding (server/world/value.mjs); this file just supplies
// evidence and reads the verdict. The signature move of the engine: a slain creature touched by
// Anomalous corruption is RAISED — positive life-evidence re-asserted onto an already-slain cell —
// and the kernel's joinKnowledge returns ⊤. It does not die; it rises Corrupted. That ⊤ is a
// situation the world holds, exactly as tab files Permit #23 at tick 30.

import { COMBAT, KIND } from "../../shared/constants.mjs";
import { append, settleEntity, get, mintItem } from "./store.mjs";
import { within } from "./spacetime.mjs";
import { lootFor } from "../../shared/items.mjs"; // [economy] the loot table by creature kind

const now = () => Date.now();

// emit — queue an outbound combat event the net layer drains each tick (see protocol.combat).
function emit(world, attacker, target, amount, outcome) {
  world.events.push({ kind: "combat", attacker, target, amount, outcome });
}

// tryAttack — `attackerId` swings at `targetId`. Returns the outcome string. Enforces range and
// cooldown server-side (authoritative). The actual damage lands immediately (no projectile model
// in the slice); windup is a client-side telegraph only.
export function tryAttack(world, attackerId, targetId) {
  const a = get(world, attackerId);
  const t = targetId && get(world, targetId);
  if (!a || a.state === "dead") return "blocked";
  if (now() - a.lastAttackAt < COMBAT.attackCooldownMs) return "cooldown";
  a.lastAttackAt = now();
  if (!t || t.id === a.id) { emit(world, a.id, null, 0, "swing"); return "swing"; }
  if (!within(a, t, COMBAT.attackRange)) { emit(world, a.id, t.id, 0, "out-of-range"); return "out-of-range"; }
  if (t.state === "dead") { emit(world, a.id, t.id, 0, "swing"); return "swing"; }
  return damage(world, a, t, COMBAT.baseDamage);
}

// damage — append `amount` units of negative evidence to `t`'s alive cell, then re-settle.
export function damage(world, attacker, t, amount) {
  t.hp -= amount;
  t.dirty = true;
  append(world, { e: t.id, a: "vitality", v: { hp: t.hp, maxHp: t.maxHp, by: attacker?.id ?? null } });
  if (t.hp <= 0 && !t.killed) {
    t.hp = 0;
    t.killed = true;
    t.diedTick = world.tick;
    t.corpseUntil = world.tick + COMBAT.corpseLingerTicks;
    append(world, { e: t.id, a: "killed", v: { by: attacker?.id ?? null } });
    settleEntity(world, t); // → f
    // [marks] the slain cell's life-evidence (its marks) is CONSERVED — it transfers to the slayer,
    // never destroyed. Evidence only ever grows. A player slayer condenses the kill into marks.
    if (attacker && attacker.kind === KIND.player) {
      // the count is the slain cell's life-evidence: one mark per ~3 hp of vitality it carried,
      // plus any marks it had itself condensed (a slayer inherits the whole carrier — conserved).
      const won = Math.max(1, Math.round(t.maxHp / 3)) + (t.marks || 0);
      attacker.marks = (attacker.marks || 0) + won;
      attacker.dirty = true;
      // [economy] LOOT — the slain creature's kind drops item(s); each is MINTED into being and
      // appended to the slayer's inventory, its held-by row filed onto the trace. Conserved +
      // additive: items come from the catalog (a fresh fact), never moved off a duplicate.
      dropLoot(world, attacker, t);
    }
    emit(world, attacker?.id ?? null, t.id, amount, "slain");
    return "slain";
  }
  settleEntity(world, t); // stays t (still alive)
  emit(world, attacker?.id ?? null, t.id, amount, "hit");
  return "hit";
}

// [economy] dropLoot — on a player kill, mint the slain creature's loot (by KIND) into the
// slayer's inventory. Each item's coming-into-being and its held-by are filed onto the trace
// (the append IS the record — no ledger object). The slain creature's kind is read BEFORE any
// later corruption could change it. Peaceful kinds (keeper/cairn/resonance) have no loot table.
function dropLoot(world, slayer, slain) {
  if (!slayer || !Array.isArray(slayer.inventory)) return;
  for (const catalogId of lootFor(slain.kind)) {
    const item = mintItem(world, catalogId);
    if (!item) continue;
    slayer.inventory.push(item);
    append(world, { e: item.id, a: "held-by", v: slayer.id });
  }
}

// heal — append positive evidence (used by rest/regen ticks for players).
export function heal(world, t, amount) {
  if (t.killed) return; // the dead are not healed; they are raised (see corrupt)
  const before = t.hp;
  t.hp = Math.min(t.maxHp, t.hp + amount);
  if (t.hp !== before) {
    t.dirty = true;
    append(world, { e: t.id, a: "vitality", v: { hp: t.hp, maxHp: t.maxHp } });
    settleEntity(world, t);
  }
}

// corrupt — RAISE a slain creature: re-assert life-evidence onto an already-slain cell. The kernel
// joins t (alive, re-lit) with f (slain, never retracted) → ⊤. The creature rises as a Corrupted
// Anomaly: hostile, with a fresh vitality pool, and a glyph the renderer shows as a contradiction.
export function corrupt(world, t) {
  if (!t.killed || t.raised) return false;
  t.raised = true;
  t.kind = KIND.anomaly;
  t.hostile = true;
  t.name = `Corrupted ${t.name}`;
  t.hp = Math.max(1, Math.round(t.maxHp * 0.6));
  t.maxHp = t.hp;
  t.corpseUntil = 0;
  t.intends = "hunt";
  t.dirty = true;
  append(world, { e: t.id, a: "raised", v: { hp: t.hp } });
  const state = settleEntity(world, t); // → anomaly (⊤)
  emit(world, null, t.id, 0, "corrupted");
  return state === "anomaly";
}
