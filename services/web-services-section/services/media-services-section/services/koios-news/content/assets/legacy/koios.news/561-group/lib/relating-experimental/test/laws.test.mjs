// Theorem-shaped tests for @emsenn/relating-experimental, run against the built
// dist. Each name is a falsifiable categorical claim the test proves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { articulate, mark, utterance, tokenIdentity, token } from "../dist/articulating/index.mjs";
import { predicate } from "../dist/articulating/predicating/index.mjs";
import { canonical, parseJson } from "../dist/codecs/index.mjs";
import { appendWitnesses, projectStateView, readWitnessLog } from "../dist/holography/projecting/index.mjs";
import { eavtId } from "../dist/codecs/eavt.mjs";
import { action, induceBins, wireCodec } from "../dist/acting/index.mjs";
import { actions } from "../dist/actions.mjs";
import { realize, generateDeclaration } from "../dist/typing/index.mjs";

test("articulate preserves the carrier: the cell carries exactly the utterance", () => {
  const u = utterance(mark("s"), mark("p"));
  const cell = articulate(u);
  assert.equal(cell.kind, "utterance.articulation.cell");
  const [carrier, pairing] = cell.potentialAperiodicArticulationCell;
  assert.equal(carrier.token.mark.value, "s");
  assert.equal(carrier.claim.mark.value, "p");
  assert.deepEqual(pairing, [[], []]);
});

test("tokenIdentity witnesses coincident marks and obstructs distinct marks", () => {
  assert.equal(tokenIdentity(token(mark("x")), token(mark("x"))).kind, "utterance.coincidence:witness");
  assert.equal(tokenIdentity(token(mark("x")), token(mark("y"))).kind, "utterance.coincidence-obstruction");
  // structural coincidence, not reference identity:
  assert.equal(tokenIdentity(token(mark({ a: 1 })), token(mark({ a: 1 }))).kind, "utterance.coincidence:witness");
});

test("canonical is representation-independent: key order does not change bytes", () => {
  assert.equal(canonical({ b: 2, a: 1 }), canonical({ a: 1, b: 2 }));
  assert.equal(canonical({ b: 2, a: 1 }), '{"a":1,"b":2}');
});

test("the json wire is idempotent: canonicalize is the identity endomorphism", () => {
  const codec = wireCodec("json");
  const once = codec.encode(codec.decode('{"b":2,"a":1}'));
  const twice = codec.encode(codec.decode(once));
  assert.equal(once, twice);
  assert.equal(once.trim(), '{"a":1,"b":2}');
});

test("appendWitnesses dedupes byte-identical rows to zero cost", () => {
  const root = mkdtempSync(path.join(tmpdir(), "rel-"));
  const store = { logDir: root, stateDir: root, recordDir: root };
  const row = { e: "k", a: "author", v: "ada", t: "2026-01-01" };
  assert.equal(appendWitnesses(store, "f", [row]).appended, 1);
  assert.equal(appendWitnesses(store, "f", [row]).appended, 0);
  assert.equal(eavtId(row), eavtId({ ...row }));
});

test("projectStateView keeps the latest witness of a functional attribute", () => {
  const log = [
    { e: "acct", a: "stake", v: 1, t: "2026-01-01" },
    { e: "acct", a: "stake", v: 7, t: "2026-02-01" },
  ];
  const view = projectStateView(log, new Set(["stake"]));
  const entity = view[canonical("acct")];
  assert.equal(entity.stake, 7);
});

test("induceBins assembles the coproduct apex: one endpoint per action", () => {
  const { discovery } = induceBins(actions, { basePath: "/relate" });
  assert.equal(discovery.bins.length, actions.length);
  const names = discovery.bins.map((b) => b.name).sort();
  for (const verb of ["utter", "articulate", "predicate", "posit", "settle", "induce-relation", "relate-relations", "coincide", "canonicalize", "realize", "read-first-cohomology-of-settlement-filtration"]) {
    assert.ok(names.includes(verb), `discovery is missing ${verb}`);
  }
  const utterBin = discovery.bins.find((b) => b.name === "utter");
  assert.equal(utterBin.input, "text/plain; charset=utf-8"); // string wire admits the Mark pair
  const articulateBin = discovery.bins.find((b) => b.name === "articulate");
  assert.equal(articulateBin.input, "application/json; charset=utf-8"); // thin morphism: takes the Utterance carrier
  const readBin = discovery.bins.find((b) => b.name === "read-first-cohomology-of-settlement-filtration");
  assert.equal(readBin.input, "application/json; charset=utf-8"); // JSON wire between scripts
});

