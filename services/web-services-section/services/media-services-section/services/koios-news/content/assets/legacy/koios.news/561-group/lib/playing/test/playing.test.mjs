// Theorem-shaped tests for playing-as-the-*-autonomous-interaction-faculty, run
// against the built dist. Each name is a falsifiable claim from
// dev/docs/notes/2026-06-21-playing-as-star-autonomous-interaction.md:
// playing is the meme's *-autonomous DUALITY + the CUT — its own carrier is the
// Design (a charge-valuation over loci); its characteristic morphism is the binary
// interact (Design ⊗ Design^⊥ → Interaction), converging to the Daimon ⊤.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { induceBins } from "@emsenn/relating";
import {
  actions,
  designAction,
  dualizeAction,
  interactAction,
  atom,
  up,
  down,
  dualProp,
  samePropositions,
  positive,
} from "../dist/index.mjs";

// dispatch a verb through the four-faced apex and parse its JSON wire output.
const dispatchOf = induceBins(actions, { packageName: "@emsenn/playing" }).dispatch;
const runVerb = (verb, inputObj) => {
  const out = dispatchOf([verb], JSON.stringify(inputObj), { caller: { transport: "test" } });
  if (out.code !== 0) throw new Error(`${verb} failed: ${out.stderr}`);
  return JSON.parse(out.stdout);
};
const P = { entries: [{ locus: [], charge: "potential" }] }; // Proponent at root
const O = { entries: [{ locus: [], charge: "active" }] };     // Opponent at root

// Run a verb's pure morphism over a JSON input. `jsonResource` returns the plain
// wire JSON the dispatcher would emit, so `run` is the action applied at the edge.
const run = (act, input, args = {}) => act.run(input, args);

test("design + dualize: the polarity involution A^⊥ swaps Player↔Opponent", () => {
  const p = run(designAction, { entries: [{ locus: [], act: "proponent" }] });
  assert.equal(p.entries[0].charge, "potential"); // proponent ↦ potential (t)
  const dual = run(dualizeAction, p);
  assert.equal(dual.entries[0].charge, "active"); // dual ↦ opponent ↦ active (f)
  // involution: dualizing twice is the identity
  const back = run(dualizeAction, dual);
  assert.equal(back.entries[0].charge, "potential");
});

test("THE CUT: interact of two DUAL designs converges to the Daimon ⊤ (orthogonality)", () => {
  // playing-in: a strategy and its counter-strategy (built by dualize)
  const p = run(designAction, { entries: [{ locus: [], act: "proponent" }] });
  const o = run(dualizeAction, p);
  // playing-out: the interaction normal form — the cut
  const report = run(interactAction, { designA: p, designB: o });
  const meeting = report.meetings[0];
  assert.equal(meeting.daimonized, true);          // the cut converges
  assert.equal(meeting.joined, "stable");          // potential ⊔_k active = ⊤ (stable)
  assert.deepEqual(report.daimonLoci, [[]]);        // it converges at the root locus
  assert.equal(report.normalForm.entries[0].charge, "stable");
});

test("a NON-dual cut does NOT reach the Daimon (the verdict discriminates)", () => {
  const p = run(designAction, { entries: [{ locus: [], act: "proponent" }] });
  // proponent vs proponent: knowledge-join potential ⊔_k potential = potential, not ⊤
  const report = run(interactAction, { designA: p, designB: p });
  if (report.meetings.length > 0) assert.equal(report.meetings[0].daimonized, false);
  assert.deepEqual(report.daimonLoci, []);
});

test("schema-first: every action declares carrier $id domain/codomain (bare descent paths)", () => {
  for (const act of actions) {
    assert.ok(act.codomainSchema, `${act.verb} has a codomainSchema`);
  }
  // playing's own carriers are produced by these morphisms
  assert.equal(designAction.codomainSchema.$ref, "playing/design");
  assert.equal(interactAction.codomainSchema.$ref, "playing/interaction");
  // dualize is the endo SELF-LOOP at the design node (domain $id === codomain $id)
  assert.equal(dualizeAction.domainSchema.$ref, "playing/design");
  assert.equal(dualizeAction.codomainSchema.$ref, "playing/design");
  // the cut is binary: both sides $ref the design carrier
  assert.equal(interactAction.domainSchema.properties.designA.$ref, "playing/design");
  assert.equal(interactAction.domainSchema.properties.designB.$ref, "playing/design");
});

