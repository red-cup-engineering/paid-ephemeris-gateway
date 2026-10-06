#!/usr/bin/env node
import { listBounties } from "../src/github.mjs";
import { listPlatformBounties } from "../src/platforms.mjs";
import { rankBounties } from "../src/selection.mjs";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
}

const limit = Number(option("limit", "20"));
const platforms = option("platforms", "").split(",").filter(Boolean);
const others = platforms.length > 0 ? await listPlatformBounties({ platforms, limit }) : { bounties: [], failures: [] };
for (const { platform, error } of others.failures) process.stderr.write(`${platform}: ${error}\n`);
const bounties = [...await listBounties({ limit, query: option("query"), token: process.env.GH_TOKEN }), ...others.bounties];
const assessments = rankBounties(bounties, { minimumRewardUsd: Number(option("minimum-reward", "1")) });
process.stdout.write(`${JSON.stringify(assessments, null, 2)}\n`);