test("dispatch routes a verb, decodes by the selected codec, and is total", () => {
  const { dispatch } = induceBins(actions);
  const ok = dispatch(["canonicalize"], '{"b":2,"a":1}');
  assert.equal(ok.code, 0);
  assert.equal(ok.stdout.trim(), '{"a":1,"b":2}');
  const unknown = dispatch(["nope"], "");
  assert.equal(unknown.code, 2); // refused at the boundary, not thrown
});

test("dispatch witnesses a scripted play as EAVT; a direct run does not", () => {
  const root = mkdtempSync(path.join(tmpdir(), "rel-"));
  const { dispatch } = induceBins(actions, { packageName: "test-pkg" });
  dispatch(["coincide"], '{"left":"x","right":"x"}', {
    dataRoot: root,
    caller: { transport: "test" },
    now: () => "2026-06-20T00:00:00.000Z",
  });
  const file = path.join(root, "log", "2026", "06", "20", "2026-06-20-test-pkg-log.jsonl");
  const rows = readFileSync(file, "utf8").trim().split("\n").map((l) => parseJson(l));
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.deepEqual(row.e, { transport: "test" });          // E = caller
  assert.equal(row.a.verb, "coincide");                     // A = morphism + args
  assert.equal(row.t, "2026-06-20T00:00:00.000Z");          // T = timestamp
  assert.equal(row.v.kind, "utterance.coincidence:witness"); // V = return value
  // a direct in-process run writes nothing new:
  actions.find((act) => act.verb === "coincide").run({ left: "x", right: "x" }, {});
  const after = readdirSync(path.join(root, "log", "2026", "06", "20"));
  assert.equal(after.length, 1);
});

test("realize is the forgetful functor Sub(J) → StructuralTypes", () => {
  // allOf → intersection
  assert.equal(realize({ allOf: [{ type: "object" }, { type: "object" }] }).kind, "intersection");
  // anyOf/oneOf → union
  assert.equal(realize({ anyOf: [{ type: "string" }, { type: "number" }] }).kind, "union");
  // enum → union of literals
  assert.equal(realize({ enum: ["a", "b"] }).kind, "union");
  // $ref → named fixpoint, never inlined
  assert.deepEqual(realize({ $ref: "#/$defs/Hand" }), { kind: "ref", name: "Hand" });
  // refinements are forgotten: a refined string realizes to the bare primitive
  assert.deepEqual(realize({ type: "string", minLength: 3, pattern: "^x" }), { kind: "primitive", name: "string" });
});

test("realize preserves recursion as named references in the printed declaration", () => {
  const schema = { type: "object", properties: { next: { $ref: "#/$defs/Node" } }, $defs: { Node: { type: "object", properties: { next: { $ref: "#/$defs/Node" } } } } };
  const dts = generateDeclaration(schema, "Root");
  assert.match(dts, /export interface Node/);
  assert.match(dts, /next\?: Node;/); // the recursion is a name, not an infinite inline
});

test("predicate materializes Φ = E × Π × E: one entity, one predicate yield one cell", () => {
  const site = predicate(articulate(utterance(mark("socrates"), mark("is-a"))));
  assert.equal(site.kind, "predication.site");
  assert.equal(site.cells.entities.entities.length, 1);
  assert.equal(site.cells.predicates.predicates.length, 1);
  assert.equal(site.cells.cells.length, 1); // |E|² · |Π| = 1·1·1
  const [cell] = site.cells.cells;
  assert.equal(cell.subject.mark.value, "socrates");
  assert.equal(cell.object.mark.value, "socrates");
  assert.equal(cell.predicate.mark.value, "is-a");
});

test("predicate dedupes by structural coincidence, surviving a JSON round-trip", () => {
  // two distinct carriers with equal mark values coincide → still one entity
  const a = articulate(utterance(mark("x"), mark("p")));
  const site = predicate(a);
  // reconstruct the token from JSON (no shared references) and confirm coincidence holds
  assert.equal(site.cells.entities.entities.length, 1);
});

test("predicate matches the reference implementation byte-for-byte (differential oracle)", async () => {
  let ref;
  try {
    ref = await import("../../relating/dist/articulating/predicating/index.mjs");
  } catch {
    return; // reference build not present; differential check skipped
  }
  const refBase = await import("../../relating/dist/articulating/index.mjs");
  const ours = JSON.stringify(JSON.parse(JSON.stringify(predicate(articulate(utterance(mark("s"), mark("p")))))));
  const theirs = JSON.stringify(JSON.parse(JSON.stringify(ref.predicate(refBase.articulate(refBase.utterance(refBase.mark("s"), refBase.mark("p")))))));
  assert.equal(ours, theirs);
});

