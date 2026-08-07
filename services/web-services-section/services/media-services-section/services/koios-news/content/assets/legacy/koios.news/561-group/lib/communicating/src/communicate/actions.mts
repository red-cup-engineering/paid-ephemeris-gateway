/**
 * communicate/actions — communicating's language-neutral operations as cocone
 * legs on the @emsenn/relating-experimental `acting` boundary, parameterized over
 * a language bundle.
 *
 * `actions(bundle)` builds the cocone for a chosen language: each operation is an
 * `action` (a boundary morphism with declared domain/codomain and the metadata
 * OpenAPI/MCP read). A language package runs `induceBins(actions(itsBundle))` to
 * assemble the discovery apex from which its `communicate` dispatcher (CLI) and
 * `communicate-serve` (HTTP/OpenAPI/MCP/web UX) are projected as functorial
 * images — one unified surface, every scripted play witnessed as EAVT.
 *
 * These are thin transports over the pure communicating morphisms: the boundary
 * document is admitted text (a Mark payload, opaque), and the codomain is the
 * communicating carrier as JSON. Communicating articulates its OWN data into its
 * own carriers atop relating's outputs; relating injects only the Mark. The
 * language bundle is the fiber the morphisms are read over.
 */
import { action, jsonResource, type Action, type JsonValue } from "@emsenn/relating-experimental";

import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import { projectReading, read, settle } from "../holography/index.mjs";
import { admitCommunication, articulateCommunication } from "../speaking/listening/parsing/index.mjs";
import { similarity, similarPairsFrom } from "../speaking/listening/geometry/index.mjs";
import { messagingActions } from "../messaging/actions.mjs";

/** The text on the boundary, trimmed; a communication's opaque Mark payload. */
function communicationText(input: JsonValue): string {
  return (typeof input === "string" ? input : "").trim();
}

/** read-communication — admitted text → the holographic communication reading. */
export const readCommunicationAction = (bundle: CompiledBundle): Action => action({
  verb: "read-communication",
  in: "string",
  out: "json",
  summary: "Read a communication as a holographic projection.",
  description: "Domain: decoded communication text (a Mark payload). Codomain: the communication reading as JSON.",
  run: (input: JsonValue): JsonValue => jsonResource(projectReading(read(communicationText(input), bundle)), "communication reading"),
});

/** articulate-communication — admitted text → the admitted communication articulation. */
export const articulateCommunicationAction = (bundle: CompiledBundle): Action => action({
  verb: "articulate-communication",
  in: "string",
  out: "json",
  summary: "Articulate a communication through the relating substrate.",
  description: "Domain: decoded communication text (a Mark payload). Codomain: the communication articulation as JSON.",
  run: (input: JsonValue): JsonValue =>
    jsonResource(articulateCommunication(admitCommunication(communicationText(input)), bundle), "communication articulation"),
});

/** settle-communication — admitted text → the settled parse reading. */
export const settleCommunicationAction = (bundle: CompiledBundle): Action => action({
  verb: "settle-communication",
  in: "string",
  out: "json",
  summary: "Settle a communication into its default parse carrier.",
  description: "Domain: decoded communication text (a Mark payload). Codomain: the settled parse reading as JSON.",
  run: (input: JsonValue): JsonValue => jsonResource(settle(communicationText(input), bundle), "communication settlement"),
});

/** read-word-similarity — word pairs (one per line) → finite-vocabulary similarity.
 *  Bundle-independent: similarity is path structure over the shared sense graph. */
export const readWordSimilarityAction: Action = action({
  verb: "read-word-similarity",
  in: "string",
  out: "json",
  summary: "Read finite-vocabulary similarity for word pairs.",
  description: "Domain: one word pair per nonblank line, split on whitespace. Codomain: the similarity readings as JSON.",
  run: (input: JsonValue): JsonValue =>
    jsonResource(
      similarPairsFrom(typeof input === "string" ? input : "").map(([a, b]) => ({ a, b, similarity: similarity(a, b) })),
      "communication word similarity",
    ),
});

/**
 * The language-neutral communicating actions over a chosen bundle: the listening
 * (read/articulate/settle), word-similarity, and messaging operations. Language
 * packages compose this with their own surface (e.g. conformance, realization).
 */
export const actions = (bundle: CompiledBundle): readonly Action[] => Object.freeze([
  readCommunicationAction(bundle),
  articulateCommunicationAction(bundle),
  settleCommunicationAction(bundle),
  readWordSimilarityAction,
  ...messagingActions(bundle),
]);
