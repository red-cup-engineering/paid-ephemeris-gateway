// Theorem-shaped tests for @emsenn/socializing, run against the built dist.
// Each name is a falsifiable claim about the package's identity: socializing is
// endomorphic on the Social Field carrier (every morphism field → field), admit grows
// the field, and converge inherits the bilattice-network-sheaf consensus theorem
// (H¹ = 0 when agents agree, H¹ ≠ 0 — held, not exploded — when they conflict). The
// one-agent field is the initial object: admit of a single agent reduces to that
// agent's own memes (the communicating ↪ socializing inclusion). A regression to an
// identity stub, a broken endomorphism slot, or a re-implemented (rather than
// delegated) cohomology fails these.
import { test } from "node:test";
import assert from "node:assert/strict";

import { meme, cell, token, mark, charge, chargeValue, valueOf, canonical, memeCarrier } from "@emsenn/relating";
import {
  communicateAction,
  semioseAction,
  illocuteAction,
  negateAction,
  conflateAction,
  referAction,
  modalizeAction,
  presupposeAction,
  quoteAction,
  composeAction,
} from "@emsenn/communicating";
import {
  socialActions,
  socialReadings,
  admitAction,
  mergeAction,
  translateAction,
  broadcastAction,
  attendAction,
  convergeAction,
  liftedActions,
  communicateLiftedAction,
  semioseLiftedAction,
  illocuteLiftedAction,
  negateLiftedAction,
  conflateLiftedAction,
  referLiftedAction,
  modalizeLiftedAction,
  presupposeLiftedAction,
  quoteLiftedAction,
  composeLiftedAction,
  emptyField,
  isField,
  SOCIAL_FIELD_ID,
  comparisonEdges,
} from "../dist/index.mjs";

/** The ten within-agent (DIAGONAL) lifts, each paired with the communicating morphism
 *  it lifts and a minimal valid arg set — the table the parity, totality, and
 *  diagonal-embedding laws range over. translate is NOT here: it is off-diagonal
 *  (inter-observer V(α)), tested in off-diagonal.test.mjs.
 *
 *  The arg sets supply ALL required carrier fields for each carrier-wrapping
 *  morphism (those whose domain is NOT memeCarrier): illocute needs force, refer
 *  needs entity + position, modalize needs mode + witness, presuppose needs trigger,
 *  quote needs position, compose needs `with` (added per-test for a fresh partner). */
const LIFTS = [
  ["communicate", communicateLiftedAction, communicateAction, {}],
  ["semiose", semioseLiftedAction, semioseAction, {}],
  ["illocute", illocuteLiftedAction, illocuteAction, { force: "assertive" }],
  ["negate", negateLiftedAction, negateAction, {}],
  ["conflate", conflateLiftedAction, conflateAction, {}],
  ["refer", referLiftedAction, referAction, { entity: "the-thing", position: "object" }],
  ["modalize", modalizeLiftedAction, modalizeAction, { mode: "evidential", witness: "evidential" }],
  ["presuppose", presupposeLiftedAction, presupposeAction, { trigger: "factive" }],
  ["quote", quoteLiftedAction, quoteAction, { position: "subject" }],
  ["compose", composeLiftedAction, composeAction, {}], // `with` filled per-test (a fresh meme)
];

/** A bare meme over a trivial cell, charged `potential` (truth witnessed). */
function seedMeme(label) {
  const c = cell(token(mark(label)), mark(`predicate:${label}`), token(mark("topic")));
  return meme(c, charge(chargeValue("potential"), [[mark(`${label}-w`)], []]));
}

/** Admit `n` memberless members into a fresh field (each an `agent` seed line). */
function societyOf(n) {
  let field = emptyField();
  for (let i = 0; i < n; i++) {
    field = admitAction.run(field, { agent: `agent-${i}|exists` });
  }
  return field;
}

/** Replace the observer category O's translations so its comparison graph is exactly
 *  `pairs` (one directed translation per pair; direction is forgotten by converge). */
function withEdges(field, pairs) {
  return {
    ...field,
    base: {
      kind: "socializing.social-base",
      translations: pairs.map(([source, target]) => ({
        kind: "socializing.translation",
        source,
        target,
        channel: {
          kind: "communicating.messaging.channel",
          medium: "test",
          from: { kind: "communicating.speaking.signifying.semiosphere", name: "a" },
          to: { kind: "communicating.speaking.signifying.semiosphere", name: "b" },
          capacity: null,
        },
      })),
    },
  };
}

/** Seed every member with a potential meme, then attend `negatives` to flip them active. */
function stances(field, negatives) {
  for (let i = 0; i < field.members.length; i++) {
    field = broadcastAction.run(field, { from: i, to: i, meme: seedMeme(`m${i}`) });
  }
  for (const i of negatives) field = attendAction.run(field, { member: i });
  return field;
}