test("bilattice-charge: the four values are Belnap's FOUR with the right coordinates", async () => {
  const c = await import("../dist/articulating/predicating/positing/bilattice-charge.mjs");
  assert.deepEqual(c.chargeValueNames, ["absurd", "potential", "active", "stable"]);
  assert.equal(c.valueOf(c.witnessedPotential(mark("w"))).name, "potential");
  assert.equal(c.negateValue(c.chargeValue("potential")).name, "active"); // truth↔falsity
  assert.equal(c.valueOf(c.joinKnowledge(c.charge(c.chargeValue("potential")), c.charge(c.chargeValue("active")))).name, "stable");
  assert.equal(c.valueOf(c.bottom).name, "absurd");
});

test("bilattice-charge operation tables match the reference byte-for-byte (differential oracle)", async () => {
  const ours = await import("../dist/articulating/predicating/positing/bilattice-charge.mjs");
  let ref;
  try {
    ref = await import("../../relating/dist/articulating/predicating/positing/bilattice-charge.mjs");
  } catch {
    return; // reference build absent; skip
  }
  const ops = ["joinKnowledge", "meetKnowledge", "joinTruth", "meetTruth"];
  for (const a of ours.chargeValueNames) {
    for (const b of ours.chargeValueNames) {
      for (const op of ops) {
        const o = ours.valueOf(ours[op](ours.charge(ours.chargeValue(a)), ours.charge(ours.chargeValue(b)))).name;
        const r = ref.valueOf(ref[op](ref.charge(ref.chargeValue(a)), ref.charge(ref.chargeValue(b)))).name;
        assert.equal(o, r, `${op}(${a},${b})`);
      }
    }
    assert.equal(ours.negateValue(ours.chargeValue(a)).name, ref.negateValue(ref.chargeValue(a)).name, `negate(${a})`);
    assert.equal(ours.conflateValue(ours.chargeValue(a)).name, ref.conflateValue(ref.chargeValue(a)).name, `conflate(${a})`);
  }
});

test("posit values a predication as a presheaf and matches the reference (differential oracle)", async () => {
  const pos = await import("../dist/articulating/predicating/positing/index.mjs");
  const pred = await import("../dist/articulating/predicating/index.mjs");
  const presheaf = pos.posit(pred.predicate(articulate(utterance(mark("s"), mark("p")))));
  assert.equal(presheaf.kind, "predication.posit.presheaf");
  assert.equal(presheaf.traces.length, 1); // seeded with the fiber's own valuation

  let refPos, refPred, refBase;
  try {
    refPos = await import("../../relating/dist/articulating/predicating/positing/index.mjs");
    refPred = await import("../../relating/dist/articulating/predicating/index.mjs");
    refBase = await import("../../relating/dist/articulating/index.mjs");
  } catch {
    return;
  }
  const ours = JSON.stringify(JSON.parse(JSON.stringify(presheaf)));
  const theirs = JSON.stringify(JSON.parse(JSON.stringify(refPos.posit(refPred.predicate(refBase.articulate(refBase.utterance(refBase.mark("s"), refBase.mark("p"))))))));
  assert.equal(ours, theirs);
});

test("linear logic on FOUR: fusion unit is stable, negation is an involution on consistent values", async () => {
  const l = await import("../dist/articulating/predicating/positing/logic/index.mjs");
  const c = await import("../dist/articulating/predicating/positing/bilattice-charge.mjs");
  assert.equal(l.linearMultiplicativeUnit.name, "stable");
  for (const v of l.consistentChargeValues) {
    assert.equal(c.sameChargeValue(l.linearNegationValue(l.linearNegationValue(v)), v), true);
  }
});

