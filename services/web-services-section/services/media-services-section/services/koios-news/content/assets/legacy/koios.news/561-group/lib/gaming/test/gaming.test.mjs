// Theorem-shaped tests for gaming-as-multi-agent-playing (full CGS), run against
// the built dist. Each name is a falsifiable claim from
// dev/docs/notes/2026-06-21-gaming-as-multi-agent-playing.md: gaming is playing
// LIFTED along the symmetry groupoid (the agent-sheaf) — its owned carriers are
// the arena-with-symmetry (gaming/arena), the concurrent strategy σ:S→A^⊥‖B
// (gaming/strategy), the ‖ parallel cut (gaming/parallel), and the FSym(𝔸)
// nominal layer (gaming/symmetry). The characteristic morphism is the
// multi-agent cut: two dual designs interact over ‖, converging to the Daimon ⊤.
import { test } from "node:test";
import assert from "node:assert/strict";

import { induceBins } from "@emsenn/relating";
import {
  actions,
  gamingActions,
  arenaAction,
  strategyAction,
  liftAction,
  parallelAction,
  matchAction,
  poolAction,
  ticketAction,
  matchmakeAction,
  libp2pSwarmAction,
  libp2pStreamAction,
  libp2pPubsubAction,
  symmetryAction,
  verificationTournamentAction,
  verificationTournamentCarrier,
  // the realized object-maps and their source-side algebra (reused verbatim from
  // @emsenn/playing/ludics, re-exported through gaming's structuring barrel) — the
  // preservation tests below call these directly so a metadata stub cannot pass.
  dialecticaObjectToArena,
  dualDialecticaArena,
  nominalArenaOf,
  cairesPfenningArena,
  dialecticaObject,
  dualDialectica,
  sessionEnd,
  sessionSend,
  propositionOfSession,
  arena as arenaOf,
  eventStructure,
  event,
  positive,
  negative,
  finitePermutation,
  eventName,
  decodeArena,
  isArena,
} from "../dist/index.mjs";

// dispatch a verb through the four-faced apex and parse its JSON wire output.
const dispatchOf = induceBins(actions, { packageName: "@emsenn/gaming" }).dispatch;
const runVerb = (verb, inputObj) => {
  const out = dispatchOf([verb], JSON.stringify(inputObj), { caller: { transport: "test" } });
  if (out.code !== 0) throw new Error(`${verb} failed: ${out.stderr}`);
  return JSON.parse(out.stdout);
};

// two dual designs at the root locus: Proponent (potential, t) and Opponent
// (active, f). Their knowledge-join potential ⊔_k active = ⊤ (stable) — the cut.
const P = { entries: [{ locus: [], charge: "potential" }] };
const O = { entries: [{ locus: [], charge: "active" }] };

test("schema-first: EVERY action (incl. legacy) declares a codomainSchema (bare descent-path carrier $id)", () => {
  // wave 2 finished: the WHOLE surface is schema-first end to end — every leg
  // (the multi-agent scale-2 legs AND the running/anthropology legs that
  // predated the schema-first surface) declares the carrier $id it produces.
  for (const act of actions) {
    assert.ok(act.codomainSchema, `${act.verb} has a codomainSchema`);
    assert.ok(
      typeof act.codomainSchema.$ref === "string" && act.codomainSchema.$ref.startsWith("gaming/"),
      `${act.verb} codomainSchema $ref is a bare gaming/ descent path`,
    );
  }
  // gaming's owned multi-agent carriers are produced by these morphisms
  assert.equal(arenaAction.codomainSchema.$ref, "gaming/arena");
  assert.equal(strategyAction.codomainSchema.$ref, "gaming/strategy");
  assert.equal(parallelAction.codomainSchema.$ref, "gaming/parallel");
  assert.equal(symmetryAction.codomainSchema.$ref, "gaming/symmetry");
  assert.equal(poolAction.codomainSchema.$ref, "gaming/pool");
  assert.equal(ticketAction.codomainSchema.$ref, "gaming/ticket-admission");
  assert.equal(matchmakeAction.codomainSchema.$ref, "gaming/matchmaking-result");
  assert.equal(libp2pSwarmAction.codomainSchema.$ref, "gaming/libp2p-swarm");
  assert.equal(libp2pStreamAction.codomainSchema.$ref, "gaming/libp2p-stream");
  assert.equal(libp2pPubsubAction.codomainSchema.$ref, "gaming/libp2p-pubsub");
  assert.equal(verificationTournamentAction.codomainSchema.$ref, "gaming/verification-tournament");
  // the playing-lift produces the same concurrent-strategy carrier
  assert.equal(liftAction.codomainSchema.$ref, "gaming/strategy");
});

test("the multi-agent (scale-2 CGS) verbs are present alongside the preserved core", () => {
  const verbs = new Set(actions.map((a) => a.verb));
  // wave: the multi-agent surface (incl. the realized CGS concurrency-paradigm
  // object-map embeddings)
  for (const v of [
    "arena", "strategy", "lift", "parallel", "compose", "match", "symmetry", "equivariant",
    "pool", "ticket", "matchmake",
    "libp2p-swarm", "libp2p-stream", "libp2p-pubsub",
    "embed-dialectica", "embed-nominal", "embed-session",
    "verification-tournament",
  ]) {
    assert.ok(verbs.has(v), `multi-agent verb ${v} present`);
  }
  // capability-preserving: the existing core is still here
  for (const v of [
    "mask", "sides", "game", "play", "settle", "interact", "analyze",
    "read-strategy", "read-regime", "read-flow", "read-deep-play",
    "read-rhetorics", "read-lusory", "embed-culture",
  ]) {
    assert.ok(verbs.has(v), `core verb ${v} preserved`);
  }
  assert.equal(gamingActions.length, 18);
});

test("arena: build an arena-with-symmetry from a demo — the scale-2 object (E,≤,#,Ṽ)", () => {
  const a = runVerb("arena", { demo: "boolean" });
  assert.ok(a.structure, "the arena carries its prime event structure");
  assert.ok(Array.isArray(a.symmetry), "the arena carries its symmetry groupoid (the agent-sheaf)");
});

test("strategy: a concurrent strategy over an arena is judged for the four CGS conditions", () => {
  // the empty play is prefix-closed and receptive over the dialogue arena's q<=a:
  // q (negative/Opponent) is enabled at the root and must be admitted for receptivity.
  const s = runVerb("strategy", { demo: "dialogue", plays: [[], ["q"]] });
  assert.equal(s.report.kind, "game.strategy.report");
  assert.equal(typeof s.report.wellFormed, "boolean");
  assert.ok(s.report.receptivity.kind, "receptivity is judged");
  assert.ok(s.report.innocence.kind, "innocence is judged");
  assert.ok(s.report.symmetryInvariance.kind, "symmetry-invariance is judged");
  assert.ok(Array.isArray(s.plays), "the strategy carries its plays");
});

test("THE MULTI-AGENT CUT: parallel ‖ of two dual designs converges to the Daimon ⊤", () => {
  const report = runVerb("parallel", { designA: P, designB: O });
  const meeting = report.meetings[0];
  assert.equal(meeting.daimonized, true);        // the cut converges
  assert.equal(meeting.joined, "stable");        // potential ⊔_k active = ⊤ (stable)
  assert.deepEqual(report.daimonLoci, [[]]);      // at the root locus
  assert.equal(report.normalForm.entries[0].charge, "stable");
});

