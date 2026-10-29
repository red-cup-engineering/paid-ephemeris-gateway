import { semanticIdentity } from "./semantic-identity.mjs";

export const CRYPTO_CAPITAL_OPPORTUNITY_PROFILE =
  "org.emsenn.agrodao.crypto-capital-opportunity.v1";

export const CRYPTO_CAPITAL_ACTIONS = Object.freeze([
  "hold",
  "harvest",
  "rotate",
  "consolidate",
  "unwind",
]);

const ACTIONS = new Set(CRYPTO_CAPITAL_ACTIONS);
const UINT = /^(?:0|[1-9][0-9]*)$/u;
const ID = /^[a-z][a-z0-9-]{2,79}$/u;
const CAIP10 = /^eip155:[1-9][0-9]*:0x[0-9a-f]{40}$/u;
const EVIDENCE_ID = /^(?:ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}|urn:[A-Za-z0-9][A-Za-z0-9:._-]+)$/u;
const FORBIDDEN_KEY = /^(?:calldata|credential|credentialalias|credentialenvalias|data|envalias|mnemonic|privatekey|rawtransaction|rlp|secret|seed|seedphrase|signature|signedtransaction|transactionrequest)$/iu;
const MAX_INPUT_DEPTH = 12;
const MAX_INPUT_NODES = 50_000;
const MAX_CONTAINER_ENTRIES = 512;
const MAX_INPUT_STRING_LENGTH = 4_096;
const MAX_TEXT_LENGTH = 2_048;
const MAX_QUANTITY_DIGITS = 78;
const MAX_POSITIONS = 128;
const MAX_PROPOSALS = 256;
const MAX_LIST_ENTRIES = 64;

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function exactKeys(name, value, keys) {
  object(name, value);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join("\0") !== expected.join("\0")) {
    throw new TypeError(`${name} must contain exactly: ${expected.join(", ")}`);
  }
}

function text(name, value, pattern = /^.+$/u, maximumLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string" || value.length > maximumLength || !pattern.test(value)) {
    throw new TypeError(`${name} is not canonical text`);
  }
  return value;
}

function flag(name, value) {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
  return value;
}

function quantity(name, value) {
  return BigInt(text(name, value, UINT, MAX_QUANTITY_DIGITS));
}

function positive(name, value) {
  const result = quantity(name, value);
  if (result === 0n) throw new TypeError(`${name} must be positive`);
  return result;
}

function instant(name, value) {
  const result = text(name, value);
  const milliseconds = Date.parse(result);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== result) {
    throw new TypeError(`${name} must be a canonical ISO instant`);
  }
  return { value: result, milliseconds };
}

function nullableQuantity(name, value) {
  return value === null ? null : quantity(name, value);
}

function minimum(values) {
  return values.reduce((result, value) => value < result ? value : result);
}

function maximum(values) {
  return values.reduce((result, value) => value > result ? value : result);
}

function boundedArray(name, value, maximumLength) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximumLength) {
    throw new TypeError(`${name} must be a non-empty array with at most ${maximumLength} entries`);
  }
  return value;
}

function sortedUniqueText(name, value, pattern = /^.+$/u) {
  boundedArray(name, value, MAX_LIST_ENTRIES);
  const result = value.map((entry, index) => text(`${name}[${index}]`, entry, pattern));
  if (new Set(result).size !== result.length) throw new TypeError(`${name} must be unique`);
  return result.sort((left, right) => left.localeCompare(right));
}

function orderedUniqueText(name, value, pattern = /^.+$/u) {
  boundedArray(name, value, MAX_LIST_ENTRIES);
  const result = value.map((entry, index) => text(`${name}[${index}]`, entry, pattern));
  if (new Set(result).size !== result.length) throw new TypeError(`${name} must be unique`);
  return result;
}

