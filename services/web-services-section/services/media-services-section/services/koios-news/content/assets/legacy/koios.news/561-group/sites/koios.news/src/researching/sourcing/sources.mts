// researching/sourcing/sources — the configured Koios intake source roll.
//
// Bibliography readings show what published articles cite. This source roll
// shows what the newsroom listens to before articles exist: configured feeds,
// their beat, editorial role, source class, and local wire-store population.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { DEFAULT_WIRE_STORE } from "@emsenn/content-production/cable";

import { DEFAULT_CONTENT_PRODUCTION_CONFIG } from "../../config.mjs";
import type { SourceKind } from "./bibliography.mjs";

export type IntakeSourceClass =
  | "general-news"
  | "specialist-news"
  | "formal-research"
  | "institutional"
  | "professional-society"
  | "policy-research"
  | "unknown";

export type IntakeSourceReading = Readonly<{
  kind: "koios.source-roll.source";
  wire: string;
  beat: string;
  adapter: string;
  url?: string;
  query?: string;
  domain?: string;
  max?: number;
  sourceKind: SourceKind;
  sourceClass: IntakeSourceClass;
  editorialRole: string;
  wireItemCount: number;
  latestWireItemAt?: string;
}>;

export type IntakeWireReading = Readonly<{
  kind: "koios.source-roll.wire";
  name: string;
  title: string;
  description?: string;
  sourceCount: number;
  wireItemCount: number;
  latestWireItemAt?: string;
  sources: readonly IntakeSourceReading[];
}>;

