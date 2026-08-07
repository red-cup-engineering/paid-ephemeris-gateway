import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { canonical, charge, chargeValue, chargeValueNames, mark, utterance, valueOf } from "@emsenn/relating";
import {
  cloudEventFromUtterance,
  DIDCOMM_PRIVATE_VISIBILITY,
  didcommVisibility,
  loadLanguageManifest,
  membraneMeme,
  modalizeAction,
  negateAction,
  openDIDCommUtterance,
  sealDIDCommUtterance,
  translationFactorChainReceipt,
  translateAction,
  translationFactorReceipt,
  utteranceFromCloudEvent,
} from "../dist/index.mjs";

const loadManifest = (path) => loadLanguageManifest(JSON.parse(readFileSync(
  new URL(path, import.meta.url),
  "utf8",
)));

const english = loadManifest("../../communicating-in-english/data/manifest.json");
const latin = loadManifest("../../communicating-in-latin/data/manifest.json");
const lakota = loadManifest("../../communicating-in-lakota/data/manifest.json");
const tokiPona = loadManifest("../../communicating-in-tokipona/data/manifest.json");
const languages = Object.freeze([english, latin, lakota, tokiPona]);

const memeWithCharge = (name) => Object.freeze({
  kind: "predication.fiber.meme",
  cell: {
    subject: { kind: "utterance.token", hand: "left", mark: mark("socrates") },
    predicate: {
      kind: "predication.predicate",
      claim: { kind: "utterance.claim", hand: "right", mark: mark("is-mortal") },
      mark: mark("is-mortal"),
    },
    object: { kind: "utterance.token", hand: "left", mark: mark("socrates") },
  },
  charge: charge(chargeValue(name), name === "potential"
    ? [[mark("truth")], []]
    : name === "active"
      ? [[], [mark("falsity")]]
      : name === "stable"
        ? [[mark("truth")], [mark("falsity")]]
        : [[], []]),
});

const translateToLakota = (meme) =>
  translateAction.run({ meme, target: lakota.bundle.meta.code }, {});

const translateThrough = (meme, chain) =>
  chain.reduce((prior, language) => translateAction.run({ meme: prior, target: language.bundle.meta.code }, {}), meme);

test("english to lakota translation is witnessed as a sofic truth-factor", () => {
  const receipt = translationFactorReceipt(english, lakota, {
    sourceRegister: "formal",
    targetRegisters: [],
  });

  assert.equal(receipt.kind, "communicating.translation-factor.receipt");
  assert.equal(receipt.sourceLanguage, "en");
  assert.equal(receipt.targetLanguage, "lkt");
  assert.equal(receipt.law, "RelMath.Aperiodic.SoficShift.SoficImage.factor");
  assert.equal(receipt.sofic.sourceWitness, true);
  assert.equal(receipt.sofic.targetWitness, true);
  assert.equal(receipt.truth.preservesTruthOrder, true);
  assert.equal(receipt.truth.commutesWithNegate, true);
  assert.equal(receipt.truth.fixedPoints.absurd, true);
  assert.equal(receipt.truth.fixedPoints.stable, true);
  assert.equal(receipt.degradation.sourceSpecificity, "potential");
  assert.equal(receipt.degradation.targetSpecificity, "absurd");
  assert.equal(receipt.degradation.settlesDown, true);
  assert.equal(receipt.degradation.fabricatesAssertivity, false);
});

test("one truth-factor map covers every ordered pair of the four language fibers", () => {
  const baseline = translationFactorReceipt(english, latin).truth.factorMap;

  for (const source of languages) {
    for (const target of languages) {
      if (source === target) continue;
      const receipt = translationFactorReceipt(source, target);
      assert.equal(receipt.sofic.sourceWitness, true, `${source.bundle.meta.code}: source sofic witness`);
      assert.equal(receipt.sofic.targetWitness, true, `${target.bundle.meta.code}: target sofic witness`);
      assert.equal(receipt.truth.preservesTruthOrder, true, `${source.bundle.meta.code}->${target.bundle.meta.code}: truth order`);
      assert.equal(receipt.truth.commutesWithNegate, true, `${source.bundle.meta.code}->${target.bundle.meta.code}: negate`);
      assert.deepEqual(receipt.truth.factorMap, baseline, `${source.bundle.meta.code}->${target.bundle.meta.code}: one FOUR map`);
      assert.equal(receipt.truth.fixedPoints.absurd, true, "bottom fixed");
      assert.equal(receipt.truth.fixedPoints.stable, true, "top fixed");
    }
  }
});

