#!/usr/bin/env node
/** Read the firing sequence carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readFiringsOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-firings-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration firings", readFiringsOfSettlementFiltration)
    .then((code) => process.exit(code));
}
