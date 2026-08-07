/**
 * multi-agent-arena — gaming as scale-2 playing (CGS with symmetry).
 *
 * gaming is `@emsenn/playing` lifted to the multi-agent FSym(𝔸) level.
 * The primary operations are:
 *   - lift: Design → { arena, plays, report }  (the playing ↪ gaming inclusion)
 *   - compose: the HO cut ‖ + interface hiding  → { composite, interface, converged }
 *   - parallel: the tensor ‖  → the interaction normal form
 */
import {
  liftAction,
  composeAction,
  interactAction,
  parallelAction,
} from "@emsenn/gaming";
import { designAction, dualizeAction } from "@emsenn/playing";

// ── designs: the single-agent proof-forests ───────────────────────────────────────
// designAction takes act: "proponent" | "opponent" | "daimon" → mapped to charge
const P = designAction.run({ entries: [{ locus: [], act: "proponent" }] }, {});
const O = dualizeAction.run(P, {});
console.log("P charge:", P.entries[0].charge); // "potential" (proponent ↦ potential)
console.log("O charge:", O.entries[0].charge); // "active"    (opponent ↦ active)

// ── lift: the playing ↪ gaming inclusion (Design → Strategy) ─────────────────────
// At trivial symmetry (no demo/arena), the strategy coincides with the input Design
const lifted = liftAction.run({ design: P }, {});
console.log("lift.report.wellFormed:", lifted.report.wellFormed); // true
console.log("lift.plays:", lifted.plays.length);  // 1 (the root play)
console.log("lift.designs:", lifted.designs.length); // round-trip: 1

// ── compose: the HO cut ‖ + interface hiding ─────────────────────────────────────
// compose takes { designA, designB } and computes the composite + hidden interface
const comp = composeAction.run({ designA: P, designB: O }, {});
console.log("compose.converged:", comp.converged);   // true when the composite converges
console.log("compose.composite:", JSON.stringify(comp.composite).slice(0, 80));

// non-dual cuts don't converge
const sameComp = composeAction.run({ designA: P, designB: P }, {});
console.log("same-polarity compose.converged:", sameComp.converged); // false

// ── parallel: the tensor product ‖ (the ⊗ of playing lifted to multi-agent) ───────
// parallel takes { designA, designB } and returns the interaction normal form
const par = parallelAction.run({ designA: P, designB: O }, {});
console.log("parallel daimonLoci:", par.daimonLoci); // [[]] (root locus daimonized)
console.log("parallel normalForm:", par.normalForm.entries[0]?.charge); // "stable"

// ── interact: gaming's cut — same as parallel (the ‖ computation) ────────────────
const interaction = interactAction.run({ designA: P, designB: O }, {});
console.log("interact meetings:", interaction.meetings.length);
console.log("interact daimonized:", interaction.meetings[0]?.daimonized); // true

// ── equivariance: a lifted Design is closed under trivial symmetry ───────────────
// lifted.plays = the Design's chronicles lifted onto the arena (trivial symmetry → 1 play)
console.log("plays (trivial symmetry):", lifted.plays.length); // 1
