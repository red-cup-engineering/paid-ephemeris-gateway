#!/usr/bin/env node
/** Read the graded-gap first-cohomology rank identity carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-graded-gap-first-cohomology-rank-identity-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration graded-gap first-cohomology rank identity", readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration)
    .then((code) => process.exit(code));
}
