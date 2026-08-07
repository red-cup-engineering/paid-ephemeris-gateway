// ingest — fetch syndication sources and write their items as ClaimStateBundles
// into a wire's store.
//
// Each SyndicationItem becomes one bundle (via syndication-holography).
// Bundles are append-only and idempotent: an existing bundle is never
// overwritten.

import { dirname, join, resolve } from "node:path";

import {
  syndicationAdapters,
  type FetchLike,
  type SyndicationAdapter,
  type SyndicationConfig,
} from "@emsenn/content/syndication";
import { syndicationBundle } from "@emsenn/content/syndication/holography";

import {
  assertedNow,
  writeBundleIfAbsent,
  reportWrite,
  type WriteOutcome,
} from "./wire.mjs";
import {
  DEFAULT_WIRE_STORE,
  readNewscableSiteConfig,
} from "./discovery.mjs";

export type IngestResult = Readonly<{
  wire: string;
  storeDir: string;
  written: number;
  skipped: number;
  errors: readonly string[];
}>;

/**
 * Ingest one wire's sources into its store. Wire name, storeDir, and sources
 * come from the cable config's newswire entry.
 */
export async function ingestWire(
  wireName: string,
  storeDir: string,
  sources: readonly SyndicationConfig[],
  options: { fetchImpl?: FetchLike; adapters?: Readonly<Record<string, SyndicationAdapter>>; onSkip?: (msg: string) => void } = {},
): Promise<IngestResult> {
  const registry = options.adapters ?? syndicationAdapters;
  const asserted = assertedNow();
  let written = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const source of sources) {
    const adapter = registry[source.adapter];
    if (!adapter) {
      const msg = `${wireName}: unknown adapter "${source.adapter}"`;
      options.onSkip?.(msg);
      errors.push(msg);
      continue;
    }
    let items;
    try {
      items = await adapter.fetch(source, options.fetchImpl ? { fetchImpl: options.fetchImpl } : {});
    } catch (error) {
      const msg = `${wireName}: fetch failed for ${source.url ?? source.query ?? source.adapter}: ${error instanceof Error ? error.message : String(error)}`;
      options.onSkip?.(msg);
      errors.push(msg);
      continue;
    }
    for (const item of items) {
      const bundle = syndicationBundle(item, { witness: wireName, asserted });
      let outcome: WriteOutcome;
      try {
        outcome = await writeBundleIfAbsent(storeDir, bundle);
      } catch (error) {
        const msg = `${wireName}: write failed for ${bundle.subject}: ${error instanceof Error ? error.message : String(error)}`;
        options.onSkip?.(msg);
        errors.push(msg);
        continue;
      }
      reportWrite(wireName, bundle.subject, outcome);
      if (outcome === "written") written += 1;
      else skipped += 1;
    }
  }

  return Object.freeze({ wire: wireName, storeDir, written, skipped, errors: Object.freeze(errors) });
}

/**
 * Load a cable config and ingest every wire it aggregates: for each
 * entry of newscable.wires that carries `sources`, fetch them into the
 * wire's store (`store/<name>` under the cable package by default). The wire
 * list is the cable's own config — no sibling-package scan.
 */
export async function ingestCableFromConfig(
  configPath: string,
  options: { fetchImpl?: FetchLike; adapters?: Readonly<Record<string, SyndicationAdapter>>; onSkip?: (msg: string) => void } = {},
): Promise<readonly IngestResult[]> {
  const config = await readNewscableSiteConfig(configPath);
  const cableDir = dirname(resolve(configPath));
  const results: IngestResult[] = [];
  for (const wire of config.wires) {
    const sources: SyndicationConfig[] = [];
    for (const entry of wire.sources ?? []) {
      if (typeof entry.adapter === "string") sources.push(entry as SyndicationConfig);
    }
    if (sources.length === 0) continue; // a computed/projected wire: no syndication to ingest
    const storeDir = resolve(cableDir, wire.store ?? join(DEFAULT_WIRE_STORE, wire.name));
    try {
      results.push(await ingestWire(wire.name, storeDir, sources, options));
    } catch (error) {
      options.onSkip?.(`${wire.name}: ingest failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return Object.freeze(results);
}