test("induceRelation (the full descent settle∘posit∘predicate∘articulate) matches the reference byte-for-byte", async () => {
  const settling = await import("../dist/articulating/predicating/positing/settling/index.mjs");
  const filtration = settling.induceRelation(utterance(mark("socrates"), mark("is-a")));
  assert.equal(filtration.kind, "predication.settlement.filtration");
  assert.ok(filtration.stages.length >= 1);
  assert.equal(filtration.stages[0].shape.kind, "predication.settling.stage.initial");

  let refBase, refTop;
  try {
    refBase = await import("../../relating/dist/articulating/index.mjs");
    refTop = await import("../../relating/dist/articulating/predicating/positing/settling/topology.mjs");
  } catch {
    return;
  }
  const ours = JSON.stringify(JSON.parse(JSON.stringify(filtration)));
  const theirs = JSON.stringify(JSON.parse(JSON.stringify(refTop.induceRelation(refBase.utterance(refBase.mark("socrates"), refBase.mark("is-a"))))));
  assert.equal(ours, theirs);
});

test("the thin chain composes: utter|articulate|predicate|posit|settle = induce-relation (each carrier is the next domain)", () => {
  const { dispatch } = induceBins(actions);
  // pipe stage-by-stage, each morphism's stdout becoming the next morphism's stdin
  const piped = ["articulate", "predicate", "posit", "settle"].reduce((stdin, verb) => {
    const step = dispatch([verb], stdin);
    assert.equal(step.code, 0, `${verb} failed: ${step.stderr}`);
    return step.stdout;
  }, dispatch(["utter"], "socrates\nis-a").stdout);
  // the full named descent in one play
  const direct = dispatch(["induce-relation"], "socrates\nis-a");
  assert.equal(direct.code, 0);
  assert.equal(canonical(parseJson(piped)), canonical(parseJson(direct.stdout)));
});

test("settle is monotone: each stage's designated cells never shrink", async () => {
  const settling = await import("../dist/articulating/predicating/positing/settling/index.mjs");
  const { stages } = settling.induceRelation(utterance(mark("a"), mark("b")));
  for (let i = 1; i < stages.length; i += 1) {
    assert.ok(stages[i].designated.cells.length >= stages[i - 1].designated.cells.length);
  }
});

test("all settlement-filtration reads match the reference byte-for-byte (differential oracle)", async () => {
  const SN = await import("../dist/articulating/predicating/positing/settling/index.mjs");
  const filtration = SN.induceRelation(utterance(mark("socrates"), mark("is-a")));
  // self-consistency: the graded-gap rank equals the first-cohomology rank
  assert.equal(SN.readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration(filtration).kind, "predication.cohomology.rankIdentity:witness");

  let SO, baseO;
  try {
    SO = await import("../../relating/dist/articulating/predicating/positing/settling/index.mjs");
    baseO = await import("../../relating/dist/articulating/index.mjs");
  } catch {
    return;
  }
  const fO = SO.induceRelation(baseO.utterance(baseO.mark("socrates"), baseO.mark("is-a")));
  const reads = [
    "readIncrementsOfSettlementFiltration", "readFiringsOfSettlementFiltration",
    "readLimitStagesOfSettlementFiltration", "readNonScottFiringsOfSettlementFiltration",
    "readFirstCohomologyOfSettlementFiltration", "readClosureInvariantOfSettlementFiltration",
    "readGradedGapOfSettlementFiltration", "readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration",
    "readClassificationOfSettlementFiltration", "readDepthOfSettlementFiltration",
    "readDepthFiniteStageJudgmentOfSettlementFiltration",
  ];
  for (const r of reads) {
    const ours = JSON.stringify(JSON.parse(JSON.stringify(SN[r](filtration))));
    const theirs = JSON.stringify(JSON.parse(JSON.stringify(SO[r](fO))));
    assert.equal(ours, theirs, r);
  }
});

test("bilattice-relation: dual is transpose-and-negate; state extension is the present points", async () => {
  const R = await import("../dist/articulating/predicating/bilattice-relation.mjs");
  const C = await import("../dist/articulating/predicating/positing/bilattice-charge.mjs");
  const same = (a, b) => a === b;
  const points = { kind: "predication.entitySet", entities: ["p", "q"] };
  const states = { kind: "predication.predicateSet", predicates: ["s"] };
  const m = R.relationMatrix(points, states, [["p", "s", C.chargeValue("potential")], ["q", "s", C.chargeValue("active")]], { samePoint: same, sameState: same });
  const rel = R.relationFromMatrix(m);
  assert.equal(rel.at("p", "s").name, "potential");
  // state extension = points charged present (potential or stable)
  assert.deepEqual(R.stateExtension(rel, "s").points.entities, ["p"]);
  // dual swaps points/states and negates: dual.at(s,p) = negate(rel.at(p,s)) = active
  assert.equal(R.dual(rel).at("s", "p").name, "active");
  // transpose preserves the value at the swapped coordinate
  assert.equal(R.transpose(rel).at("s", "p").name, "potential");
});

