import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBountyCandidate, parseAttempts, rewardFromBody } from "../src/parse-bounty-comment.mjs";
import { findBotComment, searchBountyIssues, discoverCandidates } from "../src/fetch-live.mjs";
import { qualifyBounty } from "@rsc-quiescent/software-work-qualification-assay-service";

const here = dirname(fileURLToPath(import.meta.url));
const realComment = readFileSync(join(here, "fixtures/real-algora-comment.md"), "utf8");
const OBSERVED = "2026-07-18T00:00:00Z";

test("parses the REAL Algora HTML-table comment (2 active attempts, @-spaced handles)", () => {
  const attempts = parseAttempts(realComment);
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0].who, ["Rutik7066"]);
  assert.equal(attempts[0].status, "active");
  assert.equal(attempts[1].pr, "https://github.com/qdrant/qdrant/pull/4165");
});

test("rewardFromBody pulls '$250' from the '## 💎 $250 bounty' header", () => {
  assert.equal(rewardFromBody(realComment), "$250");
});

test("real comment -> candidate -> qualify end to end", () => {
  const c = parseBountyCandidate({
    commentMarkdown: realComment,
    meta: { repo: "qdrant/qdrant", issueNumber: 4108, title: "x", url: "u" },
    observedAt: OBSERVED,
  });
  assert.equal(c.reward.amountUsd, 250);
  assert.equal(c.competition.active, 2);
  const a = qualifyBounty(c, 1 / 7);
  // 2 active competitors -> cFactor 1/3; pWin ~0.0476; EV = pWin*250 ~ 11.9 (no cost subtracted)
  assert.ok(a.ev > 11 && a.ev < 13);
  assert.equal(a.verdict, "qualified");
});

// --- network functions tested with an injected fake fetch (no real network) ---

function fakeFetch(routes) {
  return async (url) => {
    for (const [pattern, payload] of routes) {
      if (url.includes(pattern)) return { ok: true, status: 200, json: async () => payload };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

test("searchBountyIssues maps GitHub search items to {repo, issueNumber, ...}", async () => {
  const fetchImpl = fakeFetch([
    ["/search/issues", { items: [
      { repository_url: "https://api.github.com/repos/acme/widgets", number: 42, title: "Fix", html_url: "https://github.com/acme/widgets/issues/42", labels: [{ name: "💎 Bounty" }] },
    ] }],
  ]);
  const out = await searchBountyIssues({ fetchImpl, token: "x" });
  assert.equal(out.length, 1);
  assert.equal(out[0].repo, "acme/widgets");
  assert.equal(out[0].issueNumber, 42);
});

test("findBotComment picks the algora bot bounty comment", () => {
  const body = findBotComment([
    { user: { login: "someone" }, body: "hi" },
    { user: { login: "algora-pbc[bot]" }, body: realComment },
  ]);
  assert.ok(body && body.includes("💎"));
});

test("discoverCandidates stitches search + comment into parseable candidates", async () => {
  const fetchImpl = fakeFetch([
    ["/search/issues", { items: [
      { repository_url: "https://api.github.com/repos/qdrant/qdrant", number: 4108, title: "T", html_url: "u", labels: [] },
    ] }],
    ["/issues/4108/comments", [{ user: { login: "algora-pbc[bot]" }, body: realComment }]],
  ]);
  const cands = await discoverCandidates({ fetchImpl, token: "x", limit: 5 });
  assert.equal(cands.length, 1);
  assert.equal(cands[0].meta.rewardFormatted, "$250");
  const c = parseBountyCandidate({ ...cands[0], observedAt: OBSERVED });
  assert.equal(c.competition.active, 2);
});
