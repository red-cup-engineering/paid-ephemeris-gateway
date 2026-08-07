// Theorem-shaped tests for socializing's FORMAL SOCIAL THEORY wing: judgment aggregation, common
// knowledge / Aumann, epistemic democracy (CJT + diversity prediction), voting power, opinion
// dynamics, and fair division. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  judgmentAggregate,
  mutualKnowledge,
  commonKnowledge,
  aumannAgreement,
  condorcetJury,
  diversityPrediction,
  votingPower,
  degroot,
  friedkinJohnsen,
  averagingMatrix,
  allocateWork,
} from "../dist/index.mjs";

// ── Judgment aggregation: the discursive dilemma + the bilattice ⊤-hold escape ──

test("the DISCURSIVE DILEMMA: a consistent bench is collectively inconsistent (premise vs conclusion)", () => {
  // agenda: r ⟺ p ∧ q. Three judges, each individually consistent:
  //   j1: p=yes q=yes r=yes;  j2: p=yes q=no r=no;  j3: p=no q=yes r=no.
  // premise-majority: p=yes (2/3), q=yes (2/3) ⇒ r should be yes. conclusion-majority: r=no (2/3).
  const agenda = { premises: ["p", "q"], conclusion: "r", connective: "and" };
  const bench = [
    { name: "j1", views: { p: "potential", q: "potential", r: "potential" } },
    { name: "j2", views: { p: "potential", q: "active", r: "active" } },
    { name: "j3", views: { p: "active", q: "potential", r: "active" } },
  ];
  const v = judgmentAggregate(bench, agenda);
  assert.equal(v.individuallyRational, true, "each judge's r matches p∧q");
  assert.equal(v.doctrinalParadox, true, "premise-based and conclusion-based conclusions diverge");
  assert.equal(v.premiseBased, "potential", "aggregated premises both lean yes ⇒ derived r = yes");
  assert.equal(v.conclusionBased, "active", "but the bench directly aggregates r = no");
});

test("the bilattice ESCAPE: a split premise is held at ⊤ rather than forcing collective inconsistency", () => {
  const agenda = { premises: ["p", "q"], conclusion: "r", connective: "and" };
  // a clean split on p (one yes, one no) settles p to ⊤ under ≤_k, held open.
  const bench = [
    { name: "a", views: { p: "potential", q: "potential", r: "potential" } },
    { name: "b", views: { p: "active", q: "potential", r: "active" } },
  ];
  const v = judgmentAggregate(bench, agenda);
  assert.equal(v.collective.p, "stable", "the split premise is held ⊤ (told-both), not forced");
  assert.ok(v.contested.includes("p"));
});

// ── Common knowledge, regime, and Aumann ──

test("COMMON KNOWLEDGE is the ∧_k meet over a reliable channel (strict regime); a lossy channel never closes", () => {
  const ck = commonKnowledge(["potential", "potential", "potential"], true);
  assert.equal(ck.value, "potential", "all agents share it ⇒ ∧_k = potential");
  assert.equal(ck.attained, true);
  assert.equal(ck.regime, "strict", "finite, reliable ⇒ the tower closes finitely");

  // Halpern–Moses: over a lossy channel common knowledge is unattainable however aligned the agents.
  const lossy = commonKnowledge(["potential", "potential"], false);
  assert.equal(lossy.attained, false);
  assert.equal(lossy.regime, "aperiodic");
  assert.equal(lossy.closureLevel, Number.POSITIVE_INFINITY);

  // a split kills attainment even on a reliable channel (the ∧_k meet is ⊥).
  assert.equal(commonKnowledge(["potential", "active"], true).attained, false);

  // mutual knowledge stabilizes from level 1 (idempotent meet).
  const tower = mutualKnowledge(["potential", "potential"], 3);
  assert.deepEqual(tower.map((m) => m.value), ["potential", "potential", "potential"]);
});

test("AUMANN: agents with common knowledge of their posteriors CANNOT agree to disagree", () => {
  // equal posteriors, reliable channel ⇒ common knowledge holds and they agree.
  const agree = aumannAgreement(["potential", "potential"], true);
  assert.equal(agree.agree, true);
  assert.equal(agree.commonlyKnown, true);
  assert.equal(agree.cannotDisagree, true);

  // distinct posteriors do NOT become common knowledge (the ∧_k meet is ⊥) — so no Aumann violation.
  const distinct = aumannAgreement(["potential", "active"], true);
  assert.equal(distinct.agree, false);
  assert.equal(distinct.commonlyKnown, false, "distinct posteriors never reach common knowledge");
  assert.equal(distinct.cannotDisagree, true, "the theorem is not violated — CK simply fails to obtain");
});

// ── Epistemic democracy: CJT + diversity prediction ──