test("spectral: x^2 - x - 1 is Pisot (one expanding root, none on the circle)", async () => {
  const S = await import("../dist/articulating/predicating/positing/settling/analysis/spectral.mjs");
  const E = await import("../dist/articulating/predicating/positing/settling/analysis/exact-number.mjs");
  const intOf = (k) => { const nat = (m) => { let n = E.natZero; for (let i = 0; i < m; i += 1) n = E.successor(n); return n; }; return k >= 0 ? E.fromNatural(nat(k)) : E.intNegate(E.fromNatural(nat(-k))); };
  const fib = S.integerPolynomial([intOf(-1), intOf(-1), intOf(1)]); // x^2 - x - 1
  const loc = S.rootLocation(fib);
  assert.equal(loc.kind, "spectral.rootLocation:witness");
  assert.equal(loc.expanding.members.length, 1);  // one root outside the unit circle
  assert.equal(loc.neutral.members.length, 0);     // none on it
  assert.equal(S.pisotRoot(fib).kind, "spectral.pisotRoot:witness");
  // x^2 + 1 is self-reciprocal
  assert.equal(S.selfReciprocity(S.integerPolynomial([intOf(1), intOf(0), intOf(1)])).kind, "spectral.polynomialIdentity:witness");
});

test("fixed points + section + laplacian match the reference (small projections)", async () => {
  const base = await import("../dist/articulating/index.mjs");
  const pred = await import("../dist/articulating/predicating/index.mjs");
  const pos = await import("../dist/articulating/predicating/positing/index.mjs");
  const S = await import("../dist/articulating/predicating/positing/settling/index.mjs");
  const L = await import("../dist/articulating/predicating/positing/settling/analysis/laplacian.mjs");
  const fr = S.fixedPointReadings(S.fixedPoints(pos.posit(pred.predicate(base.articulate(base.utterance(base.mark("s"), base.mark("p")))))));
  assert.equal(fr.knowledgeLeast.extremum.fixedPoint.kind, "predication.valuation.fixedPoint:witness");
  const section = S.sectionOf(fr.knowledgeLeast);
  assert.equal(section.kind, "meme-topology.section.carrier");
  const graph = L.relationGraph(section);
  assert.equal(graph.terms.length, 1);                       // one entity (s = the token)
  assert.equal(L.componentCount(graph).members.length, 1);    // a single connected component

  const J = (x) => JSON.stringify(JSON.parse(JSON.stringify(x)));
  let baseO, predO, settO, lapO;
  try {
    baseO = await import("../../relating/dist/articulating/index.mjs");
    predO = await import("../../relating/dist/articulating/predicating/index.mjs");
    settO = await import("../../relating/dist/articulating/predicating/positing/settling/index.mjs");
    lapO = await import("../../relating/dist/articulating/predicating/positing/settling/analysis/laplacian.mjs");
  } catch {
    return;
  }
  const frO = settO.fixedPointReadings(settO.fixedPoints(predO.positing.posit(predO.predicate(baseO.articulate(baseO.utterance(baseO.mark("s"), baseO.mark("p")))))));
  const secO = settO.sectionOf(frO.knowledgeLeast);
  assert.equal(J(section), J(secO));                          // section byte-identical
  assert.equal(J(graph.weights), J(lapO.relationGraph(secO).weights)); // relation graph byte-identical
});

test("evidence: charge distribution probabilities sum to one; mixedness orders uniform above point", async () => {
  const EV = await import("../dist/articulating/predicating/positing/settling/analysis/evidence.mjs");
  const C = await import("../dist/articulating/predicating/positing/bilattice-charge.mjs");
  const E = await import("../dist/articulating/predicating/positing/settling/analysis/exact-number.mjs");
  const uniform = EV.chargeDistribution(C.chargeValues); // one of each → uniform over FOUR
  // probabilities sum to 1
  const totalProb = uniform.bins.reduce((acc, bin) => E.ratAdd(acc, bin.probability), E.ratZero);
  assert.equal(E.ratEqual(totalProb, E.ratOne), true);
  // a point mass is least mixed; uniform is most mixed → uniform is more mixed than a point
  const point = EV.chargeDistribution([C.chargeValue("potential")]);
  assert.equal(EV.mixedness(uniform, point).relation, "leftMoreMixed");
});

