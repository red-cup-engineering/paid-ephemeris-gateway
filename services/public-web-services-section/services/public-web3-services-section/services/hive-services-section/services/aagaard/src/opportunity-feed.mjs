import { recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";

const ACTOR = "urn:ame:aagaard";
const SETTLEMENT = "eip155:31337:0xb0dfc2eb77fb622c93f791071c66b039a7ae428d";
export const OPPORTUNITY_FEED_CATEGORY = "aagaard.opportunity-feed";

function sourceUnknown(source, problem) {
  return Object.freeze({ source, status: "unknown", problem });
}

async function bounded(source, provider) {
  try {
    const value = await provider();
    if (value?.credentialAccess !== false || value?.chainMutation !== false) {
      return sourceUnknown(source, "provider did not prove credentialAccess:false and chainMutation:false");
    }
    return Object.freeze({ source, status: "observed", value });
  } catch (error) {
    return sourceUnknown(source, error instanceof Error ? error.message : String(error));
  }
}

function globalCandidates(observation) {
  if (observation.status !== "observed") return [];
  const scan = observation.value;
  return (scan.opportunities ?? []).filter((candidate) => candidate.policyAdmitted === true).map((candidate) => Object.freeze({
    source: "global-arbitrage-scan",
    opportunityClass: "swap-hive-profit",
    identity: candidate.pool,
    admittedBySourcePolicy: true,
    executionAdmissible: false,
    worstCaseProfitSwapHive: candidate.exact?.admitted ? candidate.exact.quote.worstCaseProfitSwapHive : null,
    resourceCost: Object.freeze({
      status: "unpriced-resource-cost-model",
      pricedBySource: Object.freeze(["pool-fee", "slippage-buffer", "complete-bid-book-depth"]),
      stillUnpriced: Object.freeze(["hive-resource-credits", "hive-engine-transaction-fees", "signer", "runner-or-paymaster"]),
    }),
    providers: scan.certifyingProviders ?? [],
    provenance: scan.providerKnowledge ?? null,
    sourceCandidate: candidate,
  }));
}

function gameCandidates(observation) {
  if (observation.status !== "observed") return [];
  const games = observation.value;
  return (games.ranked ?? []).map((candidate) => {
    const detail = candidate.game === "dcity" ? games.observations?.dcity?.plan ?? null
      : candidate.game === "holozing-rewards" ? games.observations?.holozingRewards?.plan ?? null
      : candidate.game === "terracore" ? games.observations?.terracore?.plan ?? null
      : null;
    return Object.freeze({
      source: "game-opportunity-cycle",
      opportunityClass: candidate.benefitClass,
      identity: `${candidate.game}:${candidate.action}`,
      admittedBySourcePolicy: candidate.admittedNow === true,
      executionAdmissible: false,
      resourceCost: Object.freeze({ status: candidate.rcDecision }),
      refusal: candidate.refusal ?? null,
      evidence: candidate.evidence,
      provenance: candidate.evidenceSummary,
      plan: detail,
      sourceCandidate: candidate,
    });
  });
}

function refusals(observations) {
  const output = [];
  const global = observations.globalArbitrage;
  if (global.status === "observed") {
    for (const candidate of global.value.opportunities ?? []) {
      if (candidate.policyAdmitted !== true) output.push(Object.freeze({ source: global.source,
        identity: candidate.pool, reason: candidate.policyRefusal ?? "source-policy-refused", evidence: candidate }));
    }
    if (global.value.refusal) output.push(Object.freeze({ source: global.source, identity: "scan", reason: global.value.refusal,
      evidence: global.value.providerKnowledge ?? null }));
  }
  const pool = observations.poolCycle;
  if (pool.status === "observed" && pool.value.decision === "refuse") output.push(Object.freeze({ source: pool.source,
    identity: (pool.value.route ?? []).join("->"), reason: pool.value.refusal ?? "source-policy-refused", evidence: pool.value.assay ?? null }));
  const games = observations.games;
  if (games.status === "observed") {
    for (const candidate of games.value.ranked ?? []) {
      if (candidate.refusal) output.push(Object.freeze({ source: games.source, identity: `${candidate.game}:${candidate.action}`,
        reason: candidate.refusal, evidence: candidate }));
    }
  }
  return output;
}

function unknowns(observations) {
  const output = Object.values(observations).filter((observation) => observation.status === "unknown");
  const global = observations.globalArbitrage;
  if (global.status === "observed") for (const unavailable of global.value.providerKnowledge?.unavailable ?? []) {
    output.push(Object.freeze({ source: global.source, status: "unknown", provider: unavailable.provider, problem: unavailable.problem }));
  }
  const pool = observations.poolCycle;
  if (pool.status === "observed") for (const unavailable of pool.value.assay?.providerKnowledge?.unavailable ?? []) {
    output.push(Object.freeze({ source: pool.source, status: "unknown", provider: unavailable.provider, problem: unavailable.problem }));
  }
  const games = observations.games;
  if (games.status === "observed") for (const unavailable of games.value.observations?.unavailable ?? []) {
    output.push(Object.freeze({ source: games.source, status: "unknown", provider: unavailable.game, problem: unavailable.error }));
  }
  if (games.status === "observed" && games.value.observations?.terracore?.plan?.kind === "claim"
    && games.value.observations?.terracoreExit == null) {
    output.push(Object.freeze({ source: games.source, status: "unknown", provider: "terracore-exit",
      problem: "claim exit-value observation unavailable" }));
  }
  return output;
}

export function formOpportunityFeed({ observedAt, globalArbitrage, poolCycle, games }) {
  const at = new Date(observedAt).toISOString();
  const observations = Object.freeze({ globalArbitrage, poolCycle, games });
  const candidates = Object.freeze([...globalCandidates(globalArbitrage), ...gameCandidates(games)]);
  return Object.freeze({
    kind: "aagaard.unified-opportunity-feed",
    version: 1,
    observedAt: at,
    authority: Object.freeze({ credentialAccess: false, chainMutation: false, signing: false, broadcasting: false, execution: false }),
    ordering: Object.freeze({ mode: "source-policy-only", noScalarization: true,
      statement: "SWAP.HIVE profit, treasury protection, productive state, learning, credentials, and resource costs remain separate benefit classes." }),
    candidates,
    refusals: Object.freeze(refusals(observations)),
    unknowns: Object.freeze(unknowns(observations)),
    evidence: observations,
  });
}

export async function recordOpportunityFeed(feed, { env = process.env, writer = recordSettlementRecord } = {}) {
  const agentUrl = env.WITNESS_JOURNAL_RDF_AGENT;
  if (!agentUrl && writer === recordSettlementRecord) {
    throw new Error("WITNESS_JOURNAL_RDF_AGENT must name Aagaard's contracted WitnessJournal provider");
  }
  return writer({ agentUrl, settlement: SETTLEMENT, actor: ACTOR, category: OPPORTUNITY_FEED_CATEGORY,
    recordedAt: feed.observedAt, record: feed });
}

export async function observeOpportunityFeed({ providers, now = () => new Date().toISOString(), writer = recordSettlementRecord,
  env = process.env } = {}) {
  if (!providers || typeof providers.globalArbitrage !== "function" || typeof providers.poolCycle !== "function" || typeof providers.games !== "function") {
    throw new TypeError("opportunity feed requires globalArbitrage, poolCycle, and games providers");
  }
  const observedAt = new Date(now()).toISOString();
  const [globalArbitrage, poolCycle, games] = await Promise.all([
    bounded("global-arbitrage-scan", providers.globalArbitrage),
    bounded("exact-pool-cycle-assay", providers.poolCycle),
    bounded("game-opportunity-cycle", providers.games),
  ]);
  const feed = formOpportunityFeed({ observedAt, globalArbitrage, poolCycle, games });
  const journal = await recordOpportunityFeed(feed, { env, writer });
  return Object.freeze({ feed, journal });
}
