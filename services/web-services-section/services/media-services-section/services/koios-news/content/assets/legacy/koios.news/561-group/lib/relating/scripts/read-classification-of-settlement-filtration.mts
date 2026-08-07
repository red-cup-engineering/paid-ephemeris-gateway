#!/usr/bin/env node
/** Read the classification invariant carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readClassificationOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-classification-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration classification", readClassificationOfSettlementFiltration)
    .then((code) => process.exit(code));
}
