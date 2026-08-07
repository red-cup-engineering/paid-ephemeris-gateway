#!/usr/bin/env node
/** Read the graded gap carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readGradedGapOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-graded-gap-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration graded gap", readGradedGapOfSettlementFiltration)
    .then((code) => process.exit(code));
}