test("the core playing morphisms are carried as CHL run terms", () => {
  assert.ok(designAction.runTerm, "design carries a proof term");
  assert.ok(dualizeAction.runTerm, "dualize carries a proof term");
  assert.ok(interactAction.runTerm, "interact carries a proof term");
});

test("playing's core surface is single-agent ludics: the Design grain + the cut (3 verbs)", () => {
  const verbs = new Set(actions.map((a) => a.verb));
  for (const v of ["design", "dualize", "interact"]) {
    assert.ok(verbs.has(v), `verb ${v} present`);
  }
  // the CGS / multi-agent / social legs are gaming's (scale-2), NOT playing's:
  for (const v of [
    "mask", "sides", "game", "play", "settle", "analyze",
    "read-strategy", "read-regime", "read-flow", "read-deep-play",
    "read-rhetorics", "read-lusory", "embed-culture",
  ]) {
    assert.ok(!verbs.has(v), `verb ${v} is gaming-owned and absent from playing`);
  }
});

test("the four faces: induceBins projects one discovery apex over every verb", () => {
  const { discovery, dispatch } = induceBins(actions, { packageName: "@emsenn/playing" });
  assert.equal(discovery.bins.length, actions.length);
  assert.equal(discovery.package, "@emsenn/playing");
  // CLI face: dispatch a verb through the same apex
  const out = dispatch(["design"], JSON.stringify({ entries: [{ locus: [], act: "daimon" }] }), {
    caller: { transport: "test" },
  });
  assert.equal(out.code, 0);
  assert.match(out.stdout, /stable/); // daimon ↦ stable
});

test("every call witnesses as EAVT into playing's OWN ledger", () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "playing-eavt-"));
  const { dispatch } = induceBins(actions, { packageName: "@emsenn/playing" });
  dispatch(["interact"], JSON.stringify({
    designA: { entries: [{ locus: [], charge: "potential" }] },
    designB: { entries: [{ locus: [], charge: "active" }] },
  }), { caller: { transport: "test" }, dataRoot });
  // the ledger is a per-package EAVT jsonl somewhere under the data root
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".jsonl")) found.push(full);
    }
  };
  walk(dataRoot);
  assert.ok(found.length > 0, "an EAVT ledger file was written");
  // the package name keys the ledger FILE (…-emsenn-playing-log.jsonl): playing's OWN ledger
  assert.ok(found.some((f) => /playing/.test(f)), "the ledger is keyed to @emsenn/playing");
  // and the witnessed line carries the cut it recorded (the interact verb, converged to ⊤)
  const text = found.map((f) => readFileSync(f, "utf8")).join("\n");
  assert.match(text, /"verb":"interact"/);
  assert.match(text, /"joined":"stable"/);
});

// ───────────────────────────────────────────────────────────────────────────
// Wave 2: the full *-autonomous category surface + the two filled theory gaps.
// ───────────────────────────────────────────────────────────────────────────

test("the surface is the *-autonomous category: the topology/proof verbs are present", () => {
  assert.ok(actions.length >= 36);
  const verbs = new Set(actions.map((a) => a.verb));
  for (const v of ["orthogonal", "close", "dual-behaviour", "behave", "incarnate",
    "tensor", "par", "with", "plus", "lollipop", "negate-behaviour",
    "of-course", "why-not", "normalize", "cut-elimination", "fax", "fax-law",
    "fragments", "focusing-duality", "embeddings"]) {
    assert.ok(verbs.has(v), `verb ${v} present`);
  }
});

test("orthogonality: P ⊥ O (dual designs converge to a Daimon)", () => {
  const verdict = runVerb("orthogonal", { designA: P, designB: O });
  assert.equal(verdict.orthogonal, true);
  assert.ok(verdict.daimonLoci.length >= 1);
  // and a non-dual pair does NOT (P vs P)
  const none = runVerb("orthogonal", { designA: P, designB: P });
  assert.equal(none.orthogonal, false);
});

test("behaviours: close gives B^⊥⊥ and `behave` judges it closed", () => {
  const b = runVerb("close", { designs: [P], universe: [P, O] });
  assert.equal(b.kind, "playing.behaviour");
  assert.ok(Array.isArray(b.carrier) && b.carrier.length >= 1);
  // the generated behaviour is, by construction, a behaviour
  const judged = runVerb("behave", { designs: b.carrier, universe: [P, O] });
  assert.equal(judged.closed, true);
});

