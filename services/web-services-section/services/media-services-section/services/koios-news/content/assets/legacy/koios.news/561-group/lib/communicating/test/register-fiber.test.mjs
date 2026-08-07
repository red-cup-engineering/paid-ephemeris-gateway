import { test } from "node:test";
import assert from "node:assert/strict";

import {
  compiledBundleFromLanguageManifest,
  languageManifestRwIlRows,
  languageRegisterFiber,
  languageRegisterFiberCarrier,
  loadLanguageManifest,
  registerFiberDegradationReceipt,
  translationFactorReceipt,
} from "../dist/index.mjs";

const baseBundle = (code, registerFiber = {}) => ({
  meta: { name: code, code, script: "Latin", direction: "ltr" },
  lexicon: {
    determiners: [],
    prepositions: [],
    pronouns: [],
    conjunctions: [],
    auxiliaries: [],
    copula: [],
  },
  morphology: {
    suffixRules: [],
    numberSuffixPattern: "",
    verbFormRules: [],
    numberWords: [],
  },
  reference: { pronouns: {}, nameGender: {} },
  wordOrder: "SVO",
  registerFiber,
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

const sourceManifest = () => loadLanguageManifest({
  kind: "communicating.language-manifest",
  bundle: baseBundle("src", {
    register: ["formal"],
    style: ["plain"],
    evidentiality: ["witnessed"],
    politeness: ["deferential"],
    genre: ["letter"],
  }),
});

const targetManifest = () => loadLanguageManifest({
  kind: "communicating.language-manifest",
  bundle: baseBundle("dst", {
    register: [],
    style: ["plain"],
    evidentiality: [],
    politeness: [],
    genre: ["letter"],
  }),
});

test("language bundles compile register/style/evidentiality/politeness/genre as a carrier", () => {
  const compiled = compiledBundleFromLanguageManifest(sourceManifest());

  assert.equal(compiled.registerFiber.kind, "communicating.language-register-fiber");
  assert.equal(compiled.registerFiber.language, "src");
  assert.deepEqual(compiled.registerFiber.register, ["formal"]);
  assert.deepEqual(compiled.registerFiber.evidentiality, ["witnessed"]);
  assert.ok(languageRegisterFiberCarrier.validate(compiled.registerFiber));
});

test("language manifests expose register fiber axes as RWIL evidence", () => {
  const rows = languageManifestRwIlRows(sourceManifest());

  assert.ok(rows.some((row) => row.attribute === "communicating.register" && row.witness === "manifest.bundle.registerFiber.register"));
  assert.ok(rows.some((row) => row.attribute === "communicating.politeness" && row.witness === "manifest.bundle.registerFiber.politeness"));
  assert.ok(rows.some((row) => row.attribute === "communicating.genre" && row.witness === "manifest.bundle.registerFiber.genre"));
});

test("register fiber degradation preserves available axes and settles missing axes downward", () => {
  const source = languageRegisterFiber("src", sourceManifest().bundle.registerFiber);
  const target = languageRegisterFiber("dst", targetManifest().bundle.registerFiber);
  const receipt = registerFiberDegradationReceipt(source, target, {
    register: "formal",
    style: "plain",
    evidentiality: "witnessed",
    politeness: "deferential",
    genre: "letter",
  });

  const register = receipt.axes.find((axis) => axis.axis === "register");
  const style = receipt.axes.find((axis) => axis.axis === "style");
  const genre = receipt.axes.find((axis) => axis.axis === "genre");

  assert.equal(receipt.kind, "communicating.register-fiber.degradation");
  assert.equal(receipt.settlesDown, true);
  assert.equal(receipt.fabricatesAssertivity, false);
  assert.equal(register?.lost, true);
  assert.equal(register?.targetValue, null);
  assert.equal(style?.lost, false);
  assert.equal(style?.targetValue, "plain");
  assert.equal(genre?.targetValue, "letter");
});

test("translation degradation receipt carries per-axis register fiber loss", () => {
  const receipt = translationFactorReceipt(sourceManifest(), targetManifest(), {
    registerSelection: {
      register: "formal",
      style: "plain",
      evidentiality: "witnessed",
      politeness: "deferential",
      genre: "letter",
    },
  });

  assert.equal(receipt.degradation.fiber.kind, "communicating.register-fiber.degradation");
  assert.equal(receipt.degradation.fiber.settlesDown, true);
  assert.equal(receipt.degradation.fiber.fabricatesAssertivity, false);
  assert.equal(receipt.degradation.fiber.axes.find((axis) => axis.axis === "register")?.lost, true);
  assert.equal(receipt.degradation.fiber.axes.find((axis) => axis.axis === "style")?.targetValue, "plain");
  assert.equal(receipt.degradation.fiber.axes.find((axis) => axis.axis === "politeness")?.targetValue, null);
});
