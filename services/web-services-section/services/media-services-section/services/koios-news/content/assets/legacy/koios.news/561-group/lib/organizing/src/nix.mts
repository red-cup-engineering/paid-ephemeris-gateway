/**
 * nix - organizing-owned standards boundary for reproducible compute closure.
 *
 * Nix/Guix is the scale-2 computing/IN-face reproducibility standard hosted on
 * the organizing bulk, the same way jupyter.mts hosts Jupyter. This module
 * models the derivation algebra; it never shells out to a real nix or guix
 * binary. A derivation is an RMN term, evaluation settles it to normal form, the
 * store path is the content address of that normal form, and a closure is the
 * transitive settled dependency set witnessed as ledger rows.
 */
import { createHash } from "node:crypto";
import {
  canonical,
  carrierFrom,
  evaluate,
  tmCarrier,
  type FromSchema,
  type JsonRecord,
  type JsonValue,
  type Tm,
} from "@emsenn/relating";

export const NIX_NO_REAL_BINARY_ASSUMPTION =
  "organizing/nix models derivation algebra over RMN terms; it does not invoke a real nix or guix binary.";

const RmnTermRefSchema = { $ref: "relating/term/tm" } as const;
const JsonValueSchema = {} as const;
const JsonRecordSchema = { type: "object", additionalProperties: true } as const;

export const NixWitnessSchema = {
  $id: "organizing/nix/witness",
  title: "Nix derivation witness",
  description: "A witness-ledger row emitted while settling Nix/Guix derivations.",
  type: "object",
  additionalProperties: false,
  required: ["e", "a", "v", "t"],
  properties: {
    e: { type: "string", minLength: 1 },
    a: { type: "string", minLength: 1 },
    v: JsonValueSchema,
    t: { type: "string", minLength: 1 },
  },
} as const;

export const NixDerivationSchema = {
  $id: "organizing/nix/derivation",
  title: "Nix derivation",
  description:
    "A Nix/Guix derivation as a settled RMN term: deterministic evaluation reaches the normal form whose content address names the store path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "name", "system", "term", "inputIds", "env"],
  properties: {
    kind: { const: "organizing.nix.derivation" },
    id: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    system: { type: "string", minLength: 1 },
    term: RmnTermRefSchema,
    inputIds: { type: "array", items: { type: "string", minLength: 1 } },
    env: JsonRecordSchema,
  },
} as const;

export const NixStorePathSchema = {
  $id: "organizing/nix/store-path",
  title: "Nix store path",
  description:
    "A content-addressed store path projected from a settled derivation normal form. The `$id` is the term content id.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "$id", "derivationId", "name", "hash", "path", "normalForm"],
  properties: {
    kind: { const: "organizing.nix.store-path" },
    $id: { type: "string", minLength: 1 },
    derivationId: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    hash: { type: "string", minLength: 64 },
    path: { type: "string", minLength: 1 },
    normalForm: RmnTermRefSchema,
  },
} as const;

export const NixClosureSchema = {
  $id: "organizing/nix/closure",
  title: "Nix closure",
  description:
    "The transitive settled dependency set of a root derivation, with store paths and witness-ledger rows.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "root", "storePaths", "witnesses"],
  properties: {
    kind: { const: "organizing.nix.closure" },
    root: { type: "string", minLength: 1 },
    storePaths: { type: "array", items: { $ref: "organizing/nix/store-path" } },
    witnesses: { type: "array", items: NixWitnessSchema },
  },
} as const;

export const nixWitnessCarrier = carrierFrom(NixWitnessSchema);
export const nixDerivationCarrier = carrierFrom(NixDerivationSchema);
export const nixStorePathCarrier = carrierFrom(NixStorePathSchema);
export const nixClosureCarrier = carrierFrom(NixClosureSchema);

type NixDerivationCarrierType = FromSchema<typeof NixDerivationSchema>;
type NixStorePathCarrierType = FromSchema<typeof NixStorePathSchema>;
type NixClosureCarrierType = FromSchema<typeof NixClosureSchema>;

export type NixWitness = FromSchema<typeof NixWitnessSchema>;
export type NixDerivation = Omit<NixDerivationCarrierType, "term" | "env" | "inputIds"> & {
  readonly term: Tm;
  readonly env: JsonRecord;
  readonly inputIds: readonly string[];
};
export type NixStorePath = Omit<NixStorePathCarrierType, "normalForm"> & {
  readonly normalForm: Tm;
};
export type NixClosure = Omit<NixClosureCarrierType, "storePaths" | "witnesses"> & {
  readonly storePaths: readonly NixStorePath[];
  readonly witnesses: readonly NixWitness[];
};

export interface NixDerivationInput {
  readonly id: string;
  readonly name: string;
  readonly term: Tm;
  readonly system?: string;
  readonly inputIds?: readonly string[];
  readonly env?: JsonRecord;
}