// --- consistency: the CORE social morphisms transform the Social Field ---
// NOTE: this is a consistency check on `socialActions` (the field-transforming morphisms),
// NOT a definition of socializing. "socializing IS endomorphic on the Field / a monoid of
// Field endomorphisms" is a useful DESCRIPTION of what these core morphisms do, not a law that
// every operation must obey — readings (`socialReadings`: assertion-disagreements, aggregate-
// preferences = the Condorcet/Arrow escape) are first-class faculty operations and dispatch too.
// The categorical slogan does not get to gate the surface.

test("the core social morphisms transform the Social Field (field → field)", () => {
  for (const act of socialActions) {
    assert.equal(act.domain?.id, SOCIAL_FIELD_ID, `${act.verb} domain`);
    assert.equal(act.codomain?.id, SOCIAL_FIELD_ID, `${act.verb} codomain`);
  }
  // the readings are NOT field→field — and that is fine; they are projections, not endomorphisms.
  assert.ok(socialReadings.length >= 1, "readings are exposed as first-class operations");
  for (const r of socialReadings) {
    assert.notEqual(r.codomain?.id, SOCIAL_FIELD_ID, `${r.verb} is a reading, not an endomorphism`);
  }
});

// --- parity: socializing realizes every communicating verb, plus scale-2-natives ---

test("morphism parity: socializing realizes every communicating morphism, plus scale-2-natives and assert", () => {
  assert.equal(liftedActions.length, 10, "ten within-agent (diagonal) lifts");
  const verbs = new Set(socialActions.map((a) => a.verb));
  const expected = [
    "admit", "merge", "settle", "glue", // scale-2-native (no single-agent analog)
    "assert", // EAV assertion admission (endomorphic on field)
    "translate", "broadcast", "attend", "converge", // off-diagonal lifts of communicating
    "communicate", "semiose", "illocute", "negate", "conflate",
    "refer", "modalize", "presuppose", "quote", "compose", // within-agent (diagonal) lifts
  ];
  for (const v of expected) assert.ok(verbs.has(v), `socializing is missing the ${v} morphism`);
  assert.equal(verbs.size, 19, "no duplicate or extra verbs");
});

test("every morphism is total over the field: a field in yields a field out", () => {
  let field = societyOf(2);
  field = stances(field, []);
  field = withEdges(field, [[0, 1]]);
  // a minimal valid arg per verb so each transforms rather than refuses at the boundary;
  // carrier-wrapping communicating morphisms require ALL their carrier fields here
  const ARGS = {
    admit: { agent: "x|exists" },
    merge: { from: 0, to: 1 },
    assert: { observer: 0, assertions: [{ e: "x", a: "is", v: "y" }] },
    translate: { from: 0, to: 1 },
    broadcast: { from: 0, to: 1, meme: seedMeme("x") },
    attend: { member: 0 },
    illocute: { force: "assertive" },
    refer: { entity: "the-thing", position: "object" },
    modalize: { mode: "evidential", witness: "evidential" },
    presuppose: { trigger: "factive" },
    quote: { position: "subject" },
    compose: { with: seedMeme("partner") },
  };
  for (const act of socialActions) {
    const out = act.run(field, ARGS[act.verb] ?? {});
    assert.ok(isField(out), `${act.verb} did not return a field (a stub or partial morphism would fail here)`);
  }
});

// --- the diagonal embedding: every within-agent lift ↾ one agent IS communicating ---

for (const [verb, lifted, base, baseArgs] of LIFTS) {
  test(`diagonal embedding: ${verb}↑ on a one-agent field equals communicating.${verb} on that agent's meme`, () => {
    const m = seedMeme(`solo-${verb}`);
    const field = admitAction.run(emptyField(), { agent: "solo|exists", memes: [m] });
    // `compose` needs a partner meme; build a fresh one shared by both sides.
    const args = verb === "compose" ? { with: seedMeme(`partner-${verb}`) } : baseArgs;
    const out = lifted.run(field, args);
    // Communicating morphisms with a carrier-wrapping domain (domain ≠ memeCarrier)
    // now take { meme, ...options } as a single input; meme-direct morphisms still
    // take the meme directly. The lifted action wraps this in applyAtStalk.
    const expected = base.domain?.id === memeCarrier.id
      ? base.run(m, args)
      : base.run({ meme: m, ...args }, {});
    assert.equal(out.members.length, 1, "a one-agent field stays one agent");
    assert.equal(
      canonical(out.members[0].memes[0]),
      canonical(expected),
      `${verb}↑ restricted to one agent must equal communicating.${verb} verbatim (a re-implementation would drift here)`,
    );
  });
}

// --- the lift's social direction: it acts at every stalk, and `member` narrows it ---

test("a stalkwise lift acts on every agent's stalk (the social direction)", () => {
  let field = societyOf(2);
  field = stances(field, []); // each member now holds one potential meme
  const before0 = canonical(field.members[0].memes[0]);
  const before1 = canonical(field.members[1].memes[0]);
  const out = negateLiftedAction.run(field, {});
  assert.notEqual(canonical(out.members[0].memes[0]), before0, "member 0's meme was negated");
  assert.notEqual(canonical(out.members[1].memes[0]), before1, "member 1's meme was negated");
});

