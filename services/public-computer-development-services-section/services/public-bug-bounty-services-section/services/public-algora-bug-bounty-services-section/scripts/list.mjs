#!/usr/bin/env node
import { listBounties } from "../src/github.mjs";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
}

const limit = Number(option("limit", "20"));
const bounties = await listBounties({ limit, query: option("query"), token: process.env.GH_TOKEN });
process.stdout.write(`${JSON.stringify(bounties, null, 2)}\n`);
