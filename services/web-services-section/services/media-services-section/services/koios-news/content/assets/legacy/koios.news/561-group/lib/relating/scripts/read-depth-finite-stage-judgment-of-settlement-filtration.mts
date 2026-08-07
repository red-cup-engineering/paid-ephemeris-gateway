#!/usr/bin/env node
/** Read the finite-stage depth judgment carried by a `SettlementFiltration`. */
import { fileURLToPath } from "node:url";
import { readDepthFiniteStageJudgmentOfSettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";
import { runSettlementFiltrationRead } from "./settlement-filtration-read.mjs";

const scriptName = "read-depth-finite-stage-judgment-of-settlement-filtration";

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSettlementFiltrationRead(scriptName, "settlement filtration depth finite-stage judgment", readDepthFiniteStageJudgmentOfSettlementFiltration)
    .then((code) => process.exit(code));
}
