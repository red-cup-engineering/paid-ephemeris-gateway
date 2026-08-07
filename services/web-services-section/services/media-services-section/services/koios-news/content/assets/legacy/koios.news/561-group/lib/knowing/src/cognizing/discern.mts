/**
 * cognizing/discern — Meme → knowing/identity: the two derived equality predicates.
 *
 * knowing is the comonad on Meme working the knowledge order ≤_k
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md). `discern` reads the
 * IDENTITY of a meme's cell through memory's two derived equalities on the
 * diagonal Δ_E = {(s,s)}: the classical truth-order equality =_E (t on the diagonal,
 * f off it) and the paraconsistent knowledge-order equality Δ_E^k (⊤ on the diagonal —
 * information-maximal — and ⊥ off it — no claim — hence stable under ≤_k knowledge-merge).
 * `onDiagonal` is whether the meme's subject and object are the SAME entity. Both
 * equalities are DERIVED (Lawvere's diagonal-Σ construction), not postulated. Total
 * over any meme. Grounded in classical-equality and paraconsistent-equality.
 */
import {
  action,
  jsonResource,
  isMeme,
  type Action,
  type JsonValue,
  type Meme,
} from "@emsenn/relating";
import type { KnowledgeIdentity } from "./carriers.mjs";

const MEME_CARRIER_ID = "relating/articulating/predicating/positing/meme";
const IDENTITY_CARRIER_ID = "knowing/identity";

function admitMeme(input: JsonValue, verb: string): Meme {
  if (typeof input === "object" && input !== null && isMeme(input as object)) return input as unknown as Meme;
  throw new TypeError(`${verb}: expected a meme carrier (predication.fiber.meme)`);
}

/** Whether the meme's cell sits on the diagonal Δ_E: subject term == object term. */
function onDiagonal(meme: Meme): boolean {
  try {
    return JSON.stringify(meme.cell.subject) === JSON.stringify(meme.cell.object);
  } catch {
    return false;
  }
}

/** discern — read a meme's cell-diagonal identity through the two equalities. */
export const discernAction: Action = action({
  verb: "discern",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Discern a meme's identity: the classical (=_E) and paraconsistent (Δ_E^k) equality of its cell's diagonal.",
  description: `Domain: a meme carrier (${MEME_CARRIER_ID}). Codomain: ${IDENTITY_CARRIER_ID} — whether the meme's subject and object are the same entity, read through the classical two-valued equality =_E (t/f) and the paraconsistent knowledge-order equality Δ_E^k (top on the diagonal, bottom off it, merge-stable). Both derived via Lawvere's diagonal construction. Grounded in classical-equality and paraconsistent-equality.`,
  domainSchema: Object.freeze({ $ref: MEME_CARRIER_ID }),
  codomainSchema: Object.freeze({ $ref: IDENTITY_CARRIER_ID }),
  run: (input: unknown): JsonValue => {
    const diagonal = onDiagonal(admitMeme(input as JsonValue, "discern"));
    const result: KnowledgeIdentity = {
      kind: "knowing.identity",
      onDiagonal: diagonal,
      classical: diagonal ? "t" : "f",
      paraconsistent: diagonal ? "top" : "bottom",
      mergeStable: true,
    };
    return jsonResource(result, "knowledge identity");
  },
});
