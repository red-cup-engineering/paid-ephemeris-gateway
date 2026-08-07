/**
 * cognizing/morphisms/doubt — the dual-comonad descent of knowing on Meme.
 *
 * knowing is the comonad on Meme working the knowledge order ≤_k
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md). Its Priestley DUAL is a
 * closure 2-COMONAD Cl* that, where the primal closure "inflates a value in ≤_k",
 * instead "shrinks the confirming point-set" (dual-predication-hyperdoctrine). `doubt`
 * is that dual move read as cognition: it DESCENDS the knowledge order by one step,
 * dropping the less-settled side's witnesses — the formal opposite of `absorb`
 * (which climbs ≤_k by joining evidence). It is total and faithful — meme in, meme
 * out, the cell preserved IDENTICALLY while the charge descends ≤_k:
 *   stable (both witnessed) → potential (drop the falsity side)
 *   active (falsity only)   → absurd   (drop the falsity side)
 *   potential (truth only)  → absurd   (drop the truth side)
 *   absurd (no claim)       → absurd   (already at the ≤_k bottom)
 */
import { action, memeCarrier, type Action } from "@emsenn/relating";
import { cognizerDoubt } from "../expressing.mjs";

/** doubt — descend the knowledge order one step (the dual closure 2-comonad Cl*). */
export const doubtAction: Action = action({
  verb: "doubt",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Descend the knowledge order ≤_k one step (the dual closure 2-comonad): drop the less-settled side's witnesses.",
  description: "Domain: a meme carrier. Codomain: a meme carrier. The dual-comonad descent (Cl*) — the formal opposite of absorb: where absorb inflates the ≤_k value by joining evidence, doubt shrinks the confirming point-set by one ≤_k step, dropping the less-settled side. stable→potential (drop falsity), active→absurd, potential→absurd, absurd→absurd. The cell is preserved identically. Grounded in dual-predication-hyperdoctrine.",
  domain: memeCarrier,
  codomain: memeCarrier,
  runTerm: cognizerDoubt,
});