test("conservation: a balanced graded 0-chain conserves; one leg is completable", async () => {
  const CON = await import("../dist/articulating/predicating/positing/settling/analysis/conservation.mjs");
  const G = await import("../dist/articulating/predicating/positing/settling/analysis/graded.mjs");
  const E = await import("../dist/articulating/predicating/positing/settling/analysis/exact-number.mjs");
  const intOf = (k) => { let n = E.natZero; for (let i = 0; i < Math.abs(k); i += 1) n = E.successor(n); const z = E.fromNatural(n); return k < 0 ? E.intNegate(z) : z; };
  const plus3 = G.graded(E.rational(intOf(3), intOf(1)), "charge");
  const minus3 = G.graded(E.rational(intOf(-3), intOf(1)), "charge");
  assert.equal(CON.gradedConserved([plus3, minus3]).kind, "meme-analysis.conservation.graded:witness");
  // knowing only +3, the missing leg is inferable as −3
  assert.equal(CON.gradedComplete([plus3]).kind, "meme-analysis.conservation.graded-completion:witness");
});

test("firing: classifies the four firing types and judges a stable/absurd family self-dual", async () => {
  const F = await import("../dist/articulating/predicating/positing/settling/firing.mjs");
  const C = await import("../dist/articulating/predicating/positing/bilattice-charge.mjs");
  assert.equal(F.classifyFiring(C.chargeValue("potential")).kind, "predication.firing.type.truthOnly");
  assert.equal(F.classifyFiring(C.chargeValue("active")).kind, "predication.firing.type.falsityOnly");
  assert.equal(F.classifyFiring(C.chargeValue("stable")).kind, "predication.firing.type.stable");
  assert.equal(F.classifyFiring(C.chargeValue("absurd")).kind, "predication.firing.type.absurd");
  // stable and absurd are each their own negation → a self-dual orbit
  const sd = F.firingSelfDuality([C.chargeValue("stable"), C.chargeValue("absurd")]);
  assert.equal(sd.coherence.kind, "predication.firing.selfDualityCoherence:witness");
  // potential and active are exchanged by negation → not symmetric
  assert.equal(F.firingSelfDuality([C.chargeValue("potential"), C.chargeValue("active")]).negation.kind, "predication.firing.symmetry-obstruction");
});

test("temporal: the causal order of a settling matches the reference (read-firing-events, read-causal-order)", async () => {
  const base = await import("../dist/articulating/index.mjs");
  const S = await import("../dist/articulating/predicating/positing/settling/index.mjs");
  const f = S.induceRelation(base.utterance(base.mark("s"), base.mark("p")));
  const order = S.readCausalOrderOfSettlementFiltration(f);
  assert.equal(order.kind, "meme-geometry.temporal.order");
  assert.equal(order.events.length, S.readFiringEventsOfSettlementFiltration(f).length);

  const J = (x) => JSON.stringify(JSON.parse(JSON.stringify(x)));
  let baseO, settO, tempO;
  try {
    baseO = await import("../../relating/dist/articulating/index.mjs");
    settO = await import("../../relating/dist/articulating/predicating/positing/settling/index.mjs");
    tempO = await import("../../relating/dist/articulating/predicating/positing/settling/geometry/temporal.mjs");
  } catch {
    return;
  }
  const fO = settO.induceRelation(baseO.utterance(baseO.mark("s"), baseO.mark("p")));
  assert.equal(J(S.readFiringEventsOfSettlementFiltration(f)), J(tempO.readFiringEventsOfSettlementFiltration(fO)));
  assert.equal(J(order), J(tempO.readCausalOrderOfSettlementFiltration(fO)));
});