function scan(
  value,
  path = "input",
  state = { seen: new WeakSet(), nodes: 0 },
  depth = 0,
) {
  state.nodes += 1;
  if (state.nodes > MAX_INPUT_NODES) throw new TypeError("input is too large");
  if (typeof value === "number" || typeof value === "bigint") {
    throw new TypeError(`${path} must encode every integer as decimal text`);
  }
  if (typeof value === "string" && value.length > MAX_INPUT_STRING_LENGTH) {
    throw new TypeError(`${path} is too long`);
  }
  if (value == null || typeof value !== "object") return;
  if (depth > MAX_INPUT_DEPTH) throw new TypeError(`${path} is nested too deeply`);
  if (state.seen.has(value)) throw new TypeError(`${path} contains a cycle or repeated object reference`);
  state.seen.add(value);
  if (Array.isArray(value)) {
    if (value.length > MAX_CONTAINER_ENTRIES) throw new TypeError(`${path} has too many entries`);
    value.forEach((entry, index) => scan(entry, `${path}[${index}]`, state, depth + 1));
    return;
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_CONTAINER_ENTRIES) throw new TypeError(`${path} has too many entries`);
  for (const [key, entry] of entries) {
    if (key.length > MAX_INPUT_STRING_LENGTH) throw new TypeError(`${path} contains an oversized key`);
    if (FORBIDDEN_KEY.test(key.replace(/[^a-z]/giu, ""))) {
      throw new TypeError(`${path}.${key} is credential, secret, or transaction material and is refused`);
    }
    scan(entry, `${path}.${key}`, state, depth + 1);
  }
}

