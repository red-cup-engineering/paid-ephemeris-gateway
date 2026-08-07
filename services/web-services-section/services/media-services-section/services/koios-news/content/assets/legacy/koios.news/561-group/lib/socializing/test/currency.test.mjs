// Tests for coordination-currency: the reusable social-currency receipt over H1 residue.
import { test } from "node:test";
import assert from "node:assert/strict";

import { coordinationCurrency, decideByMarket } from "../dist/index.mjs";
import { admitSeed, descend } from "@emsenn/animating";

const membrane = (seed) => descend(admitSeed(seed)).utterances;

test("coordination currency mints one H1 credit per contested market cell", () => {
  const market = decideByMarket(membrane("v1|A>B\nv2|A>B\nv3|B>A\nv4|B>A"));
  const currency = coordinationCurrency(market);

  assert.equal(currency.kind, "socializing.coordination-currency");
  assert.equal(currency.unit, "h1-coordination-credit");
  assert.equal(currency.issued, 1);
  assert.equal(currency.contested, 1);
  assert.equal(currency.settled, 0);
  assert.equal(currency.noArbitrage, false);
  assert.equal(currency.coherentConsensus, false);
  assert.deepEqual(currency.lenses, [
    "money-is-memory",
    "mutual-credit",
    "exchange-value",
    "debt-subjectivation",
    "semiotic-flow",
    "social-factory",
  ]);

  const [cell] = currency.cells;
  assert.equal(cell.id, "preference:A>B");
  assert.equal(cell.source, "decide-by-market");
  assert.equal(cell.spreadH1, 1);
  assert.equal(cell.issued, 1);
  assert.equal(cell.status, "contested");
});

test("raw cells can issue the same currency register for later sociology bridges", () => {
  const currency = coordinationCurrency([
    { id: "office:maintainer", source: "institutionalize", spreadH1: 0 },
    { id: "recognition:ignored-claim", source: "recognition", spreadH1: 2, noArbitrage: false },
  ]);

  assert.equal(currency.issued, 2);
  assert.equal(currency.contested, 1);
  assert.equal(currency.settled, 1);
  assert.equal(currency.noArbitrage, false);
  assert.equal(currency.cells[0].status, "settled");
  assert.equal(currency.cells[1].status, "contested");
  assert.equal(currency.cells[1].issued, 2);
  assert.equal(currency.theory.socialFactory.includes("coordination labor"), true);
});
