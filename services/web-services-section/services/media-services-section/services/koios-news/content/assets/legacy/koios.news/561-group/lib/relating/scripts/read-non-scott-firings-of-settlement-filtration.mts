#!/usr/bin/env node
/** Read non-Scott firings carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readNonScottFiringsOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-non-scott-firings-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration non-Scott firings", readNonScottFiringsOfSettlementFiltration)
    .then((code) => process.exit(code));
}
