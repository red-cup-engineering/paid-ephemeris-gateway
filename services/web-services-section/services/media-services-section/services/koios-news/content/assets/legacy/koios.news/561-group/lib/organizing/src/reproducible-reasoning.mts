/**
 * reproducible-reasoning - research spike for RMN reasoning as a reproducible build.
 *
 * This module models the algebra only: an RMN reasoning term is rendered as an
 * organizing-owned Nix derivation, settled by Relating's deterministic evaluator,
 * and content-addressed by the normal form. It never shells out to real Nix.
 */
import {
  carrierFrom,
  tmCarrier,
  type FromSchema,
  type JsonRecord,
  type Tm,
} from "@emsenn/relating";
import {
  NIX_NO_REAL_BINARY_ASSUMPTION,
  NixWitnessSchema,
  nixDerivation,
  nixWitnessCarrier,
  settleDerivation,
  termContentId,
  type NixDerivation,
  type NixStorePath,
  type NixWitness,
} from "./nix.mjs";

export const REPRODUCIBLE_REASONING_SPIKE_ASSUMPTION =
  "organizing/reproducible-reasoning renders an RMN reasoning term as a Nix-derivation-shaped artifact; it proves deterministic settling, not live agent cognition.";

const RmnTermRefSchema = { $ref: "relating/term/tm" } as const;
const NixDerivationRefSchema = { $ref: "organizing/nix/derivation" } as const;
const NixStorePathRefSchema = { $ref: "organizing/nix/store-path" } as const;

export const ReproducibleReasoningBuildSchema = {
  $id: "organizing/reproducible-reasoning/build",
  title: "Reproducible reasoning build",
  description:
    "A research-spike artifact rendering an RMN reasoning term as a content-addressed Nix derivation normal form.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "claim",
    "assumption",
    "derivation",
    "storePath",
    "contentAddress",
    "normalForm",
    "witnesses",
  ],
  properties: {
    kind: { const: "organizing.reproducible-reasoning.build" },
    claim: { type: "string", minLength: 1 },
    assumption: { type: "string", minLength: 1 },
    derivation: NixDerivationRefSchema,
    storePath: NixStorePathRefSchema,
    contentAddress: { type: "string", minLength: 1 },
    normalForm: RmnTermRefSchema,
    witnesses: { type: "array", items: NixWitnessSchema },
  },
} as const;

export const ReproducibleReasoningRebuildSchema = {
  $id: "organizing/reproducible-reasoning/rebuild",
  title: "Reproducible reasoning rebuild report",
  description:
    "A rebuild check that re-evaluates the derivation term and compares the expected content address with the settled normal form id.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "expectedContentAddress",
    "actualContentAddress",
    "ok",
    "storePath",
    "normalForm",
  ],
  properties: {
    kind: { const: "organizing.reproducible-reasoning.rebuild" },
    expectedContentAddress: { type: "string", minLength: 1 },
    actualContentAddress: { type: "string", minLength: 1 },
    ok: { type: "boolean" },
    storePath: NixStorePathRefSchema,
    normalForm: RmnTermRefSchema,
  },
} as const;

export const reproducibleReasoningBuildCarrier = carrierFrom(ReproducibleReasoningBuildSchema);
export const reproducibleReasoningRebuildCarrier = carrierFrom(ReproducibleReasoningRebuildSchema);

type ReproducibleReasoningBuildCarrierType = FromSchema<typeof ReproducibleReasoningBuildSchema>;
type ReproducibleReasoningRebuildCarrierType = FromSchema<typeof ReproducibleReasoningRebuildSchema>;

export type ReproducibleReasoningBuild = Omit<
  ReproducibleReasoningBuildCarrierType,
  "derivation" | "storePath" | "normalForm" | "witnesses"
> & {
  readonly derivation: NixDerivation;
  readonly storePath: NixStorePath;
  readonly normalForm: Tm;
  readonly witnesses: readonly NixWitness[];
};