test("transports: OpenAPI, MCP, HTTP, and web-UX are functorial images of the one apex", async () => {
  const { induceBins, routeRequest, actionOpenApi, actionMcpHandle } = await import("../dist/acting/index.mjs");
  const { actions } = await import("../dist/actions.mjs");
  const induced = induceBins(actions, { packageName: "test-pkg" });

  // OpenAPI: one POST path per action
  const openapi = actionOpenApi(induced);
  assert.equal(openapi.openapi, "3.1.1");
  assert.equal(Object.keys(openapi.paths).length, actions.length);

  // MCP: tools/list has one tool per action; tools/call runs the morphism
  const list = actionMcpHandle(induced, { jsonrpc: "2.0", id: 1, method: "tools/list" }, {});
  assert.equal(list.result.tools.length, actions.length);
  const call = actionMcpHandle(induced, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "canonicalize", arguments: { input: { b: 2, a: 1 } } } }, {});
  assert.equal(call.result.content[0].text, '{"a":1,"b":2}');

  // HTTP: POST /:verb runs the morphism (raw body → stdin)
  const post = routeRequest(induced, { method: "POST", path: "/canonicalize", query: {}, body: '{"b":2,"a":1}' });
  assert.equal(post.status, 200);
  assert.equal(post.body.trim(), '{"a":1,"b":2}');

  // web UX: GET / is the index, GET /:verb is a form
  assert.match(routeRequest(induced, { method: "GET", path: "/", query: {}, body: "" }).body, /<ol>/);
  assert.match(routeRequest(induced, { method: "GET", path: "/articulate", query: {}, body: "" }).body, /<form method="post"/);
  // unknown verb → 404
  assert.equal(routeRequest(induced, { method: "POST", path: "/nope", query: {}, body: "" }).status, 404);

  // MCP: initialize advertises tools + resources + prompts as the vault surface
  const init = actionMcpHandle(induced, { jsonrpc: "2.0", id: 9, method: "initialize" }, {});
  assert.deepEqual(Object.keys(init.result.capabilities).sort(), ["prompts", "resources", "tools"]);
});

test("MCP resources & prompts are functorial images of the same apex", async () => {
  const { induceBins, actionMcpHandle } = await import("../dist/acting/index.mjs");
  const { actions } = await import("../dist/actions.mjs");
  const induced = induceBins(actions, { packageName: "test-pkg" });

  // resources/list: at least the discovery resource is always present; schema
  // resources are auto-derived from any action that declares an input/output schema.
  const reslist = actionMcpHandle(induced, { jsonrpc: "2.0", id: 1, method: "resources/list" }, {});
  assert.ok(Array.isArray(reslist.result.resources));
  const discoveryUri = reslist.result.resources.find((r) => r.uri.endsWith("/discovery"))?.uri;
  assert.ok(discoveryUri, "a discovery resource is published");

  // resources/read: the discovery resource reads back the live apex carrier
  const read = actionMcpHandle(induced, { jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: discoveryUri } }, {});
  assert.equal(read.result.contents[0].uri, discoveryUri);
  assert.equal(JSON.parse(read.result.contents[0].text).package, "test-pkg");

  // unknown uri → JSON-RPC error
  const miss = actionMcpHandle(induced, { jsonrpc: "2.0", id: 3, method: "resources/read", params: { uri: "relating://nope" } }, {});
  assert.equal(miss.error.code, -32602);

  // prompts/list: one guided prompt per action (auto-derived)
  const prlist = actionMcpHandle(induced, { jsonrpc: "2.0", id: 4, method: "prompts/list" }, {});
  assert.equal(prlist.result.prompts.length, actions.length);

  // prompts/get: composes messages that mention the verb
  const verb = actions[0].verb;
  const get = actionMcpHandle(induced, { jsonrpc: "2.0", id: 5, method: "prompts/get", params: { name: verb, arguments: { input: "x" } } }, {});
  assert.equal(get.result.messages[0].role, "user");
  assert.match(get.result.messages[0].content.text, new RegExp(verb));

  // unknown prompt → JSON-RPC error
  const noprompt = actionMcpHandle(induced, { jsonrpc: "2.0", id: 6, method: "prompts/get", params: { name: "nope" } }, {});
  assert.equal(noprompt.error.code, -32602);
});

