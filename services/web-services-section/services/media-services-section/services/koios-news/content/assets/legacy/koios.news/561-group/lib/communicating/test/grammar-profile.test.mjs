import { test } from "node:test";
import assert from "node:assert/strict";

import {
  admitCommunication,
  languageGrammarProfileCarrier,
  load,
  morphotacticPatternRuleCarrier,
  parseCommunication,
} from "../dist/index.mjs";

const baseMeta = {
  script: "Latin",
  direction: "ltr",
};

function bundle(overrides) {
  return load({
    meta: { ...baseMeta, name: "Test", code: "x-test", ...(overrides.meta ?? {}) },
    lexicon: {
      determiners: [],
      prepositions: [],
      pronouns: [],
      conjunctions: [],
      auxiliaries: [],
      copula: [],
      ...(overrides.lexicon ?? {}),
    },
    morphology: {
      suffixRules: [],
      numberSuffixPattern: "",
      verbFormRules: [],
      numberWords: [],
      ...(overrides.morphology ?? {}),
    },
    reference: { pronouns: {}, nameGender: {}, ...(overrides.reference ?? {}) },
    wordOrder: overrides.wordOrder ?? "SVO",
    ...(overrides.roleBy === undefined ? {} : { roleBy: overrides.roleBy }),
    grammar: overrides.grammar,
    attachment: {
      determiner: "left",
      adjective: "left",
      subject: "left",
      object: "right",
      ...(overrides.attachment ?? {}),
    },
    segmentation: {
      sentenceTerminatorPattern: "[.!?]",
      abbreviations: [],
      ...(overrides.segmentation ?? {}),
    },
  });
}

function parseText(text, compiled) {
  return parseCommunication(admitCommunication(text), compiled);
}

function arc(result, rel) {
  return result.arcs.find((candidate) => candidate.rel === rel);
}

function arcByText(result, rel, headText, depText) {
  return result.arcs.find((candidate) =>
    candidate.rel === rel && candidate.headText === headText && candidate.depText === depText);
}

test("language grammar profiles are schema-literal carriers", () => {
  const profile = {
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
  };

  assert.ok(languageGrammarProfileCarrier.validate(profile));
  assert.equal(languageGrammarProfileCarrier.assert(profile).kind, "communicating.language-grammar-profile");
});

test("morphotactic pattern rules admit root-template morphology as bundle evidence", () => {
  const rule = {
    pattern: "^كتب$",
    tag: "verb",
    root: "k-t-b",
    template: "CaCaCa",
    features: ["aspect:perfective"],
  };
  assert.ok(morphotacticPatternRuleCarrier.validate(rule));

  const arabicLike = bundle({
    meta: { name: "Arabic-like", code: "ar-x", script: "Arabic", direction: "rtl" },
    morphology: {
      rootPatternRules: [rule],
    },
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "VSO",
      alignment: "nominative-accusative",
      headDirectionality: {
        determiner: "right",
        adjective: "right",
        subject: "right",
        object: "right",
        adposition: "left",
      },
      roleStrategies: [
        { relation: "nsubj", by: "position", direction: "right", distance: "nearest" },
        { relation: "dobj", by: "position", direction: "right", distance: "farthest" },
      ],
      morphology: {
        type: "mixed",
        caseMarking: "mixed",
        agreement: "rich",
      },
      segmentation: {
        sentenceBoundary: "punctuation",
        wordBoundary: "space",
      },
    },
  });
  const result = parseText("كتب الطالب الدرس.", arabicLike);
  const verb = result.words.find((word) => word.text === "كتب");

  assert.ok(verb?.tags.includes("verb"));
  assert.ok(verb?.feats.includes("root:k-t-b"));
  assert.ok(verb?.feats.includes("template:CaCaCa"));
  assert.ok(verb?.feats.includes("aspect:perfective"));
  assert.equal(arc(result, "nsubj")?.depText, "الطالب");
  assert.equal(arc(result, "dobj")?.depText, "الدرس");
});

