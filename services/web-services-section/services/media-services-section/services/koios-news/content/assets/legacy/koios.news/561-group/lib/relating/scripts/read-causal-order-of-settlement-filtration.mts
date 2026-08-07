#!/usr/bin/env node
/** Read the temporal causal order carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readCausalOrderOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/geometry/temporal.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-causal-order-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration causal order", readCausalOrderOfSettlementFiltration)
    .then((code) => process.exit(code));
}
