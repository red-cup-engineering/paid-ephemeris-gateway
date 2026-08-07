import { test } from "node:test";
import assert from "node:assert/strict";

import { isMeme, canonical, mark, utterance, valueOf } from "@emsenn/relating";
import { memeActions, communicateAction, semioseAction, MEME_CARRIER_ID } from "../dist/communicate/meme.mjs";
import { discourseCohesionOf } from "../dist/communicate/cohesion.mjs";
import {
  morphismActions,
  negateAction,
  conflateAction,
  speakAction,
  listenAction,
  groundAction,
  composeAction,
  illocuteAction,
  modalizeAction,
  presupposeAction,
  quoteAction,
  referAction,
  translateAction,
} from "../dist/communicate/morphisms/index.mjs";

const sampleMeme = Object.freeze({
  kind: "predication.fiber.meme",
  cell: {
    subject: { kind: "utterance.token", hand: "left", mark: { kind: "utterance.mark", value: "socrates" } },
    predicate: {
      kind: "predication.predicate",
      claim: { kind: "utterance.claim", hand: "right", mark: { kind: "utterance.mark", value: "is-mortal" } },
      mark: { kind: "utterance.mark", value: "is-mortal" },
    },
    object: { kind: "utterance.token", hand: "left", mark: { kind: "utterance.mark", value: "socrates" } },
  },
  charge: {
    kind: "bilattice-charge.carrier",
    value: [{ kind: "bilattice-charge.side", name: "present" }, { kind: "bilattice-charge.side", name: "absent" }],
    evidence: [[{ kind: "utterance.mark", value: "observed" }], []],
  },
});

test("the sample is a well-formed meme (test fixture is valid)", () => {
  assert.ok(isMeme(sampleMeme));
});

test("the structural core is carried as CHL runTerm, not TS-only callbacks", () => {
  for (const act of [communicateAction, semioseAction, ...morphismActions]) {
    assert.ok(act.runTerm, `${act.verb} should expose a CHL runTerm`);
  }
});

// A totality check on the specific meme-transforming morphisms (communicate, negate, conflate, …):
// each maps a charged meme to a meme. This describes those morphisms; it is NOT a contract that
// gates communicating's surface — readings/codecs/language-ops that project a membrane into another
// carrier (e.g. `cohere`) are legitimate communicating operations too.
test("each argument-free meme-transforming morphism is total: a charged meme in yields a meme out", () => {
  const argFree = memeActions.filter((act) => act.options.length === 0);
  assert.ok(argFree.length >= 4, "expected the argument-free morphisms");
  for (const act of argFree) {
    const out = act.run(sampleMeme, {});
    assert.ok(isMeme(out), `${act.verb} did not return a meme`);
  }
});

test("communicate is the monoid unit: faithful transmission is the identity", () => {
  assert.equal(canonical(communicateAction.run(sampleMeme, {})), canonical(sampleMeme));
});

test("negate is an involution and preserves the cell", () => {
  const once = negateAction.run(sampleMeme, {});
  assert.ok(isMeme(once));
  assert.equal(canonical(once.cell), canonical(sampleMeme.cell), "cell preserved");
  assert.notEqual(canonical(once), canonical(sampleMeme), "negate is non-trivial on this charge");
  const twice = negateAction.run(once, {});
  assert.equal(canonical(twice), canonical(sampleMeme), "negate after negate is id");
});

test("conflate is an involution", () => {
  const once = conflateAction.run(sampleMeme, {});
  assert.ok(isMeme(once));
  assert.equal(canonical(once.cell), canonical(sampleMeme.cell), "cell preserved");
  const twice = conflateAction.run(once, {});
  assert.equal(canonical(twice), canonical(sampleMeme), "conflate after conflate is id");
});

test("semiose is the iteration primitive: the interpretant's subject nests the prior meme", () => {
  const interpretant = semioseAction.run(sampleMeme, {});
  assert.ok(isMeme(interpretant));
  assert.equal(canonical(interpretant.cell.subject.mark.value), canonical(sampleMeme), "prior meme nested as vehicle");
  assert.equal(canonical(interpretant.cell.object), canonical(sampleMeme.cell.object), "object preserved");
});

