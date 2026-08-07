#!/usr/bin/env node
// demand-pull — pull Search Console demand for one property into a
// { queries: [...] } JSON file. Thin script over the computer module's demand
// adapter; no transport. Subsumes the former content-computer CLI's demand-pull.
//
//   --property=sc-domain:example.com   (required)
//   --days=28                          window ending today
//   --start=YYYY-MM-DD --end=YYYY-MM-DD  explicit window
//   --key-file=PATH                    service-account key
//   --out=PATH                         write here (default: stdout)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

import { fetchSearchConsoleDemand } from "../computer/demand.mjs";

function parseFlags(args: readonly string[]): Readonly<Record<string, string>> {
  const flags: Record<string, string> = {};
  for (const arg of args) {
    const match = arg.match(/^--([\w-]+)=(.*)$/);
    if (!match) throw new TypeError(`malformed flag: ${arg} (expected --name=value)`);
    flags[match[1]!] = match[2]!;
  }
  return Object.freeze(flags);
}

const isoDay = (epochMs: number): string => new Date(epochMs).toISOString().slice(0, 10);

const flags = parseFlags(process.argv.slice(2));
const property = flags["property"];
if (!property) {
  process.stderr.write("demand-pull needs --property=sc-domain:example.com\n");
  process.exit(2);
}
const days = Number.parseInt(flags["days"] ?? "28", 10);
if (!Number.isInteger(days) || days <= 0) {
  process.stderr.write(`--days must be a positive integer, got ${flags["days"]}\n`);
  process.exit(2);
}
const nowMs = Date.now(); // law-allow: wall-clock-as-data — the pull window is anchored to the vendor's reporting clock
const endDate = flags["end"] ?? isoDay(nowMs);
const startDate = flags["start"] ?? isoDay(nowMs - days * 86_400_000);

const judgment = await fetchSearchConsoleDemand({
  property,
  startDate,
  endDate,
  ...(flags["key-file"] === undefined ? {} : { keyFile: flags["key-file"] }),
});
if (judgment.kind === "content.demand.search-console-obstruction") {
  process.stderr.write(`demand-pull obstructed at ${judgment.at}: ${judgment.detail}\n`);
  process.exit(1);
}

const text = `${JSON.stringify({
  property: judgment.property,
  startDate: judgment.startDate,
  endDate: judgment.endDate,
  queries: judgment.queries,
}, null, 2)}\n`;
const out = flags["out"];
if (out === undefined) {
  process.stdout.write(text);
} else {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  process.stderr.write(`demand-pull: ${judgment.queries.length} queries (${judgment.startDate}..${judgment.endDate}) -> ${out}\n`);
}
