#!/usr/bin/env node
import { reviewHistory } from "../src/algora.mjs";

const directory = process.argv[2];
if (!directory) throw new Error("usage: npm run history -- <outcome-directory>");
process.stdout.write(`${JSON.stringify(await reviewHistory(directory), null, 2)}\n`);