test("a NON-dual parallel cut does NOT reach the Daimon (the verdict discriminates)", () => {
  const report = runVerb("parallel", { designA: P, designB: P });
  if (report.meetings.length > 0) assert.equal(report.meetings[0].daimonized, false);
  assert.deepEqual(report.daimonLoci, []);
});

test("ANTI-FAKE: compose is playing's REAL HO cut (interface HIDDEN), not the union-join shadow", () => {
  // Two COMPOSABLE designs over the cut-interface convention of
  // @emsenn/playing/ludics::composition: the A side lives under DOMAIN_SIDE `0·…`,
  // the B/C side under CODOMAIN_SIDE `1·1·…`.
  //   f : A ⊸ B   private A content at 0.3 ; B (codomain) give-up (Daimon) at 1.1.7
  //   g : B ⊸ C   B (domain) Opponent move at 0.7 ; private C content at 1.1.9
  // The shared interface B is the side-less sub-locus `7` (f's 1.1.7 ↔ g's 0.7).
  const f = { entries: [{ locus: [0, 3], charge: "potential" }, { locus: [1, 1, 7], charge: "stable" }] };
  const g = { entries: [{ locus: [0, 7], charge: "active" }, { locus: [1, 1, 9], charge: "potential" }] };

  const composite = runVerb("compose", { designA: f, designB: g });
  const shadow = runVerb("parallel", { designA: f, designB: g });

  // loci in Design entries are address arrays; use JSON.stringify as a stable key for Set/has ops
  const compositeLoci = new Set(composite.composite.entries.map((e) => JSON.stringify(e.locus)));
  const shadowLoci = new Set(shadow.normalForm.entries.map((e) => JSON.stringify(e.locus)));

  // 1. The cut is DEFINED: the B-dispute converges at the Daimon collision.
  assert.equal(composite.converged, true, "the composed play converges on the shared interface B");
  // interface is still locus-key strings (the hidden interface loci, encoded as dot-path strings)
  assert.deepEqual([...composite.interface].sort(), ["0.7", "1.1.7"], "the cut interface is the shared B (f's 1.1.7 ↔ g's 0.7)");

  // 2. THE SHADOW IS THE UNION-JOIN: interactionReport's normalForm keeps the
  //    full union of BOTH supports, including each design's private far-side content.
  assert.deepEqual([...shadowLoci].sort(), ["[0,3]", "[0,7]", "[1,1,7]", "[1,1,9]"], "the shadow keeps the UNION of both supports");

  // 3. THE REAL CUT HIDES THE INTERFACE / DROPS PRIVATE FAR-SIDE CONTENT: the
  //    composite is NOT the union. f's private domain locus 0.3 and g's private
  //    codomain locus 1.1.9 — which the union-join retains — are ABSENT from the
  //    composite. A union-join compose would (wrongly) contain them; this is the
  //    assertion that fails against the shadow and passes only against playing's cut.
  assert.ok(!compositeLoci.has("[0,3]"), "real cut drops f's private domain content 0.3 (the union-join would keep it)");
  assert.ok(!compositeLoci.has("[1,1,9]"), "real cut drops g's private codomain content 1.1.9 (the union-join would keep it)");
  assert.ok(compositeLoci.size < shadowLoci.size, "the real composite is a STRICT reduction of the union, not the union join");
  assert.notDeepEqual([...compositeLoci].sort(), [...shadowLoci].sort(), "compose ≠ parallel: the real cut is not interactionReport");
});

// ── THE GENUINE MULTI-AGENT MATCH (anti-fake vs the binary first-two shadow) ──
// federation-is-parallel-composition.md: CGS's ‖ IS parallel composition = concurrent
// multi-player, and the joint interaction of N players is the ‖-combine = the iterated
// knowledge-join ⊔_k = superpose over the WHOLE roster. The discriminator below is a
// roster of THREE where convergence and the joint support exist ONLY because of the 3rd
// player: a first-two-only shadow would neither converge nor carry the 3rd's loci.

// THREE players. P1, P2 commit private potential loci (no daimon among them). P3 is the
// dual that closes the play: it commits `active` at P1's locus 0 (potential ⊔ active = ⊤),
// AND `active` at locus 2 which NO other player commits. So the joint match converges at 0
// and the jointForm's support INCLUDES locus 2 — impossible for a first-two-only fold.
const M1 = { entries: [{ locus: [0], charge: "potential" }] };
const M2 = { entries: [{ locus: [1], charge: "potential" }] };
const M3 = { entries: [{ locus: [0], charge: "active" }, { locus: [2], charge: "active" }] };

test("MATCH FOLDS OVER ALL PLAYERS: a 3-design roster converges via the 3rd, and the jointForm carries a locus ONLY the 3rd commits (anti-fake vs first-two)", () => {
  const all3 = runVerb("match", { designs: [M1, M2, M3] });
  assert.equal(all3.kind, "game.computer.match");
  assert.equal(all3.players, 3, "the fold counts ALL three participants");

  // CONVERGENCE COMES FROM THE WHOLE ROSTER: the daimon is the P1↔P3 collision at locus 0.
  assert.equal(all3.converged, true, "the joint match converges — the N-way ⊔_k collides at ⊤");
  assert.deepEqual(all3.daimonLoci, [[0]], "the joint give-up locus is the P1↔P3 collision at 0");

  // THE JOINT FORM CARRIES THE 3rd PLAYER'S OWN LOCUS: locus [2] is committed by NO design
  // but P3. Its presence in jointForm proves the fold reached the 3rd player — a first-two
  // shadow (superpose(M1,M2)) could never produce it. This is the load-bearing anti-fake.
  // loci are address arrays; JSON.stringify gives a stable key for Map lookup.
  const support = new Map(all3.jointForm.entries.map((e) => [JSON.stringify(e.locus), e.charge]));
  assert.equal(support.get("[2]"), "active", "jointForm includes locus [2] — committed ONLY by the 3rd player");
  assert.equal(support.get("[0]"), "stable", "the N-way join at [0] is ⊤ (potential ⊔ active) — the collision");
  assert.equal(support.get("[1]"), "potential", "the 2nd player's private locus survives the fold too");

  // THE FIRST-TWO-ONLY SHADOW IS PROVABLY DIFFERENT: match over just {P1,P2} neither
  // converges NOR carries locus [2]. If `match` were the old binary first-two, all3 would
  // equal this — it does not.
  const first2 = runVerb("match", { designs: [M1, M2] });
  assert.equal(first2.converged, false, "the first-two pair does NOT converge (no dual among them)");
  assert.ok(!first2.jointForm.entries.some((e) => JSON.stringify(e.locus) === "[2]"),
    "the first-two shadow has NO locus [2] — so all3 ≠ first2 proves match is NOT binary-first-two");
  assert.notDeepEqual(all3.daimonLoci, first2.daimonLoci, "the 3-way verdict differs from the first-two verdict");
});

