#!/usr/bin/env node
// koios daily issue pulse -- the separately formed clockkeeper this
// settlement's own AGENTS.md requires before unattended cadence can be
// claimed ("the publication-local executable does not author, schedule, or
// attribute the pulse ... a separate pulser or scheduler must be formed and
// contracted before unattended cadence can be claimed"). This script lives
// outside koios.news's own package and is the pulse's actual author: it
// builds the exact ActivityStreams Create<NewsroomIssueDemand> the site's
// own publication-issue-policy.json already admits from
// https://bare-cedar-fog.561.group/actors/cold-red-gate-clockkeeper, and
// delivers it on koios.news's own stdin exactly as an externally authored
// pulse would arrive.
//
// Automates the researching -> writing -> editing -> candidate-build chain
// (all of it already wired to the free/running LISS inference teams --
// groq, gemini, nvidia, openrouter, local -- via inference-work-lot-service,
// no separate wiring needed here). It never performs the final VPS deploy
// (`pnpm run deploy:ship`) -- that remains the human-gated act
// koios.news/sites/koios.news/AGENTS.md reserves to Publication Operations
// ("a publication edition is live only after Publication Operations
// receives exact editorial admission and an witnessed
// delivery result"). Every outcome -- published-pending-release, refused,
// or obstructed -- is posted once to the TTI admin Discord channel with the
// [KOIOS] prefix so a human can decide whether to ship, repair, or raise the
// inference routing profile.

import { randomUUID } from "node:crypto";
import { readFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { postKoiosAlert } from "./discord-alert.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, "..", "sites", "koios.news");
const NODE_BIN = process.env.KOIOS_NODE_BIN ?? process.execPath;
const STATE_DIR = join(HERE, "data", "state");
const STATE_LOG = join(STATE_DIR, "daily-issue-pulse.ndjson");

// Same fixed local A2A/agent-card addresses the already-running
// koios-activitypub-settle-next.service uses; overridable via env for a
// differently wired host.
const SITE_ENV = {
  NODE_OPTIONS: process.env.KOIOS_NODE_OPTIONS ?? "--max-old-space-size=1280",
  RMN_CONFORMANCE_AGENT: process.env.RMN_CONFORMANCE_AGENT ?? "http://127.0.0.1:8786/.well-known/agent-card.json",
  WITNESS_JOURNAL_RDF_AGENT: process.env.WITNESS_JOURNAL_RDF_AGENT ?? "http://127.0.0.1:19764/.well-known/agent-card.json",
  WIT_TRANSITION_ASSAY_AGENT: process.env.WIT_TRANSITION_ASSAY_AGENT ?? "http://127.0.0.1:19827/.well-known/agent-card.json",
  INFERENCE_WORK_LOT_AGENT_CARD_URL: process.env.INFERENCE_WORK_LOT_AGENT_CARD_URL ?? "http://127.0.0.1:8796/.well-known/agent-card.json",
  KOIOS_INDEPENDENT_EDITORIAL_ASSESSMENT_ROOT: resolve(HERE, "..", "services", "independent-editorial-assessment"),
  KOIOS_NEWSWIRE_EDITORIAL_PRODUCTION_ROOT: resolve(HERE, "..", "services", "newswire-editorial-production"),
  KOIOS_NEWSCABLE_SOURCE_BROKER_ROOT: resolve(HERE, "..", "services", "newscable-source-broker"),
  KOIOS_WEB_SOURCE_ACQUISITION_ROOT: resolve(HERE, "..", "services", "web-source-acquisition"),
  KOIOS_CORPUS_MANAGEMENT_TEAM_ROOT: process.env.KOIOS_CORPUS_MANAGEMENT_TEAM_ROOT ?? "/home/emsenn/info/lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/knowledge-services-section/services/corpus-management-team",
  KOIOS_RESOURCE_BROKERAGE_TEAM_ROOT: process.env.KOIOS_RESOURCE_BROKERAGE_TEAM_ROOT ?? "/home/emsenn/info/lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/change-services-section/services/resource-brokerage-team",
  C2PA_AGENT: process.env.C2PA_AGENT ?? "http://127.0.0.1:8792/.well-known/agent-card.json",
  EVM_RPC_URL: process.env.EVM_RPC_URL ?? "http://127.0.0.1:8545",
  ERC4337_BUNDLER_URL: process.env.ERC4337_BUNDLER_URL ?? "http://127.0.0.1:4337",
  KOIOS_EVM_PASSWORD_FILE: process.env.KOIOS_EVM_PASSWORD_FILE ?? "/home/emsenn/.local/share/emsenn/settlement-credentials/5fbdae8a7e345595added81300e0ca48ed3ef90b33a3b6033bbdbac0057d864f/eip155-31337.password",
  PATH: process.env.PATH,
  NODE_PATH: process.env.NODE_PATH,
  NO_COLOR: "1",
};

const ISSUE_PULSE_ACTOR = "https://bare-cedar-fog.561.group/actors/cold-red-gate-clockkeeper";
const ISSUE_PULSE_CAPABILITY = "urn:capability:koios-news:clockkeeper:cold-red-gate:publication-issue-pulse:v1";
const REPAIR_PULSE_ACTOR = "urn:colony:cold-red-gate:clockkeeper";
const REPAIR_PULSE_CAPABILITY = "urn:capability:koios-news:clockkeeper:cold-red-gate:newsroom-repair-pulse:v1";
const REPAIR_PULSE_CONTRACT = "koios-news/newsroom-repair-pulse/v1";

function runSiteScript(entry, activity, now) {
  const result = spawnSync(NODE_BIN, [join(SITE_ROOT, "dist", entry), "--now", now], {
    cwd: SITE_ROOT,
    input: `${JSON.stringify(activity)}\n`,
    encoding: "utf8",
    timeout: 20 * 60_000,
    maxBuffer: 64 * 1024 * 1024,
    env: SITE_ENV,
  });
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = { type: "ProcessFailure", stdout: result.stdout, stderr: result.stderr, status: result.status, signal: result.signal };
  }
  return parsed;
}

