/**
 * English actions — the communicating cocone read over the English fiber.
 *
 * `actions(english)` from the base supplies the language-neutral operations
 * (read/articulate/settle, word-similarity, messaging) bound to the English
 * bundle; this package adds the operations that only exist for a language with a
 * realized prose surface — here, English prose conformance. `induceBins` over
 * this array is the discovery apex the English `communicate` dispatcher and
 * `communicate-serve` are projected from.
 */
import { actions as baseActions } from "@emsenn/communicating";
import { action, jsonResource, type Action, type JsonValue } from "@emsenn/relating-experimental";

import english from "./compiled.mjs";
import { lint } from "./conformance/index.mjs";

/** read-conformance-of-communication — text → the English prose conformance verdict. */
export const readConformanceOfCommunicationAction: Action = action({
  verb: "read-conformance-of-communication",
  in: "string",
  out: "json",
  summary: "Judge English prose conformance for a communication.",
  description: "Domain: decoded communication text. Codomain: the conformance verdict (pass + diagnostics) as JSON.",
  run: (input: JsonValue): JsonValue => {
    const verdict = lint(typeof input === "string" ? input : "");
    return jsonResource({ pass: verdict.pass, diagnostics: verdict.diagnostics }, "communication conformance verdict");
  },
});

/** The English package's full action surface. */
export const actions: readonly Action[] = Object.freeze([
  ...baseActions(english),
  readConformanceOfCommunicationAction,
]);