test("SETTLE USES THE JOINT VERDICT: settle over a 3-design game records ALL three (designIds + joint report), not designs[0]/[1]", () => {
  // Build a running game (real arena/play snapshot) and enroll all three designs, then settle.
  const base = runVerb("game", { demo: "boolean", id: "g3" });
  const game3 = { ...base, designs: [
    { id: "p1", design: M1 },
    { id: "p2", design: M2 },
    { id: "p3", design: M3 },
  ] };

  const settled = runVerb("settle", { game: game3 });
  const entry = settled.history[settled.history.length - 1];

  assert.equal(entry.kind, "game.computer.settle");
  // ALL THREE participants are recorded (the JOINT verdict), in roster order — not a pair.
  assert.deepEqual(entry.designIds, ["p1", "p2", "p3"], "settle records every participant id (the joint roster)");
  assert.equal(entry.converged, true, "the joint settle converges over the WHOLE roster");
  // the joint report's normalForm is the ‖-combine and carries the 3rd player's locus 2.
  assert.deepEqual(entry.report.daimonLoci, [[0]], "the joint give-up locus is the P1↔P3 collision at 0");
  assert.ok(entry.report.normalForm.entries.some((e) => JSON.stringify(e.locus) === "[2]" && e.charge === "active"),
    "the settle's joint report includes locus [2] — committed ONLY by the 3rd player (not a first-two shadow)");
});

test("A NON-DUAL ROSTER DOES NOT CONVERGE: three mutually non-dual designs reach no Daimon", () => {
  // three players each committing potential at a private locus — no two are dual, so the
  // N-way join never reaches ⊤ at any shared locus: the multi-agent match must NOT converge.
  const N1 = { entries: [{ locus: [0], charge: "potential" }] };
  const N2 = { entries: [{ locus: [1], charge: "potential" }] };
  const N3 = { entries: [{ locus: [2], charge: "potential" }] };
  const nondual = runVerb("match", { designs: [N1, N2, N3] });
  assert.equal(nondual.players, 3, "all three were folded");
  assert.equal(nondual.converged, false, "no two players are dual, so the joint match does NOT converge");
  assert.deepEqual(nondual.daimonLoci, [], "there is no Daimon collision anywhere in the roster");
  // and the join is a plain union of the three private commitments (no locus reaches ⊤).
  assert.ok(nondual.jointForm.entries.every((e) => e.charge === "potential"),
    "every locus stays at its committed potential — nothing collided into ⊤");
});

test("the match codomain is the gaming/match carrier ($id), schema-first like every other leg", () => {
  assert.equal(matchAction.codomainSchema.$ref, "gaming/match");
  assert.equal(matchAction.verb, "match");
});

test("LOBBY: pool -> ticket -> match forms a well-typed arena over its admitted players", () => {
  let pool = runVerb("pool", { id: "ranked", demo: "empty", matchSize: 2 });
  pool = runVerb("ticket", { pool, player: "alice", design: P }).pool;
  pool = runVerb("ticket", { pool, player: "bob", design: O }).pool;

  const result = runVerb("matchmake", { pool });
  assert.equal(result.matches.length, 1, "one full match is formed from two tickets");
  const [formed] = result.matches;
  assert.deepEqual(formed.playerIds, ["alice", "bob"], "the match names the admitted players");
  assert.equal(formed.players, 2);
  assert.equal(formed.converged, true, "the match reuses the existing gaming/match verdict over ticket designs");
  assert.deepEqual(formed.daimonLoci, [[]]);

  const matchArena = decodeArena(formed.arena);
  assert.equal(isArena(matchArena), true, "the formed match arena decodes to the existing Arena carrier");
  assert.deepEqual(matchArena.structure.events.map((e) => e.id).sort(), ["player:alice", "player:bob"]);
  assert.ok(
    matchArena.symmetry.some((bij) => bij.some((pair) => pair[0] === "player:alice" && pair[1] === "player:bob")),
    "the arena carries the FSym transposition of the admitted player names",
  );
});

test("LOBBY LAW: matchmaking is order-independent under FSym player-name permutation", () => {
  const fill = (players) => {
    let pool = runVerb("pool", { id: "bracket", demo: "empty", matchSize: 2 });
    for (const player of players) pool = runVerb("ticket", { pool, player }).pool;
    return runVerb("matchmake", { pool }).matches.map((m) => m.playerIds.join("+")).sort();
  };

  assert.deepEqual(
    fill(["dana", "cai", "bea", "ari"]),
    fill(["ari", "bea", "cai", "dana"]),
    "commuting queue order yields the same brackets up to the player-name symmetry",
  );
});

test("LOBBY LAW: re-queuing is once-only; a ticket consumed into a match cannot be matched again", () => {
  let pool = runVerb("pool", { id: "once", demo: "empty", matchSize: 2 });
  const firstAlice = runVerb("ticket", { pool, player: "alice" });
  pool = firstAlice.pool;
  const replayAlice = runVerb("ticket", { pool, player: "alice" });
  assert.equal(replayAlice.accepted, false);
  assert.equal(replayAlice.reason, "already-queued");
  assert.equal(replayAlice.pool.tickets.length, 1, "re-queueing while queued does not mint another ticket");

  pool = runVerb("ticket", { pool, player: "bob" }).pool;
  const firstRun = runVerb("matchmake", { pool });
  assert.equal(firstRun.matches.length, 1);
  pool = firstRun.pool;

  const matchedReplay = runVerb("ticket", { pool, player: "alice" });
  assert.equal(matchedReplay.accepted, false);
  assert.equal(matchedReplay.reason, "already-matched");
  assert.equal(matchedReplay.pool.tickets.length, 2, "re-queueing after match keeps the consumed-ticket ledger fixed");

  const secondRun = runVerb("matchmake", { pool: matchedReplay.pool });
  assert.equal(secondRun.matches.length, 0, "the consumed tickets are not delivered to another match");
});

test("LIBP2P: peer join/leave coherently updates the swarm roster, peerstore, DHT, and arena", () => {
  let swarm = runVerb("libp2p-swarm", { id: "under-captp", peers: ["bob"], join: ["alice", "cai"] });
  assert.deepEqual(swarm.peers.map((peer) => peer.peerId), ["alice", "bob", "cai"]);
  assert.deepEqual(swarm.peerstore.map((entry) => entry.peerId), ["alice", "bob", "cai"]);
  assert.deepEqual(swarm.dht.map((entry) => entry.peerId), ["alice", "bob", "cai"]);

  let arena = decodeArena(swarm.arena);
  assert.deepEqual(arena.structure.events.map((e) => e.id).sort(), ["peer:alice", "peer:bob", "peer:cai"]);
  assert.ok(
    arena.symmetry.some((bij) => bij.some((pair) => pair[0] === "peer:alice" && pair[1] === "peer:bob")),
    "joining peers installs FSym peer-name mobility into the arena roster",
  );

  swarm = runVerb("libp2p-swarm", { swarm, leave: ["bob"] });
  assert.deepEqual(swarm.peers.map((peer) => peer.peerId), ["alice", "cai"]);
  assert.deepEqual(swarm.peerstore.map((entry) => entry.peerId), ["alice", "cai"]);
  assert.deepEqual(swarm.dht.map((entry) => entry.peerId), ["alice", "cai"]);
  arena = decodeArena(swarm.arena);
  assert.deepEqual(arena.structure.events.map((e) => e.id).sort(), ["peer:alice", "peer:cai"]);
  assert.ok(!arena.structure.events.some((e) => e.id === "peer:bob"), "leaving removes the peer locus from the arena roster");
});

