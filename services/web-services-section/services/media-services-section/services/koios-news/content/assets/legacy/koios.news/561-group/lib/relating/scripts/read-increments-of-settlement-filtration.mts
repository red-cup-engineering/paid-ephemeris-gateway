#!/usr/bin/env node
/** Read the increments carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readIncrementsOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-increments-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration increments", readIncrementsOfSettlementFiltration)
    .then((code) => process.exit(code));
}
