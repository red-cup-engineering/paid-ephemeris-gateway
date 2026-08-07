#!/usr/bin/env node
// source-cycle.mts — refresh Koios-owned source wires, then run one farm tick.

import process from "node:process";

import { runKoiosSourceCycle } from "./researching/sourcing/source-cycle.mjs";

const reading = await runKoiosSourceCycle({
  env: process.env,
  onSkip: (message) => process.stderr.write(`${message}\n`),
});

process.stdout.write(`${JSON.stringify(reading, null, 2)}\n`);
