// Tests for mobilize: coalition capacity priced as coordination-currency.
import { test } from "node:test";
import assert from "node:assert/strict";

import { mobilize } from "../dist/index.mjs";

const relation = (kind, active, passive, scope, standing = "potential") =>
  Object.freeze({ kind, active, passive, scope, standing });

test("mobilize clears when the seed coalition closes over the target mandate without capture", () => {
  const relations = [
    relation("power", "union", "boss", "strike"),
    relation("duty", "union", "members", "strike"),
    relation("power", "shop", "boss", "strike"),
    relation("duty", "shop", "members", "strike"),
  ];

  const r = mobilize({
    name: "strike",
    relations,
    seed: ["union", "shop"],
    targetMandate: ["power:strike", "duty:strike"],
    minimumCoalitionSize: 2,
  });

  assert.equal(r.kind, "socializing.mobilization");
  assert.deepEqual(r.coalition.agents, ["shop", "union"]);
  assert.deepEqual(r.missingMandate, []);
  assert.equal(r.mobilized, true);
  assert.equal(r.captured, false);
  assert.equal(r.currency.issued, 0);
  assert.equal(r.currency.noArbitrage, true);
});

test("mobilize prices mandate gaps, unstable relations, and duty without power capture", () => {
  const relations = [
    relation("duty", "tenant", "landlord", "rent-strike", "stable"),
    relation("power", "landlord", "tenant", "rent-strike"),
  ];

  const r = mobilize({
    name: "rent-strike",
    relations,
    seed: ["tenant"],
    targetMandate: ["power:rent-strike", "duty:rent-strike"],
    minimumCoalitionSize: 2,
  });

  assert.equal(r.mobilized, false);
  assert.equal(r.captured, true);
  assert.deepEqual(r.missingMandate, ["power:rent-strike"]);
  assert.equal(r.scaleDeficit, 1);
  assert.equal(r.contestedRelations, 1);
  assert.equal(r.coalitionTraps.length, 1);
  assert.equal(r.currency.issued, 4);
  assert.equal(r.currency.cells.some((cell) => cell.id.endsWith(":savior-slave-capture") && cell.issued === 1), true);
  assert.equal(r.theory.socialFactory.includes("coordination labor"), true);
});