test("the MALL connectives and the exponential ! produce behaviours", () => {
  for (const verb of ["tensor", "par", "with", "plus", "lollipop"]) {
    const r = runVerb(verb, { left: [P], right: [O], universe: [P, O] });
    assert.equal(r.kind, "playing.behaviour", `${verb} → behaviour`);
    assert.ok(Array.isArray(r.carrier));
  }
  // !B — where the ! of Eff ≃ Kl(!_CGS) lives
  const bang = runVerb("of-course", { carrier: [P], copies: 2, universe: [P, O] });
  assert.equal(bang.kind, "playing.behaviour");
});

test("computational ludics: normalize converges and cut-elimination carries the Hauptsatz", () => {
  const nf = runVerb("normalize", { designA: P, designB: O });
  assert.equal(nf.converges, true);
  const hauptsatz = runVerb("cut-elimination", {});
  assert.match(hauptsatz.theorem, /Church-Rosser|strongly normalizing|Hauptsatz/);
});

test("GAP #1 — Fax: the copycat responder lies in B^⊥ (accepts every member); fax-law pins the grain", () => {
  const fax = runVerb("fax", { designs: [P], universe: [P, O] });
  assert.equal(fax.acceptsAll, true);
  assert.ok(fax.responder.entries.length >= 1, "responder is non-vacuous over a real universe");
  const law = runVerb("fax-law", {});
  assert.match(law.theorem, /Fax/);
  assert.match(law.theorem, /chronicle/); // honest about the reactive copycat's grain
});

test("GAP #2 — shifts ↑/↓: the duality (↑P)^⊥ = ↓(P^⊥) holds structurally", () => {
  const p = atom("a", positive());
  assert.ok(samePropositions(dualProp(up(p)), down(dualProp(p))), "(↑P)^⊥ = ↓(P^⊥)");
  assert.ok(samePropositions(dualProp(down(p)), up(dualProp(p))), "(↓P)^⊥ = ↑(P^⊥)");
  // and via the action surface, the shift connectives cohere under focusing duality
  assert.equal(runVerb("focusing-duality", { connective: "up" }).coheres, true);
  assert.equal(runVerb("focusing-duality", { connective: "down" }).coheres, true);
});

test("the proof layer: the fragment lattice has ILL ⊥ CLL (incomparable middle)", () => {
  const lat = runVerb("fragments", {});
  assert.deepEqual([...lat.elements].sort(), ["CLL", "ILL", "LL", "MALL", "MLL"]);
  const hasEdge = (a, b) => lat.coverings.some(([x, y]) => x === a && y === b);
  assert.ok(!hasEdge("ILL", "CLL") && !hasEdge("CLL", "ILL"), "ILL and CLL are incomparable");
});

test("the proof layer: the four sub-*-autonomous embeddings into CGS are cataloged", () => {
  const cat = runVerb("embeddings", {});
  const names = new Set(cat.embeddings.map((e) => e.name));
  for (const n of ["hylandOng", "dialectica", "nominal", "cairesPfenning"]) assert.ok(names.has(n), `embedding ${n}`);
});

// ───────────────────────────────────────────────────────────────────────────
// Wave 3: the logic layer (propositions, fragments, focusing+shifts, sessions,
// embeddings) and the topology roundout (chronicles, coherence, internal
// completeness, locativity, chronicle-convergence, design order, locatives).
// ───────────────────────────────────────────────────────────────────────────

const atomProp = (label, pol = "positive") => ({ connective: "atom", operands: [], polarity: pol, label });
const tensorProp = (a, b) => ({ connective: "tensor", operands: [a, b] });
const send = (payload, cont) => ({ kind: "game.logic.session.send", payload, continuation: cont });
const sEnd = () => ({ kind: "game.logic.session.end" });

test("the single-agent surface: 47 verbs (3 core + 20 *-autonomous + 11 logic + 10 topology-extra + 3 composition)", () => {
  assert.equal(actions.length, 47);
});

test("logic: dual-prop is De Morgan — (A ⊗ B)^⊥ = A^⊥ ⅋ B^⊥", () => {
  const prop = tensorProp(atomProp("a", "positive"), atomProp("b", "positive"));
  const proposed = runVerb("propose", { proposition: prop });
  assert.equal(proposed.wellFormed, true);
  assert.ok(proposed.connectives.includes("tensor"));
  const dual = runVerb("dual-prop", { proposition: prop });
  assert.equal(dual.proposition.connective, "par"); // ⊗ dualizes to ⅋
});

