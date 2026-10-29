#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { observeRepositoryMaterial } from "../src/repo-workspace.mjs";

const request = JSON.parse(readFileSync(0, "utf8"));
process.stdout.write(`${JSON.stringify(await observeRepositoryMaterial(request), null, 2)}\n`);
