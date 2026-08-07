// source-roll - configured newscable intake plus local wire-store evidence.
//
// A publication may classify its sources editorially, but the roll itself is
// cable substrate: read the newscable config, resolve each wire's local store,
// and report what configured sources and stored evidence exist.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { requireJsonValue } from "@emsenn/relating/writing";
import { DEFAULT_WIRE_STORE, NEWSCABLE_CONFIG_BLOCK, assertNewscableBlock } from "./discovery.mjs";

export const SourceRollSourceSchema = Type.Object({
  kind: Type.Literal("producing-content.source-roll.source"),
  wire: Type.String({ minLength: 1 }),
  beat: Type.String({ minLength: 1 }),
  adapter: Type.String({ minLength: 1 }),
  url: Type.Optional(Type.String()),
  query: Type.Optional(Type.String()),
  domain: Type.Optional(Type.String()),
  max: Type.Optional(Type.Number()),
  sourceKind: Type.String({ minLength: 1 }),
  sourceClass: Type.String({ minLength: 1 }),
  editorialRole: Type.String({ minLength: 1 }),
  wireItemCount: Type.Number(),
  latestWireItemAt: Type.Optional(Type.String()),
}, { additionalProperties: false });

export const SourceRollWireSchema = Type.Object({
  kind: Type.Literal("producing-content.source-roll.wire"),
  name: Type.String({ minLength: 1 }),
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  sourceCount: Type.Number(),
  wireItemCount: Type.Number(),
  latestWireItemAt: Type.Optional(Type.String()),
  sources: Type.Array(SourceRollSourceSchema),
}, { additionalProperties: false });

export const SourceRollSchema = Type.Object({
  kind: Type.Literal("producing-content.source-roll"),
  configPath: Type.String({ minLength: 1 }),
  generatedAt: Type.String({ minLength: 1 }),
  wireCount: Type.Number(),
  sourceCount: Type.Number(),
  wireItemCount: Type.Number(),
  wires: Type.Array(SourceRollWireSchema),
  byClass: Type.Record(Type.String(), Type.Number()),
  bySourceKind: Type.Record(Type.String(), Type.Number()),
  constraints: Type.Array(Type.String()),
}, {
  $id: "producing-content/cable/source-roll",
  title: "CableSourceRoll",
  additionalProperties: false,
});

export type SourceRollSource = Static<typeof SourceRollSourceSchema>;
export type SourceRollWire = Static<typeof SourceRollWireSchema>;
export type SourceRollReading = Static<typeof SourceRollSchema>;

export const sourceRollCarrier = carrierFrom(SourceRollSchema);

export type SourceRollClassification = Readonly<{
  sourceKind: string;
  sourceClass: string;
  editorialRole: string;
}>;

export type SourceRollClassifier = (input: Readonly<{
  wire: string;
  source: Readonly<Record<string, unknown>>;
  domain?: string;
}>) => SourceRollClassification;

export type SourceRollOptions = Readonly<{
  configPath: string;
  now?: () => string;
  classify?: SourceRollClassifier;
  constraints?: readonly string[];
}>;

type JsonRecord = Record<string, unknown>;

const DEFAULT_CLASSIFICATION: SourceRollClassification = Object.freeze({
  sourceKind: "unknown",
  sourceClass: "unknown",
  editorialRole: "Configured intake source; classification has not been curated yet.",
});

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

function readConfig(configPath: string): JsonRecord {
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  if (!isRecord(parsed)) throw new TypeError("source roll config must be a JSON object");
  const block = parsed[NEWSCABLE_CONFIG_BLOCK];
  if (block !== undefined) assertNewscableBlock(block);
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

export function sourceRollReading(options: SourceRollOptions): SourceRollReading {
  const configPath = options.configPath;
  const config = readConfig(configPath);
  const cable = isRecord(config[NEWSCABLE_CONFIG_BLOCK]) ? config[NEWSCABLE_CONFIG_BLOCK] : {};
  const cableDir = dirname(resolve(configPath));
  const rawWires = Array.isArray(cable["wires"]) ? cable["wires"] : [];
  const byClass: Record<string, number> = {};
  const bySourceKind: Record<string, number> = {};
  const classify = options.classify ?? (() => DEFAULT_CLASSIFICATION);
  const wires = rawWires.flatMap((rawWire): SourceRollWire[] => {
    if (!isRecord(rawWire)) return [];
    const name = text(rawWire["name"], "unnamed-wire");
    const storeDir = resolve(cableDir, text(rawWire["store"], join(DEFAULT_WIRE_STORE, name)));
    const store = wireStoreStats(storeDir);
    const rawSources = Array.isArray(rawWire["sources"]) ? rawWire["sources"] : [];
    const sources = rawSources.flatMap((rawSource): SourceRollSource[] => {
      if (!isRecord(rawSource)) return [];
      const url = optionalText(rawSource["url"]);
      const query = optionalText(rawSource["query"]);
      const domain = domainOf(url);
      const classification = classify({ wire: name, source: rawSource, ...(domain === undefined ? {} : { domain }) });
      increment(byClass, classification.sourceClass);
      increment(bySourceKind, classification.sourceKind);
      return [{
        kind: "producing-content.source-roll.source" as const,
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
      }];
    });
    return [{
      kind: "producing-content.source-roll.wire" as const,
      name,
      title: text(rawWire["title"], name),
      ...(optionalText(rawWire["description"]) === undefined ? {} : { description: optionalText(rawWire["description"])! }),
      sourceCount: sources.length,
      wireItemCount: store.count,
      ...(store.latestAt === undefined ? {} : { latestWireItemAt: store.latestAt }),
      sources: [...sources],
    }];
  });
  return sourceRollCarrier.assert({
    kind: "producing-content.source-roll" as const,
    configPath,
    generatedAt: (options.now ?? (() => new Date().toISOString()))(),
    wireCount: wires.length,
    sourceCount: wires.reduce((sum, wire) => sum + wire.sourceCount, 0),
    wireItemCount: wires.reduce((sum, wire) => sum + wire.wireItemCount, 0),
    wires: [...wires],
    byClass: Object.freeze(byClass),
    bySourceKind: Object.freeze(bySourceKind),
    constraints: [...(options.constraints ?? [
      "This is configured intake, not an endorsement of every item a source publishes.",
      "The wire store is append-only and idempotent; present counts describe locally owned evidence bundles.",
    ])],
  }, "producing-content source roll");
}

export function sourceRollTerm(input: SourceRollReading): Tm {
  return carrierToTerm(requireJsonValue(sourceRollCarrier.assert(input), "producing-content source roll"));
}
