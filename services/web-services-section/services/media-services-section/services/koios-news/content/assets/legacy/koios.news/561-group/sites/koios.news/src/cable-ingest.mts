#!/usr/bin/env node
// cable-ingest.mts — ingest Koios's declared syndication sources into its own
// collapse wire stores. The stores are the cable's state; the farm consumes the
// served cable, not another site's witness source.

import process from "node:process";

import { ingestCableFromConfig } from "@emsenn/content-production/cable";

import { DEFAULT_CONTENT_PRODUCTION_CONFIG } from "./config.mjs";

const onSkip = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

const results = await ingestCableFromConfig(DEFAULT_CONTENT_PRODUCTION_CONFIG, { onSkip });
for (const result of results) {
  process.stdout.write(
    `${result.wire}: ${result.written} written, ${result.skipped} skipped${result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}\n`,
  );
}