export type SourceRollReading = Readonly<{
  kind: "koios.source-roll";
  configPath: string;
  generatedAt: string;
  wireCount: number;
  sourceCount: number;
  wireItemCount: number;
  wires: readonly IntakeWireReading[];
  byClass: Readonly<Record<string, number>>;
  bySourceKind: Readonly<Record<string, number>>;
  constraints: readonly string[];
}>;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function optionalText(value: unknown): string | undefined {
  const string = text(value);
  return string === "" ? undefined : string;
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function domainOf(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function classify(domain: string | undefined): Readonly<{ sourceKind: SourceKind; sourceClass: IntakeSourceClass; editorialRole: string }> {
  switch (domain) {
    case "nature.com":
    case "pnas.org":
    case "science.org":
    case "arxiv.org":
    case "nber.org":
      return Object.freeze({
        sourceKind: "academic-journal" as const,
        sourceClass: "formal-research" as const,
        editorialRole: "Formal or pre-publication research signal for claims that need more than headline-level support.",
      });
    case "federalreserve.gov":
      return Object.freeze({
        sourceKind: "professional-journal" as const,
        sourceClass: "institutional" as const,
        editorialRole: "Institutional primary-source signal for monetary, banking, payment, and macroeconomic policy.",
      });
    case "spectrum.ieee.org":
      return Object.freeze({
        sourceKind: "professional-journal" as const,
        sourceClass: "professional-society" as const,
        editorialRole: "Professional engineering signal for technical systems, infrastructure, robotics, and AI practice.",
      });
    case "carbonbrief.org":
    case "insideclimatenews.org":
    case "grist.org":
    case "npr.org":
    case "bellingcat.com":
      return Object.freeze({
        sourceKind: "independent-website" as const,
        sourceClass: "specialist-news" as const,
        editorialRole: "Specialist journalism signal with beat expertise and public-interest framing.",
      });
    case "isdglobal.org":
    case "gnet-research.org":
    case "crisisgroup.org":
    case "warontherocks.com":
      return Object.freeze({
        sourceKind: "professional-journal" as const,
        sourceClass: "policy-research" as const,
        editorialRole: "Strategic-analysis signal from a research institute or policy publication: terrorism, extremism, conflict, and geopolitics studied as a field, not breaking-news wire.",
      });
    case "coindesk.com":
    case "theblock.co":
    case "technologyreview.com":
    case "theregister.com":
    case "arstechnica.com":
      return Object.freeze({
        sourceKind: "commercial-website" as const,
        sourceClass: "specialist-news" as const,
        editorialRole: "Specialist trade/news signal for technology, crypto, and infrastructure market movements.",
      });
    case "theguardian.com":
    case "aljazeera.com":
    case "nytimes.com":
      return Object.freeze({
        sourceKind: "commercial-website" as const,
        sourceClass: "general-news" as const,
        editorialRole: "General newsroom signal for public events, politics, business, and cross-beat developments.",
      });
    default:
      return Object.freeze({
        sourceKind: "unknown" as const,
        sourceClass: "unknown" as const,
        editorialRole: "Configured intake source; classification has not been curated yet.",
      });
  }
}

function readConfig(configPath: string): JsonRecord {
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  if (!isRecord(parsed)) throw new TypeError("source roll config must be a JSON object");
  return parsed;
}

function wireStoreStats(storeDir: string): Readonly<{ count: number; latestAt?: string }> {
  if (!existsSync(storeDir)) return Object.freeze({ count: 0 });
  let count = 0;
  let latest = 0;
  for (const entry of readdirSync(storeDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    count += 1;
    const mtime = statSync(join(storeDir, entry.name)).mtimeMs;
    if (mtime > latest) latest = mtime;
  }
  return Object.freeze({
    count,
    ...(latest === 0 ? {} : { latestAt: new Date(latest).toISOString() }),
  });
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export function sourceRollReading(options: Readonly<{ configPath?: string; now?: () => string }> = {}): SourceRollReading {
  const configPath = options.configPath ?? DEFAULT_CONTENT_PRODUCTION_CONFIG;
  const config = readConfig(configPath);
  const cable = isRecord(config["newscable"]) ? config["newscable"] : {};
  const cableDir = dirname(resolve(configPath));
  const rawWires = Array.isArray(cable["wires"]) ? cable["wires"] : [];
  const byClass: Record<string, number> = {};
  const bySourceKind: Record<string, number> = {};
  const wires = rawWires.flatMap((rawWire): IntakeWireReading[] => {
    if (!isRecord(rawWire)) return [];
    const name = text(rawWire["name"], "unnamed-wire");
    const storeDir = resolve(cableDir, text(rawWire["store"], join(DEFAULT_WIRE_STORE, name)));
    const store = wireStoreStats(storeDir);
    const rawSources = Array.isArray(rawWire["sources"]) ? rawWire["sources"] : [];
    const sources = rawSources.flatMap((rawSource): IntakeSourceReading[] => {
      if (!isRecord(rawSource)) return [];
      const url = optionalText(rawSource["url"]);
      const query = optionalText(rawSource["query"]);
      const domain = domainOf(url);
      const classification = classify(domain);
      increment(byClass, classification.sourceClass);
      increment(bySourceKind, classification.sourceKind);
      return [Object.freeze({
        kind: "koios.source-roll.source" as const,
        wire: name,
        beat: name,
        adapter: text(rawSource["adapter"], "unknown"),
        ...(url === undefined ? {} : { url }),
        ...(query === undefined ? {} : { query }),
        ...(domain === undefined ? {} : { domain }),
        ...(optionalInteger(rawSource["max"]) === undefined ? {} : { max: optionalInteger(rawSource["max"])! }),
        sourceKind: classification.sourceKind,
        sourceClass: classification.sourceClass,
        editorialRole: classification.editorialRole,
        wireItemCount: store.count,
        ...(store.latestAt === undefined ? {} : { latestWireItemAt: store.latestAt }),
      })];
    });
    return [Object.freeze({
      kind: "koios.source-roll.wire" as const,
      name,
      title: text(rawWire["title"], name),
      ...(optionalText(rawWire["description"]) === undefined ? {} : { description: optionalText(rawWire["description"])! }),
      sourceCount: sources.length,
      wireItemCount: store.count,
      ...(store.latestAt === undefined ? {} : { latestWireItemAt: store.latestAt }),
      sources: Object.freeze(sources),
    })];
  });
  return Object.freeze({
    kind: "koios.source-roll" as const,
    configPath,
    generatedAt: (options.now ?? (() => new Date().toISOString()))(),
    wireCount: wires.length,
    sourceCount: wires.reduce((sum, wire) => sum + wire.sourceCount, 0),
    wireItemCount: wires.reduce((sum, wire) => sum + wire.wireItemCount, 0),
    wires: Object.freeze(wires),
    byClass: Object.freeze(byClass),
    bySourceKind: Object.freeze(bySourceKind),
    constraints: Object.freeze([
      "This is configured intake, not an endorsement of every item a source publishes.",
      "The wire store is append-only and idempotent; present counts describe locally owned evidence bundles.",
      "Classification is editorial metadata for operators and readers; article bibliographies still cite exact source URLs.",
    ]),
  });
}