test("CONDORCET JURY THEOREM: competent majorities amplify, incompetent ones degrade", () => {
  const good = condorcetJury(0.6, 9);
  assert.ok(good.majorityCorrect > 0.6, "a 9-juror majority beats a single 0.6 juror");
  assert.equal(good.improvesOnIndividual, true);
  assert.equal(good.regime, "amplifies");
  // more jurors → closer to certainty.
  assert.ok(condorcetJury(0.6, 51).majorityCorrect > good.majorityCorrect);
  // the dark side: below ½, the crowd is worse than the individual.
  const bad = condorcetJury(0.4, 51);
  assert.equal(bad.regime, "degrades");
  assert.ok(bad.majorityCorrect < 0.4);
});

test("DIVERSITY PREDICTION THEOREM: CrowdError = AverageError − Diversity (exact identity)", () => {
  const d = diversityPrediction([10, 20, 30], 25);
  // mean = 20, crowdError = 25, avgError = ((15)+( 25)+(25))/3 = (225+25+25)/3 = 91.666…, diversity = 200/3
  assert.ok(Math.abs(d.crowdError - (d.averageError - d.diversity)) < 1e-9, "the identity holds exactly");
  assert.equal(d.crowdBeatsAverage, true, "positive diversity ⇒ the crowd beats its average member");
});

// ── Voting power: Banzhaf + Shapley–Shubik ──

test("VOTING POWER: a heavy bloc can be a DICTATOR; a light one a DUMMY (power ≠ weight)", () => {
  // weights [3,1,1], quota 3: player 0 alone meets quota and is decisive; 1 and 2 never swing.
  const p = votingPower([3, 1, 1], 3);
  assert.equal(p.players[0].dictator, true);
  assert.ok(Math.abs(p.players[0].shapleyShubik - 1) < 1e-9, "the dictator holds all Shapley power");
  assert.equal(p.players[1].dummy, true, "a bloc that never swings is a dummy despite its weight");
  assert.equal(p.players[2].dummy, true);
});

test("VOTING POWER: equal weights share power equally; the indices sum to one", () => {
  const p = votingPower([1, 1, 1], 2); // simple majority of 3
  const ssum = p.players.reduce((s, pl) => s + pl.shapleyShubik, 0);
  const bsum = p.players.reduce((s, pl) => s + pl.banzhaf, 0);
  assert.ok(Math.abs(ssum - 1) < 1e-9, "Shapley–Shubik indices sum to 1");
  assert.ok(Math.abs(bsum - 1) < 1e-9, "Banzhaf indices (normalized) sum to 1");
  assert.ok(p.players.every((pl) => Math.abs(pl.shapleyShubik - 1 / 3) < 1e-9), "symmetric players share equally");
});

// ── Opinion dynamics: DeGroot consensus vs Friedkin–Johnsen persistent disagreement ──

test("DEGROOT averaging drives a connected society to CONSENSUS", () => {
  const W = averagingMatrix(3, [[0, 1], [1, 2], [0, 2]]); // a triangle
  const r = degroot(W, [0, 0.5, 1]);
  assert.equal(r.converged, true);
  assert.equal(r.consensus, true, "a connected, self-trusting society converges to one opinion");
  assert.ok(r.spread < 1e-6);
});

test("FRIEDKIN–JOHNSEN: stubborn agents with different innate opinions → PERSISTENT DISAGREEMENT", () => {
  const W = averagingMatrix(3, [[0, 1], [1, 2], [0, 2]]);
  // agents 0 and 2 are fully stubborn (λ=0) at opposite innate opinions; 1 is open (λ=1).
  const r = friedkinJohnsen(W, [0, 0.5, 1], [0, 1, 0], [0, 0.5, 1]);
  assert.equal(r.converged, true);
  assert.equal(r.consensus, false, "anchored, opposed stubborn agents never fully converge");
  assert.equal(r.polarized, true, "the equilibrium is a stable, non-trivial spread — polarization");
});

// ── Fair division of work-items ──

test("FAIR DIVISION: round-robin gives an EF1 split of work-items", () => {
  // two agents value three items; round-robin in order [ada, bo].
  const valuations = {
    ada: { t1: 10, t2: 6, t3: 1 },
    bo: { t1: 1, t2: 6, t3: 10 },
  };
  const a = allocateWork(["ada", "bo"], ["t1", "t2", "t3"], valuations);
  assert.equal(a.ef1, true, "round-robin guarantees envy-freeness up to one item");
  assert.equal(a.proportional, true);
  // ada picks t1 first (value 10), bo picks t3 (value 10), ada picks t2.
  assert.deepEqual([...a.bundles.ada].sort(), ["t1", "t2"]);
  assert.deepEqual([...a.bundles.bo], ["t3"]);
  assert.ok(a.nashWelfare > 0);
});