test("cohere exposes discourse H1 as a normalized relating cohomology receipt", () => {
  const said = (who, what) => utterance(mark(who), mark(what));
  const cohesion = discourseCohesionOf([
    said("bob", "alice"),
    said("carol", "bob"),
    said("alice", "carol"),
  ]);

  assert.equal(cohesion.kind, "communicating.discourse-cohesion");
  assert.equal(cohesion.subjects, 3);
  assert.equal(cohesion.topics, 1);
  assert.equal(cohesion.redundant, true);
  assert.equal(cohesion.irreducible, 1, "the three-edge discourse triangle has one H1 loop");
  assert.equal(cohesion.cohomology.kind, "communicating.discourse-cohesion.cohomology");
  assert.equal(cohesion.cohomology.subjects, cohesion.subjects);
  assert.equal(cohesion.cohomology.topics, cohesion.topics);
  assert.equal(cohesion.cohomology.cells, 3);
  assert.equal(cohesion.cohomology.h1, cohesion.irreducible);
  assert.equal(cohesion.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
  assert.equal(cohesion.cohomology.laplacian.kind, "predication.cohomology.laplacian");
  assert.equal(cohesion.cohomology.laplacian.firstCohomologyCokernelRank.kind, "predication.cohomology.rankIdentity:witness");
});

test("speak re-charges the meme as witnessed-potential and preserves the cell", () => {
  const spoken = speakAction.run({ meme: sampleMeme, speaker: "alice" }, {});
  assert.ok(isMeme(spoken));
  assert.equal(canonical(spoken.cell), canonical(sampleMeme.cell), "cell preserved identically");
  assert.equal(valueOf(spoken.charge).name, "potential", "transit charge is potential");
});

test("speak consumes one input carrier: transport fields are not a semantic args channel", () => {
  const spoken = speakAction.run({ meme: sampleMeme, speaker: "alice", medium: "wire", capacity: 1 }, {});
  assert.ok(isMeme(spoken));
  assert.equal(valueOf(spoken.charge).name, "potential", "speak remains total over admitted input");
});

test("listen consumes one input carrier and remains total over admitted memes", () => {
  const heard = listenAction.run({ meme: sampleMeme, listener: "bob" }, {});
  assert.ok(isMeme(heard));
  assert.equal(valueOf(heard.charge).name, "active", "uptake moves the charge to active");
  const heardAgain = listenAction.run({ meme: heard, listener: "bob" }, {});
  assert.ok(isMeme(heardAgain), "total proof evaluator returns a meme, not a spent-resource throw");
});

test("ground supports the common-ground update modes", () => {
  for (const mode of ["assertion", "accommodation", "challenge"]) {
    const grounded = groundAction.run({ meme: sampleMeme, partner: "carol", mode }, {});
    assert.ok(isMeme(grounded), `ground ${mode} yields a meme`);
    assert.equal(canonical(grounded.cell), canonical(sampleMeme.cell), `ground ${mode} preserves the cell`);
  }
});

test("every product-carrier morphism evaluates through IR to a meme", () => {
  const cases = [
    [speakAction, { meme: sampleMeme, speaker: "alice" }],
    [listenAction, { meme: sampleMeme, listener: "bob" }],
    [groundAction, { meme: sampleMeme, partner: "carol", mode: "assertion" }],
    [composeAction, { meme: sampleMeme, with: sampleMeme }],
    [illocuteAction, { meme: sampleMeme, force: "assertive" }],
    [modalizeAction, { meme: sampleMeme, mode: "evidential", witness: "source" }],
    [presupposeAction, { meme: sampleMeme, trigger: "factive" }],
    [quoteAction, { meme: sampleMeme, position: "subject" }],
    [referAction, { meme: sampleMeme, position: "object", entity: "plato" }],
    [translateAction, { meme: sampleMeme, target: "academy" }],
  ];
  for (const [act, input] of cases) {
    assert.ok(act.runTerm, `${act.verb} should be IR-backed`);
    assert.ok(isMeme(act.run(input, {})), `${act.verb} should return a meme`);
  }
});