test("LIBP2P: a multiplexed stream is FSym name-passing into a source/target sub-arena", () => {
  const swarm = runVerb("libp2p-swarm", { id: "streams", peers: ["alice", "bob", "cai"] });
  const stream = runVerb("libp2p-stream", {
    swarm,
    streamId: "s1",
    protocol: "/captp/1.0.0",
    source: "alice",
    target: "bob",
  });

  assert.equal(stream.multiplexed, true);
  assert.equal(stream.protocol, "/captp/1.0.0");
  assert.deepEqual(stream.namePassing.mappings, [["alice", "bob"], ["bob", "alice"]]);

  const subArena = decodeArena(stream.subArena);
  assert.deepEqual(subArena.structure.events.map((e) => e.id).sort(), ["stream:s1:alice", "stream:s1:bob"]);
  assert.ok(
    subArena.symmetry.some((bij) => bij.some((pair) => pair[0] === "stream:s1:alice" && pair[1] === "stream:s1:bob")),
    "dialing/multiplexing opens a sub-arena with the source/target FSym transposition",
  );
});

test("LIBP2P: pubsub delivery is order-independent under arena symmetry", () => {
  const left = runVerb("libp2p-swarm", { id: "pubsub", peers: ["dana", "alice", "cai", "bea"] });
  const right = runVerb("libp2p-swarm", { id: "pubsub", peers: ["bea", "cai", "alice", "dana"] });

  const publishLeft = runVerb("libp2p-pubsub", { swarm: left, topic: "arena", messageId: "m1", from: "alice" });
  const publishRight = runVerb("libp2p-pubsub", { swarm: right, topic: "arena", messageId: "m1", from: "alice" });

  assert.equal(publishLeft.broadcast, true);
  assert.equal(publishLeft.symmetryInvariant, true);
  assert.deepEqual(
    publishLeft.deliveries.map((delivery) => delivery.to),
    ["bea", "cai", "dana"],
    "broadcast recipients are the concurrent roster minus the publisher, sorted by peer name",
  );
  assert.deepEqual(
    publishLeft.deliveries,
    publishRight.deliveries,
    "permuting peer join order gives the same pubsub delivery set",
  );
});

test("verification-tournament: Dialectica claim/refutation play settles to a Nash certificate", () => {
  const tournament = runVerb("verification-tournament", {
    id: "organization-verify",
    agents: ["claimant-a", "refuter-a", "refuter-b"],
    claims: [
      { id: "claim:ick-is-one-ledger", text: "ICK protocols are one witness ledger", agent: "claimant-a" },
    ],
    refutations: [
      { id: "refute:activitypub-is-separate", against: "claim:ick-is-one-ledger", agent: "refuter-a" },
      { id: "refute:chat-is-separate", against: "claim:ick-is-one-ledger", agent: "refuter-b" },
    ],
  });

  assert.equal(tournament.kind, "gaming.verification.tournament");
  assert.equal(verificationTournamentCarrier.validate(tournament), true);
  assert.deepEqual(tournament.dialectica.witnesses, ["claim:ick-is-one-ledger"]);
  assert.deepEqual(tournament.dialectica.challenges, ["refute:activitypub-is-separate", "refute:chat-is-separate"]);
  assert.ok(tournament.dialectica.arena.structure.events.some((event) => event.id === "P:claim:ick-is-one-ledger"));
  assert.equal(tournament.swarm.kind, "gaming.libp2p.swarm");
  assert.deepEqual(tournament.swarm.peers.map((peer) => peer.peerId), ["claimant-a", "refuter-a", "refuter-b"]);
  assert.equal(tournament.transport.kind, "gaming.verification.transport");
  assert.equal(tournament.transport.swarm, "gaming.libp2p.structural-swarm");
  assert.equal(tournament.transport.source, "agents");
  assert.equal(tournament.transport.messages.length, 5, "claim, two refutations, and two settled plays are broadcast");
  assert.ok(tournament.transport.messages.every((message) => message.pubsub.symmetryInvariant === true));
  assert.equal(tournament.matchmaking.kind, "gaming.lobby.matchmaking");
  assert.equal(tournament.plays.length, 2);
  assert.deepEqual(tournament.plays.map((play) => play.match.kind), [
    "gaming.verification.play-match",
    "gaming.verification.play-match",
  ]);
  assert.deepEqual(tournament.plays.map((play) => play.match.playerIds), [
    ["claimant-a", "refuter-a"],
    ["claimant-a", "refuter-b"],
  ]);
  assert.deepEqual(tournament.plays.map((play) => play.match.stream.kind), [
    "gaming.libp2p.stream",
    "gaming.libp2p.stream",
  ]);
  assert.deepEqual(tournament.plays.map((play) => [play.match.stream.source, play.match.stream.target]), [
    ["claimant-a", "refuter-a"],
    ["claimant-a", "refuter-b"],
  ]);
  assert.equal(tournament.dominanceSeed, "claim:ick-is-one-ledger|refute:activitypub-is-separate\nclaim:ick-is-one-ledger|refute:chat-is-separate");
  assert.equal(tournament.equilibrium.kind, "gaming.reachability");
  assert.equal(tournament.equilibrium.pureEquilibrium, true);
  assert.equal(tournament.namedEquilibrium.kind, "gaming.verification.equilibrium");
  assert.equal(tournament.namedEquilibrium.fixedPoint, true);
  assert.equal(tournament.namedEquilibrium.pure, true);
  assert.deepEqual(tournament.namedEquilibrium.stableStrategies, ["claim:ick-is-one-ledger"]);
  assert.equal(tournament.namedEquilibrium.settledStrategy, "claim:ick-is-one-ledger");
  assert.equal(tournament.namedEquilibrium.settledRole, "claim");
  assert.equal(tournament.namedEquilibrium.correspondence.equilibriumMatchesSurvivor, true);
  assert.equal(tournament.verdict, "survived");
  assert.deepEqual(tournament.survivingClaims, ["claim:ick-is-one-ledger"]);
  assert.equal(tournament.certificate.kind, "gaming.verification.nash-certificate");
  assert.equal(tournament.certificate.stable, true);
  assert.equal(tournament.certificate.noProfitableDeviation, true);
  assert.equal(tournament.certificate.fixedPoint, true);
  assert.equal(tournament.certificate.dialecticaWitnessSurvives, true);
  assert.equal(tournament.certificate.correspondence, true);
  assert.equal(tournament.certificate.equilibriumStrategy, "claim:ick-is-one-ledger");
  assert.equal(tournament.certificate.survivingClaim, "claim:ick-is-one-ledger");
  assert.equal(tournament.certificate.proof.kind, "gaming.verification.proof-witness");
  assert.equal(tournament.certificate.proof.stable, true);
  assert.equal(tournament.certificate.proof.fixedPoint, true);
  assert.equal(tournament.certificate.proof.correspondsToSurvivor, true);
  assert.deepEqual(tournament.certificate.proof.obligations.map((step) => step.obligation), [
    "dialectica-object-map",
    "transport-roster-witnessed",
    "matchmaking-once-only",
    "strategy-play-witnessed",
    "monotone-fixed-point",
    "nash-stability",
    "survivor-correspondence",
  ]);
  assert.ok(tournament.certificate.proof.obligations.every((step) => step.satisfied === true));
  assert.ok(tournament.certificate.proof.obligations.every((step) => step.maturity === "Built+green"));
  assert.match(
    tournament.certificate.proof.obligations.find((step) => step.obligation === "matchmaking-once-only").evidence,
    /3 libp2p peers admitted once/,
  );
  assert.match(
    tournament.certificate.proof.obligations.find((step) => step.obligation === "strategy-play-witnessed").evidence,
    /2 claim\/refutation plays are pairwise matchmade and streamed between admitted strategy agents/,
  );
  assert.equal(tournament.certificate.formalization.kind, "gaming.verification.formalization-boundary");
  assert.equal(
    tournament.certificate.formalization.certificateTheorem,
    "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_reading",
  );
  assert.equal(tournament.certificate.formalization.certificateTheoremMaturity, "Proven-in-Lean");
  assert.equal(tournament.certificate.formalization.certificateMaturity, "Built+green");
  assert.equal(tournament.certificate.formalization.leanMaturity, "Roadmap");
  assert.equal(tournament.certificate.formalization.proofBoundary, "finite-runtime-certificate-not-lean-theorem");
  assert.equal(
    tournament.certificate.formalization.obligation,
    "formalize-verification-tournament-fixed-point-correspondence",
  );
  assert.deepEqual(tournament.certificate.formalization.leanArtifacts, [
    "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_reading",
    "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_obligations",
    "RelMath.Gaming.VerificationTournament.settled_verdict_of_closure_certificate",
  ]);
  assert.ok(tournament.certificate.evidence.some((line) => line.includes("unique dominant settled strategy")));
  assert.equal(tournament.certificate.maturity, "Built+green");
});

