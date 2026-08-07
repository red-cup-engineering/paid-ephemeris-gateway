import { test } from "node:test";
import assert from "node:assert/strict";

import {
  admitCommunication,
  discourseStateCarrier,
  discourseStateOfForest,
  load,
  parseCommunicationForest,
  projectReading,
  read,
} from "../dist/index.mjs";

const baseMeta = {
  script: "Latin",
  direction: "ltr",
};

function bundle() {
  return load({
    meta: { ...baseMeta, name: "Discourse Test", code: "discourse-test" },
    lexicon: {
      determiners: ["the"],
      prepositions: ["with"],
      pronouns: ["she"],
      conjunctions: [],
      auxiliaries: [],
      copula: [],
    },
    morphology: {
      suffixRules: [{ pattern: "^(saw|sleeps)$", tag: "verb" }],
      numberSuffixPattern: "",
      verbFormRules: [],
      numberWords: [],
    },
    reference: {
      pronouns: { she: { person: 3, number: "sg", gender: "f" } },
      nameGender: {},
    },
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
  });
}

test("discourse state carries dynamic reference, topics, commitments, and presupposition repair", () => {
  const compiled = bundle();
  const forest = parseCommunicationForest(admitCommunication("alice sleeps. she saw the dog."), compiled);
  const state = discourseStateOfForest(forest);

  assert.equal(state.kind, "communicating.discourse-state");
  assert.ok(discourseStateCarrier.validate(state));
  assert.ok(state.entities.some((entity) => entity.label === "alice" && entity.mentions.length === 1));
  assert.ok(state.entities.some((entity) => entity.label === "dog"));
  assert.ok(state.topics.some((topic) => topic.label === "alice"));
  assert.ok(state.topics.some((topic) => topic.label === "dog"));

  const she = state.references.find((reference) => reference.anaphor.toLowerCase() === "she");
  assert.equal(she?.status, "resolved");
  assert.equal(she?.antecedent, "alice");

  assert.ok(state.presuppositions.some((item) => item.trigger === "the dog" && item.presupposed === "exists(dog)"));
  assert.ok(state.repairs.some((item) => item.kind === "presupposition-accommodation" && item.target === "the dog"));
  assert.equal(state.commitments.length, 2);
  assert.ok(state.commitments.every((item) => item.basis === "assertion"));
});

test("ambiguous forests produce parse and grammar repair obligations", () => {
  const compiled = bundle();
  const forest = parseCommunicationForest(admitCommunication("alice saw dog with telescope."), compiled);
  const state = discourseStateOfForest(forest);

  assert.equal(state.charge, "stable");
  assert.ok(state.commitments.some((item) => item.basis === "ambiguous" && item.charge === "stable"));
  assert.ok(state.repairs.some((item) => item.kind === "parse-obstruction" && item.target === "pp-attachment"));
  assert.ok(state.repairs.some((item) => item.kind === "grammar-obstruction"));
});

test("holographic readings expose the discourse-state summary", () => {
  const compiled = bundle();
  const projected = projectReading(read("alice sleeps. she sleeps.", compiled));

  assert.equal(projected.discourse.entities, 1);
  assert.equal(projected.discourse.references, 1);
  assert.equal(projected.discourse.commitments, 2);
});
