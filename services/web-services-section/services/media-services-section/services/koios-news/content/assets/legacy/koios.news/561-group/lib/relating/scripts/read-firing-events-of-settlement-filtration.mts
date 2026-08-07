#!/usr/bin/env node
/** Read temporal firing events carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readFiringEventsOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/geometry/temporal.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-firing-events-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration firing events", readFiringEventsOfSettlementFiltration)
    .then((code) => process.exit(code));
}
