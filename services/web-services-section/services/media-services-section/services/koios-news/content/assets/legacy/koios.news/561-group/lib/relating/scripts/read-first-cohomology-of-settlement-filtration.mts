#!/usr/bin/env node
/** Read first cohomology carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readFirstCohomologyOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-first-cohomology-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration first cohomology", readFirstCohomologyOfSettlementFiltration)
    .then((code) => process.exit(code));
}