test("the four-fiber cycle round-trips the truth lattice without fabricating assertivity", () => {
  const receipt = translationFactorChainReceipt(languages, {
    sourceRegister: "formal",
    targetRegisters: [],
    closeCycle: true,
  });

  assert.deepEqual(receipt.languages, ["en", "la", "lkt", "tok"]);
  assert.equal(receipt.legs.length, languages.length);
  assert.equal(receipt.oneTruthFactorMap, true);
  assert.equal(receipt.allSoficWitnesses, true);
  assert.equal(receipt.roundTrip.preservesTruthOrder, true);
  assert.equal(receipt.roundTrip.commutesWithNegate, true);
  assert.equal(receipt.roundTrip.fixedPoints.absurd, true);
  assert.equal(receipt.roundTrip.fixedPoints.stable, true);
  assert.equal(receipt.roundTrip.neverFabricatesAssertivity, true);

  for (const name of chargeValueNames) {
    const source = memeWithCharge(name);
    const cycled = translateThrough(source, languages);
    assert.equal(valueOf(cycled.charge).name, name, `${name}: four-fiber cycle preserves truth charge`);
  }
});

test("translate commutes with negate and fixes top/bottom charges", () => {
  for (const name of ["absurd", "potential", "active", "stable"]) {
    const source = memeWithCharge(name);
    const translateAfterNegate = translateToLakota(negateAction.run(source, {}));
    const negateAfterTranslate = negateAction.run(translateToLakota(source), {});

    assert.equal(
      canonical(translateAfterNegate),
      canonical(negateAfterTranslate),
      `${name}: translate after negate equals negate after translate`,
    );
  }

  assert.equal(valueOf(translateToLakota(memeWithCharge("absurd")).charge).name, "absurd");
  assert.equal(valueOf(translateToLakota(memeWithCharge("stable")).charge).name, "stable");
});

test("translation factor survives modality and protocol wire round-trips", () => {
  const sourceUtterance = utterance(mark("did:web:dev.bare-cedar-fog.emsenn.net:agents:codex"), mark("not sky-is-green"));
  const event = cloudEventFromUtterance(sourceUtterance, "assertive", "2026-06-27T00:00:00Z", {
    id: "urn:uuid:translation-factor-cloudevents",
  });
  const cloudMeme = membraneMeme(utteranceFromCloudEvent(event));

  const sealed = sealDIDCommUtterance(
    sourceUtterance,
    "did:web:ops.561.group:agents:vesper",
    "assertive",
    "translation factor didcomm fixture",
    {
      id: "urn:uuid:translation-factor-didcomm",
      createdTime: 1_782_432_000,
      iv: new Uint8Array([11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]),
    },
  );
  assert.equal(didcommVisibility(sealed), DIDCOMM_PRIVATE_VISIBILITY);
  const didcommMeme = membraneMeme(openDIDCommUtterance(sealed, "translation factor didcomm fixture"));

  for (const source of [cloudMeme, didcommMeme]) {
    const translatedAfterModalize = translateThrough(
      modalizeAction.run({ meme: source, mode: "evidential", witness: "wire" }, {}),
      languages,
    );
    const modalizedAfterTranslate = modalizeAction.run({
      meme: translateThrough(source, languages),
      mode: "evidential",
      witness: "wire",
    }, {});

    assert.equal(valueOf(translatedAfterModalize.charge).name, valueOf(source.charge).name);
    assert.equal(valueOf(modalizedAfterTranslate.charge).name, valueOf(source.charge).name);
    assert.equal(canonical(translatedAfterModalize.charge), canonical(modalizedAfterTranslate.charge));
  }
});