test("case-driven profiles read grammatical roles from declared feature rules", () => {
  const latin = bundle({
    wordOrder: "free",
    roleBy: "case",
    morphology: {
      suffixRules: [
        { pattern: ".{2,}a$", tag: "noun" },
        { pattern: ".{2,}um$", tag: "noun" },
        { pattern: ".{2,}it$", tag: "verb" },
      ],
      featureRules: [
        { pattern: ".{2,}a$", tag: "case:nom" },
        { pattern: ".{2,}um$", tag: "case:acc" },
      ],
    },
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "free",
      alignment: "nominative-accusative",
      headDirectionality: {
        determiner: "left",
        adjective: "mixed",
        subject: "mixed",
        object: "mixed",
        adposition: "left",
      },
      roleStrategies: [
        { relation: "nsubj", by: "case", caseFeature: "case:nom" },
        { relation: "dobj", by: "case", caseFeature: "case:acc" },
      ],
      morphology: {
        type: "fusional",
        caseMarking: "suffix",
        agreement: "rich",
      },
      segmentation: {
        sentenceBoundary: "punctuation",
        wordBoundary: "space",
      },
    },
  });
  const result = parseText("puella puerum vidit.", latin);

  assert.equal(arc(result, "nsubj")?.depText, "puella");
  assert.equal(arc(result, "dobj")?.depText, "puerum");
});

test("particle-driven profiles read roles from overt markers", () => {
  const toki = bundle({
    lexicon: { determiners: ["li", "e"] },
    morphology: {
      suffixRules: [{ pattern: "^moku$", tag: "verb" }],
    },
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
        { relation: "nsubj", by: "particle", marker: "li", markerPosition: "after" },
        { relation: "dobj", by: "particle", marker: "e", markerPosition: "before" },
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
  });
  const result = parseText("jan li moku e kili.", toki);

  assert.equal(arc(result, "nsubj")?.depText, "jan");
  assert.equal(arc(result, "dobj")?.depText, "kili");
});

