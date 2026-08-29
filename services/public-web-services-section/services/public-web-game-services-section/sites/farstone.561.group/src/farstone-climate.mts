import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { CLOCK, clockReport } from "@red-cup-engineering/feltos/world-clock";
import { tell, value } from "@red-cup-engineering/feltos/world";

export function farstoneClimateReport(world: unknown) {
  const clock = clockReport(world);
  return Object.freeze({
    ...clock,
    harborClosed: value(world, "farstone:climate", "harbor-closed") === true,
    shellfishClosed: value(world, "farstone:climate", "shellfish-closed") === true,
    fireDanger: value(world, "farstone:climate", "fire-danger") ?? "low",
  });
}

function almanac(ctx: any) {
  const report = farstoneClimateReport(ctx.world);
  const advisories = [
    report.harborClosed ? "The harbor is closed." : "The harbor is open.",
    report.shellfishClosed ? "The clam bed is closed." : "The clam bed is open.",
    `Fire danger is ${report.fireDanger}.`,
  ];
  return { events: [ctx.message(ctx.actor, `Almanac of Farstone — ${report.season}, ${report.phase}; ${report.weather}, tide ${report.tide}. ${advisories.join(" ")}`)] };
}

export const farstoneClimateCapability = defineCapability({
  id: "farstone.climate",
  commands: { almanac, forecast: almanac },
  onTick(ctx) {
    if (value(ctx.world, CLOCK, "world-time") === null) return undefined;
    const report = clockReport(ctx.world);
    const harsh = report.weather === "storm";
    const shellfishClosed = report.season === "summer" && (report.weather === "rain" || harsh);
    const fireDanger = report.season === "summer" && report.dryStreak >= 8 ? "high" : report.dryStreak >= 4 ? "moderate" : "low";
    return {
      world: tell(ctx.world, [
        { subject: "farstone:climate", predicate: "harbor-closed", object: harsh },
        { subject: "farstone:climate", predicate: "shellfish-closed", object: shellfishClosed },
        { subject: "farstone:climate", predicate: "fire-danger", object: fireDanger },
      ], { source: "farstone.climate" }),
    };
  },
});
