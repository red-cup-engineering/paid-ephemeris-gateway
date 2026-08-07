// Tests for institutionalize and recognition bridges: sociological readings that
// emit coordination-currency receipts.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  centerCharges,
  institutionalize,
  polycentricCoherence,
  recognition,
} from "../dist/index.mjs";

const relation = (kind, active, passive, scope, standing = "potential") =>
  Object.freeze({ kind, active, passive, scope, standing });

const rule = (ruleType, level = "operational") => Object.freeze({ ruleType, level });

function commons({ healthy = true } = {}) {
  const relations = [
    relation("duty", "monitor", "members", "monitor water"),
    relation("power", "assembly", "members", "revise rules"),
  ];
  return Object.freeze({
    rules: healthy
      ? [
          rule("boundary"),
          rule("payoff"),
          rule("scope"),
          rule("choice", "collective-choice"),
          rule("information"),
          rule("position"),
          rule("aggregation"),
        ]
      : [rule("position")],
    relations,
    sanctionLadder: healthy ? ["notice", "repair", "suspension"] : ["ban"],
    polycentricity: healthy
      ? polycentricCoherence(centerCharges(["potential", "potential", "potential"]))
      : polycentricCoherence(centerCharges(["potential"])),
    conflictResolution: healthy,
    externallyRecognized: healthy,
  });
}

test("institutionalize reads a durable living commons with no issued coordination currency", () => {
  const r = institutionalize({
    name: "water-commons",
    institution: commons({ healthy: true }),
    actLevels: ["operational", "operational", "collective-choice"],
    regime: "transfinite-bounded",
    exitOpen: true,
  });

  assert.equal(r.kind, "socializing.institutionalization");
  assert.equal(r.diagnostic.enduring, true);
  assert.equal(r.racket.racket, false);
  assert.equal(r.vitality.verdict, "alive");
  assert.equal(r.institutionalized, true);
  assert.equal(r.enduring, true);
  assert.equal(r.currency.issued, 0);
  assert.equal(r.currency.noArbitrage, true);
});

test("institutionalize prices missing principles, racket self-reference, and calcification", () => {
  const r = institutionalize({
    name: "closed-apparatus",
    institution: commons({ healthy: false }),
    actLevels: ["collective-choice", "constitutional", "constitutional"],
    regime: "strict",
    concentration: 1,
    exitOpen: false,
  });

  assert.equal(r.diagnostic.enduring, false);
  assert.equal(r.racket.racket, true);
  assert.equal(r.vitality.verdict, "calcified");
  assert.equal(r.institutionalized, false);
  assert.equal(r.enduring, false);
  assert.equal(r.currency.issued > 0, true);
  assert.equal(r.currency.noArbitrage, false);
  assert.equal(r.currency.cells.some((cell) => cell.id.endsWith(":racket") && cell.issued === 1), true);
  assert.equal(r.currency.cells.some((cell) => cell.id.endsWith(":vitality") && cell.issued === 1), true);
});

test("recognition distinguishes symbolic violence from contested recognition and prices the deficit", () => {
  const relations = [
    relation("duty", "worker", "boss", "schedule"),
    relation("power", "boss", "worker", "schedule"),
  ];
  const r = recognition({
    relations,
    agent: "worker",
    scope: "schedule",
    holders: [
      { agent: "boss", capital: { economic: 3, cultural: 2, social: 2, symbolic: 9 } },
      { agent: "worker", capital: { economic: 1, cultural: 1, social: 1, symbolic: 1 } },
    ],
    commonKnowledgeValues: ["potential", "potential"],
  });

  assert.equal(r.symbolicViolence.symbolicViolence, true);
  assert.equal(r.misrecognized, true);
  assert.equal(r.recognized, false);
  assert.equal(r.symbolicTopHolder, "boss");
  assert.equal(r.currency.issued, 2, "symbolic violence plus symbolic-capital monopoly");
});

test("recognition clears when domination is contested into common knowledge", () => {
  const relations = [
    relation("duty", "worker", "boss", "schedule"),
    relation("power", "boss", "worker", "schedule"),
    relation("claim", "worker", "boss", "schedule", "active"),
  ];
  const r = recognition({
    relations,
    agent: "worker",
    scope: "schedule",
    holders: [
      { agent: "boss", capital: { economic: 2, cultural: 2, social: 2, symbolic: 3 } },
      { agent: "worker", capital: { economic: 1, cultural: 1, social: 1, symbolic: 3 } },
    ],
    commonKnowledgeValues: ["potential", "potential"],
  });

  assert.equal(r.symbolicViolence.symbolicViolence, false);
  assert.equal(r.misrecognized, false);
  assert.equal(r.recognized, true);
  assert.equal(r.currency.issued, 0);
});
