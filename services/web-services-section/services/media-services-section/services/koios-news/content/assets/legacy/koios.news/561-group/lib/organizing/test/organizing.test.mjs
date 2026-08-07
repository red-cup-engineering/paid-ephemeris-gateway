/**
 * organizing — end-to-end tests of the social gluing node over the built package.
 *
 * Pins the domain of dev/docs/notes/2026-06-21-organizing-as-social-scale-governing.md:
 * organizing is the social-scale governing — it glues a plurality of agents into one
 * organization (the global section) over three Gen-2 boundary faces; the gluing act
 * is adjudication (contested/open/monotone), and H¹ over the social cover is the
 * consensus cost; the organization is seen only through its three faces and re-seeds
 * the next scale.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  organize,
  assemble,
  adjudicate,
  socialBecoming,
  relate,
  community,
  institute,
  socialSymmetry,
  socialStance,
  cohesion,
  governance,
  socialFactor,
  face,
  project,
  reseed as reseedOrganization,
  federate,
  verificationTournamentAction,
} from "../dist/index.mjs";
import { agent, reseed as reseedAgent, descend, admitSeed } from "@emsenn/animating";
import { socializingFace } from "@emsenn/socializing";
import { computingFace } from "@emsenn/computing";
import { gamingFace } from "@emsenn/gaming";

const BOUNDARY = {
  socializing: "alice|trusts-bob\nbob|trusts-carol",
  computing: "alice|computes-tax\nbob|computes-tax",
  gaming: "alice|plays-carol",
};

test("organize: glue a plurality of agents into one organization (the global section)", () => {
  const org = organize(BOUNDARY, { identity: "the-guild" });
  assert.equal(org.kind, "organizing.organization");
  assert.equal(org.identity, "the-guild");
  assert.equal(org.settledBelow, true);
  assert.equal(org.openAbove, true);

  // the three Gen-2 social faces, across/inside/outside
  assert.equal(org.faces.length, 3);
  assert.deepEqual(org.faces.map((f) => f.faculty), ["socializing", "computing", "gaming"]);
  assert.deepEqual(org.faces.map((f) => f.direction), ["across", "inside", "outside"]);

  // the organization is glued from a base of agents (members = distinct agent-entities)
  assert.ok(org.members >= 1);

  // glued is the cross-arena condition: the genuine obstruction is federation-only
  // content (coker diff), NOT disagreement — so glued ⟺ federationOnly == 0
  assert.equal(org.glued, org.adjudication.federationOnly === 0);
  assert.equal(org.glued, org.adjudication.cohomologyRank === 0);
  assert.equal(org.coordination, org.glued ? "coordination-free" : "consensus-required");

  // the organization references the intrinsic settled order (institution); it is a
  // DIFFERENT reading from the cross-arena gluing, so they may differ (not asserted equal)
  assert.equal(org.institution.kind, "organizing.institution");
  assert.equal(org.institution.stage, "governing");
  assert.equal(org.institution.epistemic, "knowledge");

  // the associated milieu (Simondon): residual non-stable field cells
  assert.ok(org.milieu >= 0 && org.milieu <= org.institution.field);
});

test("adjudication: the cross-arena Mayer–Vietoris — disagreement tolerated, federation-only is the obstruction", () => {
  const a = adjudicate(BOUNDARY);
  assert.equal(a.kind, "organizing.adjudication");
  // the disciplines + the genuine obstruction
  assert.ok(a.contested >= 0); // disagreement-pairs (ker δ) — tolerated, no obstruction
  assert.ok(a.open >= 0);
  assert.equal(a.monotone, true);
  assert.ok(a.federationOnly >= 0); // coker(diff) — the genuine obstruction
  assert.equal(a.cohomologyRank, a.federationOnly);

  // adjudicate agrees with organize's interior adjudication over the same boundary
  const org = organize(BOUNDARY);
  assert.equal(a.federationOnly, org.adjudication.federationOnly);

  // the corpus's load-bearing fact: a society can be GLUED yet deeply CONTESTED —
  // two agents flatly disagreeing on one cell produces contested>0 but no obstruction.
  const split = organize({ socializing: "alice|the-sky-is-blue\nbob|the-sky-is-not-blue" });
  assert.equal(split.glued, split.adjudication.federationOnly === 0);
});

test("a face is a local section over its social cover; an absent face is the empty cover", () => {
  const f = face("computing", [["alice", "computes-tax"], ["bob", "computes-tax"]]);
  assert.equal(f.kind, "organizing.face");
  assert.equal(f.faculty, "computing");
  assert.equal(f.direction, "inside");
  assert.ok(f.held >= 1);

  // organize still founds the collective from a single face; the others are empty
  const partial = organize({ socializing: "alice|trusts-bob" });
  assert.equal(partial.faces.find((x) => x.faculty === "gaming").held, 0);
});

test("the bulk consolidates each face's within-face gluing obstruction H¹ (≠ contested)", () => {
  const membrane = (seed) => descend(admitSeed(seed)).utterances;
  // each face's obstruction is its OWN H¹, read faithfully from its structure: socializing's
  // opposition-H¹, computing's contested concerns, gaming's arena conflict edges.
  assert.equal(face("socializing", BOUNDARY.socializing).obstruction, socializingFace(membrane(BOUNDARY.socializing)).obstruction, "socializing obstruction = its opposition-H¹");
  assert.equal(face("computing", BOUNDARY.computing).obstruction, computingFace(membrane(BOUNDARY.computing)).contested, "computing obstruction = its contested concerns");
  assert.equal(face("gaming", BOUNDARY.gaming).obstruction, gamingFace(membrane(BOUNDARY.gaming)).obstruction, "gaming obstruction = its arena conflict edges");

  // H¹=0 ⟺ the face coheres coordination-free (CRDT/CALM); the BOUNDARY is coherent per-face
  for (const fac of ["socializing", "computing", "gaming"]) {
    assert.equal(face(fac, BOUNDARY[fac]).obstruction, 0, `${fac} integrates without adjudication (H¹=0)`);
  }

  // obstruction stays FAITHFUL even when the face is contested: a held contradiction
  // (contested>0) is distinct from the gluing obstruction H¹, and the bulk consolidates the
  // face's OWN obstruction regardless.
  const splitSeed = "alice|blue\nbob|not blue"; // same subject "blue" asserted and denied
  const split = face("socializing", splitSeed);
  assert.ok(split.contested >= 1, "the seed is genuinely contested at the face");
  assert.equal(split.obstruction, socializingFace(descend(admitSeed(splitSeed)).utterances).obstruction, "obstruction consolidated faithfully even under contestation");
});

test("the bulk consolidates each face's collective standing (the ≤_k join / aggregate)", () => {
  const MAP = { undecidable: "absurd", verified: "potential", refuted: "active", contradictory: "stable" };
  // FAITHFUL: organizing's derived computing-face aggregate equals computing's OWN member-join
  // aggregate (mapped) — the closed form over the census matches ∨_k by associativity.
  const cm = descend(admitSeed(BOUNDARY.computing)).utterances;
  assert.equal(face("computing", BOUNDARY.computing).aggregate, MAP[computingFace(cm).aggregate.value], "computing aggregate ≡ its own member-join (∨_k associativity)");

  // the adjudication accumulation: a face holding both for and against settles to ⊤ told-both
  assert.equal(face("socializing", "alice|blue\nbob|not blue").aggregate, "stable", "held-for ∨_k held-against = ⊤");
  // an empty face stands at the ≤_k bottom ⊥
  assert.equal(organize({ socializing: "alice|trusts-bob" }).faces.find((f) => f.faculty === "gaming").aggregate, "absurd", "no contribution ⇒ ⊥ absurd");
});

test("socializing's real work: the BIGRADED common knowledge the collective achieves (C^t vs C^k)", () => {
  const m = (seed) => descend(admitSeed(seed)).utterances;
  // a coherent collective reaches common knowledge on BOTH axes — agreement-on-value (C^t) and
  // agreement-on-witness (C^k) COINCIDE (no paraconsistent observer; the bigrading collapses).
  const coherent = socializingFace(m(BOUNDARY.socializing));
  assert.equal(coherent.commonKnowledge.agree, true, "no told-both observer ⇒ C^t and C^k coincide");
  assert.equal(coherent.commonKnowledge.divergence, 0);
  // a paraconsistent collective (one subject both asserted AND denied) DIVERGES at the ⊤ cell —
  // the split-brain / learner-lag substrate surface the theorem names.
  const split = socializingFace(m("alice|blue\nbob|not blue"));
  assert.equal(split.commonKnowledge.agree, false, "a told-both observer ⇒ C^t and C^k diverge");
  assert.ok(split.commonKnowledge.divergence >= 1, "divergence at the ⊤ cell");
});

test("socializing's swarm work: STIGMERGIC coordination decouples cost (O(N+|L|) not O(N²))", () => {
  const m = (seed) => descend(admitSeed(seed)).utterances;
  // a 3-observer collective coordinates through the Social Field (stigmergic), not pairwise
  const f = socializingFace(m("a|x\nb|x\nc|x"));
  const c = f.coordination;
  assert.equal(c.stigmergic, true, "consensus is field-mediated, not observer-pairwise");
  // the stigmergic cost is linear O(N + |L|); the orchestrated O(N²) is what it AVOIDS
  assert.equal(c.cost, f.observers + f.cover, "stigmergic cost = O(observers + field cover)");
  assert.equal(c.orchestratedCost, (f.observers * (f.observers - 1)) / 2, "the avoided pairwise O(N²) cost");
  // the decoupling: at any nontrivial population the avoided cost exceeds the stigmergic cost
  assert.ok(f.observers >= 3 ? c.orchestratedCost >= 1 : true, "swarm coordination scales where orchestration saturates");
});

test("computing's real work: the network-sheaf CONSENSUS H⁰ (∧_k meet), dual to the ∨_k aggregate", () => {
  const MAP = { undecidable: "absurd", verified: "potential", refuted: "active", contradictory: "stable" };
  const m = (seed) => descend(admitSeed(seed)).utterances;
  // the consensus is the ∧_k MEET over the society's concerns — the maximum info shared by ALL
  // (the network-sheaf H⁰ global section), dual to the ∨_k aggregate (the disagreement join).
  const cf = computingFace(m(BOUNDARY.computing));
  assert.equal(cf.consensus, "potential", "an agreeing society shares a for-standing");
  // for the coherent (agreeing) society there is no disagreement, so consensus = aggregate
  assert.equal(MAP[cf.aggregate.value], "potential", "no disagreement ⇒ consensus = aggregate (gap zero)");
});

test("gaming's real work: the arena CONCURRENCY partition (causal ⊎ conflict ⊎ concurrent — the CGS datum)", () => {
  const m = (seed) => descend(admitSeed(seed)).utterances;
  // events on DIFFERENT loci are genuinely concurrent — independent parallel moves (the
  // defining structure of a CONCURRENT game, vs sequential Hyland–Ong play).
  const independent = gamingFace(m("alice|x\nbob|y"));
  const c = independent.concurrency;
  const n = independent.cover;
  // the three event-structure relations PARTITION the distinct event pairs
  assert.equal(c.causal + c.conflict + c.concurrent, (n * (n - 1)) / 2, "≤ ⊎ # ⊎ co = all event pairs");
  if (n >= 2) assert.ok(c.concurrent >= 1, "different-loci events are concurrent (parallel)");
  // conflict is exactly the arena's gluing obstruction
  assert.equal(c.conflict, independent.obstruction, "the # relation IS the obstruction H¹");
});

test("the holographic projection: the organization is seen only through its three social faces", () => {
  const org = organize(BOUNDARY, { identity: "the-guild" });
  const view = project(org);
  assert.equal(view.kind, "organizing.projection");
  assert.equal(view.identity, "the-guild");
  assert.equal(view.glued, org.glued);
  assert.equal(view.coordination, org.coordination);
  assert.equal(view.socializing.direction, "across");
  assert.equal(view.computing.direction, "inside");
  assert.equal(view.gaming.direction, "outside");
});

test("the four-fold social descent, one settled society read four ways (Gen-2 mirror)", () => {
  // social-becoming — stage 1: the individuals re-posed among others, pure potential
  const sb = socialBecoming(BOUNDARY);
  assert.equal(sb.kind, "organizing.social-becoming");
  assert.equal(sb.scale, "social");
  assert.equal(sb.stage, "becoming");
  assert.equal(sb.face, "animate");
  assert.equal(sb.openAbove, true);

  // relating — stage 2 (doing): directed bonds among agents
  const r = relate(BOUNDARY);
  assert.equal(r.kind, "organizing.relating");
  assert.equal(r.stage, "doing");
  assert.equal(r.face, "agential");
  assert.ok(r.agents >= 1);
  assert.ok(r.bonds >= 1);

  // community — stage 3 (working): the shared field (Simondon transindividual)
  const c = community(BOUNDARY);
  assert.equal(c.kind, "organizing.community");
  assert.equal(c.stage, "working");
  assert.equal(c.face, "agentic");
  assert.equal(c.transindividual, true);
  assert.ok(c.field >= 1);

  // institution — stage 4 (governing): the settled order (mirror of animating governing)
  const i = institute(BOUNDARY);
  assert.equal(i.kind, "organizing.institution");
  assert.equal(i.stage, "governing");
  assert.equal(i.face, "individual");
  assert.equal(i.settled, true);
  assert.equal(i.glued, i.cohomologyRank === 0);

  // all four readings project the SAME settled society: one member count throughout
  const org = organize(BOUNDARY);
  assert.equal(sb.members, r.agents);
  assert.equal(r.agents, c.members);
  assert.equal(c.members, org.members);
  assert.equal(i.field, c.field);
});

test("GOVERNANCE: organizing consolidates its three faculties' impossibility-escapes (Arrow + FLP + best-response) into ONE verdict", () => {
  // all three classical impossibilities active at once: a Condorcet cycle (deciding), a split
  // knowledge claim (knowing), and Rock-Paper-Scissors (competing). The SAME no-periodic-orbit
  // theorem dissolves all three — the organization is governable, the irreducible ⊤-core isolated.
  const g = governance({
    preferences: "v1|A>B\nv1|B>C\nv1|A>C\nv2|B>C\nv2|C>A\nv2|B>A\nv3|C>A\nv3|A>B\nv3|C>B",
    knowledge: "alice|trusts\nbob|not trusts",
    dominance: "rock|scissors\nscissors|paper\npaper|rock",
  });
  assert.equal(g.kind, "organizing.governance");
  // each dimension escapes its classical impossibility…
  assert.equal(g.socialChoice.acyclic, true, "no Condorcet cycle (Arrow escape)");
  assert.equal(g.socialChoice.majorityCyclic, true, "…though majority rule would have cycled");
  assert.equal(g.consensus.coordinationFree, true, "monotone merge is coordination-free (FLP/CALM escape)");
  assert.equal(g.equilibrium.reachable, true, "the equilibrium is reachable (best-response-cycle escape)");
  assert.equal(g.equilibrium.bestResponseCyclic, true, "…though best-response would cycle (RPS)");
  // …by the SAME theorem, so the organization GOVERNS across all three at once.
  assert.equal(g.governable, true, "governable: acyclic ∧ coordination-free ∧ reachable");
  // the irreducible ⊤-core is the sum across dimensions (3 + 1 + 3): the genuinely-hard conflict.
  assert.equal(g.irreducible, 7);

  // a coherent organization: every dimension clean, no irreducible conflict.
  const clean = governance({ preferences: "v1|A>B\nv2|A>B", knowledge: "a|trusts\nb|trusts", dominance: "A|B\nA|C" });
  assert.equal(clean.governable, true);
  assert.equal(clean.irreducible, 0);
  assert.equal(clean.consensus.flpEscaped, true);
});

test("the organization's STANCE: the collective ≤_t truth lean, consolidated from the socializing face (Gen-2 lift of the agent's stance)", () => {
  // the bulk consolidates the socializing (across/truth) face's LEAN DIRECTION — which way the
  // society leans on the truth order ≤_t. Negation is ANTITONE: asserting vs denying land opposed.
  const forLean = socialStance({ socializing: "a|trusts\nb|trusts" });
  assert.equal(forLean.kind, "organizing.stance");
  assert.equal(forLean.lean, "potential", "an asserting society leans FOR (≤_t up)");

  const againstLean = socialStance({ socializing: "a|not trusts\nb|not helps" });
  assert.equal(againstLean.lean, "active", "a denying society leans AGAINST (≤_t down — antitone)");

  // a torn society (asserts AND denies one thing) is polarized ⊤ on the truth axis.
  assert.equal(socialStance({ socializing: "a|trusts\na|not trusts" }).lean, "stable");

  // no across face ⇒ uncommitted (no truth lean).
  assert.equal(socialStance({ computing: "a|x" }).lean, "absurd");
});

test("the organization's SYMMETRY: FSym(𝔸) member interchangeability (structural equivalence) ≠ name-mobility, consolidating gaming's arena Ẽ", () => {
  // federation-is-parallel-composition.md names TWO FSym(𝔸) phenomena. (1) the symmetry
  // GROUPOID Ẽ: members one could PERMUTE without changing the institution — structural
  // equivalence (same role). Two members asserting the same predicate are interchangeable.
  const same = socialSymmetry({ socializing: "alice|trusts\nbob|trusts" });
  assert.equal(same.kind, "organizing.symmetry");
  assert.equal(same.members, 2);
  assert.equal(same.roles, 1, "both members occupy one role (the orbit 𝔸/Ẽ)");
  assert.equal(same.interchangeable, 2, "both are FSym-permutable");
  assert.equal(same.uniform, true, "a non-trivial member permutation symmetry");

  // read NEGATION-AWARE: an asserter and a denier of one predicate are DIFFERENT roles — the
  // for/against polarity is part of the role, so they are NOT interchangeable.
  const opposed = socialSymmetry({ socializing: "alice|trusts\nbob|not trusts" });
  assert.equal(opposed.roles, 2, "assert vs deny ⇒ distinct roles");
  assert.equal(opposed.interchangeable, 0);
  assert.equal(opposed.uniform, false);

  // (2) name-PASSING (`mobile`): a member ACTING ACROSS ≥2 constituents — entity-mobility,
  // the OTHER FSym(𝔸) phenomenon, distinct from interchangeability (it is one name, not a
  // permutable pair). carol appears in both the socializing and computing faces.
  const mobile = socialSymmetry({ socializing: "carol|leads", computing: "carol|leads" });
  assert.equal(mobile.mobile, 1, "carol is a mobile name (acts across constituents)");
  assert.equal(mobile.interchangeable, 0, "mobility is not interchangeability");

  // the bulk CONSOLIDATES gaming's (outside/evidence) face arena symmetry — no longer dropped.
  const arena = socialSymmetry({ gaming: "alice|plays\nbob|plays" });
  assert.equal(arena.arenaUniform, gamingFace(descend(admitSeed("alice|plays\nbob|plays")).utterances).symmetry.uniform,
    "arenaUniform = the gaming face's own arena Ẽ uniformity");
  assert.equal(arena.arenaUniform, true);

  // a single member is a RIGID order — no non-trivial symmetry.
  assert.equal(socialSymmetry({ socializing: "alice|p" }).uniform, false);
});

test("the transindividual field records the held-contradiction ⊤ substrate (the negation involution, not the all-positive descent)", () => {
  // cross-arena-mayer-vietoris.md: "Disagreement is recorded as substrate content via the
  // bilattice's ⊤ value when both sides assert." A society told `alice trusts` AND
  // `alice ¬trusts` HOLDS that contradiction — the H⁰ field records it. The all-positive
  // descent (no negation ~) would read every cell potential and record ⊤ = 0; the
  // consolidated face census (the involution-aware reading) records it as 1.
  const held = community({ socializing: "alice|trusts\nalice|not trusts" });
  assert.equal(held.contested, 1, "the transindividual field records the held ⊤");
  assert.equal(held.transindividual, true);

  // a field with no opposed assertion holds no contradiction — no false positive.
  assert.equal(community({ socializing: "alice|trusts\nbob|helps" }).contested, 0);

  // the within-constituent ⊤ is "adjudicated within each constituent by its own
  // machinery" — it is the face's OWN involution-aware census, surfaced at the bulk.
  const org = organize({ socializing: "alice|trusts\nalice|not trusts" });
  const social = org.faces.find((f) => f.faculty === "socializing");
  assert.equal(social.belnap.stable, 1, "the face adjudicates the ⊤ by its own machinery");
  // the federation-level adjudication carries only the ker(δ) OVERLAP term — a single
  // constituent's internal ⊤ is NOT a cross-arena overlap, so it stays 0 there.
  assert.equal(org.adjudication.contested, 0, "federation-level overlap is distinct from within-constituent ⊤");
});

test("the social act-factorization: locution/illocution/perlocution — the receiving dual of speaking", () => {
  const state = descend(admitSeed(BOUNDARY.socializing));
  const f = socialFactor("socializing", state);
  assert.equal(f.kind, "organizing.social-factorization");
  assert.equal(f.faculty, "socializing");
  assert.equal(f.axis, "truth"); // provisional, mirroring Gen-1
  assert.equal(f.dual, "receiving"); // the social-scale act is adjudication — the receiving dual

  // CONSOLIDATED from the face's OWN reading (not a generic descend): the receiving funnel —
  // locution (cover RECEIVED: the membrane's contributions) ⊇ illocution (charges HELD: the
  // face's cover) ⊇ perlocution (record CONVERGED: the face's held standing).
  assert.equal(f.locution, state.utterances.length, "locution = the cover received (membrane contributions)");
  assert.ok(f.locution >= f.illocution && f.illocution >= f.perlocution, "L ⊇ I ⊇ P (received → held → converged)");
  // belnap is the face's OWN adjudication census: illocution (cover) = full FOUR census,
  // perlocution (held / converged record) = non-absurd census.
  assert.equal(f.illocution, f.belnap.absurd + f.belnap.potential + f.belnap.active + f.belnap.stable, "illocution = cover = full census");
  assert.equal(f.perlocution, f.belnap.potential + f.belnap.active + f.belnap.stable, "perlocution = held = converged (non-absurd)");
  // the faculty→axis map is provisional but total, mirroring animating
  assert.equal(socialFactor("computing", state).axis, "knowledge");
  assert.equal(socialFactor("gaming", state).axis, "evidence");
});

test("the concrete spiral: real animating agents are literally members of the social base", () => {
  // two settled individuals (Gen-1 animating), sharing a standing concern
  const alice = agent("alice|seeks-truth", { identity: "alice", goal: { predicate: "seeks-truth" } });
  const bob = agent("bob|seeks-truth", { identity: "bob", goal: { predicate: "seeks-truth" } });

  const org = assemble([alice, bob], { identity: "the-seekers" });
  assert.equal(org.kind, "organizing.organization");
  assert.equal(org.identity, "the-seekers");
  // each animating agent is a distinct member of the social base
  assert.equal(org.members, 2);

  // the spiral composes literally: assemble's per-agent line === animating reseed's emission
  assert.deepEqual(reseedAgent("alice|seeks-truth", { identity: "alice" }).seed, ["alice|individuated"]);

  // an empty plurality founds no collective
  assert.throws(() => assemble([]), /no agents/);
});

test("the spiral up: federation = parallel composition ‖ with name-passing (cross-arena MV)", () => {
  // two constituent societies sharing the member `alice` (entity-mobility across polities)
  const guild = organize({ socializing: "alice|trusts-bob\nbob|trusts-alice" }, { identity: "guild" });
  const lodge = organize({ socializing: "alice|guides-carol\ncarol|guides-alice" }, { identity: "lodge" });
  const seed = reseedOrganization(guild);
  const fed = federate([guild, lodge]);

  assert.equal(guild.membrane.kind, "organizing.institution.membrane");
  assert.equal(guild.membrane.node, "guild|institution");
  assert.deepEqual(seed.seed, ["guild|institution"]);
  assert.equal(seed.scale, "federation");
  assert.ok(guild.membrane.seed.includes("alice|trusts-bob"));
  assert.equal(guild.membrane.witnesses.every((row) => row.e.bridge === "organizing.reseed"), true);
  assert.equal(fed.kind, "organizing.federation");
  assert.equal(fed.monoidal, "parallel-composition"); // federation IS ‖, not a protocol on top
  assert.equal(fed.constituents, 2);

  // name-passing: `alice` belongs to both constituents (nominal-set FSym(𝔸) mobility)
  assert.ok(fed.nameMobility >= 1);

  // the cross-arena decomposition + the genuine obstruction reading
  assert.ok(fed.shared >= 0);
  assert.ok(fed.contested >= 0);
  assert.ok(fed.federationOnly >= 0);
  assert.equal(fed.glued, fed.federationOnly === 0);
  assert.equal(fed.coordination, fed.glued ? "coordination-free" : "consensus-required");

  const disjoint = federate([
    organize({ socializing: "dora|keeps-ledger" }, { identity: "archive" }),
    organize({ socializing: "erin|keeps-garden" }, { identity: "garden" }),
  ]);
  const mobileOrg = federate([
    organize({ socializing: "dora|keeps-ledger" }, { identity: "archive" }),
    organize({ socializing: "erin|keeps-garden" }, { identity: "archive" }),
  ]);
  assert.equal(disjoint.nameMobility, 0, "disjoint organization nodes pass no shared FSym name");
  assert.ok(mobileOrg.nameMobility > disjoint.nameMobility, "an organization node present in two constituents is name-passing mobility");

  // an empty federation composes nothing
  assert.throws(() => federate([]), /no constituent/);
});

test("verification-tournament action: organizing supplies the organization and gaming settles the game", () => {
  const org = organize({ socializing: "claimant|asserts\nrefuter|challenges" }, { identity: "verification-office" });
  const tournament = verificationTournamentAction.run({
    id: "organizing-verification-office",
    organization: org,
    claims: [
      { id: "claim:organization-hosts-tournament", agent: "claimant" },
    ],
    refutations: [
      { id: "refute:organization-missing-game", against: "claim:organization-hosts-tournament", agent: "refuter" },
    ],
  }, {});

  assert.equal(verificationTournamentAction.codomainSchema.$ref, "gaming/verification-tournament");
  assert.equal(tournament.kind, "gaming.verification.tournament");
  assert.equal(tournament.transport.source, "organization-signal");
  assert.equal(tournament.transport.organizationSignal.sourceKind, "organizing.organization");
  assert.equal(tournament.transport.organizationSignal.identity, "verification-office");
  assert.equal(tournament.transport.organizationSignal.glued, org.glued);
  assert.equal(tournament.transport.organizationSignal.coordination, org.coordination);
  assert.deepEqual(tournament.swarm.peers.map((peer) => peer.peerId), ["claimant", "refuter"]);
  assert.deepEqual(tournament.plays.map((play) => play.match.playerIds), [["claimant", "refuter"]]);
  assert.deepEqual(tournament.plays.map((play) => [play.match.stream.source, play.match.stream.target]), [["claimant", "refuter"]]);
  assert.equal(tournament.verdict, "survived");
  assert.equal(tournament.certificate.stable, true);
  assert.equal(tournament.certificate.correspondence, true);
  assert.equal(tournament.certificate.proof.stable, true);
  assert.equal(tournament.certificate.proof.correspondsToSurvivor, true);
});

test("verification-tournament action: theatre work-locus claims derive the game", () => {
  const tournament = verificationTournamentAction.run({
    id: "organizing-work-locus-derived-game",
    organizationSignal: {
      kind: "organizing.theatre.agent-signal",
      session: "claimant-session",
      harness: "codex",
      activeClaims: [
        {
          kind: "organizing.theatre.active-work-locus-claim",
          claimId: "lib-gaming-verification",
          session: "claimant-session",
          harness: "codex",
          paths: ["lib/gaming"],
          reason: "gaming verification tournament is the live settlement surface",
        },
      ],
      claimConflicts: [
        {
          kind: "organizing.theatre.work-locus-claim-conflict",
          relation: "claimed-locus-overlap",
          path: "lib/gaming",
          reason: "different sessions have overlapping active claims",
          left: {
            claimId: "lib-gaming-verification",
            session: "claimant-session",
            harness: "codex",
            path: "lib/gaming",
          },
          right: {
            claimId: "lib-gaming-refutation",
            session: "refuter-session",
            harness: "claude",
            path: "lib/gaming",
          },
        },
      ],
    },
  }, {});

  assert.equal(tournament.kind, "gaming.verification.tournament");
  assert.deepEqual(tournament.dialectica.witnesses, ["claim:lib-gaming-verification"]);
  assert.deepEqual(tournament.dialectica.challenges, ["refute:lib-gaming-refutation:against:lib-gaming-verification"]);
  assert.deepEqual(tournament.swarm.peers.map((peer) => peer.peerId), ["claude:refuter-session", "codex:claimant-session"]);
  assert.deepEqual(tournament.plays.map((play) => play.match.playerIds), [["claude:refuter-session", "codex:claimant-session"]]);
  assert.deepEqual(tournament.plays.map((play) => [play.match.stream.source, play.match.stream.target]), [["codex:claimant-session", "claude:refuter-session"]]);
  assert.equal(tournament.transport.source, "organization-signal");
  assert.equal(tournament.verdict, "survived");
  assert.equal(tournament.certificate.survivingClaim, "claim:lib-gaming-verification");
  assert.equal(tournament.certificate.stable, true);
  assert.equal(tournament.certificate.correspondence, true);
  assert.equal(tournament.certificate.proof.fixedPoint, true);
  assert.equal(tournament.certificate.proof.correspondsToSurvivor, true);
  assert.ok(tournament.certificate.proof.obligations.every((step) => step.maturity === "Built+green"));
  assert.equal(
    tournament.certificate.proof.obligations.find((step) => step.obligation === "strategy-play-witnessed").satisfied,
    true,
  );
  assert.equal(
    tournament.certificate.formalization.certificateTheorem,
    "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_reading",
  );
  assert.equal(tournament.certificate.formalization.certificateTheoremMaturity, "Proven-in-Lean");
  assert.equal(tournament.certificate.formalization.leanMaturity, "Roadmap");
});

test("COHESION: structural balance (Cartwright–Harary factions) — the scale-2 lift of the agent's coherence", () => {
  // a balanced signed network splits into ≤2 antagonistic factions (a stable polity).
  const balanced = cohesion({ socializing: "a|likes b\na|dislikes c\nb|dislikes c" });
  assert.equal(balanced.kind, "organizing.cohesion");
  assert.equal(balanced.balanced, true);
  assert.equal(balanced.factions, 2, "two antagonistic factions {a,b} vs {c}");
  assert.equal(balanced.dissonance, 0);
  // the balanced 2-faction polity is ALSO clusterable (balance ⟹ clusterability), with no internal enmity.
  assert.equal(balanced.clusterable, true);
  assert.equal(balanced.frustration, 0);
  // a FRUSTRATED network (an imbalanced triad: ally-of-ally is enemy) is factionally unstable — no
  // two-camp split, AND the internal enmity within the {a,b,c} positive coalition breaks clusterability.
  const frustrated = cohesion({ socializing: "a|likes b\nb|likes c\na|dislikes c" });
  assert.equal(frustrated.balanced, false);
  assert.equal(frustrated.dissonance, 1, "the H¹/Z₂ obstruction = factional instability");
  assert.equal(frustrated.clusterable, false, "the − tie a–c falls inside the positive coalition {a,b,c}");
  assert.equal(frustrated.frustration, 1);

  // THE SCALE-2 ENRICHMENT (Davis 1967): a TRIPOLAR polity — three mutually-hostile blocs — is NOT
  // 2-balanced (an odd negative cycle, Heider calls it unstable) yet IS cleanly CLUSTERABLE into 3
  // coalitions. This is the multipolar structure a single agent's belief graph never needs; the old
  // flat 2-camp `cohesion` mis-read it as incohesive.
  const tripolar = cohesion({ socializing: "a|dislikes b\nb|dislikes c\na|dislikes c" });
  assert.equal(tripolar.balanced, false, "three negative edges = an odd cycle, not 2-balanced");
  assert.ok(tripolar.dissonance > 0, "the Heider reading still flags it");
  assert.equal(tripolar.clusterable, true, "but Davis: three singleton coalitions, hostility only between");
  assert.equal(tripolar.factions, 3, "a tripolar world: {a} {b} {c}");
  assert.equal(tripolar.frustration, 0, "no negative tie inside any coalition");
});
