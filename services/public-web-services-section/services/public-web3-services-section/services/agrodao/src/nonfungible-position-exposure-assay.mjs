import { semanticIdentity } from "./semantic-identity.mjs";
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;

const PROFILE = "org.emsenn.agrodao.nonfungible-position-exposure-assay.v1";
const DISPOSITIONS = Object.freeze([
  "inert-empty",
  "recoverable-principal",
  "live-liability",
  "further-assay",
  "ignore-untrusted",
]);

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

function text(name, value, pattern = /^.+$/u) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`${name} must be bounded text`);
  return value;
}

function flag(name, value) {
  if (typeof value !== "boolean") throw new Error(`${name} must be boolean`);
  return value;
}

function quantity(name, value) {
  text(name, value, /^(0|[1-9][0-9]*)$/u);
  return BigInt(value);
}

function credentialFreeHttps(name, value) {
  const parsed = new URL(text(name, value));
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${name} must be a credential-free HTTPS URL`);
  }
  return parsed.href;
}

function assertNoNumericOrTransactionMaterial(value, path = "input") {
  if (typeof value === "number" || typeof value === "bigint") {
    throw new Error(`${path} must encode every integer as a decimal string`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoNumericOrTransactionMaterial(entry, `${path}[${index}]`));
    return;
  }
  if (value == null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(calldata|data|privateKey|mnemonic|rawTransaction|rlp|secret|signedTransaction)$/iu.test(key)) {
      throw new Error(`${path}.${key} is transaction or secret material and is refused`);
    }
    assertNoNumericOrTransactionMaterial(entry, `${path}.${key}`);
  }
}

function normalizeAmounts(name, values, caip2) {
  if (!Array.isArray(values) || values.length > 16) throw new Error(`${name} must be an array of at most sixteen entries`);
  const normalized = values.map((value, index) => {
    const entryName = `${name}[${index}]`;
    object(entryName, value);
    const asset = text(`${entryName}.asset`, value.asset,
      /^eip155:[1-9][0-9]*\/(?:erc20:0x[0-9a-fA-F]{40}|slip44:60)$/u);
    if (!asset.startsWith(`${caip2}/`)) throw new Error(`${entryName}.asset must belong to the position chain`);
    return { asset, amount: quantity(`${entryName}.amount`, value.amount) };
  });
  if (new Set(normalized.map(({ asset }) => asset.toLowerCase())).size !== normalized.length) {
    throw new Error(`${name} must contain unique asset identifiers`);
  }
  return normalized;
}

function normalizePosition(position, index) {
  const name = `positions[${index}]`;
  object(name, position);
  const chain = object(`${name}.chain`, position.chain);
  const caip2 = text(`${name}.chain.caip2`, chain.caip2, /^eip155:[1-9][0-9]*$/u);
  const snapshotBlock = quantity(`${name}.chain.snapshotBlock`, chain.snapshotBlock);
  const snapshotTimestamp = quantity(`${name}.chain.snapshotTimestamp`, chain.snapshotTimestamp);
  if (snapshotBlock === 0n || snapshotTimestamp === 0n) throw new Error(`${name}.chain snapshot must be positive`);
  const instrument = text(`${name}.instrument`, position.instrument,
    /^eip155:[1-9][0-9]*\/erc721:0x[0-9a-fA-F]{40}\/(0|[1-9][0-9]*)$/u);
  if (!instrument.startsWith(`${caip2}/`)) throw new Error(`${name}.instrument must belong to the position chain`);
  const evidence = object(`${name}.evidence`, position.evidence);
  const state = object(`${name}.state`, position.state);
  const sourceUrls = Array.isArray(position.sourceUrls)
    ? position.sourceUrls.map((url, sourceIndex) => credentialFreeHttps(`${name}.sourceUrls[${sourceIndex}]`, url))
    : (() => { throw new Error(`${name}.sourceUrls must be an array`); })();
  if (sourceUrls.length === 0 || sourceUrls.length > 12) throw new Error(`${name}.sourceUrls must contain one through twelve entries`);

  return {
    positionId: text(`${name}.positionId`, position.positionId, /^[a-z0-9][a-z0-9-]{2,99}$/u),
    wallet: text(`${name}.wallet`, position.wallet, /^[A-Z][A-Z0-9_-]{2,31}$/u),
    protocol: text(`${name}.protocol`, position.protocol, /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,79}$/u),
    instrument,
    chain: { caip2, snapshotBlock, snapshotTimestamp },
    evidence: {
      trustedContract: flag(`${name}.evidence.trustedContract`, evidence.trustedContract),
      contractProvenanceComplete: flag(`${name}.evidence.contractProvenanceComplete`, evidence.contractProvenanceComplete),
      accountStateComplete: flag(`${name}.evidence.accountStateComplete`, evidence.accountStateComplete),
      recoverableStateComplete: flag(`${name}.evidence.recoverableStateComplete`, evidence.recoverableStateComplete),
      liabilityStateComplete: flag(`${name}.evidence.liabilityStateComplete`, evidence.liabilityStateComplete),
    },
    state: {
      activePosition: flag(`${name}.state.activePosition`, state.activePosition),
      canLiquidate: flag(`${name}.state.canLiquidate`, state.canLiquidate),
      recoverableAssets: normalizeAmounts(`${name}.state.recoverableAssets`, state.recoverableAssets, caip2),
      liabilities: normalizeAmounts(`${name}.state.liabilities`, state.liabilities, caip2),
    },
    sourceUrls,
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

function assayPosition(position) {
  const evidenceComplete = position.evidence.contractProvenanceComplete
    && position.evidence.accountStateComplete
    && position.evidence.recoverableStateComplete
    && position.evidence.liabilityStateComplete;
  const hasRecoverablePrincipal = position.state.recoverableAssets.some(({ amount }) => amount > 0n);
  const hasLiability = position.state.liabilities.some(({ amount }) => amount > 0n)
    || position.state.canLiquidate;

  let disposition;
  let reason;
  if (!position.evidence.trustedContract) {
    disposition = "ignore-untrusted";
    reason = "contract provenance is not trusted";
  } else if (!evidenceComplete) {
    disposition = "further-assay";
    reason = "one or more fixed-block evidence domains are incomplete";
  } else if (hasLiability) {
    disposition = "live-liability";
    reason = "positive liability or liquidation exposure dominates recovery classification";
  } else if (hasRecoverablePrincipal) {
    disposition = "recoverable-principal";
    reason = "positive recoverable asset quantity is evidenced without a live liability";
  } else if (!position.state.activePosition) {
    disposition = "inert-empty";
    reason = "complete state shows no active position, recoverable quantity, or liability";
  } else {
    disposition = "further-assay";
    reason = "active position has no quantified recovery or liability state";
  }

  return {
    positionId: position.positionId,
    wallet: position.wallet,
    protocol: position.protocol,
    instrument: position.instrument,
    chain: serializable(position.chain),
    disposition,
    reason,
    evidence: position.evidence,
    state: serializable(position.state),
    gate: {
      evidenceComplete,
      hasRecoverablePrincipal,
      hasLiability,
      executionAdmitted: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
    },
    sourceUrls: position.sourceUrls,
  };
}

export function assayNonfungiblePositionExposure(rawInput) {
  assertNoNumericOrTransactionMaterial(rawInput);
  const input = object("input", rawInput);
  if (input.profile !== PROFILE) throw new Error(`profile must equal ${PROFILE}`);
  const authority = object("authority", input.authority);
  if (flag("authority.fixedBlockEvidenceOnly", authority.fixedBlockEvidenceOnly) !== true
      || flag("authority.liveMutation", authority.liveMutation) !== false
      || flag("authority.transactionAssembly", authority.transactionAssembly) !== false
      || flag("authority.signerMaterialPresent", authority.signerMaterialPresent) !== false
      || flag("authority.signing", authority.signing) !== false
      || flag("authority.broadcast", authority.broadcast) !== false) {
    throw new Error("authority must be credential-free fixed-block evidence with no live mutation, transaction assembly, signing, or broadcast");
  }
  if (!Array.isArray(input.positions) || input.positions.length === 0 || input.positions.length > 128) {
    throw new Error("positions must contain one through one hundred twenty-eight entries");
  }
  const normalized = input.positions.map(normalizePosition);
  if (new Set(normalized.map(({ positionId }) => positionId)).size !== normalized.length) {
    throw new Error("position identifiers must be unique");
  }
  if (new Set(normalized.map(({ instrument }) => instrument.toLowerCase())).size !== normalized.length) {
    throw new Error("position instruments must be unique");
  }
  const positions = normalized.map(assayPosition);
  const dispositionCounts = Object.fromEntries(DISPOSITIONS.map((disposition) => [
    disposition,
    positions.filter((position) => position.disposition === disposition).length.toString(),
  ]));
  const result = {
    profile: PROFILE,
    outcome: "completed-nonfungible-position-exposure-assay",
    positionCount: positions.length.toString(),
    dispositionCounts,
    positions,
    gate: {
      executionAdmitted: false,
      transactionAssembly: false,
      signing: false,
      broadcast: false,
      chainMutation: false,
      reason: "position classification is evidence, never custody or execution authority",
    },
  };
  return { id: semanticId("agrodao.nonfungible-position-exposure-assay", { input: serializable(normalized), result }), ...result };
}

export const NONFUNGIBLE_POSITION_EXPOSURE_ASSAY_PROFILE = PROFILE;
export const NONFUNGIBLE_POSITION_EXPOSURE_DISPOSITIONS = DISPOSITIONS;
