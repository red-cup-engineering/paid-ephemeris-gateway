#!/usr/bin/env node
// farm — run one content-farm cultivation cycle over configured properties,
// and write the cycle (with its computer provenance) to stdout.
// Thin script over the content-farm module; NO transport — a generic server
// mounts this script when a site wants HTTP. Subsumes the former content-farm
// CLI's `tick`. Optional arg: the config path (defaults to
// ./content-production.config.json).
import process from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  contentFarmConfigFromDocument,
  createContentFarmService,
  farmCycleReading,
  type ContentFarmServiceOptions,
  type FarmHub,
} from "../content-farm/index.mjs";

async function hubFromEnv(env: NodeJS.ProcessEnv): Promise<FarmHub | undefined> {
  const base = env.CONTENT_FARM_HUB ?? env.SWARM_561_HUB;
  const tokenFile = env.CONTENT_FARM_HUB_TOKEN_FILE;
  if (!base || !tokenFile) return undefined;
  return { base, token: (await readFile(tokenFile, "utf8")).trim() };
}

const configPath = resolve(process.argv[2] ?? "content-production.config.json");
const document = JSON.parse(await readFile(configPath, "utf8")) as unknown;
const config = contentFarmConfigFromDocument(document);
const hub = await hubFromEnv(process.env);
const options: ContentFarmServiceOptions = {
  env: process.env,
  ...(hub === undefined ? {} : { hub }),
};
const service = createContentFarmService(config, options);
const cycle = await service.tick();
process.stdout.write(`${JSON.stringify(farmCycleReading(cycle))}\n`);
