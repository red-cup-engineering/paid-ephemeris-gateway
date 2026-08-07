#!/usr/bin/env node
/** Read the depth invariant carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readDepthOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-depth-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration depth", readDepthOfSettlementFiltration)
    .then((code) => process.exit(code));
}
