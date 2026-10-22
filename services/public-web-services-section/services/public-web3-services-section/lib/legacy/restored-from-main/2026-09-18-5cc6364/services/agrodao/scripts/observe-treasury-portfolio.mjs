#!/usr/bin/env node
import { observeTreasuryPortfolio } from "../src/observe-treasury-portfolio.mjs";

observeTreasuryPortfolio()
  .then((disclosure) => process.stdout.write(`${JSON.stringify(disclosure, null, 2)}\n`))
  .catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  });
