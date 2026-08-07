/**
 * cognizing/infer — knowing/knowledge-state → knowing/knowledge-state: the
 * CLOSURE 2-MONAD as cognition (deductive closure / the inference engine).
 *
 * knowing is the comonad on Meme (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md);
 * its richer carrier is the comonad context C(Meme) = a held section of memes.
 * `infer` is the closure 2-monad Cl acting on that section. Cl is Kock–Zöberlein
 * (lax-idempotent): its unit is INFLATIONARY (v ≤_k cl(v)) and it is IDEMPOTENT
 * (closing twice = closing once). We realize it as the ≤_k re-fold of the held
 * section: on an unfolded section this genuinely closes — coincident-cell evidence
 * is joined UP the knowledge order (joinKnowledge, the inflationary unit) — and on an
 * already-folded section the re-fold is the identity, so `infer` is provably
 * idempotent. This is the closure-2-monad unit, the plug-point for deeper closure
 * rules (richer derivability than coincident-cell join). Pure, total, no I/O.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonValue,
} from "@emsenn/relating";
import { admitState, heldMemesOf, stateFromMemes } from "./section.mjs";
import type { KnowledgeState } from "./carriers.mjs";

const STATE_CARRIER_ID = "knowing/knowledge-state";

/** infer — the inflationary idempotent closure: re-fold the held section. */
export const inferAction: Action = action({
  verb: "infer",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Close a knowledge-state under the ≤_k fold (the closure 2-monad unit: inflationary, idempotent).",
  description: `Domain: ${STATE_CARRIER_ID} — a held section, the comonad context C(Meme). Codomain: ${STATE_CARRIER_ID}. CLOSURE: the Kock–Zöberlein (lax-idempotent) closure 2-monad Cl, realized as the ≤_k re-fold of the held section. Its unit is INFLATIONARY (v ≤_k cl(v)): coincident-cell evidence is joined UP the knowledge order (joinKnowledge). It is IDEMPOTENT (closing twice = closing once): on an already-folded section the re-fold is the identity. The closure-2-monad unit — the plug-point for deeper closure rules.`,
  domainSchema: Object.freeze({ $ref: STATE_CARRIER_ID }),
  codomainSchema: Object.freeze({ $ref: STATE_CARRIER_ID }),
  run: (input: unknown): JsonValue => {
    const state: KnowledgeState = admitState(input as JsonValue, "infer");
    return jsonResource(stateFromMemes(state.base, heldMemesOf(state)) as unknown as JsonValue, "knowledge state");
  },
});