async function recordDigestOf(value) {
  const { recordDigest } = await import(join(SITE_ROOT, "dist", "management", "ledger.mjs"));
  return recordDigest(value);
}

function describeIssueOutcome(settlement) {
  const object = settlement?.object ?? {};
  const code = object.code;
  if (settlement?.type === "Accept" && code === "cloudflare-release-completed") {
    return { staged: false, published: true, summary: `published: ${object.assignmentId}` };
  }
  if (code === "cloudflare-release-pending") {
    return { staged: true, published: false, summary: `candidate staged, awaiting release: assignment ${object.assignmentId} slug ${object.newsroom?.slug ?? "unknown"}` };
  }
  if (code === "newsroom-refused" || code === "newsroom-obstructed") {
    return { staged: false, published: false, summary: `no candidate: ${object.newsroom?.reason ?? object.obstruction?.reason ?? code}` };
  }
  if (code === "publication-cycle-obstructed") {
    return { staged: false, published: false, summary: `pipeline obstructed: ${object.obstruction?.reason ?? "unknown"}` };
  }
  return { staged: false, published: false, summary: `unrecognized settlement: ${JSON.stringify(settlement).slice(0, 300)}` };
}

async function main() {
  const now = new Date().toISOString();
  const policyPath = join(SITE_ROOT, "lib", "law", "publication-issue-policy.json");
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  const policyDigest = await recordDigestOf(policy);
  const pulseId = `urn:koios:daily-pulse:${now}`;
  const issueActivity = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `urn:koios:clockkeeper-pulse:${randomUUID()}`,
    type: "Create",
    actor: ISSUE_PULSE_ACTOR,
    capability: ISSUE_PULSE_CAPABILITY,
    target: "https://koios.news/activitypub/actor",
    published: now,
    object: { type: "NewsroomIssueDemand", pulseId, policy, policyDigest },
  };

  const issueSettlement = runSiteScript("operate-issue.mjs", issueActivity, now);
  let outcome = describeIssueOutcome(issueSettlement);
  let repairSettlement;

  if (!outcome.published && !outcome.staged) {
    // The issue pulse could not form a publishable candidate on its own.
    // Give the newsroom's own self-repair loop one bounded attempt before
    // alerting -- this is the same repair pulse contract-clockkeeper.mjs
    // registers on a separate cadence; running it here once keeps the daily
    // automated portion self-contained rather than depending on a second
    // clocked contract being separately live.
    const repairNow = new Date().toISOString();
    const repairActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `urn:koios:clockkeeper-repair-pulse:${randomUUID()}`,
      type: "Create",
      actor: REPAIR_PULSE_ACTOR,
      capability: REPAIR_PULSE_CAPABILITY,
      target: "https://koios.news/activitypub/actor",
      published: repairNow,
      object: { type: "NewsroomRepairPulseDemand", contract: REPAIR_PULSE_CONTRACT, pulseId: `urn:koios:daily-repair-pulse:${repairNow}` },
    };
    repairSettlement = runSiteScript("operate-repair-pulse.mjs", repairActivity, repairNow);
  }

  mkdirSync(STATE_DIR, { recursive: true });
  appendFileSync(STATE_LOG, `${JSON.stringify({ now, pulseId, outcome, issueSettlement, repairSettlement })}\n`, { encoding: "utf8", mode: 0o600 });

  const repairSummary = repairSettlement?.object?.disposition
    ? `repair attempt: ${repairSettlement.object.disposition}${repairSettlement.object.settlement?.repair?.reason ? ` (${repairSettlement.object.settlement.repair.reason.split("\n")[0].slice(0, 200)})` : ""}`
    : undefined;

  const lines = [
    `daily issue pulse ${pulseId}`,
    outcome.summary,
    ...(repairSummary ? [repairSummary] : []),
    outcome.staged
      ? "Candidate is staged for review; run `pnpm run deploy:ship` from koios.news after editorial sign-off to go live."
      : "No candidate reached staging today; researching/writing/editing did not clear the pipeline's own quality gates.",
  ];

  try {
    await postKoiosAlert(lines);
    process.stdout.write("posted [KOIOS] alert to TTI admin Discord channel\n");
  } catch (error) {
    process.stderr.write(`failed to post [KOIOS] Discord alert: ${error instanceof Error ? error.message : String(error)}\n`);
    process.stdout.write(`${lines.join("\n")}\n`);
  }
}

await main();