test("particle-driven profiles read oblique provenance, locus, and kind markers", () => {
  const rel = bundle({
    lexicon: {
      determiners: ["ga", "do"],
      prepositions: ["pa", "lo", "ke"],
      pronouns: ["mi"],
    },
    morphology: {
      suffixRules: [{ pattern: "^mor$", tag: "verb" }],
    },
    reference: {
      pronouns: { mi: { person: 1, number: "sg" } },
      nameGender: {},
    },
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "topic-comment",
      alignment: "semantic-particle",
      headDirectionality: {
        determiner: "left",
        adjective: "right",
        subject: "left",
        object: "right",
        adposition: "mixed",
      },
      roleStrategies: [
        { relation: "nsubj", by: "particle", marker: "ga", markerPosition: "after" },
        { relation: "dobj", by: "particle", marker: "do", markerPosition: "before" },
        { relation: "obl", by: "particle", marker: "pa", markerPosition: "after" },
        { relation: "obl", by: "particle", marker: "lo", markerPosition: "before" },
        { relation: "obl", by: "particle", marker: "ke", markerPosition: "before" },
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
  });
  const result = parseText("sava pa mi ga mor do tilo lo hena ke vara.", rel);

  assert.ok(arcByText(result, "obl", "mor", "sava"));
  assert.ok(arcByText(result, "case", "sava", "pa"));
  assert.ok(arcByText(result, "obl", "mor", "hena"));
  assert.ok(arcByText(result, "case", "hena", "lo"));
  assert.ok(arcByText(result, "obl", "mor", "vara"));
  assert.ok(arcByText(result, "case", "vara", "ke"));
});

test("particle-driven profiles read clause-level discourse markers", () => {
  const rel = bundle({
    morphology: {
      suffixRules: [
        { pattern: "^ku$", tag: "part" },
        { pattern: "^kan$", tag: "verb" },
      ],
      featureRules: [
        { pattern: "^ku$", tag: "dialogue:question" },
      ],
    },
    lexicon: {
      determiners: ["ga", "do"],
      pronouns: ["tu"],
    },
    reference: {
      pronouns: { tu: { person: 2, number: "sg" } },
      nameGender: {},
    },
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
        { relation: "discourse", by: "particle", marker: "ku", markerPosition: "before" },
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
  });
  const result = parseText("ku tu ga kan do kano?", rel);
  const marker = result.words.find((word) => word.text === "ku");

  assert.ok(arcByText(result, "discourse", "kan", "ku"));
  assert.ok(marker?.feats.includes("dialogue:question"));
});

test("particle-driven profiles read information-structure markers", () => {
  const rel = bundle({
    morphology: {
      suffixRules: [
        { pattern: "^ran$", tag: "verb" },
        { pattern: "^(ma|fi|ko|ri)$", tag: "part" },
      ],
      featureRules: [
        { pattern: "^ma$", tag: "info:topic" },
        { pattern: "^fi$", tag: "info:focus" },
        { pattern: "^ko$", tag: "info:contrast" },
        { pattern: "^ri$", tag: "info:repair" },
      ],
    },
    lexicon: {
      pronouns: ["mi", "tu"],
    },
    reference: {
      pronouns: {
        mi: { person: 1, number: "sg" },
        tu: { person: 2, number: "sg" },
      },
      nameGender: {},
    },
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "topic-comment",
      alignment: "topic-comment",
      headDirectionality: {
        determiner: "left",
        adjective: "right",
        subject: "left",
        object: "right",
        adposition: "left",
      },
      roleStrategies: [
        { relation: "nsubj", by: "position", direction: "left", distance: "nearest" },
        { relation: "dobj", by: "position", direction: "right", distance: "nearest" },
        { relation: "topic", by: "particle", marker: "ma", markerPosition: "after" },
        { relation: "focus", by: "particle", marker: "fi", markerPosition: "before" },
        { relation: "contrast", by: "particle", marker: "ko", markerPosition: "before" },
        { relation: "repair", by: "particle", marker: "ri", markerPosition: "before" },
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
  });
  const topic = parseText("mi ma ran kelu.", rel);
  const focus = parseText("mi ran fi kelu.", rel);
  const contrast = parseText("ko tu ran kelu.", rel);
  const repair = parseText("mi ran ri sava.", rel);

  assert.ok(arcByText(topic, "topic", "ran", "mi"));
  assert.ok(arcByText(topic, "mark", "mi", "ma"));
  assert.ok(topic.words.find((word) => word.text === "ma")?.feats.includes("info:topic"));

  assert.ok(arcByText(focus, "focus", "ran", "kelu"));
  assert.ok(arcByText(focus, "mark", "kelu", "fi"));
  assert.ok(focus.words.find((word) => word.text === "fi")?.feats.includes("info:focus"));

  assert.ok(arcByText(contrast, "contrast", "ran", "tu"));
  assert.ok(arcByText(contrast, "mark", "tu", "ko"));

  assert.ok(arcByText(repair, "repair", "ran", "sava"));
  assert.ok(arcByText(repair, "mark", "sava", "ri"));
});

test("SOV profiles distinguish farthest subject from nearest object", () => {
  const sov = bundle({
    wordOrder: "SOV",
    morphology: {
      suffixRules: [{ pattern: "^eats$", tag: "verb" }],
    },
    attachment: {
      subject: "left",
      object: "left",
    },
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "SOV",
      alignment: "active-stative",
      headDirectionality: {
        determiner: "right",
        adjective: "right",
        subject: "left",
        object: "left",
        adposition: "right",
      },
      roleStrategies: [
        { relation: "nsubj", by: "position", direction: "left", distance: "farthest" },
        { relation: "dobj", by: "position", direction: "left", distance: "nearest" },
      ],
      morphology: {
        type: "polysynthetic",
        caseMarking: "none",
        agreement: "pronominal",
      },
      segmentation: {
        sentenceBoundary: "punctuation",
        wordBoundary: "space",
      },
    },
  });
  const result = parseText("alice apple eats.", sov);

  assert.equal(arc(result, "nsubj")?.depText, "alice");
  assert.equal(arc(result, "dobj")?.depText, "apple");
});
