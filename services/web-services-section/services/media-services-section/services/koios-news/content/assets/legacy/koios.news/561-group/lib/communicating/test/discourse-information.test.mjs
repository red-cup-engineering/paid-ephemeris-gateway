import { test } from "node:test";
import assert from "node:assert/strict";

import {
  admitCommunication,
  discourseInformationCarrier,
  discourseInformationOfState,
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
    meta: { ...baseMeta, name: "Discourse Information Test", code: "discourse-information-test" },
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

function informationFor(text) {
  const compiled = bundle();
  const forest = parseCommunicationForest(admitCommunication(text), compiled);
  return discourseInformationOfState(discourseStateOfForest(forest));
}

test("discourse information reads entropy, surprisal, redundancy, cohesion, and channel data", () => {
  const information = informationFor("alice sleeps. she saw the dog.");

  assert.equal(information.kind, "communicating.discourse-information");
  assert.ok(discourseInformationCarrier.validate(information));
  assert.ok(information.topicEntropy > 0);
  assert.equal(information.meanSurprisal, information.topicEntropy);
  assert.ok(information.redundancy >= 0 && information.redundancy <= 1);
  assert.ok(information.semanticCohesion >= 0 && information.semanticCohesion < 1);
  assert.ok(information.surprisals.some((item) => item.outcome === "alice" && item.count === 1));
  assert.ok(information.surprisals.some((item) => item.outcome === "dog" && item.count === 1));
  assert.equal(information.channel.kind, "communicating.discourse-information.channel");
  assert.ok(information.channel.samples > 0);
  assert.ok(information.channel.mutualInformation >= 0);
});

test("repair-heavy discourse lowers semantic cohesion and carries repair entropy", () => {
  const clean = informationFor("alice sleeps. bob sleeps.");
  const obstructed = informationFor("alice saw dog with telescope.");

  assert.equal(clean.repairEntropy, 0);
  assert.ok(obstructed.repairEntropy > 0);
  assert.ok(obstructed.semanticCohesion < clean.semanticCohesion);
});

test("holographic readings expose the discourse-information summary", () => {
  const compiled = bundle();
  const projected = projectReading(read("alice sleeps. she sleeps.", compiled));

  assert.ok(projected.discourseInformation.topicEntropy >= 0);
  assert.ok(projected.discourseInformation.channel.samples > 0);
  assert.ok(projected.discourseInformation.semanticCohesion <= 1);
});