function deepFreeze(value) {
  if (value == null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function normalizeEvidence(name, raw) {
  exactKeys(name, raw, ["asOf", "complete", "provenance"]);
  return {
    asOf: instant(`${name}.asOf`, raw.asOf),
    complete: flag(`${name}.complete`, raw.complete),
    provenance: sortedUniqueText(`${name}.provenance`, raw.provenance, EVIDENCE_ID),
  };
}

function normalizeMandate(raw) {
  const keys = [
    "objective", "baseAsset", "allowedWrappers", "allowedVenues",
    "minimumRetainedNetBaseUnits", "maximumNetExposureReductionBaseUnits",
    "maximumWrapperDivergenceBps", "maximumDepegLossBps",
    "maximumLeverageBps", "minimumHealthFactorWad", "maximumGasBaseUnits",
    "maximumSlippageBaseUnits", "maximumFeesBaseUnits",
    "maximumEvidenceAgeSeconds", "requireExecutableExit",
  ];
  exactKeys("mandate", raw, keys);
  if (raw.objective !== "stack-sats" || raw.baseAsset !== "BTC") {
    throw new TypeError("mandate must optimize stack-sats in BTC base units");
  }
  const minimumRetainedNetBaseUnits = nullableQuantity(
    "mandate.minimumRetainedNetBaseUnits",
    raw.minimumRetainedNetBaseUnits,
  );
  const maximumNetExposureReductionBaseUnits = nullableQuantity(
    "mandate.maximumNetExposureReductionBaseUnits",
    raw.maximumNetExposureReductionBaseUnits,
  );
  if (minimumRetainedNetBaseUnits === null && maximumNetExposureReductionBaseUnits === null) {
    throw new TypeError("mandate must state minimum retained sats or maximum exposure reduction");
  }
  if (flag("mandate.requireExecutableExit", raw.requireExecutableExit) !== true) {
    throw new TypeError("mandate must require an executable exit");
  }
  return {
    objective: "stack-sats",
    baseAsset: "BTC",
    allowedWrappers: sortedUniqueText("mandate.allowedWrappers", raw.allowedWrappers, ID),
    allowedVenues: sortedUniqueText("mandate.allowedVenues", raw.allowedVenues, ID),
    minimumRetainedNetBaseUnits,
    maximumNetExposureReductionBaseUnits,
    maximumWrapperDivergenceBps: quantity("mandate.maximumWrapperDivergenceBps", raw.maximumWrapperDivergenceBps),
    maximumDepegLossBps: quantity("mandate.maximumDepegLossBps", raw.maximumDepegLossBps),
    maximumLeverageBps: quantity("mandate.maximumLeverageBps", raw.maximumLeverageBps),
    minimumHealthFactorWad: positive("mandate.minimumHealthFactorWad", raw.minimumHealthFactorWad),
    maximumGasBaseUnits: quantity("mandate.maximumGasBaseUnits", raw.maximumGasBaseUnits),
    maximumSlippageBaseUnits: quantity("mandate.maximumSlippageBaseUnits", raw.maximumSlippageBaseUnits),
    maximumFeesBaseUnits: quantity("mandate.maximumFeesBaseUnits", raw.maximumFeesBaseUnits),
    maximumEvidenceAgeSeconds: positive("mandate.maximumEvidenceAgeSeconds", raw.maximumEvidenceAgeSeconds),
    requireExecutableExit: true,
  };
}

function normalizePosition(raw, index) {
  const name = `positions[${index}]`;
  exactKeys(name, raw, [
    "positionId", "account", "wrapper", "venue", "grossBaseExposureUnits",
    "debtBaseUnits", "leverageBps", "healthFactorWad", "wrapperDivergenceBps",
    "depegLossBps", "evidence",
  ]);
  return {
    positionId: text(`${name}.positionId`, raw.positionId, ID),
    account: text(`${name}.account`, raw.account, CAIP10),
    wrapper: text(`${name}.wrapper`, raw.wrapper, ID),
    venue: text(`${name}.venue`, raw.venue, ID),
    grossBaseExposureUnits: quantity(`${name}.grossBaseExposureUnits`, raw.grossBaseExposureUnits),
    debtBaseUnits: quantity(`${name}.debtBaseUnits`, raw.debtBaseUnits),
    leverageBps: quantity(`${name}.leverageBps`, raw.leverageBps),
    healthFactorWad: positive(`${name}.healthFactorWad`, raw.healthFactorWad),
    wrapperDivergenceBps: quantity(`${name}.wrapperDivergenceBps`, raw.wrapperDivergenceBps),
    depegLossBps: quantity(`${name}.depegLossBps`, raw.depegLossBps),
    evidence: normalizeEvidence(`${name}.evidence`, raw.evidence),
  };
}

function normalizeCosts(name, raw) {
  const keys = [
    "gasBaseUnits", "slippageBaseUnits", "feesBaseUnits", "borrowBaseUnits",
    "impermanentLossBaseUnits", "rewardConversionBaseUnits", "otherBaseUnits",
  ];
  exactKeys(name, raw, keys);
  return Object.fromEntries(keys.map((key) => [key, quantity(`${name}.${key}`, raw[key])]));
}

function normalizeProposal(raw, index, positions) {
  const name = `proposals[${index}]`;
  exactKeys(name, raw, [
    "proposalId", "action", "positionIds", "targetAccount", "targetWrapper",
    "targetVenue", "grossBaseAssetGainUnits", "costs",
    "resultingGrossBaseExposureUnits", "resultingDebtBaseUnits", "resultingLeverageBps",
    "resultingMinimumHealthFactorWad", "resultingWrapperDivergenceBps",
    "resultingDepegLossBps", "changedRisks", "evidence", "exit", "falsifier",
  ]);
  const proposalId = text(`${name}.proposalId`, raw.proposalId, ID);
  const action = text(`${name}.action`, raw.action, ID);
  if (!ACTIONS.has(action)) throw new TypeError(`${name}.action is unsupported`);
  const positionIds = sortedUniqueText(`${name}.positionIds`, raw.positionIds, ID);
  for (const positionId of positionIds) {
    if (!positions.has(positionId)) throw new TypeError(`${name} names unknown position '${positionId}'`);
  }
  const accounts = new Set([...positions.values()].map(({ account }) => account));
  const targetAccount = raw.targetAccount === null
    ? null
    : text(`${name}.targetAccount`, raw.targetAccount, CAIP10);
  if (targetAccount !== null && !accounts.has(targetAccount)) {
    throw new TypeError(`${name}.targetAccount must be a known portfolio account`);
  }
  if (action === "consolidate") {
    const sourceAccounts = new Set(positionIds.map((positionId) => positions.get(positionId).account));
    if (sourceAccounts.size < 2 || targetAccount === null) {
      throw new TypeError(`${name} consolidation must evaluate at least two accounts and one known target`);
    }
  }
  const targetWrapper = raw.targetWrapper === null
    ? null
    : text(`${name}.targetWrapper`, raw.targetWrapper, ID);
  const targetVenue = raw.targetVenue === null
    ? null
    : text(`${name}.targetVenue`, raw.targetVenue, ID);
  if (action === "hold") {
    if (targetAccount !== null || targetWrapper !== null || targetVenue !== null
        || positionIds.length !== positions.size) {
      throw new TypeError(`${name} hold baseline must be targetless and cover the whole portfolio`);
    }
  } else if (targetWrapper === null || targetVenue === null) {
    throw new TypeError(`${name} must name its target wrapper and venue`);
  }
  exactKeys(`${name}.exit`, raw.exit, ["executable", "route"]);
  const route = orderedUniqueText(`${name}.exit.route`, raw.exit.route, ID);
  return {
    proposalId,
    action,
    positionIds,
    targetAccount,
    targetWrapper,
    targetVenue,
    grossBaseAssetGainUnits: quantity(`${name}.grossBaseAssetGainUnits`, raw.grossBaseAssetGainUnits),
    costs: normalizeCosts(`${name}.costs`, raw.costs),
    resultingGrossBaseExposureUnits: quantity(`${name}.resultingGrossBaseExposureUnits`, raw.resultingGrossBaseExposureUnits),
    resultingDebtBaseUnits: quantity(`${name}.resultingDebtBaseUnits`, raw.resultingDebtBaseUnits),
    resultingLeverageBps: quantity(`${name}.resultingLeverageBps`, raw.resultingLeverageBps),
    resultingMinimumHealthFactorWad: positive(`${name}.resultingMinimumHealthFactorWad`, raw.resultingMinimumHealthFactorWad),
    resultingWrapperDivergenceBps: quantity(`${name}.resultingWrapperDivergenceBps`, raw.resultingWrapperDivergenceBps),
    resultingDepegLossBps: quantity(`${name}.resultingDepegLossBps`, raw.resultingDepegLossBps),
    changedRisks: sortedUniqueText(`${name}.changedRisks`, raw.changedRisks, ID),
    evidence: normalizeEvidence(`${name}.evidence`, raw.evidence),
    exit: { executable: flag(`${name}.exit.executable`, raw.exit.executable), route },
    falsifier: text(`${name}.falsifier`, raw.falsifier),
  };
}

function serializable(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializable);
  if (value != null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializable(entry)]));
  }
  return value;
}

