// producing-content - the organizing reading of a farm cycle.
//
// A farm cycle is not merely an observation emitted by a computer. It is a
// small organization of property readings: each property contributes a section,
// and organizing glues those sections into the produced-content collective.

import { Type, type Static } from "@sinclair/typebox";
import { organize, project, type Organization, type SocialProjection } from "@emsenn/organizing";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource, type JsonValue } from "@emsenn/relating/writing";

import { isCultivationObstruction, type CultivationJudgment } from "./cultivate.mjs";

export type ProducingContentRunReading = Readonly<{
  kind: "producing-content.cycle.run-reading";
  property: string;
  status: "committed" | "withheld" | "obstructed";
}>;

export const ProducingContentRunReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.cycle.run-reading"),
  property: Type.String({ minLength: 1 }),
  status: Type.Union([
    Type.Literal("committed"),
    Type.Literal("withheld"),
    Type.Literal("obstructed"),
  ]),
}, { additionalProperties: false });

export const ProducingContentCycleSchema = Type.Object({
  kind: Type.Literal("producing-content.cycle"),
  identity: Type.String({ minLength: 1 }),
  ordinal: Type.String({ minLength: 1 }),
  propertyCount: Type.Number(),
  committed: Type.Number(),
  withheld: Type.Number(),
  obstructed: Type.Number(),
  readings: Type.Array(ProducingContentRunReadingSchema),
  organization: Type.Unsafe<JsonValue>({}),
  projection: Type.Unsafe<JsonValue>({}),
  constraints: Type.Array(Type.String()),
}, {
  $id: "producing-content/content-farm/cycle",
  title: "ProducingContentCycle",
  additionalProperties: false,
});

export type ProducingContentCycle = Static<typeof ProducingContentCycleSchema>;

export const producingContentCycleCarrier = carrierFrom(ProducingContentCycleSchema);

export type ProducingContentCycleInput = Readonly<{
  identity: string;
  ordinal: bigint;
  readings: readonly Readonly<{
    property: string;
    run: CultivationJudgment | Readonly<{ kind: "content.farm.run-obstruction"; property: string; reason: string }>;
  }>[];
  constraints?: readonly string[];
}>;

function runStatus(
  run: CultivationJudgment | Readonly<{ kind: "content.farm.run-obstruction"; property: string; reason: string }>,
): ProducingContentRunReading["status"] {
  if (run.kind === "content.farm.run-obstruction") return "obstructed";
  if (isCultivationObstruction(run)) return "withheld";
  return "committed";
}

function cycleMembrane(readings: readonly ProducingContentRunReading[]): string {
  return readings
    .map((reading) => `${reading.property}|${reading.status}`)
    .join("\n");
}

export function producingContentCycle(input: ProducingContentCycleInput): ProducingContentCycle {
  const readings = input.readings.map((reading): ProducingContentRunReading => Object.freeze({
    kind: "producing-content.cycle.run-reading" as const,
    property: reading.property,
    status: runStatus(reading.run),
  }));
  const organization: Organization = organize({
    socializing: cycleMembrane(readings),
    computing: readings.map((reading) => `${reading.property}|${reading.status === "committed" ? "settled" : "held"}`).join("\n"),
    gaming: readings.map((reading) => `${reading.property}|${reading.status === "committed" ? "playable" : "constrained"}`).join("\n"),
  }, { identity: input.identity });
  const projection: SocialProjection = project(organization);
  const committed = readings.filter((reading) => reading.status === "committed").length;
  const withheld = readings.filter((reading) => reading.status === "withheld").length;
  const obstructed = readings.filter((reading) => reading.status === "obstructed").length;
  return producingContentCycleCarrier.assert({
    kind: "producing-content.cycle" as const,
    identity: input.identity,
    ordinal: input.ordinal.toString(),
    propertyCount: readings.length,
    committed,
    withheld,
    obstructed,
    readings: [...readings],
    organization: jsonResource(organization, "producing content organization"),
    projection: jsonResource(projection, "producing content projection"),
    constraints: [...(input.constraints ?? [
      "A produced-content cycle is read as an organized plurality of property run readings.",
      "Committed, withheld, and obstructed runs are held together by organizing rather than collapsed into a boolean pass/fail.",
    ])],
  }, "producing content cycle");
}

export function producingContentCycleTerm(input: ProducingContentCycle): Tm {
  return carrierToTerm(jsonResource(producingContentCycleCarrier.assert(input), "producing content cycle"));
}