test("verification-tournament: organizing theatre signal peers become the libp2p swarm roster", () => {
  const tournament = runVerb("verification-tournament", {
    id: "organization-live-signal",
    organizationSignal: {
      kind: "organizing.theatre.agent-signal",
      session: "observer-session",
      harness: "codex",
      activeClaims: [
        { session: "claimant-session", harness: "codex", claimId: "claim-work", paths: ["lib/gaming"] },
      ],
      peerClaims: [
        { session: "refuter-session", harness: "claude", claimId: "refute-work", paths: ["lib/gaming"] },
      ],
      peerCapabilities: [
        { holder: "https://dev.bare-cedar-fog.emsenn.net/agents/codex/capability-peer" },
      ],
      activityPub: {
        actorCount: 4,
        camps: [{ id: "camp:codex" }],
      },
    },
    claims: [
      { id: "claim:organization-signal-runs", agent: "codex:claimant-session" },
    ],
    refutations: [
      { id: "refute:organization-signal-missing", against: "claim:organization-signal-runs", agent: "claude:refuter-session" },
    ],
  });

  assert.equal(tournament.transport.source, "organization-signal");
  assert.equal(tournament.transport.organizationSignal.kind, "gaming.verification.organization-signal");
  assert.equal(tournament.transport.organizationSignal.sourceKind, "organizing.theatre.agent-signal");
  assert.equal(tournament.transport.organizationSignal.identity, null);
  assert.equal(tournament.transport.organizationSignal.observer, "codex:observer-session");
  assert.equal(tournament.transport.organizationSignal.members, null);
  assert.equal(tournament.transport.organizationSignal.glued, null);
  assert.equal(tournament.transport.organizationSignal.coordination, null);
  assert.equal(tournament.transport.organizationSignal.activeClaims, 1);
  assert.equal(tournament.transport.organizationSignal.peerClaims, 1);
  assert.equal(tournament.transport.organizationSignal.activityPubActors, 4);
  assert.deepEqual(tournament.swarm.peers.map((peer) => peer.peerId), [
    "camp:codex",
    "claude:refuter-session",
    "codex:claimant-session",
    "codex:observer-session",
    "https://dev.bare-cedar-fog.emsenn.net/agents/codex/capability-peer",
  ]);
  assert.equal(tournament.verdict, "survived");
  assert.equal(tournament.certificate.correspondence, true);
});

test("verification-tournament: organizing organization coordination is preserved on the transport summary", () => {
  const tournament = runVerb("verification-tournament", {
    id: "organization-core",
    organization: {
      kind: "organizing.organization",
      identity: "verification-office",
      members: 2,
      glued: true,
      coordination: "coordination-free",
    },
    claims: [
      { id: "claim:organization-settles", agent: "organizing:claimant" },
    ],
    refutations: [
      { id: "refute:organization-open", against: "claim:organization-settles", agent: "organizing:refuter" },
    ],
  });

  assert.equal(tournament.transport.source, "organization-signal");
  assert.equal(tournament.transport.organizationSignal.kind, "gaming.verification.organization-signal");
  assert.equal(tournament.transport.organizationSignal.sourceKind, "organizing.organization");
  assert.equal(tournament.transport.organizationSignal.identity, "verification-office");
  assert.equal(tournament.transport.organizationSignal.members, 2);
  assert.equal(tournament.transport.organizationSignal.glued, true);
  assert.equal(tournament.transport.organizationSignal.coordination, "coordination-free");
  assert.deepEqual(tournament.transport.organizationSignal.peerIds, []);
  assert.deepEqual(tournament.swarm.peers.map((peer) => peer.peerId), ["organizing:claimant", "organizing:refuter"]);
  assert.equal(tournament.certificate.stable, true);
});

test("verification-tournament: a successful refutation settles the verdict against the claim", () => {
  const tournament = runVerb("verification-tournament", {
    id: "verification-refute",
    agents: ["claimant", "refuter"],
    claims: [
      { id: "claim:unchecked", agent: "claimant" },
    ],
    refutations: [
      { id: "refute:counterexample", against: "claim:unchecked", agent: "refuter", defeats: true },
    ],
  });

  assert.equal(tournament.verdict, "refuted");
  assert.deepEqual(tournament.survivingClaims, []);
  assert.equal(tournament.namedEquilibrium.pure, true);
  assert.deepEqual(tournament.namedEquilibrium.stableStrategies, ["refute:counterexample"]);
  assert.equal(tournament.namedEquilibrium.settledRole, "refutation");
  assert.equal(tournament.namedEquilibrium.correspondence.dialecticaWitnessSurvives, false);
  assert.equal(tournament.namedEquilibrium.correspondence.equilibriumMatchesSurvivor, false);
  assert.equal(tournament.certificate.stable, true);
  assert.equal(tournament.certificate.equilibriumStrategy, "refute:counterexample");
  assert.equal(tournament.certificate.dialecticaWitnessSurvives, false);
  assert.equal(tournament.certificate.correspondence, false);
  assert.equal(tournament.certificate.proof.stable, true);
  assert.equal(tournament.certificate.proof.fixedPoint, true);
  assert.equal(tournament.certificate.proof.correspondsToSurvivor, false);
  assert.equal(
    tournament.certificate.proof.obligations.find((step) => step.obligation === "survivor-correspondence").satisfied,
    false,
  );
});

test("symmetry: the FSym(𝔸) nominal layer judges strategy equivariance", () => {
  // the boolean arena's tt/ff are interchangeable Proponent answers; the
  // transposition (x y) over labels {tt↦x, ff↦y} acts as an arena symmetry, and
  // a play-set closed under that relabeling is equivariant.
  const result = runVerb("symmetry", {
    demo: "boolean",
    plays: [[], ["q"], ["q", "tt"], ["q", "ff"]],
    labels: [{ event: "tt", name: "x" }, { event: "ff", name: "y" }],
    permutations: [[["x", "y"], ["y", "x"]]],
  });
  assert.ok(result.permutation, "the judged permutation is reported");
  assert.ok(result.equivariance.kind, "an equivariance witness/obstruction is reported");
  assert.match(result.equivariance.kind, /game\.nominal\.equivariance/);
});