test("the member option narrows a stalkwise lift to one agent's stalk", () => {
  let field = societyOf(2);
  field = stances(field, []);
  const before0 = canonical(field.members[0].memes[0]);
  const before1 = canonical(field.members[1].memes[0]);
  const out = negateLiftedAction.run(field, { member: 0 });
  assert.notEqual(canonical(out.members[0].memes[0]), before0, "the named member changed");
  assert.equal(canonical(out.members[1].memes[0]), before1, "the other member is untouched");
});

test("a within-agent involution lifts to a field involution: negate↑ ∘ negate↑ = id", () => {
  let field = societyOf(2);
  field = stances(field, []);
  const once = negateLiftedAction.run(field, {});
  const twice = negateLiftedAction.run(once, {});
  for (let i = 0; i < field.members.length; i++) {
    assert.equal(
      canonical(twice.members[i].memes[0]),
      canonical(field.members[i].memes[0]),
      `member ${i}: negate↑ applied twice returns the original meme`,
    );
  }
});

// --- admit grows the field ---

test("admit grows the field: each admit appends exactly one member", () => {
  let field = emptyField();
  assert.equal(field.members.length, 0, "the empty field has no members");
  field = admitAction.run(field, { agent: "alice|exists" });
  assert.equal(field.members.length, 1, "first admit ⇒ one member");
  field = admitAction.run(field, { agent: "bob|exists" });
  assert.equal(field.members.length, 2, "second admit ⇒ two members");
  // the observer category grows: two observers ⇒ both directed translations (0→1, 1→0),
  // whose comparison graph is the single undirected edge {0,1}.
  assert.equal(field.base.translations.length, 2, "two observers ⇒ two directed translations");
  assert.equal(comparisonEdges(field.base).length, 1, "their comparison graph is one undirected edge");
});

// --- initial-object law: a one-agent field IS communicating ---

test("initial object: a one-agent field carries exactly that agent's own memes (admit reduces to communicating)", () => {
  const m = seedMeme("solo");
  const field = admitAction.run(emptyField(), { agent: "solo|exists", memes: [m] });
  assert.equal(field.members.length, 1, "one admitted agent ⇒ a one-member society");
  assert.equal(field.base.translations.length, 0, "a one-observer society is a DISCRETE O — no non-identity translations");
  const only = field.members[0];
  assert.equal(only.memes.length, 1, "the member holds exactly the admitted memes — nothing socially added");
  // The member's own memes ARE the admitted memes: socializing adds no meaning at one agent.
  assert.equal(canonical(only.memes[0].cell), canonical(m.cell), "the one-agent field's meme is the agent's own meme verbatim");
  // converge over a one-agent field is the agent's own charge — the trivial sheaf glues.
  const out = convergeAction.run(field, {});
  assert.equal(out.section.glued, true, "a single agent always glues (no edges ⇒ no obstruction)");
  assert.equal(out.section.obstruction, 0, "one agent ⇒ H¹ = 0");
});

// --- converge: the bilattice-network-sheaf consensus / held-disagreement law ---

test("converge: two agreeing agents glue with H¹ = 0 (consensus)", () => {
  // members 0 and 1 both positive (potential), neither attended ⇒ no opposition.
  let field = societyOf(2);
  field = stances(field, []);
  field = withEdges(field, [[0, 1]]);
  const out = convergeAction.run(field, {});
  assert.equal(out.section.kind, "socializing.common-ground");
  assert.equal(out.section.obstruction, 0, "agreement ⇒ H¹ = 0");
  assert.equal(out.section.glued, true, "H¹ = 0 ⇒ glued common ground");
  const component = out.section.components.find((c) => c.members.length === 2);
  assert.equal(valueOf(component.pooled).name, "potential", "agreement on truth pools to a definite potential");
});

test("converge: a cycle of conflicting agents does not glue (H¹ ≠ 0, held not exploded)", () => {
  // A 4-cycle 2-colored +,-,+,- ⇒ every edge opposed ⇒ one independent cycle ⇒ H¹ = 1.
  let field = societyOf(4);
  field = stances(field, [1, 3]);
  field = withEdges(field, [[0, 1], [1, 2], [2, 3], [3, 0]]);
  const out = convergeAction.run(field, {});
  assert.ok(out.section.obstruction > 0, "a cycle of opposed agents raises H¹");
  assert.equal(out.section.glued, false, "non-zero H¹ ⇒ not glued (standing disagreement)");
  // Held, not exploded: the connected component pools to `stable`, never `absurd`.
  const component = out.section.components.find((c) => c.members.length > 1);
  assert.ok(component, "the cycle is one connected component");
  assert.equal(valueOf(component.pooled).name, "stable", "a held contradiction settles stable, not absurd");
});
