/**
 * cognizing/morphisms/cognize — the comonad UNIT (counit/extract, epsilon) of knowing.
 *
 * cognize is the unit of knowing-as-a-comonad on Meme
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md): knowing is the comonad
 * working the KNOWLEDGE order <=_k (absurd <=_k active <=_k potential <=_k stable),
 * where reflecting is the convergent settling orbit and ruminating is the
 * non-converging one. cognize is the epsilon that those orbits compose OVER: it
 * extracts the meme's already-settled knowledge standing without touching the cell.
 * It is faithful transmission on the <=_k order — confirm, do not change. Because
 * `joinKnowledge` of a charge with ITSELF returns the same <=_k value (the order's
 * join is idempotent on a fixed point), cognize is provably IDEMPOTENT: it is the
 * "extract the known" unit over which absorb/reflect compose.
 */
import { action, memeCarrier, type Action } from "@emsenn/relating";
import { cognizerCognize } from "../expressing.mjs";

/** cognize — the unit (epsilon) of knowing-as-comonad: the <=_k-idempotent extract
 *  of the meme's settled knowledge standing, cell preserved identically. */
export const cognizeAction: Action = action({
  verb: "cognize",
  inputFormat: "json",
  outputFormat: "json",
  summary: "The unit (epsilon) of knowing-as-comonad: the <=_k-idempotent extract of the meme's settled knowledge standing.",
  description: "Domain: a meme carrier. Codomain: a meme carrier. The counit/extract (epsilon) of knowing-as-a-comonad on Meme — faithful transmission on the knowledge order <=_k that confirms the meme's settled standing without changing the cell. The charge becomes joinKnowledge(prior.charge, prior.charge), which is provably idempotent (joining a charge with itself returns the same <=_k value), so cognize is the unit over which absorb/reflect compose.",
  domain: memeCarrier,
  codomain: memeCarrier,
  runTerm: cognizerCognize,
});
