


import type { ChargeCarrier } from "@emsenn/relating-experimental";

export type Charge = ChargeCarrier;



export interface KnowledgeBaseEntity {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly aliases: readonly string[];
}

export interface LinkResult {
  readonly status: "linked" | "ambiguous" | "nil";
  readonly entity: string | null;
  readonly candidates: readonly string[];
  readonly charge: Charge;
}



export interface ReferenceResolution {
  readonly anaphor: string;
  readonly status: "resolved" | "ambiguous" | "void";
  readonly antecedent: string | null;
  readonly candidates: readonly string[];
}

export interface ReferenceResult {
  readonly resolutions: readonly ReferenceResolution[];
  readonly clusters: readonly (readonly string[])[];
}
