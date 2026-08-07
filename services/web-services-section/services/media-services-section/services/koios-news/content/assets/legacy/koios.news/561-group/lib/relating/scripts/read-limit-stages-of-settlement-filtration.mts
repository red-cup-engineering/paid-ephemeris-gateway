#!/usr/bin/env node
/** Read limit stages carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readLimitStagesOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-limit-stages-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration limit stages", readLimitStagesOfSettlementFiltration)
    .then((code) => process.exit(code));
}
