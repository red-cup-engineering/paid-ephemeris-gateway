const WAD = 10n ** 18n;
const BASIS_POINTS = 10_000n;
const STRICT_TARGET_HEALTH_FACTOR_MANTISSA = "1500000000000000000";
const BTC_FAMILY_TARGET_HEALTH_FACTOR_MANTISSA = "1200000000000000000";
const MINIMUM_BTC_DEBT_SHARE_BPS = 9_999n;
const MINIMUM_BTC_COLLATERAL_SHARE_BPS = 8_000n;

// Moonwell market symbols are the asset-family labels present in its fixed-block
// disclosure. The policy does not infer a family from quantities or addresses.
const BTC_FAMILY_MARKET_SYMBOL = /^(?:m)?(?:cb|l|t|w|x)?btc$/iu;

function uint(value) {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "string" && /^(?:0|[1-9][0-9]*)$/u.test(value)) return BigInt(value);
  return null;
}

function marketValue(market) {
  const supplied = uint(market?.suppliedUnderlyingRaw);
  const borrowed = uint(market?.borrowedUnderlyingRaw);
  const price = uint(market?.underlyingPriceMantissa);
  const collateralFactor = uint(market?.collateralFactorMantissa);
  if (supplied === null || borrowed === null || price === null || collateralFactor === null
      || !Number.isInteger(market?.underlyingDecimals) || market.underlyingDecimals < 0 || market.underlyingDecimals > 36) return null;
  // The protocol's oracle-price scale incorporates underlying decimals; validate
  // them here and preserve its exact fixed-point valuation equations.
  const collateral = market.entered === true ? (supplied * price * collateralFactor) / (WAD * WAD * WAD) : 0n;
  const debtNumerator = borrowed * price;
  const debt = debtNumerator === 0n ? 0n : ((debtNumerator - 1n) / (WAD * WAD)) + 1n;
  return { collateral, debt };
}

function shareBps(part, total) {
  return total === 0n ? null : (part * BASIS_POINTS) / total;
}

function evidence(markets) {
  let collateral = 0n;
  let debt = 0n;
  let btcCollateral = 0n;
  let btcDebt = 0n;
  let valuationKnown = true;
  const collateralSymbols = [];
  const debtSymbols = [];
  for (const market of markets) {
    const value = marketValue(market);
    const supplied = uint(market?.suppliedUnderlyingRaw);
    const borrowed = uint(market?.borrowedUnderlyingRaw);
    if (supplied === null || borrowed === null || ((supplied > 0n || borrowed > 0n) && value === null)) {
      valuationKnown = false;
      continue;
    }
    if (supplied > 0n) collateralSymbols.push(market.symbol ?? null);
    if (borrowed > 0n) debtSymbols.push(market.symbol ?? null);
    if (value === null) continue;
    collateral += value.collateral;
    debt += value.debt;
    if (typeof market.symbol === "string" && BTC_FAMILY_MARKET_SYMBOL.test(market.symbol)) {
      btcCollateral += value.collateral;
      btcDebt += value.debt;
    }
  }
  return {
    valuationKnown,
    collateralValueMantissa: collateral.toString(), debtValueMantissa: debt.toString(),
    btcCollateralValueMantissa: btcCollateral.toString(), btcDebtValueMantissa: btcDebt.toString(),
    btcCollateralShareBps: shareBps(btcCollateral, collateral)?.toString() ?? null,
    btcDebtShareBps: shareBps(btcDebt, debt)?.toString() ?? null,
    collateralSymbols, debtSymbols,
  };
}

/**
 * Select an intervention target from fixed-block, risk-adjusted market facts.
 * BTC may receive 1.2 only when its debt is at least 99.99% BTC by value and
 * its risk-adjusted collateral is at least 80% BTC by value. Missing valuation,
 * a materially mixed debt book, or non-dominant BTC collateral retains 1.5.
 */
export function selectHealthFactorTarget(rawMarkets) {
  const facts = evidence(Array.isArray(rawMarkets) ? rawMarkets : []);
  const debtShare = facts.btcDebtShareBps === null ? null : BigInt(facts.btcDebtShareBps);
  const collateralShare = facts.btcCollateralShareBps === null ? null : BigInt(facts.btcCollateralShareBps);
  const btcCore = facts.valuationKnown && debtShare !== null && collateralShare !== null
    && debtShare >= MINIMUM_BTC_DEBT_SHARE_BPS && collateralShare >= MINIMUM_BTC_COLLATERAL_SHARE_BPS;
  return Object.freeze({
    mantissa: btcCore ? BTC_FAMILY_TARGET_HEALTH_FACTOR_MANTISSA : STRICT_TARGET_HEALTH_FACTOR_MANTISSA,
    decimal: btcCore ? "1.2" : "1.5",
    classification: btcCore ? "btc-denominated-core" : "strict-default",
    thresholds: {
      minimumBtcDebtShareBps: MINIMUM_BTC_DEBT_SHARE_BPS.toString(),
      minimumBtcCollateralShareBps: MINIMUM_BTC_COLLATERAL_SHARE_BPS.toString(),
    },
    evidence: facts,
  });
}

export const BTC_FAMILY_TARGET_HEALTH_FACTOR_WAD = BTC_FAMILY_TARGET_HEALTH_FACTOR_MANTISSA;
export const STRICT_TARGET_HEALTH_FACTOR_WAD = STRICT_TARGET_HEALTH_FACTOR_MANTISSA;
