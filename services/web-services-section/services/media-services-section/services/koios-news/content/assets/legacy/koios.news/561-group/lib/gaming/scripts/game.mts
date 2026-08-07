#!/usr/bin/env node
// game — the concurrent-game-system computer: create/list/show/design/play/
// interact/settle/analyze over persisted games. Thin entry over
// @emsenn/gaming/running's runGameCli.
import process from "node:process";
import { runGameCli } from "@emsenn/gaming/running";

const result = runGameCli(process.argv.slice(2));
process.stdout.write(result.output + "\n");
process.exit(result.code);
