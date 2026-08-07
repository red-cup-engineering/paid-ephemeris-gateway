/**
 * design-and-cut — playing as *-autonomous interaction.
 *
 * The Design carrier is a charge-valuation over loci (proof-trees in the ludics
 * sense). The characteristic morphism is interact: Design ⊗ Design^⊥ → Interaction,
 * converging to the Daimon ⊤ when the two designs are dual.
 */
import {
  designAction,
  dualizeAction,
  interactAction,
  atom,
  up,
  down,
} from "@emsenn/playing";

// ── design: a charge-valuation over loci ─────────────────────────────────────────
const P = designAction.run({ entries: [{ locus: [], act: "proponent" }] }, {});
console.log("P charge:", P.entries[0].charge); // "potential" (proponent ↦ potential)

// ── dualize: the polarity involution A^⊥ ─────────────────────────────────────────
const O = dualizeAction.run(P, {});
console.log("O charge:", O.entries[0].charge); // "active" (opponent ↦ active)

// involution: dualizing twice is the identity
const backToP = dualizeAction.run(O, {});
console.log("involution holds:", backToP.entries[0].charge === P.entries[0].charge); // true

// ── THE CUT: interact of dual designs converges to the Daimon ⊤ ─────────────────
const cut = interactAction.run({ designA: P, designB: O }, {});
console.log("daimonized:", cut.meetings[0]?.daimonized);  // true
console.log("joined:", cut.meetings[0]?.joined);          // "stable" (potential ⊔_k active = ⊤)
console.log("normal form:", cut.normalForm.entries[0].charge); // "stable"

// ── a non-dual cut does NOT reach the Daimon ─────────────────────────────────────
const nonCut = interactAction.run({ designA: P, designB: P }, {});
console.log("non-dual daimon loci:", nonCut.daimonLoci); // [] (no convergence)

// ── propositions: the logic layer ────────────────────────────────────────────────
const a = atom("p");
const plus  = up(atom("p"), atom("q"));   // ⊕ (disjunction / additive or)
const times = down(atom("p"), atom("q")); // ⊗ (tensor / multiplicative and)
console.log("proposition atom:", a.connective);    // "atom"
console.log("plus connective:", plus.connective);  // "plus"
console.log("times connective:", times.connective); // "times"
