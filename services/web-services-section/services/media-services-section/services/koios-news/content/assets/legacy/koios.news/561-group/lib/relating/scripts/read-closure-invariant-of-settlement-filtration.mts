#!/usr/bin/env node
/** Read the closure invariant carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readClosureInvariantOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-closure-invariant-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration closure invariant", readClosureInvariantOfSettlementFiltration)
    .then((code) => process.exit(code));
}
