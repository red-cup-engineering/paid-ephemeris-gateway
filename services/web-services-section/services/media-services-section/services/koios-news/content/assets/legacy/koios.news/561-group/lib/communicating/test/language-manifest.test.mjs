import { test } from "node:test";
import assert from "node:assert/strict";

import {
  admitCommunication,
  compiledBundleFromLanguageManifest,
  languageManifestCarrier,
  languageManifestReceipts,
  languageManifestRwIlRows,
  loadLanguageManifest,
  parseCommunication,
} from "../dist/index.mjs";

const manifest = {
  kind: "communicating.language-manifest",
  bundle: {
    meta: {
      name: "Manifest Test",
      code: "x-mft",
      script: "Latin",
      direction: "ltr",
    },
    lexicon: {
      determiners: ["ga", "do"],
      prepositions: ["lo"],
      pronouns: ["mi", "tu"],
      conjunctions: ["en"],
      auxiliaries: [],
      copula: ["is"],
    },
    morphology: {
      suffixRules: [
        { pattern: "^ran$", tag: "verb" },
      ],
      rootPatternRules: [
        { pattern: "^kelu$", tag: "noun", root: "k-l", template: "CeCu", features: ["semantic:relation"] },
      ],
      numberSuffixPattern: "s$",
      verbFormRules: [],
      numberWords: [],
    },
    reference: {
      pronouns: {
        mi: { person: 1, number: "sg" },
        tu: { person: 2, number: "sg" },
      },
      nameGender: {},
    },
    wordOrder: "topic-comment",
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "topic-comment",
      alignment: "semantic-particle",
      headDirectionality: {
        determiner: "left",
        adjective: "right",
        subject: "left",
        object: "right",
        adposition: "left",
      },
      roleStrategies: [
        { relation: "nsubj", by: "particle", marker: "ga", markerPosition: "after" },
        { relation: "dobj", by: "particle", marker: "do", markerPosition: "before" },
      ],
      morphology: {
        type: "isolating",
        caseMarking: "particle",
        agreement: "none",
      },
      segmentation: {
        sentenceBoundary: "punctuation",
        wordBoundary: "space",
      },
    },
    attachment: {
      determiner: "left",
      adjective: "right",
      subject: "left",
      object: "right",
    },
    segmentation: {
      sentenceTerminatorPattern: "[.!?]",
      abbreviations: [],
    },
  },
  rwil: [
    { entity: "language:x-mft:particle:ga", attribute: "communicating.role", value: "nsubj" },
  ],
  lambek: {
    categories: ["FOUR", "TOPIC"],
    judgments: [
      { expression: "mi ga ran do kelu", type: "S" },
    ],
  },
  sofic: {
    alphabet: ["C", "V"],
    graph: [
      [false, true],
      [true, true],
    ],
    factor: [0, 1],
    sample: [0, 1, 0, 1],
    note: "alternating onset/nucleus sample",
  },
  chu: {
    pts: ["ta", "na", "sha", "mu"],
    sts: ["truth", "falsity"],
    matrix: [
      { pt: "ta", st: "truth", charge: "active" },
      { pt: "na", st: "falsity", charge: "potential" },
      { pt: "sha", st: "truth", charge: "absurd" },
      { pt: "mu", st: "falsity", charge: "stable" },
    ],
  },
  discourseCover: {
    entities: 3,
    cells: 2,
    components: 1,
    note: "single tree-shaped discourse cover",
  },
};

test("language manifests admit bundle data and compile into parsable fibers", () => {
  assert.ok(languageManifestCarrier.validate(manifest));
  const admitted = loadLanguageManifest(manifest);
  const compiled = compiledBundleFromLanguageManifest(admitted);
  const parsed = parseCommunication(admitCommunication("mi ga ran do kelu."), compiled);

  assert.equal(compiled.meta.code, "x-mft");
  assert.equal(parsed.arcs.find((arc) => arc.rel === "nsubj")?.depText, "mi");
  assert.equal(parsed.arcs.find((arc) => arc.rel === "dobj")?.depText, "kelu");
  assert.ok(parsed.words.find((word) => word.text === "kelu")?.feats.includes("root:k-l"));
});

test("language manifests project RWIL-shaped rows and finite math receipts", () => {
  const admitted = loadLanguageManifest(manifest);
  const rows = languageManifestRwIlRows(admitted);
  const receipts = languageManifestReceipts(admitted);

  assert.equal(rows.find((row) => row.attribute === "communicating.wordOrder")?.value, "topic-comment");
  assert.equal(rows.find((row) => row.entity === "language:x-mft:particle:ga")?.witness, "manifest.rwil.0");
  assert.equal(receipts.kind, "communicating.language-manifest.receipts");
  assert.equal(receipts.language, "x-mft");
  assert.equal(receipts.rwil.length, rows.length);
  assert.equal(receipts.chu.dualInvolution, true);
  assert.equal(receipts.discourseCover.cover.components, 1);
  assert.equal(receipts.sofic.sample.length, 4);
});