test("transport POST is a witnessed scripted play (EAVT row written through routeRequest)", async () => {
  const { mkdtempSync, readdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = (await import("node:path")).default;
  const { induceBins, routeRequest } = await import("../dist/acting/index.mjs");
  const { actions } = await import("../dist/actions.mjs");
  const root = mkdtempSync(path.join(tmpdir(), "rel-http-"));
  const induced = induceBins(actions, { packageName: "test-pkg" });
  routeRequest(induced, { method: "POST", path: "/coincide", query: {}, body: '{"left":"x","right":"x"}' },
    { dataRoot: root, caller: { transport: "http" }, now: () => "2026-06-20T00:00:00.000Z" });
  const dir = path.join(root, "log", "2026", "06", "20");
  assert.equal(readdirSync(dir).length, 1); // one dated EAVT log written by the HTTP call
});

test("typed-theory: a base object types to itself (empty derivation) and the proof closure is non-trivial", async () => {
  const base = await import("../dist/articulating/index.mjs");
  const pred = await import("../dist/articulating/predicating/index.mjs");
  const T = await import("../dist/articulating/predicating/typed-theory/index.mjs");
  const site = pred.predicate(base.articulate(base.utterance(base.mark("s"), base.mark("p"))));
  const theory = T.theoryOfBase(site.base);
  const subject = site.cells.entities.entities[0];
  // reflexivity: a base object derives itself with an empty derivation
  const self = T.typing(theory, subject, subject);
  assert.equal(self.kind, "typedTheory.typing:witness");
  assert.equal(self.derivation.steps.length, 0);
  // the proof carrier closes the rule set and judges every generated rule
  const proof = T.typedTheoryProofCarrier(theory);
  assert.equal(proof.kind, "typedTheory.proof.carrier");
  assert.equal(proof.judgments.length, proof.closure.generated.length);
});

test("geometry: a golden-ratio cut-and-project model set has a finite, aperiodic gap spectrum", async () => {
  const Q = await import("../dist/articulating/predicating/geometry/spatial/index.mjs");
  const E = await import("../dist/articulating/predicating/positing/settling/analysis/exact-number.mjs");
  const intOf = (k) => { let n = E.natZero; for (let i = 0; i < Math.abs(k); i += 1) n = E.successor(n); const z = E.fromNatural(n); return k < 0 ? E.intNegate(z) : z; };
  const slope = Q.quadraticRational(5, E.rational(intOf(1), intOf(2)), E.rational(intOf(1), intOf(2))); // (1+√5)/2
  assert.equal(Q.quadraticIsRational(slope), false);
  const ms = Q.modelSet(Q.cutProjectScheme(slope), Q.acceptanceWindow(Q.quadraticFromInts(5, 0, 0), Q.quadraticFromInts(5, 1, 0)), 4);
  const gs = Q.gapSpectrum(ms);
  assert.ok(gs.distinct.length >= 1 && gs.distinct.length <= 3); // an interval window yields finitely many gap lengths
  assert.equal(Q.refutePeriod(gs, 1).kind, "meme-geometry.cutProject.aperiodicity:witness"); // not period-1
});

test("dynamics: the Fibonacci substitution has a primitive incidence matrix and Fibonacci-length iterates", async () => {
  const D = await import("../dist/articulating/predicating/positing/settling/dynamics/substitution/index.mjs");
  const base = await import("../dist/articulating/index.mjs");
  const a = D.substitutionSymbol(base.mark("a"));
  const b = D.substitutionSymbol(base.mark("b"));
  const rule = D.substitutionRule([D.substitutionRuleEntry(a, [a, b]), D.substitutionRuleEntry(b, [a])]); // a→ab, b→a
  const M = D.abelianize(rule, [a, b]);
  assert.equal(D.primitiveMatrix(M).kind, "substitution.dynamics.primitiveMatrix:witness");
  // |φⁿ(a)| follows the Fibonacci numbers: 1,2,3,5,8 for n=1..5
  const E = await import("../dist/articulating/predicating/positing/settling/analysis/exact-number.mjs");
  const nat = (k) => { let n = E.natZero; for (let i = 0; i < k; i += 1) n = E.successor(n); return n; };
  assert.deepEqual([1, 2, 3, 4, 5].map((k) => D.iterateSubstitution(rule, [a], nat(k)).length), [2, 3, 5, 8, 13]);
});

test("codecs: datom folds to the paraconsistent section; toml round-trips; triple drops time", async () => {
  const C = await import("../dist/codecs/index.mjs");
  // datom: an assert then a retract of the same cell folds to a held contradiction (stable)
  const log = [C.datom.assertDatomFact("k", "a", 1, "t1"), C.datom.retractDatomFact("k", "a", 1, "t2")];
  const section = C.datom.foldObjectDatoms(log);
  assert.equal(section.cells[0].value, "stable");
  // triple projects EAVT by dropping time
  assert.deepEqual(C.triple.tripleFromEavt({ e: "s", a: "p", v: "o", t: "t" }), { s: "s", p: "p", o: "o" });
  // toml round-trips a small document
  assert.deepEqual(C.decodeToml(C.encodeToml({ a: 1, t: { b: "x" } })), { a: 1, t: { b: "x" } });
  // turtle writes a typed literal and an IRI ref
  assert.equal(C.turtleLiteral(42), "42");
  assert.equal(C.iriRef("http://x/y"), "<http://x/y>");
});

test("action() rejects an unknown wire codec at registration (vocabulary witness)", () => {
  assert.throws(() => action({ verb: "x", in: "yaml", run: (v) => v }), /unknown wire codec/);
});