test("THE LIFT IS REAL (symmetry gate): a play-set CLOSED under a non-trivial FSym(𝔸) permutation is symmetry-invariant; one NOT closed is REJECTED", () => {
  // The boolean arena's two Proponent answers tt, ff are interchangeable agents.
  // Label them tt↦x, ff↦y and act by the non-trivial transposition (x y); this is
  // a genuine FSym(𝔸) generator installed into the arena symmetry groupoid via the
  // REAL applyPermutation / nominalEquivarianceJudgment (not a placeholder relabel).
  const labels = [{ event: "tt", name: "x" }, { event: "ff", name: "y" }];
  const permutations = [[["x", "y"], ["y", "x"]]];

  // CLOSED: the play-set is fixed by the transposition (swapping tt↔ff maps the
  // set to itself) — symmetry-invariant ⇒ the equivariance WITNESS.
  const closed = runVerb("symmetry", {
    demo: "boolean",
    plays: [[], ["q"], ["q", "tt"], ["q", "ff"]],
    labels, permutations,
  });
  assert.equal(closed.equivariance.kind, "game.nominal.equivariance:witness",
    "a play-set closed under the FSym transposition is symmetry-invariant");
  assert.equal(closed.equivariance.symmetryInvariance.kind,
    "game.strategy.symmetryInvariance:witness");

  // NOT CLOSED: drop ["q","ff"]. The transposition carries the admitted ["q","tt"]
  // to the absent ["q","ff"], so the set is NOT fixed — the gate must FAIL with the
  // symmetry-invariance OBSTRUCTION. (A placeholder/no-op relabel would wrongly pass;
  // this asserts the real FSym(𝔸) groupoid action is what decides invariance.)
  const open = runVerb("symmetry", {
    demo: "boolean",
    plays: [[], ["q"], ["q", "tt"]],
    labels, permutations,
  });
  assert.equal(open.equivariance.kind, "game.nominal.equivariance-obstruction",
    "a play-set NOT closed under the FSym transposition is rejected (the gate fails)");
  assert.equal(open.equivariance.symmetryInvariance.kind,
    "game.strategy.symmetryInvariance-obstruction",
    "the obstruction is precisely symmetry-invariance: the relabeled play is missing");
});

test("THE LIFT IS REAL (playing ↪ gaming): the trivial-symmetry strategy of a Design's chronicles ROUND-TRIPS to that Design", () => {
  // A coherent playing Design with two chronicles: root Proponent ε opens children
  // 0 and 1; under each, an Opponent answer. (ε is +, 0/1 are −, 0.0/1.0 are +.)
  // Its chronicles are the two root-to-leaf branches; lifted onto the design's own
  // trivial-symmetry arena, the strategy's plays ARE those chronicles, and reading
  // them back recovers the Design — the playing↪gaming inclusion at trivial symmetry.
  const design = {
    entries: [
      { locus: [], charge: "potential" },
      { locus: [0], charge: "active" },
      { locus: [1], charge: "active" },
      { locus: [0, 0], charge: "potential" },
      { locus: [1, 0], charge: "potential" },
    ],
  };

  const lifted = runVerb("lift", { design });

  // 1. The lift is the genuine concurrent strategy: well-formed over its arena.
  assert.equal(lifted.report.kind, "game.strategy.report");
  // 2. Trivial symmetry: the closure adds nothing, so the plays ARE the chronicles
  //    (each maximal play is one root-to-leaf branch of the design's chronicle forest).
  const maximal = lifted.plays
    .filter((p) => !lifted.plays.some((q) => q.length > p.length && p.every((m, i) => q[i] === m)))
    .map((p) => p.join("|")).sort();
  assert.deepEqual(maximal, ["|0|0.0", "|1|1.0"],
    "the two maximal plays are exactly the Design's two chronicles (lifted by locusKey)");
  // 3. THE ROUND-TRIP: designsOfStrategy reads the maximal plays back as Designs, and
  //    the combined Design equals the input — strategyFromDesign is a genuine embedding.
  const back = new Set(lifted.design.entries.map((e) => `${e.locus}=${e.charge}`));
  const want = new Set(design.entries.map((e) => `${e.locus}=${e.charge}`));
  assert.deepEqual([...back].sort(), [...want].sort(),
    "designOfStrategy(strategyFromDesign(d)) recovers d (playing ↪ gaming round-trips)");
  // and each chronicle's own Design is among the read-back designs.
  assert.equal(lifted.designs.length, 2, "one Design per chronicle (a design is the union of its chronicles)");
});

test("the discovery apex lists every verb (the four faces over one cocone)", () => {
  const { discovery, dispatch } = induceBins(actions, { packageName: "@emsenn/gaming" });
  assert.equal(discovery.bins.length, actions.length);
  assert.equal(discovery.package, "@emsenn/gaming");
  const verbsListed = new Set(discovery.bins.map((b) => b.verb ?? b.name));
  for (const v of ["arena", "strategy", "lift", "parallel", "compose", "match", "symmetry", "equivariant"]) {
    assert.ok(verbsListed.has(v), `discovery lists ${v}`);
  }
  for (const v of ["pool", "ticket", "matchmake"]) {
    assert.ok(verbsListed.has(v), `discovery lists lobby verb ${v}`);
  }
  for (const v of ["libp2p-swarm", "libp2p-stream", "libp2p-pubsub"]) {
    assert.ok(verbsListed.has(v), `discovery lists libp2p verb ${v}`);
  }
  assert.ok(verbsListed.has("verification-tournament"), "discovery lists verification-tournament");
  // CLI face: dispatch a verb through the same apex
  const out = dispatch(["arena"], JSON.stringify({ demo: "boolean" }), { caller: { transport: "test" } });
  assert.equal(out.code, 0);
});

// ── The CGS concurrency-paradigm embeddings are REAL object-maps, not catalog ──
// Each claim is from content/_archive …/computing/code/transformers/f-dial-to-cgs.md
// and the AGMOS / Caires–Pfenning readings. The anti-fake gate is *-autonomous
// PRESERVATION: the structure carried by the source algebra must SURVIVE the map
// onto a real arena. A metadata stub (a verb that just echoes a name) cannot pass.

// Partition an encoded arena's events by polarity (the polarity wire tag is a bare
// "positive"/"negative" string). P-events = positive (witnesses U); O-events =
// negative (challenges X).
const polarityOf = (e) => (typeof e.polarity === "string" ? e.polarity : e.polarity?.name);
const pEvents = (encoded) => encoded.structure.events.filter((e) => polarityOf(e) === "positive").map((e) => e.id).sort();
const oEvents = (encoded) => encoded.structure.events.filter((e) => polarityOf(e) === "negative").map((e) => e.id).sort();
const canonPairs = (pairs) => pairs.map((p) => [...p].sort().join("#")).sort();

