#!/usr/bin/env node
// discover — one keyword-and-source discovery reading over Koios's owned wire
// stores and published corpus, written to stdout as JSON. Thin script over
// researching/sourcing/discovery; no transport. By default it folds the public
// Google Trends signal when reachable (--no-trends to skip; --geo=XX to set the
// region). Optional first arg overrides the config path.
import process from "node:process";

import { googleTrendsProbe, keywordDiscoveryReading } from "./researching/sourcing/discovery.mjs";

const args = process.argv.slice(2);
const configPath = args.find((arg) => !arg.startsWith("-"));
const wantTrends = !args.includes("--no-trends");
const geo = (args.find((arg) => arg.startsWith("--geo="))?.split("=")[1]) ?? "US";

const trends = wantTrends ? await googleTrendsProbe({ geo }) : undefined;
const reading = await keywordDiscoveryReading({
  ...(configPath === undefined ? {} : { configPath }),
  ...(trends === undefined ? {} : { trends }),
});
process.stdout.write(`${JSON.stringify(reading, null, 2)}\n`);
