import { Attempt, Bounty } from "./bounty.mjs";

// Bounty platforms besides Algora that fund GitHub issues. Each reads the platform's public feed and
// keeps only open, positively funded work with a canonical GitHub issue, as a Bounty whose
// `platform` names where the reward is posted. Nothing here claims, applies or comments.

const GITHUB_ISSUE = /https:\/\/github\.com\/([^/\s]+\/[^/\s]+)\/issues\/(\d+)(?:[/?#\s]|$)/u;
const issueOf = (text) => {
  const match = GITHUB_ISSUE.exec(String(text ?? ""));
  return match ? { repository: match[1], issueNumber: Number(match[2]) } : null;
};
const positive = (value) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
};
const listIn = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};
const bounded = (limit) => Math.max(1, Math.min(100, Math.floor(limit ?? 20)));
async function getJson(url, fetchImpl, headers = {}) {
  const response = await fetchImpl(url, { headers: { accept: "application/json", ...headers }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}
// People already working an issue lower its win probability like Algora attempts do.
const anonymousAttempts = (count) => Array.from({ length: count }, () => new Attempt({ status: "active" }));

/** Opire rewards: USD or USD-cent prices; a reward someone has already claimed is skipped. */
async function opire({ limit, fetchImpl, observedAt, onSkip, url = "https://api.opire.dev/rewards" }) {
  const feed = new URL(url);
  feed.searchParams.set("page", "1");
  feed.searchParams.set("itemsPerPage", String(bounded(limit)));
  const out = [];
  for (const reward of listIn(await getJson(feed, fetchImpl, { "user-agent": "561-group-bug-bounties/1.0" }), ["data"])) {
    const issue = issueOf(reward?.url);
    const price = reward?.pendingPrice, raw = positive(price?.value), unit = String(price?.unit ?? "").toUpperCase();
    const usd = raw === null ? null : unit === "USD_CENT" ? raw / 100 : unit === "USD" ? raw : null;
    const claimers = Array.isArray(reward?.claimerUsers) ? reward.claimerUsers.length : 0;
    if (!issue) { onSkip("opire", reward, "no canonical GitHub issue URL"); continue; }
    if (!usd) { onSkip("opire", reward, "no positive USD reward"); continue; }
    if (claimers > 0) { onSkip("opire", reward, "reward already has a claimer"); continue; }
    out.push(new Bounty({ ...issue, title: reward?.title, rewardUsd: usd, observedAt, platform: "opire", platformId: String(reward?.id ?? ""),
      attempts: anonymousAttempts(Array.isArray(reward?.tryingUsers) ? reward.tryingUsers.length : 0) }));
    if (out.length >= bounded(limit)) break;
  }
  return out;
}

/** TaskBounty: the listing is compact, so a task's detail is read when its issue or reward is missing. */
async function taskbounty({ limit, fetchImpl, observedAt, onSkip, url = "https://www.task-bounty.com/api/v1" }) {
  const base = url.replace(/\/$/u, "");
  const issueField = (task) => ["github_issue_url", "issue_url", "source_url"].map((key) => issueOf(task?.[key])).find(Boolean) ?? null;
  const rewardField = (task) => ["bounty_amount", "bounty_amount_usd", "reward_usd", "amount_usd", "amount"].map((key) => positive(task?.[key])).find(Boolean) ?? null;
  const out = [];
  for (const listing of listIn(await getJson(`${base}/bounties.json?limit=${bounded(limit)}`, fetchImpl), ["tasks", "bounties", "items", "results"])) {
    let task = listing;
    const id = ["id", "task_id", "uuid", "slug"].map((key) => listing?.[key]).find((value) => typeof value === "string" && value.trim() !== "");
    if ((!issueField(task) || !rewardField(task)) && id) {
      try { const detail = await getJson(`${base}/tasks/${encodeURIComponent(id)}`, fetchImpl); task = detail?.task ?? detail; }
      catch (error) { onSkip("taskbounty", listing, `detail lookup failed: ${error.message}`); continue; }
    }
    const issue = issueField(task), usd = rewardField(task);
    if (!issue) { onSkip("taskbounty", task, "no GitHub issue source"); continue; }
    if (!usd) { onSkip("taskbounty", task, "no positive USD bounty"); continue; }
    out.push(new Bounty({ ...issue, title: task?.title, rewardUsd: usd, observedAt, platform: "taskbounty", platformId: id ?? null, body: task?.description ?? "" }));
    if (out.length >= bounded(limit)) break;
  }
  return out;
}

/** Agent Exchange: open tasks with a USDC budget whose spec names a GitHub issue. */
async function agentexchange({ limit, fetchImpl, observedAt, onSkip, url = "https://exchange.agentexchange.work/tasks" }) {
  const out = [];
  for (const task of listIn(await getJson(url, fetchImpl), ["tasks", "items", "results", "data"])) {
    const status = String(task?.status ?? "open").toLowerCase();
    const budget = positive(task?.budget_usdc ?? task?.budget);
    const issue = issueOf([task?.description, task?.spec, task?.title].filter((value) => typeof value === "string").join("\n"));
    if (status !== "open") { onSkip("agentexchange", task, `status ${status}`); continue; }
    if (!budget) { onSkip("agentexchange", task, "no positive budget"); continue; }
    if (!issue) { onSkip("agentexchange", task, "no GitHub issue source in task spec"); continue; }
    out.push(new Bounty({ ...issue, title: task?.title, rewardUsd: budget, observedAt, platform: "agentexchange", platformId: task?.id == null ? null : String(task.id),
      body: [task?.description, task?.spec].filter((value) => typeof value === "string").join("\n") }));
    if (out.length >= bounded(limit)) break;
  }
  return out;
}

/**
 * Agent Bounties (Base): only a healthy, fresh ready-to-earn projection is read, and only escrowed,
 * claimable, verification-ready coding work whose USDC reward exceeds its required external spend.
 * The reward is the solver reward less that spend.
 */
async function agentBounties({ limit, fetchImpl, observedAt, onSkip,
  url = "https://api.agentbounties.app/v1/opportunities?network=base-mainnet&view=ready_to_earn&source_type=canonical_base&limit=50" }) {
  const payload = await getJson(url, fetchImpl, { "x-agent-bounties-interface": "api" });
  if (payload?.schema_version !== "agent-bounties/opportunity-projection-v1" || payload?.network !== "base-mainnet"
    || payload?.applied_view !== "ready_to_earn" || payload?.degraded !== false || !Array.isArray(payload?.items)) {
    throw new Error("projection is not a healthy ready-to-earn projection");
  }
  const generated = Date.parse(payload.generated_at), observed = Date.parse(observedAt);
  if (!Number.isFinite(generated) || !Number.isFinite(observed) || observed - generated > 15 * 60_000 || generated - observed > 60_000) {
    throw new Error("projection is stale or clock-invalid");
  }
  const canonical = (payload.source_statuses ?? []).find((source) => source?.source_type === "canonical_base");
  if (!canonical || canonical.available !== true || canonical.error != null) throw new Error("canonical source is unavailable");
  const usdc = (money) => money && money.currency === "USDC" && money.unit === "base_units" && money.decimals === 6
    && typeof money.amount === "string" && /^(0|[1-9][0-9]*)$/u.test(money.amount) ? BigInt(money.amount) : null;
  const out = [];
  for (const item of payload.items) {
    const reward = usdc(item?.cash_economics?.solver_reward ?? item?.reward), spend = usdc(item?.cash_economics?.required_external_spend);
    const issue = issueOf(item?.source_url);
    const ready = item?.source_type === "canonical_base" && item?.network === "base-mainnet" && item?.work_state === "claimable"
      && item?.payment_state === "escrowed" && item?.payment_committed === true && item?.verification_ready === true
      && item?.cash_economics?.gross_cash_margin_positive === true && reward !== null && spend !== null && reward > spend
      && (Array.isArray(item?.categories) ? item.categories : []).some((value) => /coding|software|development/iu.test(String(value)));
    if (!ready || !issue) { onSkip("agent-bounties", item, "not ready software work with a GitHub source"); continue; }
    out.push(new Bounty({ ...issue, title: item?.title, rewardUsd: Number(reward - spend) / 1e6, observedAt, platform: "agent-bounties",
      platformId: item?.id == null ? null : String(item.id) }));
    if (out.length >= bounded(limit)) break;
  }
  return out;
}

export const PLATFORMS = Object.freeze({ opire, taskbounty, agentexchange, "agent-bounties": agentBounties });

/** Bounties from the named platforms; a platform that fails is reported, not fatal to the others. */
export async function listPlatformBounties({ platforms = Object.keys(PLATFORMS), limit = 20, fetchImpl = fetch,
  observedAt = new Date().toISOString(), onSkip = () => {}, urls = {} } = {}) {
  const unknown = platforms.filter((name) => !PLATFORMS[name]);
  if (unknown.length > 0) throw new TypeError(`unknown bounty platform: ${unknown.join(", ")}`);
  const results = await Promise.allSettled(platforms.map((name) =>
    PLATFORMS[name]({ limit, fetchImpl, observedAt, onSkip, ...(urls[name] ? { url: urls[name] } : {}) })));
  return {
    bounties: results.flatMap((result) => result.status === "fulfilled" ? result.value : []),
    failures: results.flatMap((result, index) => result.status === "rejected" ? [{ platform: platforms[index], error: result.reason?.message ?? String(result.reason) }] : []),
  };
}