export type ReproducibleReasoningRebuild = Omit<
  ReproducibleReasoningRebuildCarrierType,
  "storePath" | "normalForm"
> & {
  readonly storePath: NixStorePath;
  readonly normalForm: Tm;
};

export interface ReproducibleReasoningInput {
  readonly id: string;
  readonly name: string;
  readonly term: Tm;
  readonly claim?: string;
  readonly system?: string;
  readonly inputIds?: readonly string[];
  readonly env?: JsonRecord;
  readonly witnesses?: readonly NixWitness[];
}

/**
 * Render one RMN reasoning term as a content-addressed derivation artifact.
 *
 * The bridge is intentionally one-way in this spike: the RMN term is the
 * reasoning witness being rendered; the Nix-shaped derivation is the reproducible
 * build view of its settled normal form.
 */
export function reproducibleReasoning(input: ReproducibleReasoningInput): ReproducibleReasoningBuild {
  const term = tmCarrier.assert(input.term, "reproducibleReasoning.term") as Tm;
  const derivation = nixDerivation({
    id: input.id,
    name: input.name,
    term,
    ...(input.system === undefined ? {} : { system: input.system }),
    ...(input.inputIds === undefined ? {} : { inputIds: input.inputIds }),
    ...(input.env === undefined ? {} : { env: input.env }),
  });
  const settled = settleDerivation(derivation);
  const value = {
    kind: "organizing.reproducible-reasoning.build" as const,
    claim: input.claim ?? input.name,
    assumption: `${NIX_NO_REAL_BINARY_ASSUMPTION} ${REPRODUCIBLE_REASONING_SPIKE_ASSUMPTION}`,
    derivation,
    storePath: settled.storePath,
    contentAddress: settled.storePath.$id,
    normalForm: settled.normalForm,
    witnesses: Object.freeze([
      ...settled.witnesses,
      ...admittedWitnesses(input.witnesses ?? []),
      reasoningWitness(derivation.id, "organizing/reproducible-reasoning/content-address", settled.storePath.$id, settled.storePath.$id),
      reasoningWitness(derivation.id, "organizing/reproducible-reasoning/normal-form-id", termContentId(settled.normalForm), settled.storePath.$id),
    ]),
  };
  return reproducibleReasoningBuildCarrier.assert(Object.freeze(value), "reproducibleReasoning") as ReproducibleReasoningBuild;
}

/**
 * Rebuild an artifact by re-evaluating the carried derivation term and comparing
 * the expected store hash/content id with the newly settled normal form.
 */
export function rebuild(artifact: ReproducibleReasoningBuild): ReproducibleReasoningRebuild {
  const admitted = reproducibleReasoningBuildCarrier.assert(artifact, "rebuild.artifact") as ReproducibleReasoningBuild;
  const settled = settleDerivation(admitted.derivation);
  const actualContentAddress = termContentId(settled.normalForm);
  const value = {
    kind: "organizing.reproducible-reasoning.rebuild" as const,
    expectedContentAddress: admitted.contentAddress,
    actualContentAddress,
    ok: admitted.contentAddress === actualContentAddress,
    storePath: settled.storePath,
    normalForm: settled.normalForm,
  };
  return reproducibleReasoningRebuildCarrier.assert(Object.freeze(value), "rebuild") as ReproducibleReasoningRebuild;
}

function admittedWitnesses(witnesses: readonly NixWitness[]): readonly NixWitness[] {
  return Object.freeze(witnesses.map((witness, index) => nixWitnessCarrier.assert(witness, `reasoning witness ${index}`) as NixWitness));
}

function reasoningWitness(e: string, a: string, v: string, contentAddress: string): NixWitness {
  return nixWitnessCarrier.assert(Object.freeze({
    e,
    a,
    v,
    t: `reproducible-reasoning:${contentAddress}`,
  }), "reproducibleReasoning.witness") as NixWitness;
}