test("DIALECTICA OBJECT-MAP: F(U,X,α) has P-events = U, O-events = X, trivial causality, intra-polarity conflict (f-dial-to-cgs.md)", () => {
  // a small Dialectica object: two witnesses U={a,b}, two challenges X={p,q}.
  const obj = dialecticaObject(["a", "b"], ["p", "q"]);
  const a = dialecticaObjectToArena(obj);
  // it is a REAL arena carrier with a frozen prime event structure + symmetry.
  assert.ok(a.structure, "the image is a real arena (has a prime event structure)");
  assert.ok(Array.isArray(a.symmetry), "the image is a real arena (has a symmetry groupoid)");

  const enc = { structure: { events: a.structure.events.map((e) => ({ id: e.id, polarity: e.polarity.name })), causality: [...a.structure.causality], conflict: [...a.structure.conflict] }, symmetry: a.symmetry };

  // P-events ARE the witnesses U (positive, P:-namespaced), O-events ARE X (negative).
  assert.deepEqual(pEvents(enc), ["P:a", "P:b"], "P-events are exactly the witnesses U");
  assert.deepEqual(oEvents(enc), ["O:p", "O:q"], "O-events are exactly the challenges X");

  // TRIVIAL causality: all events concurrent (the defining Dialectica concurrency).
  assert.deepEqual([...a.structure.causality], [], "causality is trivial — all events concurrent");

  // INTRA-polarity all-pairs conflict (u#u', x#x'), and NO cross P–O conflict.
  const conflict = canonPairs(a.structure.conflict.map((p) => [...p]));
  assert.deepEqual(conflict, canonPairs([["P:a", "P:b"], ["O:p", "O:q"]]),
    "conflict is intra-polarity all-pairs (u#u', x#x') with NO cross P–O conflict");
});

test("DIALECTICA *-AUTONOMOUS PRESERVATION (anti-fake gate): F(A^⊥) = (FA)^⊥ — the dual swaps P/O events", () => {
  // This is THE anti-fake gate: a real object-map must commute with duality, so
  // the arena of the Dialectica dual must be the CGS dual (P/O swapped) of the
  // arena of the original. A name-only metadata stub cannot satisfy this.
  const obj = dialecticaObject(["a", "b"], ["p", "q"]);

  const fa = dialecticaObjectToArena(obj);
  const faDual = dualDialecticaArena(obj);                 // F(A^⊥)
  const sourceDual = dialecticaObjectToArena(dualDialectica(obj)); // also F(A^⊥), via source algebra

  const enc = (a) => ({ structure: { events: a.structure.events.map((e) => ({ id: e.id, polarity: e.polarity.name })) } });

  const faP = pEvents(enc(fa)), faO = oEvents(enc(fa));
  const dualP = pEvents(enc(faDual)), dualO = oEvents(enc(faDual));

  // PRESERVATION: the dual's P-events are FA's O-events (challenges become
  // witnesses) and the dual's O-events are FA's P-events. The names of FA's
  // O-events were O:p, O:q; in the dual the SAME underlying challenges p,q are now
  // witnesses, so they carry the P: namespace. We compare on the underlying name.
  const strip = (ids) => ids.map((id) => id.slice(2)).sort();
  assert.deepEqual(strip(dualP), strip(faO), "F(A^⊥) P-events = (FA) O-events — duality swaps O→P");
  assert.deepEqual(strip(dualO), strip(faP), "F(A^⊥) O-events = (FA) P-events — duality swaps P→O");

  // and the two routes to F(A^⊥) agree (dualDialecticaArena = F∘dual on the nose).
  assert.deepEqual(pEvents(enc(faDual)), pEvents(enc(sourceDual)), "dualDialecticaArena = dialecticaObjectToArena∘dualDialectica (P)");
  assert.deepEqual(oEvents(enc(faDual)), oEvents(enc(sourceDual)), "dualDialecticaArena = dialecticaObjectToArena∘dualDialectica (O)");

  // and it is genuinely a SWAP, not the identity: FA's P set differs from the dual's
  // P set (the map is not a no-op that would let a stub pass).
  assert.notDeepEqual(pEvents(enc(fa)), pEvents(enc(faDual)),
    "the dual actually moves events between polarities (not an identity stub)");
});

test("DIALECTICA via the verb: embed-dialectica produces the same real arena image", () => {
  const out = runVerb("embed-dialectica", { object: { witnesses: ["a", "b"], challenges: ["p", "q"] } });
  assert.deepEqual(pEvents(out), ["P:a", "P:b"], "verb image P-events = witnesses U");
  assert.deepEqual(oEvents(out), ["O:p", "O:q"], "verb image O-events = challenges X");
  assert.deepEqual([...out.structure.causality], [], "verb image causality is trivial");
});

test("NOMINAL OBJECT-MAP: the FSym(𝔸) symmetry groupoid is NON-TRIVIAL (contains a name-permutation bijection)", () => {
  // base arena: two interchangeable Proponent events tt, ff (the boolean arena's
  // answers), built directly so the test owns its events.
  const base = arenaOf(eventStructure(
    [event("q", negative()), event("tt", positive()), event("ff", positive())],
    [["q", "tt"], ["q", "ff"]],
    [["tt", "ff"]],
  ));
  // before nominalization the symmetry groupoid is trivial (discrete: identity only,
  // i.e. no non-identity bijections installed).
  const baseNonId = base.symmetry.filter((bij) => bij.some((p) => p[0] !== p[1]));
  assert.equal(baseNonId.length, 0, "the bare arena's symmetry groupoid is trivial (no non-identity bijection)");

  // install the FSym(𝔸) transposition (x y) over labels {tt↦x, ff↦y}.
  const labels = [eventName("tt", "x"), eventName("ff", "y")];
  const perms = [finitePermutation([["x", "y"], ["y", "x"]])];
  const nominal = nominalArenaOf(base, labels, perms);

  // PRESERVATION/non-triviality: the enriched arena's symmetry groupoid now
  // contains a genuine bijection that swaps the two events (tt↔ff) — the defining
  // NON-TRIVIAL symmetry of the AGMOS nominal embedding. A stub with discrete
  // symmetry could not produce this.
  const swap = nominal.symmetry.find((bij) => bij.some((p) => p[0] === "tt" && p[1] === "ff"));
  assert.ok(swap, "the nominal arena's symmetry groupoid contains the FSym(𝔸) transposition tt↔ff");
  const moves = new Map(swap.map((p) => [p[0], p[1]]));
  assert.equal(moves.get("tt"), "ff", "the bijection sends tt↦ff");
  assert.equal(moves.get("ff"), "tt", "the bijection sends ff↦tt (a real FSym bijection, not identity)");
});

test("NOMINAL via the verb: a strategy CLOSED under the FSym(𝔸) permutation is judged equivariant by the nominalizing layer", () => {
  // a play-set fixed by (x y) — swapping tt↔ff maps it to itself — is symmetry
  // invariant, so the nominalizing layer returns the equivariance WITNESS.
  const result = runVerb("symmetry", {
    demo: "boolean",
    plays: [[], ["q"], ["q", "tt"], ["q", "ff"]],
    labels: [{ event: "tt", name: "x" }, { event: "ff", name: "y" }],
    permutations: [[["x", "y"], ["y", "x"]]],
  });
  assert.equal(result.equivariance.kind, "game.nominal.equivariance:witness",
    "the nominalizing layer judges the closed strategy equivariant");
  assert.equal(result.equivariance.symmetryInvariance.kind, "game.strategy.symmetryInvariance:witness");
});

