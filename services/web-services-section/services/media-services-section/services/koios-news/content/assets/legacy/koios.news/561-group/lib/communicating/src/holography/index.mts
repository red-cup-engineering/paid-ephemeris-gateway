/**
 * holography — projections from a communicating whole into readable layers.
 *
 * Holography is the representation boundary, not a codec. It does not encode a
 * carrier for transport; it reads the communicative whole through layer
 * projections whose parts remain accountable to the whole parse.
 */
import type { ParseResult, CohomologyResult } from "../speaking/listening/parsing/index.mjs";
import { admitCommunication, parseCommunication } from "../speaking/listening/parsing/index.mjs";
import { cohomology } from "../speaking/listening/parsing/cohomology.mjs";
import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import { grammaticality } from "../speaking/listening/judging/grammaticality/index.mjs";
import type { GrammaticalityResult } from "../speaking/listening/judging/grammaticality/index.mjs";
import { roles, resolveReferences } from "../speaking/listening/understanding/index.mjs";
import type { SemanticFrame, ReferenceResult } from "../speaking/listening/understanding/index.mjs";

/** A full report over one sentence: the settled parse and every layer's reading. */
export interface Reading {
  readonly text: string;
  readonly parse: ParseResult;
  readonly roles: readonly SemanticFrame[];
  readonly grammaticality: GrammaticalityResult;
  readonly cohomology: CohomologyResult;
  readonly reference: ReferenceResult;
}

/** Articulate text, take its first sentence, and settle it through the engine. */
export function settle(text: string, bundle: CompiledBundle): ParseResult {
  return parseCommunication(admitCommunication(text), bundle);
}

/** Read a sentence at every layer at once — the headline endomorphism. */
export function read(text: string, bundle: CompiledBundle): Reading {
  const parsed = settle(text, bundle);
  return {
    text,
    parse: parsed,
    roles: roles(parsed),
    grammaticality: grammaticality(parsed),
    cohomology: cohomology(parsed),
    reference: resolveReferences(parsed),
  };
}

/** A holographic projection of a reading: layer views accountable to the whole. */
export function projectReading(reading: Reading): Record<string, unknown> {
  return {
    text: reading.text,
    words: reading.parse.words.map((w) => ({ text: w.text, tags: w.tags, roles: w.roles })),
    arcs: reading.parse.arcs.map((a) => ({ rel: a.rel, head: a.headText, dep: a.depText })),
    roles: reading.roles,
    grammaticality: reading.grammaticality,
    cohomology: {
      glued: reading.cohomology.glued,
      h0: reading.cohomology.h0,
      h1: reading.cohomology.h1,
      obstructions: reading.cohomology.obstructions,
    },
  };
}
