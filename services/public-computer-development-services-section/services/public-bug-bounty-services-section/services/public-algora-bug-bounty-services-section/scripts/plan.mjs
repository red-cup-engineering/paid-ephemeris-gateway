#!/usr/bin/env node
import { listBounties } from "../src/github.mjs";
import { rankBounties } from "../src/selection.mjs";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
}

const bounties = await listBounties({ limit: Number(option("limit", "20")), query: option("query"), token: process.env.GH_TOKEN });
const assessments = rankBounties(bounties, { minimumRewardUsd: Number(option("minimum-reward", "1")) });
process.stdout.write(`${JSON.stringify(assessments, null, 2)}\n`);
