/**
 * Charge-faithful serialization of the computer carriers — `DerivationProvenance`
 * and `Observation`.
 *
 * The provenance decodes through the real `derivationProvenance()` constructor
 * (re-deriving the canonical four-stage list), and the observation reuses
 * `@emsenn/gaming/encoding` `encodeArena`/`decodeArena` for its arena, so a decoded
 * observation is a genuine frozen carrier round-tripping its encoding.
 */
import { type Json, asArray, asObject, asString, decodeArena, encodeArena, field } from "@emsenn/gaming/encoding";
import { type Observation } from "../operating/observation.mjs";
import { type DerivationProvenance, derivationProvenance } from "../operating/provenance.mjs";

const asStrings = (value: unknown, what: string): readonly string[] =>
  asArray(value, what).map((entry) => asString(entry, `${what} entry`));

export function encodeProvenance(value: DerivationProvenance): Json {
  return {
    kind: value.kind,
    stages: [...value.stages],
    observedEvents: [...value.observedEvents],
    auditedCells: [...value.auditedCells],
  };
}

export function decodeProvenance(json: unknown): DerivationProvenance {
  const obj = asObject(json, "provenance");
  return derivationProvenance(
    asStrings(field(obj, "observedEvents", "provenance"), "observedEvents"),
    asStrings(field(obj, "auditedCells", "provenance"), "auditedCells"),
  );
}

export function encodeObservation(value: Observation): Json {
  return {
    kind: value.kind,
    arena: encodeArena(value.arena),
    provenance: encodeProvenance(value.provenance),
  };
}

export function decodeObservation(json: unknown): Observation {
  const obj = asObject(json, "observation");
  return Object.freeze({
    kind: "computing.computer.observation" as const,
    arena: decodeArena(field(obj, "arena", "observation")),
    provenance: decodeProvenance(field(obj, "provenance", "observation")),
  });
}
