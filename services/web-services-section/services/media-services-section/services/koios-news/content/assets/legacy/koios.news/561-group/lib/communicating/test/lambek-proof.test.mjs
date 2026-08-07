import { test } from "node:test";
import assert from "node:assert/strict";

import {
  admitCommunication,
  lambekForestProofCarrier,
  lambekProofOfForest,
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
    meta: { ...baseMeta, name: "Lambek Test", code: "lambek-test" },
    lexicon: {
      determiners: [],
      prepositions: ["with"],
      pronouns: [],
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
    reference: { pronouns: {}, nameGender: {} },
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

test("Lambek proof carrier reads a parse forest as a grammatical sequent", () => {
  const compiled = bundle();
  const forest = parseCommunicationForest(admitCommunication("alice saw dog."), compiled);
  const proof = lambekProofOfForest(forest);

  assert.equal(proof.kind, "communicating.lambek.forest-proof");
  assert.equal(proof.proven, true);
  assert.equal(proof.charge, "potential");
  assert.equal(proof.laws.kind, "lambek.laws:witness");
  assert.ok(lambekForestProofCarrier.validate(proof));

  const reading = proof.proofs[0];
  assert.deepEqual(reading.sequent.succedent, "S");
  assert.ok(reading.hypotheses.some((hypothesis) => hypothesis.text === "saw" && hypothesis.category === "(NP\\S)/NP"));
  assert.ok(reading.steps.some((step) => step.rule === "right-residual-application" && step.evidence === "dobj"));
  assert.ok(reading.steps.some((step) => step.rule === "left-residual-application" && step.evidence === "nsubj"));
  assert.ok(reading.steps.some((step) => step.rule === "sentence-introduction"));
});

test("ambiguous parse forests remain charged unproved Lambek readings", () => {
  const compiled = bundle();
  const forest = parseCommunicationForest(admitCommunication("alice saw dog with telescope."), compiled);
  const proof = lambekProofOfForest(forest);

  assert.equal(forest.charge, "stable");
  assert.equal(proof.proven, false);
  assert.equal(proof.charge, "stable");
  assert.ok(proof.proofs[0].obstructions.some((obstruction) => obstruction.includes("conflict:pp-attachment")));
  assert.ok(proof.proofs[0].steps.some((step) => step.rule === "obstruction" && step.charge === "stable"));
});

test("holographic readings expose the Lambek proof summary", () => {
  const compiled = bundle();
  const projected = projectReading(read("alice saw dog.", compiled));

  assert.equal(projected.lambek.proven, true);
  assert.equal(projected.lambek.charge, "potential");
  assert.equal(projected.lambek.proofs, 1);
});
