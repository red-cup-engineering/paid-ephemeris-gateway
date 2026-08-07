import { test } from "node:test";
import assert from "node:assert/strict";

import {
  admitCommunication,
  codecActions,
  load,
  parseCommunicationForest,
  parseForestCarrier,
} from "../dist/index.mjs";

const baseMeta = {
  script: "Latin",
  direction: "ltr",
};

function bundle(overrides = {}) {
  return load({
    meta: { ...baseMeta, name: "Forest Test", code: "forest-test", ...(overrides.meta ?? {}) },
    lexicon: {
      determiners: [],
      prepositions: ["with"],
      pronouns: [],
      conjunctions: [],
      auxiliaries: [],
      copula: [],
      ...(overrides.lexicon ?? {}),
    },
    morphology: {
      suffixRules: [
        { pattern: "^(saw|sleeps)$", tag: "verb" },
        ...(overrides.morphology?.suffixRules ?? []),
      ],
      numberSuffixPattern: "",
      verbFormRules: [],
      numberWords: [],
      ...(overrides.morphology ?? {}),
    },
    reference: { pronouns: {}, nameGender: {}, ...(overrides.reference ?? {}) },
    wordOrder: "SVO",
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "SVO",
      alignment: "nominative-accusative",
      headDirectionality: {
        determiner: "left",
        adjective: "left",
        subject: "left",
        object: "right",
        adposition: "left",
      },
      roleStrategies: [
        { relation: "nsubj", by: "position", direction: "left", distance: "nearest" },
        { relation: "dobj", by: "position", direction: "right", distance: "nearest" },
      ],
      morphology: {
        type: "mixed",
        caseMarking: "none",
        agreement: "weak",
      },
      segmentation: {
        sentenceBoundary: "punctuation",
        wordBoundary: "space",
      },
    },
    attachment: {
      determiner: "left",
      adjective: "left",
      subject: "left",
      object: "right",
    },
    segmentation: {
      sentenceTerminatorPattern: "[.!?]",
      abbreviations: [],
    },
    ...(overrides.roleBy === undefined ? {} : { roleBy: overrides.roleBy }),
  });
}

test("surface language settles into a schema-backed charged parse forest", () => {
  const compiled = bundle();
  const forest = parseCommunicationForest(
    admitCommunication("alice saw dog with telescope. bob sleeps."),
    compiled,
  );

  assert.equal(forest.kind, "communicating.parse-forest");
  assert.equal(forest.readings.length, 2);
  assert.equal(forest.charge, "stable");
  assert.equal(forest.glued, false);
  assert.equal(forest.complete, true);
  assert.ok(forest.ambiguity > 0);
  assert.ok(forest.obstructions.some((obstruction) => obstruction.kind === "conflict"));
  assert.ok(parseForestCarrier.validate(forest));

  const first = forest.readings[0];
  assert.equal(first.kind, "communicating.parse-forest.reading");
  assert.equal(first.charge, "stable");
  assert.equal(first.glued, false);
  assert.ok(first.parse.arcs.some((arc) => arc.rel === "prep"));
});

test("settle-communication codec action returns the forest carrier", () => {
  const compiled = bundle();
  const settle = codecActions(compiled).find((action) => action.verb === "settle-communication");
  assert.ok(settle);

  const forest = settle.run("alice saw dog with telescope.", {});
  assert.equal(forest.kind, "communicating.parse-forest");
  assert.equal(forest.readings.length, 1);
  assert.equal(forest.charge, "stable");
  assert.ok(parseForestCarrier.validate(forest));
});
