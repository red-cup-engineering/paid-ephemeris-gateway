/**
 * cognizing/morphisms/forget — the ≤_k-annihilation of knowing on Meme.
 *
 * knowing is the comonad on Meme working the knowledge order ≤_k
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md). `forget` is the limit of
 * the dual-comonad descent (`doubt`): it returns the meme to the ≤_k BOTTOM (absurd —
 * no claim, no witnesses), preserving the cell. It is the annihilator of held
 * knowledge — the move that lets memory stay finite by releasing a held standing back
 * to the unknown — total and faithful (meme in, meme out, cell identical, charge reset
 * to the knowledge-least value). It is idempotent and is the ≤_k-bottom fixpoint of
 * repeated `doubt`.
 */
import { action, memeCarrier, type Action } from "@emsenn/relating";
import { cognizerForget } from "../expressing.mjs";

/** forget — reset the meme's charge to the ≤_k bottom (absurd), cell preserved. */
export const forgetAction: Action = action({
  verb: "forget",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Release a held standing to the knowledge-order bottom (absurd): the ≤_k-bottom fixpoint of repeated doubt.",
  description: "Domain: a meme carrier. Codomain: a meme carrier. The ≤_k-annihilation — the limit of the dual-comonad descent (doubt). The cell is preserved identically; the charge is reset to absurd (the knowledge-least value: no claim, no witnesses). Idempotent. This is what lets memory stay finite — releasing a held standing back to the unknown. Grounded in dual-predication-hyperdoctrine and the knowledge-order bottom.",
  domain: memeCarrier,
  codomain: memeCarrier,
  runTerm: cognizerForget,
});