export interface SettledDerivation {
  readonly derivation: NixDerivation;
  readonly normalForm: Tm;
  readonly storePath: NixStorePath;
  readonly witnesses: readonly NixWitness[];
}

export function nixDerivation(input: NixDerivationInput): NixDerivation {
  const term = tmCarrier.assert(input.term, "nixDerivation.term") as Tm;
  const value = {
    kind: "organizing.nix.derivation" as const,
    id: input.id,
    name: input.name,
    system: input.system ?? "x86_64-linux",
    term,
    inputIds: uniqueSorted(input.inputIds ?? []),
    env: Object.freeze({ ...(input.env ?? {}) }) as JsonRecord,
  };
  return nixDerivationCarrier.assert(value, "nixDerivation") as NixDerivation;
}

export function settleDerivation(input: NixDerivationInput | NixDerivation): SettledDerivation {
  const derivation = isDerivation(input) ? input : nixDerivation(input);
  const normalForm = tmCarrier.assert(evaluate(derivation.term), "settleDerivation.normalForm") as Tm;
  const storePath = storePathFromTerm(normalForm, derivation);
  return Object.freeze({
    derivation,
    normalForm,
    storePath,
    witnesses: Object.freeze(settlementWitnesses(derivation, storePath)),
  });
}

export function evaluateDerivation(input: NixDerivationInput | NixDerivation): NixStorePath {
  return settleDerivation(input).storePath;
}

export function termContentId(term: Tm): string {
  const admitted = tmCarrier.assert(term, "termContentId") as Tm;
  return `nix:sha256:${hashJson(admitted as JsonValue)}`;
}

export function storePathFromTerm(term: Tm, derivation: Pick<NixDerivation, "id" | "name">): NixStorePath {
  const normalForm = tmCarrier.assert(term, "storePathFromTerm") as Tm;
  const $id = termContentId(normalForm);
  const hash = $id.slice("nix:sha256:".length);
  const value = {
    kind: "organizing.nix.store-path" as const,
    $id,
    derivationId: derivation.id,
    name: derivation.name,
    hash,
    path: `/nix/store/${hash}-${storeName(derivation.name)}`,
    normalForm,
  };
  return nixStorePathCarrier.assert(value, "storePathFromTerm") as NixStorePath;
}

export function closureOf(root: NixDerivationInput | NixDerivation, derivations: readonly (NixDerivationInput | NixDerivation)[]): NixClosure {
  const rootDerivation = isDerivation(root) ? root : nixDerivation(root);
  const byId = new Map<string, NixDerivation>();
  byId.set(rootDerivation.id, rootDerivation);
  for (const item of derivations) {
    const derivation = isDerivation(item) ? item : nixDerivation(item);
    byId.set(derivation.id, derivation);
  }

  const order: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`closureOf: cyclic derivation dependency at ${id}`);
    const derivation = byId.get(id);
    if (derivation === undefined) throw new Error(`closureOf: missing derivation ${id}`);
    visiting.add(id);
    for (const inputId of derivation.inputIds) visit(inputId);
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };
  visit(rootDerivation.id);

  const storePaths: NixStorePath[] = [];
  const witnesses: NixWitness[] = [];
  for (const id of order) {
    const derivation = byId.get(id)!;
    const settled = settleDerivation(derivation);
    storePaths.push(settled.storePath);
    witnesses.push(...settled.witnesses);
    for (const inputId of derivation.inputIds) {
      witnesses.push(witness(derivation.id, "organizing/nix/input", inputId, `nix:closure:${rootDerivation.id}`));
    }
  }

  const value = {
    kind: "organizing.nix.closure" as const,
    root: rootDerivation.id,
    storePaths: Object.freeze(storePaths),
    witnesses: Object.freeze(witnesses),
  };
  return nixClosureCarrier.assert(value, "closureOf") as NixClosure;
}

function isDerivation(value: NixDerivationInput | NixDerivation): value is NixDerivation {
  return "kind" in value && value.kind === "organizing.nix.derivation";
}

function settlementWitnesses(derivation: NixDerivation, storePath: NixStorePath): readonly NixWitness[] {
  return Object.freeze([
    witness(derivation.id, "organizing/nix/settles-to", storePath.$id, `nix:settle:${storePath.$id}`),
    witness(storePath.$id, "organizing/nix/normal-form", storePath.normalForm as JsonValue, `nix:settle:${storePath.$id}`),
  ]);
}

function witness(e: string, a: string, v: JsonValue, t: string): NixWitness {
  return nixWitnessCarrier.assert(Object.freeze({ e, a, v, t }), "nixWitness");
}

function hashJson(value: JsonValue): string {
  return createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function storeName(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9+._?-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return normalized.length === 0 ? "derivation" : normalized;
}