test("SESSION OBJECT-MAP: embed-session of a small session returns the expected CLL proposition (= propositionOfSession)", () => {
  // a small session: send(end, end). Caires–Pfenning: send ↦ ⊗, end ↦ 1, so the
  // proposition is (1 ⊗ 1). We compute the expected tree with propositionOfSession
  // (reused verbatim) and assert the verb image matches it on the nose.
  const session = sessionSend(sessionEnd(), sessionEnd());
  const expected = propositionOfSession(session);

  // sanity: the source map gives ⊗ of two units (1 ⊗ 1).
  assert.equal(expected.connective, "tensor", "send ↦ ⊗ (tensor)");
  assert.deepEqual(expected.operands.map((o) => o.connective), ["one", "one"], "end ↦ 1 (one), twice");

  // the gaming object-map reuses propositionOfSession verbatim.
  const direct = cairesPfenningArena(session);
  assert.equal(direct.connective, expected.connective);
  assert.deepEqual(direct.operands.map((o) => o.connective), expected.operands.map((o) => o.connective));

  // the verb image carries the CLL proposition naming the CGS_CLL behaviour.
  const out = runVerb("embed-session", { session });
  assert.equal(out.embedding, "cairesPfenning");
  assert.equal(out.subcategory, "CGS_CLL");
  assert.equal(out.proposition.connective, "tensor", "the image proposition is ⊗ (send)");
  assert.deepEqual(out.proposition.operands.map((o) => o.connective), ["one", "one"],
    "the image proposition's operands are 1, 1 (end, end) — matches propositionOfSession");
});

import { gamingFace } from "../dist/index.mjs";
import { admitSeed } from "@emsenn/animating";

test("gaming's arena carries its SYMMETRY Ẽ — the FSym(𝔸) datum that makes it CGS 'with symmetry'", () => {
  // The note's thesis: symmetry IS the multi-agent structure; a plain concurrent game
  // (E,≤,#) is promoted to CGS by the symmetry groupoid Ẽ, decided by the REAL symmetry
  // law (a bijection preserving polarity/causality/conflict). gaming's face must DISCOVER
  // and CARRY Ẽ, not return a discrete identity-only arena.
  const m = (s) => admitSeed(s);

  // two structurally-identical independent positive plays by DIFFERENT agents are
  // interchangeable — the transposition (alice bob) is a valid arena symmetry.
  const interchangeable = gamingFace(m("alice|trusts\nbob|trusts"));
  assert.equal(interchangeable.symmetry.uniform, true, "interchangeable plays ⇒ a non-trivial symmetry");
  assert.equal(interchangeable.symmetry.symmetric, 1, "exactly one symmetric pair (alice ↔ bob)");
  assert.equal(interchangeable.symmetry.orbits, 1, "both events in one interchangeability orbit");
  assert.equal(interchangeable.symmetry.interchangeable, 2, "both events are FSym-mobile");
  // the discovered symmetry is INSTALLED into the arena Ẽ (identity + the transposition).
  assert.ok(interchangeable.arena.symmetry.length >= 2, "Ẽ carries the discovered symmetry, not just identity");

  // three independent positive plays: all C(3,2)=3 pairs symmetric, one orbit of 3.
  const three = gamingFace(m("a|p\nb|p\nc|p"));
  assert.equal(three.symmetry.symmetric, 3);
  assert.equal(three.symmetry.orbits, 1);

  // a RIGID arena: a single play has no non-trivial symmetry.
  const rigid = gamingFace(m("alice|p"));
  assert.equal(rigid.symmetry.uniform, false, "a single play admits no agent permutation");
  assert.equal(rigid.symmetry.symmetric, 0);

  // symmetry DISCRIMINATES by polarity (the honest evidence reading, negation-aware): a FOR
  // and an AGAINST play are NOT interchangeable — opposite Player/Opponent polarity breaks
  // the symmetry. (Before the polarity fix the all-positive descent made them look uniform.)
  const opposed = gamingFace(m("alice|trusts\nbob|not trusts"));
  assert.equal(opposed.symmetry.uniform, false, "for/against plays are not interchangeable");
  assert.equal(opposed.symmetry.symmetric, 0);
  assert.equal(opposed.forCount, 1, "the assertion is the FOR side a₊");
  assert.equal(opposed.againstCount, 1, "the denial is the AGAINST side a₋ (negation-aware)");

  // a for and an against on the SAME locus is a held contradiction ⊤ — a conflict edge.
  const contradiction = gamingFace(m("alice|trusts\nalice|not trusts"));
  assert.equal(contradiction.contested, 2, "both for+against events on one locus are contested (⊤)");
  assert.equal(contradiction.obstruction, 1, "the single # conflict edge is the gluing obstruction");
  assert.equal(contradiction.cohomology.kind, "gaming.face.conflict-cohomology");
  assert.equal(contradiction.cohomology.obstruction, contradiction.obstruction);
  assert.equal(contradiction.cohomology.first.kind, "predication.settling.firstCohomology");
  assert.equal(contradiction.cohomology.first.rank.members.length, contradiction.obstruction);
  assert.equal(contradiction.cohomology.first.generators.length, contradiction.obstruction);
  assert.equal(contradiction.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");

  const coherent = gamingFace(m("alice|trusts\nbob|trusts"));
  assert.equal(coherent.obstruction, 0);
  assert.equal(coherent.cohomology.first.rank.members.length, 0);
  assert.equal(coherent.cohomology.vanishing.kind, "predication.cohomology.rankVanishing:witness");
});

import { reachability } from "../dist/index.mjs";

test("equilibrium REACHABILITY: best-response cycles (RPS), but the monotone ≤_k settling converges", () => {
  // Rock-Paper-Scissors: best-response dynamics cycles forever and never reaches the equilibrium —
  // the canonical stability↔reachability gap (equilibrium-concept.md). A cycle IS a periodic orbit.
  const rps = reachability("rock|scissors\nscissors|paper\npaper|rock");
  assert.equal(rps.kind, "gaming.reachability");
  assert.equal(rps.bestResponseCyclic, true, "best-response would cycle (a periodic orbit)");
  assert.equal(rps.contested, 3, "every move wins some and loses some → ⊤ (mixed support)");
  assert.equal(rps.pureEquilibrium, false);
  assert.equal(rps.mixed, true, "the reachable attractor is the symmetric ⊤ mixed equilibrium");
  // …yet the monotone settling CONVERGES — the no-non-trivial-periodic-orbit theorem closes the gap.
  assert.equal(rps.converges, true, "the monotone ≤_k settling cannot cycle — it reaches a fixpoint");
  assert.equal(rps.reachable, true, "the equilibrium is reachable even where best-response cycles");

  // a transitive game has a PURE dominant-strategy equilibrium, reachable with no cycle.
  const transitive = reachability("A|B\nA|C\nB|C");
  assert.equal(transitive.pureEquilibrium, true, "A beats B and C — a pure equilibrium");
  assert.equal(transitive.bestResponseCyclic, false);
  assert.equal(transitive.mixed, false);

  // a strictly dominant move (beats everyone) is the pure equilibrium; the rest are dominated.
  const dominant = reachability("D|x\nD|y\nD|z");
  assert.equal(dominant.pureEquilibrium, true);
  assert.equal(dominant.dominated, 3);
  assert.equal(dominant.contested, 0);
});