test("logic GAP #2 at the proposition level: the shift ↑ dualizes to ↓", () => {
  const upA = { connective: "up", operands: [atomProp("a", "positive")] };
  const dual = runVerb("dual-prop", { proposition: upA });
  assert.equal(dual.proposition.connective, "down"); // (↑A)^⊥ = ↓(A^⊥)
  // and ↑ is the negative (asynchronous) shift
  assert.equal(runVerb("focus", { proposition: upA }).polarity, "negative");
});

test("logic: the fragment lattice classifies and tests membership", () => {
  const mul = tensorProp(atomProp("a"), atomProp("b"));
  assert.equal(runVerb("classify-fragment", { proposition: mul }).name, "MLL");
  const banged = { connective: "ofCourse", operands: [atomProp("a")] };
  assert.equal(runVerb("classify-fragment", { proposition: banged }).name, "CLL");
  const inMll = runVerb("in-fragment", { proposition: banged, fragment: "MLL" });
  assert.equal(inMll.inFragment, false);
  assert.ok(inMll.forbidden.includes("ofCourse"));
});

test("logic: formulas name behaviours, and a generator proves its formula", () => {
  const f = runVerb("formula", { name: "P", generators: [P], universe: [P, O] });
  assert.equal(f.name, "P");
  assert.ok(Array.isArray(f.behaviour));
  const p = runVerb("proves", { design: P, name: "P", generators: [P], universe: [P, O] });
  assert.equal(p.proves, true);
});

test("logic: sessions correspond to propositions and dual endpoints are compatible (Caires–Pfenning)", () => {
  const s = send(sEnd(), sEnd());
  const corr = runVerb("session", { session: s });
  assert.equal(corr.proposition.connective, "tensor"); // send ↦ A ⊗ B
  const dual = runVerb("dual-session", { session: s });
  const compat = runVerb("session-compat", { left: s, right: dual.dual });
  assert.equal(compat.compatible, true);
  assert.ok(compat.cut); // the cut boundary A ⊗ A^⊥
});

test("logic: the four embeddings into CGS are applicable by name", () => {
  const dia = runVerb("embed", { name: "dialectica" });
  assert.equal(dia.embeddings[0].name, "dialectica");
  assert.match(dia.embeddings[0].theorem, /./);
});

test("topology: the chronicle grain — a coherent design has chronicles (plays-along-one-branch)", () => {
  // a positive root opening one child the design also commits (a coherent 2-step play)
  const d = { entries: [{ locus: [], charge: "potential" }, { locus: [0], charge: "active" }] };
  const chr = runVerb("chronicles", { design: d });
  assert.ok(chr.count >= 1);
  assert.ok(chr.chronicles[0].actions.length >= 1);
  assert.equal(runVerb("coherent", { design: d }).coherent, true);
});

test("topology: Hyland-Ong views expose the local-memory basis for innocent play", () => {
  const d = {
    entries: [
      { locus: [], charge: "potential" },
      { locus: [0], charge: "active" },
      { locus: [0, 0], charge: "potential" },
    ],
  };
  const views = runVerb("view", { design: d, perspective: "proponent" });
  assert.equal(views.count, 1);
  assert.deepEqual(views.views[0].actions.map((a) => a.variety), ["positive", "negative", "positive"]);
  const verdict = runVerb("innocent", { design: d });
  assert.equal(verdict.innocent, true);
  assert.equal(verdict.decisions.length, 1);
  assert.deepEqual(verdict.decisions[0].next.locus, [0, 0]);
});

test("topology: internal completeness, locativity, chronicle-convergence, the design order", () => {
  assert.equal(runVerb("internal-completeness", { left: [P], right: [P], universe: [P, O] }).same, true);
  assert.equal(runVerb("locativity", { designA: P, designB: O, prefix: [0] }).invariant, true);
  assert.equal(runVerb("chronicle-convergence", { designA: P, designB: O }).converges, true);
  // potential ≤_k stable (a proponent design is knowledge-below the Daimon design)
  const daimon = { entries: [{ locus: [], charge: "stable" }] };
  assert.equal(runVerb("design-leq", { designA: P, designB: daimon }).leq, true);
});

test("topology: the locative primitives — delocate relocates under a prefix; superpose unions", () => {
  const moved = runVerb("delocate", { design: P, prefix: [1] });
  assert.deepEqual(moved.entries[0].locus, [1]);
  const sup = runVerb("superpose", { designs: [P, { entries: [{ locus: [0], charge: "active" }] }] });
  assert.equal(sup.entries.length, 2);
});