function evidenceReasons(evidence, evaluatedAtMs, maximumAgeMs, prefix) {
  return [
    ...(evidence.complete ? [] : [`${prefix}-evidence-incomplete`]),
    ...(evidence.asOf.milliseconds > evaluatedAtMs
      || evaluatedAtMs - evidence.asOf.milliseconds > maximumAgeMs
      ? [`${prefix}-evidence-stale`]
      : []),
  ];
}

/**
 * Compare caller-supplied BTC-family opportunities. This operation is pure:
 * it observes no wallet, reads no credential, and constructs no transaction.
 */
export function evaluateCryptoCapitalOpportunities(raw) {
  scan(raw);
  exactKeys("input", raw, ["profile", "evaluatedAt", "horizonDays", "mandate", "positions", "proposals"]);
  if (raw.profile !== CRYPTO_CAPITAL_OPPORTUNITY_PROFILE) {
    throw new TypeError(`profile must equal ${CRYPTO_CAPITAL_OPPORTUNITY_PROFILE}`);
  }
  const evaluatedAt = instant("evaluatedAt", raw.evaluatedAt);
  const horizonDays = positive("horizonDays", raw.horizonDays);
  const mandate = normalizeMandate(raw.mandate);
  boundedArray("positions", raw.positions, MAX_POSITIONS);
  const positions = new Map();
  raw.positions.forEach((entry, index) => {
    const position = normalizePosition(entry, index);
    if (positions.has(position.positionId)) throw new TypeError("position IDs must be unique");
    positions.set(position.positionId, position);
  });
  boundedArray("proposals", raw.proposals, MAX_PROPOSALS);
  const proposals = raw.proposals.map((entry, index) => normalizeProposal(entry, index, positions));
  if (new Set(proposals.map(({ proposalId }) => proposalId)).size !== proposals.length) {
    throw new TypeError("proposal IDs must be unique");
  }
  if (!proposals.some(({ action }) => action === "hold")) {
    throw new TypeError("proposals must include a hold baseline");
  }

  const currentGrossBaseExposureUnits = [...positions.values()]
    .reduce((total, position) => total + position.grossBaseExposureUnits, 0n);
  const currentDebtBaseUnits = [...positions.values()]
    .reduce((total, position) => total + position.debtBaseUnits, 0n);
  const currentNetBaseExposureUnits = currentGrossBaseExposureUnits - currentDebtBaseUnits;
  const positionValues = [...positions.values()];
  const currentMaximumLeverageBps = maximum(positionValues.map(({ leverageBps }) => leverageBps));
  const currentMinimumHealthFactorWad = minimum(positionValues.map(({ healthFactorWad }) => healthFactorWad));
  const currentMaximumWrapperDivergenceBps = maximum(positionValues.map(({ wrapperDivergenceBps }) => wrapperDivergenceBps));
  const currentMaximumDepegLossBps = maximum(positionValues.map(({ depegLossBps }) => depegLossBps));
  const maximumAgeMs = mandate.maximumEvidenceAgeSeconds * 1_000n;
  if (maximumAgeMs > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("mandate.maximumEvidenceAgeSeconds is too large");
  }

  const evaluated = proposals.map((proposal) => {
    const allCosts = Object.values(proposal.costs).reduce((total, cost) => total + cost, 0n);
    const netBaseAssetGainUnits = proposal.grossBaseAssetGainUnits - allCosts;
    const resultingNetBaseExposureUnits = proposal.resultingGrossBaseExposureUnits - proposal.resultingDebtBaseUnits;
    const netExposureReduction = currentNetBaseExposureUnits > resultingNetBaseExposureUnits
      ? currentNetBaseExposureUnits - resultingNetBaseExposureUnits
      : 0n;
    const reasons = [
      ...[...positions.values()].flatMap((position) => evidenceReasons(
        position.evidence,
        evaluatedAt.milliseconds,
        Number(maximumAgeMs),
        "position",
      )),
      ...evidenceReasons(proposal.evidence, evaluatedAt.milliseconds, Number(maximumAgeMs), "proposal"),
      ...(proposal.targetWrapper !== null && !mandate.allowedWrappers.includes(proposal.targetWrapper) ? ["wrapper-not-allowed"] : []),
      ...(proposal.targetVenue !== null && !mandate.allowedVenues.includes(proposal.targetVenue) ? ["venue-not-allowed"] : []),
      ...(proposal.resultingWrapperDivergenceBps > mandate.maximumWrapperDivergenceBps ? ["wrapper-divergence-exceeded"] : []),
      ...(proposal.resultingDepegLossBps > mandate.maximumDepegLossBps ? ["depeg-loss-exceeded"] : []),
      ...(proposal.resultingLeverageBps > mandate.maximumLeverageBps ? ["leverage-exceeded"] : []),
      ...(proposal.resultingMinimumHealthFactorWad < mandate.minimumHealthFactorWad ? ["health-factor-too-low"] : []),
      ...(proposal.costs.gasBaseUnits > mandate.maximumGasBaseUnits ? ["gas-cap-exceeded"] : []),
      ...(proposal.costs.slippageBaseUnits > mandate.maximumSlippageBaseUnits ? ["slippage-cap-exceeded"] : []),
      ...(proposal.costs.feesBaseUnits > mandate.maximumFeesBaseUnits ? ["fee-cap-exceeded"] : []),
      ...(mandate.minimumRetainedNetBaseUnits !== null
        && resultingNetBaseExposureUnits < mandate.minimumRetainedNetBaseUnits
        ? ["minimum-retained-exposure-violated"] : []),
      ...(mandate.maximumNetExposureReductionBaseUnits !== null
        && netExposureReduction > mandate.maximumNetExposureReductionBaseUnits
        ? ["exposure-reduction-tolerance-exceeded"] : []),
      ...(proposal.exit.executable && proposal.exit.route.length > 0 ? [] : ["executable-exit-missing"]),
      ...(netBaseAssetGainUnits < 0n ? ["negative-net-base-asset-gain"] : []),
      ...(proposal.action === "hold"
        && (proposal.grossBaseAssetGainUnits !== 0n || allCosts !== 0n
          || proposal.resultingGrossBaseExposureUnits !== currentGrossBaseExposureUnits
          || proposal.resultingDebtBaseUnits !== currentDebtBaseUnits
          || proposal.resultingLeverageBps !== currentMaximumLeverageBps
          || proposal.resultingMinimumHealthFactorWad !== currentMinimumHealthFactorWad
          || proposal.resultingWrapperDivergenceBps !== currentMaximumWrapperDivergenceBps
          || proposal.resultingDepegLossBps !== currentMaximumDepegLossBps)
        ? ["hold-baseline-must-preserve-current-state"] : []),
    ];
    const refusalReasons = [...new Set(reasons)].sort((left, right) => left.localeCompare(right));
    return {
      proposalId: proposal.proposalId,
      action: proposal.action,
      horizonDays: horizonDays.toString(),
      positionIds: proposal.positionIds,
      target: {
        account: proposal.targetAccount,
        wrapper: proposal.targetWrapper,
        venue: proposal.targetVenue,
      },
      economics: {
        grossBaseAssetGainUnits: proposal.grossBaseAssetGainUnits.toString(),
        costsAndDrags: serializable(proposal.costs),
        totalCostsAndDragsBaseUnits: allCosts.toString(),
        netBaseAssetGainUnits: netBaseAssetGainUnits.toString(),
      },
      resultingExposure: {
        baseAsset: "BTC",
        grossBaseUnits: proposal.resultingGrossBaseExposureUnits.toString(),
        debtBaseUnits: proposal.resultingDebtBaseUnits.toString(),
        netBaseUnits: resultingNetBaseExposureUnits.toString(),
        netReductionBaseUnits: netExposureReduction.toString(),
        leverageBps: proposal.resultingLeverageBps.toString(),
        minimumHealthFactorWad: proposal.resultingMinimumHealthFactorWad.toString(),
        wrapperDivergenceBps: proposal.resultingWrapperDivergenceBps.toString(),
        depegLossBps: proposal.resultingDepegLossBps.toString(),
      },
      changedRisks: proposal.changedRisks,
      evidence: {
        asOf: proposal.evidence.asOf.value,
        complete: proposal.evidence.complete,
        provenance: proposal.evidence.provenance,
      },
      exit: proposal.exit,
      falsifier: proposal.falsifier,
      admissible: refusalReasons.length === 0,
      refusalReasons,
    };
  });

  const ranked = evaluated
    .filter(({ admissible }) => admissible)
    .sort((left, right) => {
      const gainOrder = BigInt(right.economics.netBaseAssetGainUnits)
        - BigInt(left.economics.netBaseAssetGainUnits);
      return gainOrder === 0n
        ? left.proposalId.localeCompare(right.proposalId)
        : gainOrder > 0n ? 1 : -1;
    });
  const rankById = new Map(ranked.map(({ proposalId }, index) => [proposalId, index + 1]));
  const resultProposals = evaluated
    .map((proposal) => ({ ...proposal, rank: rankById.get(proposal.proposalId) ?? null }))
    .sort((left, right) => {
      if (left.rank !== null && right.rank !== null) return left.rank - right.rank;
      if (left.rank !== null) return -1;
      if (right.rank !== null) return 1;
      return left.proposalId.localeCompare(right.proposalId);
    });
  const normalizedInput = {
    profile: CRYPTO_CAPITAL_OPPORTUNITY_PROFILE,
    evaluatedAt: evaluatedAt.value,
    horizonDays,
    mandate,
    positions: [...positions.values()].sort((left, right) => left.positionId.localeCompare(right.positionId)),
    proposals: proposals.sort((left, right) => left.proposalId.localeCompare(right.proposalId)),
  };
  const body = {
    profile: CRYPTO_CAPITAL_OPPORTUNITY_PROFILE,
    objective: "stack-sats",
    baseAsset: "BTC",
    evaluatedAt: evaluatedAt.value,
    horizonDays: horizonDays.toString(),
    currentGrossBaseExposureUnits: currentGrossBaseExposureUnits.toString(),
    currentDebtBaseUnits: currentDebtBaseUnits.toString(),
    currentNetBaseExposureUnits: currentNetBaseExposureUnits.toString(),
    proposals: resultProposals,
    ranking: ranked.map(({ proposalId }) => proposalId),
    bestAdmissibleProposalId: ranked[0]?.proposalId ?? null,
    decisionBoundary: {
      callerSuppliedFactsOnly: true,
      recommendationOnly: true,
      secretAccess: false,
      networkAccess: false,
      transactionConstruction: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
    },
    replay: {
      module: "@red-cup-engineering/agrodao/crypto-capital-opportunity",
      export: "evaluateCryptoCapitalOpportunities",
      normalizedInput: serializable(normalizedInput),
    },
  };
  return deepFreeze({
    id: semanticIdentity("agrodao.crypto-capital-opportunity", body),
    ...body,
  });
}
