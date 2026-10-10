import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBountyCandidate, parseAttempts } from "@red-cup-engineering/algora-opportunity-observation-service/parse";
import { qualifyBounty, competitionFactor } from "@red-cup-engineering/software-work-qualification-assay-service";
import { repoTrustFactor } from "@red-cup-engineering/software-work-risk-assay-service/repo-trust";
import { runCycle0 } from "../src/cycle0.mjs";
import { digestObject } from "@red-cup-engineering/software-work-witness-service/hashing";

const here = dirname(fileURLToPath(import.meta.url));
const candidates = JSON.parse(readFileSync(join(here, "fixtures/sample-candidates.json"), "utf8"));
const OBSERVED = "2026-07-18T00:00:00Z";

test("parseAttempts reads competitor handles, status emoji, and PR link", () => {
  const attempts = parseAttempts(candidates[0].commentMarkdown);
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0].who, ["alice"]);
  assert.equal(attempts[0].status, "active");
  assert.equal(attempts[0].pr, "https://github.com/acme/widgets/pull/140");
  assert.equal(attempts[1].status, "inactive");
});

test("parseBountyCandidate computes competition and parses cash reward", () => {
  const c = parseBountyCandidate({ ...candidates[1], observedAt: OBSERVED });
  assert.equal(c.competition.active, 2);
  assert.equal(c.competition.warned, 1);
  assert.equal(c.competition.total, 3);
  assert.equal(c.reward.kind, "cash");
  assert.equal(c.reward.amountUsd, 1200);
});

test("parseBountyCandidate requires observedAt and meta", () => {
  assert.throws(() => parseBountyCandidate({ ...candidates[0] }));
  assert.throws(() => parseBountyCandidate({ meta: {}, observedAt: OBSERVED }));
});

test("competitionFactor and repoTrustFactor are as specified", () => {
  assert.equal(competitionFactor(0), 1);
  assert.equal(competitionFactor(1), 0.5);
  // cold prior alpha=1,beta=6 -> 1/7
  assert.ok(Math.abs(repoTrustFactor(0, 0) - 1 / 7) < 1e-9);
  // 2 merges of 3 resolved -> 3/10
  assert.ok(Math.abs(repoTrustFactor(2, 3) - 0.3) < 1e-9);
});

test("qualify: low-competition cash bounty on cold repo qualifies (EV = pWin*reward, no cost subtracted)", () => {
  const c = parseBountyCandidate({ ...candidates[0], observedAt: OBSERVED });
  const a = qualifyBounty(c, 1 / 7); // cold prior
  // reward 500, 1 active competitor -> cFactor .5, pWin~0.0714, EV~35.7
  assert.equal(a.activeCompetitors, 1);
  assert.ok(a.ev > 34 && a.ev < 37);
  assert.ok(a.evPerRequest > 5 && a.evPerRequest < 7);
  assert.equal(a.verdict, "qualified");
});

test("qualify: point reward is refused", () => {
  const c = parseBountyCandidate({ ...candidates[3], observedAt: OBSERVED });
  const a = qualifyBounty(c, 1 / 7);
  assert.equal(a.verdict, "refused");
  assert.match(a.reasons.join(" "), /not cash/);
});

test("qualify: uncontested low-value bounty now QUALIFIES (free-compute long tail)", () => {
  const c = parseBountyCandidate({ ...candidates[2], observedAt: OBSERVED }); // $10, 0 competitors
  const a = qualifyBounty(c, 1 / 7);
  assert.equal(a.verdict, "qualified");
  assert.ok(a.flags.includes("uncontested"));
});

test("qualify: unknown autopay is flagged, not refused", () => {
  const c = parseBountyCandidate({ ...candidates[1], observedAt: OBSERVED }); // no autopay field
  const a = qualifyBounty(c, 1 / 7);
  assert.equal(c.autopay, null);
  assert.equal(a.verdict, "qualified");
  assert.ok(a.flags.includes("autopay-unknown"));
});

test("runCycle0 ranks by EV-per-request, summarizes, and is content-addressed + reproducible", () => {
  const r1 = runCycle0({ candidatesInput: candidates, observedAt: OBSERVED, historyRecords: [] });
  const r2 = runCycle0({ candidatesInput: candidates, observedAt: OBSERVED, historyRecords: [] });
  // deterministic content address across runs
  assert.equal(r1.watch.digest, r2.watch.digest);
  // digest verifies against the bare object (id/digest stripped)
  assert.equal(r1.watch.digest, digestObject(stripAddr(r1.watch)));
  // ranked descending by EV-per-request
  const perReq = r1.watch.candidates.map((c) => c.evPerRequest);
  assert.deepEqual(perReq, [...perReq].sort((a, b) => b - a));
  // summary counts add up; three cash bounties qualify, only the points one is refused
  const s = r1.summary;
  assert.equal(s.qualified + s.refused, s.total);
  assert.equal(s.total, 4);
  assert.equal(s.qualified, 3);
});

function stripAddr(o) { const { id, digest, ...rest } = o; return rest; }
