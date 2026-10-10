// The day's lection: the property's data table first (it can carry curated
// verse text), then lib/liturgy-topology's sourced RCL tables (Cassia reads
// the Psalm, or the Gospel when the day gives one), then an honest
// fallback — a sequential psalter cycle, Psalm (day-of-year mod 150) + 1,
// that SAYS SO in its cycle field. The Routine Read cites its symbols, so
// the citation must name the cycle that actually produced it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Lection } from "@emsenn/divining/divination";
import { lectionFor as liturgyLection } from "@emsenn/divining/liturgy";
import { PROPERTY_ROOT } from "./config.ts";

type LectionTable = Readonly<Record<string, Readonly<{ cycle: string; reference: string; text?: string; translation?: string }>>>;

function dayOfYear(dateIso: string): number {
  const [year, month, day] = dateIso.split("-").map(Number) as [number, number, number];
  const start = Date.UTC(year, 0, 1);
  const date = Date.UTC(year, month - 1, day);
  return Math.round((date - start) / 86_400_000) + 1;
}

export function lectionFor(dateIso: string): Lection {
  let table: LectionTable = {};
  try {
    table = JSON.parse(readFileSync(join(PROPERTY_ROOT, "data", "lectionary.json"), "utf8")) as LectionTable;
  } catch {
    // No table yet: the fallback below carries its own provenance.
  }
  const entry = table[dateIso];
  if (entry) {
    return Object.freeze({
      cycle: entry.cycle,
      reference: entry.reference,
      ...(entry.text === undefined ? {} : { text: entry.text }),
      ...(entry.translation === undefined ? {} : { translation: entry.translation }),
    });
  }
  const liturgical = liturgyLection(dateIso, "rcl");
  if (liturgical.outcome === "found") {
    const readings = liturgical.entry.readings;
    const chosen =
      readings.find((reading) => reading.role === "psalm" && reading.track !== "complementary") ??
      readings.find((reading) => reading.role === "gospel") ??
      readings[0];
    if (chosen) {
      return Object.freeze({
        cycle: `RCL ${liturgical.entry.service}, Year ${liturgical.entry.cycle}`,
        reference: chosen.citation,
      });
    }
  }
  const psalm = ((dayOfYear(dateIso) - 1) % 150) + 1;
  return Object.freeze({
    cycle: "sequential psalter (fallback; no RCL entry recorded for this date)",
    reference: `Psalm ${psalm}`,
  });
}
