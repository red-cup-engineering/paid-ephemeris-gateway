// Theorem-shaped tests for decide-by-market: aggregate-preferences settled through
// the price/no-arbitrage/H1 market reading. Run against the built dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import { decideByMarket } from "../dist/index.mjs";
import { admitSeed, descend } from "@emsenn/animating";

const membrane = (seed) => descend(admitSeed(seed)).utterances;

test("a coherent preference cell settles no-arbitrage with zero coordination cost", () => {
  const r = decideByMarket(membrane("v1|A>B\nv2|A>B\nv3|A>B"));

  assert.equal(r.kind, "socializing.market-governance");
  assert.equal(r.noArbitrage, true);
  assert.equal(r.coherentConsensus, true);
  assert.equal(r.coordinationCost, 0);
  assert.equal(r.decided, 1);

  const [cell] = r.cells;
  assert.equal(cell.spreadH1, 0);
  assert.equal(cell.coordinationCost, 0);
  assert.equal(cell.noArbitrage, true);
  assert.equal(cell.coherentConsensus, true);
  assert.equal(cell.decision, "a");
  assert.equal(cell.proof.noArbitrageIffH1Zero, true);
  assert.equal(cell.proof.coherentConsensusIffH1Zero, true);
  assert.equal(cell.proof.noArbitrageIffCoherentConsensus, true);
});

test("a two-sided preference market reports residual spread-H1 as contested-cell cost", () => {
  const r = decideByMarket(membrane("v1|A>B\nv2|A>B\nv3|B>A\nv4|B>A"));

  assert.equal(r.noArbitrage, false);
  assert.equal(r.coherentConsensus, false);
  assert.equal(r.coordinationCost, 1);
  assert.equal(r.contested, 1);

  const [cell] = r.cells;
  assert.equal(cell.aggregateStanding, "stable");
  assert.equal(cell.aggregateWinner, "incomparable");
  assert.equal(cell.decision, "contested");
  assert.equal(cell.spreadH1, 1);
  assert.equal(cell.coordinationCost, 1);
  assert.equal(cell.noArbitrage, false);
  assert.equal(cell.coherentConsensus, false);
  assert.equal(cell.contestedCell, true);
  assert.equal(cell.proof.spreadH1Zero, false);
  assert.equal(cell.proof.noArbitrageIffH1Zero, true);
  assert.equal(cell.proof.coherentConsensusIffH1Zero, true);
  assert.equal(cell.proof.noArbitrageIffCoherentConsensus, true);
});
