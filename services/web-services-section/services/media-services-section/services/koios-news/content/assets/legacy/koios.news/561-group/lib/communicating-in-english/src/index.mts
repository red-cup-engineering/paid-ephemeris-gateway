/**
 * @emsenn/communicating-in-english — the English fiber over @emsenn/communicating.
 *
 * The base package is language-neutral machinery whose every reading morphism is
 * parameterized over a `CompiledBundle`. This package is one such bundle made
 * concrete: it supplies the compiled English vocabulary, binds the base reading
 * morphisms to it (the `read`/`settle`/`articulate` conveniences), and adds the
 * capabilities that only exist for a language with a realized prose surface —
 * English realization and English prose conformance. The full realization and
 * conformance surfaces live on the `./realizing` and `./conformance` subpaths;
 * the headline entry points are re-exported here. The runnable `communicate` /
 * `communicate-serve` bins project this package's actions.
 */
import {
  read as readOver,
  settle as settleOver,
  articulateCommunication,
  admitCommunication,
  locute as locuteOver,
  type Reading,
  type ParseResult,
  type ArticulateResult,
  type CommunicatingCarrier,
  type LocutionaryAct,
} from "@emsenn/communicating";

import english from "./compiled.mjs";

export { english, default } from "./compiled.mjs";
export { rawBundle } from "./bundle.mjs";

/** Read a sentence at every layer at once, over the English bundle. */
export const read = (text: string): Reading => readOver(text, english);

/** Settle a sentence through the engine, over the English bundle. */
export const settle = (text: string): ParseResult => settleOver(text, english);

/** Articulate admitted English text into its articulation carrier. */
export const articulate = (text: string): ArticulateResult =>
  articulateCommunication(admitCommunication(text), english);

/** Read an admitted carrier as a locutionary act, over the English bundle. */
export const locute = (carrier: CommunicatingCarrier): LocutionaryAct => locuteOver(carrier, english);

export { actions, readConformanceOfCommunicationAction } from "./actions.mjs";

// Headline English capabilities; the full surfaces live on ./realizing and ./conformance.
export { generate, realize, realizeClause, sectionFromText } from "./realizing/index.mjs";
export { lint, detect, report, verdict } from "./conformance/index.mjs";
