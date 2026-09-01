// config — the capability gates and per-account policy of the Aagaard fleet.
//
// Aagaard orchestrates a fleet of Hive accounts across four capability lanes.
// Two are *operational* (the platform may act on-chain): `voting` (spends only
// regenerating voting-mana to claim a share of each block's content-reward
// mint) and `trading` (moves liquid value on the internal HIVE/HBD market, the
// Hive-Engine token books, and the AMM pools). Two are *prepared but locked*:
// `posting` (composing content) and `gaming` (playing on-chain games with
// staked assets) are fully built but MUST NOT broadcast until a human flips
// them on — `lockedCapabilities` cannot be enabled at runtime, only in source.
//
// Safety is layered, not implicit:
//   1. `dryRun` (global) — when true NO broadcast leaves the process; every lane
//      computes its full plan and the orchestrator records it. Default-on; a
//      human exports AAGAARD_LIVE=1 to arm the fleet.
//   2. capability gates — voting/trading on, posting/gaming locked off.
//   3. per-account `tradingLive` — only the sandbox account (sigmund-vexler)
//      is permitted live financial action; every other account is propose-only
//      on the trading lane even when the fleet is armed.
// The gates compose by AND: an op broadcasts iff live AND capability-enabled AND
// (for trades) the account is trading-live.

import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";

import { resolveStrategy, type VotingStrategy } from "./strategy.mts";

export type Capability = "voting" | "trading" | "posting" | "gaming";

export const ALL_CAPABILITIES: readonly Capability[] = Object.freeze([
  "voting",
  "trading",
  "posting",
  "gaming",
]);

/** Capabilities that are prepared in code but can NEVER be armed at runtime.
 *  Enabling them is a source edit a human makes after reviewing the lane. */
export const LOCKED_CAPABILITIES: readonly Capability[] = Object.freeze(["posting", "gaming"]);

export function isLocked(capability: Capability): boolean {
  return LOCKED_CAPABILITIES.includes(capability);
}

/** Per-account risk envelope for the trading lane. Milli-units are thousandths
 *  of a token (1_000 = 1.000 HIVE/HBD), matching the chain's 3-dp assets. */
export interface AccountRiskPolicy {
  /** Internal-market HIVE sell cap per cycle, milli-HIVE. */
  readonly capHiveMilli: number;
  /** Internal-market HBD buy cap per cycle, milli-HBD. */
  readonly capHbdMilli: number;
  /** Liquid HBD kept out of savings, milli-HBD. */
  readonly minLiquidHbdMilli: number;
  /** Max single curation vote weight, basis points (10000 = 100%). */
  readonly maxVoteWeightBps: number;
  /** When true this account may broadcast trades while the fleet is armed.
   *  Only the sandbox account is live; everyone else is propose-only. */
  readonly tradingLive: boolean;
}

export interface AccountPolicy {
  readonly account: string;
  /** Which lanes run for this account (subset of the globally-enabled set). */
  readonly capabilities: readonly Capability[];
  readonly risk: AccountRiskPolicy;
  /** Incentive action classes this account may AUTO-execute when armed, opt-in
   *  per account (default none). Only non-posting classes are ever honoured —
   *  comment/post incentives can never auto-execute, posting being locked. */
  readonly incentiveAuto: readonly string[];
  /** The wallet's voting character: which feeds it watches and how it weights
   *  the upstream composite toward what its wallet-type values. Resolved from a
   *  named default per account, with an optional config overlay. */
  readonly strategy: VotingStrategy;
}

export interface AagaardConfig {
  readonly name: string;
  readonly keyRoot: string;
  /** When false, broadcasts are suppressed fleet-wide (plans still computed). */
  readonly live: boolean;
  /** Globally-enabled capability lanes (locked lanes are always excluded). */
  readonly enabled: readonly Capability[];
  /** Seconds between orchestrator ticks. */
  readonly cadenceSeconds: number;
  readonly accounts: readonly AccountPolicy[];
  readonly nodes?: readonly string[];
}

const CONSERVATIVE_RISK: AccountRiskPolicy = Object.freeze({
  capHiveMilli: 1_000,
  capHbdMilli: 1_000,
  minLiquidHbdMilli: 1_000,
  maxVoteWeightBps: 5_000,
  tradingLive: false,
});

/** The sandbox account: the one place live financial shenanigans are allowed.
 *  Larger caps, full vote weight, and the only `tradingLive` envelope. */
const SANDBOX_RISK: AccountRiskPolicy = Object.freeze({
  capHiveMilli: 5_000,
  capHbdMilli: 5_000,
  minLiquidHbdMilli: 500,
  maxVoteWeightBps: 10_000,
  tradingLive: true,
});

const SANDBOX_ACCOUNT = "sigmund-vexler";

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8")) as unknown;
}

/** Lanes operational for an account: voting fleet-wide; trading fleet-wide
 *  (propose-only off the sandbox); posting/gaming are prepared per-account but
 *  excluded from the *enabled* set by the lock, so they never broadcast. */
function defaultCapabilities(): readonly Capability[] {
  return Object.freeze(["voting", "trading", "posting", "gaming"] as Capability[]);
}

function riskFor(account: string): AccountRiskPolicy {
  return account === SANDBOX_ACCOUNT ? SANDBOX_RISK : CONSERVATIVE_RISK;
}

/**
 * Load the fleet policy. Accounts come from the Propolis config (so the read
 * surface and the operational surface name the same fleet); the operational
 * overlay (gates, caps, cadence, live) comes from an optional aagaard.config.json
 * merged over safe defaults. `live` is forced on only by AAGAARD_LIVE=1 in the
 * environment OR an explicit `"live": true` in the config — never by accident.
 */
export function loadAagaardConfig(options: {
  readonly propolisConfigPath: string;
  readonly aagaardConfigPath?: string;
  readonly keyRoot?: string;
  readonly env?: NodeJS.ProcessEnv;
}): AagaardConfig {
  const env = options.env ?? process.env;
  const propolis = isRecord(readJson(options.propolisConfigPath)) ? (readJson(options.propolisConfigPath) as Record<string, unknown>) : {};

  let overlay: Record<string, unknown> = {};
  if (options.aagaardConfigPath) {
    try {
      const raw = readJson(options.aagaardConfigPath);
      if (isRecord(raw)) overlay = raw as Record<string, unknown>;
    } catch {
      // no operational overlay — safe defaults stand
    }
  }

  const accountNames = Array.isArray(propolis["accounts"])
    ? propolis["accounts"]
        .filter((a): a is { account: string } => isRecord(a) && typeof a["account"] === "string")
        .map((a) => a.account)
    : [];

  const keyRoot = expandHome(
    options.keyRoot
      ?? (typeof overlay["keyRoot"] === "string" ? (overlay["keyRoot"] as string) : undefined)
      ?? (typeof propolis["keyRoot"] === "string" ? (propolis["keyRoot"] as string) : "~/.config/blockchain/hive"),
  );

  const live = env["AAGAARD_LIVE"] === "1" || overlay["live"] === true;

  const enabledRaw = Array.isArray(overlay["enabled"])
    ? (overlay["enabled"] as unknown[]).filter((c): c is Capability => ALL_CAPABILITIES.includes(c as Capability))
    : (["voting", "trading"] as Capability[]);
  // Locked lanes can never be in the enabled set, whatever the config says.
  const enabled = Object.freeze(enabledRaw.filter((c) => !isLocked(c)));

  const cadenceSeconds = typeof overlay["cadenceSeconds"] === "number" && overlay["cadenceSeconds"] >= 60
    ? overlay["cadenceSeconds"]
    : 900;

  const accountOverrides = isRecord(overlay["accounts"]) ? (overlay["accounts"] as Record<string, unknown>) : {};

  const accounts: readonly AccountPolicy[] = Object.freeze(
    accountNames.map((account) => {
      const ov = isRecord(accountOverrides[account]) ? (accountOverrides[account] as Record<string, unknown>) : {};
      const baseRisk = riskFor(account);
      const risk: AccountRiskPolicy = Object.freeze({
        capHiveMilli: typeof ov["capHiveMilli"] === "number" ? ov["capHiveMilli"] : baseRisk.capHiveMilli,
        capHbdMilli: typeof ov["capHbdMilli"] === "number" ? ov["capHbdMilli"] : baseRisk.capHbdMilli,
        minLiquidHbdMilli: typeof ov["minLiquidHbdMilli"] === "number" ? ov["minLiquidHbdMilli"] : baseRisk.minLiquidHbdMilli,
        maxVoteWeightBps: typeof ov["maxVoteWeightBps"] === "number" ? ov["maxVoteWeightBps"] : baseRisk.maxVoteWeightBps,
        tradingLive: typeof ov["tradingLive"] === "boolean" ? ov["tradingLive"] : baseRisk.tradingLive,
      });
      const incentiveAuto = Array.isArray(ov["incentiveAuto"])
        ? Object.freeze((ov["incentiveAuto"] as unknown[]).filter((x): x is string => typeof x === "string"))
        : Object.freeze([] as string[]);
      const strategy = resolveStrategy(account, ov["strategy"]);
      return Object.freeze({ account, capabilities: defaultCapabilities(), risk, incentiveAuto, strategy });
    }),
  );

  const nodes = Array.isArray(propolis["nodes"])
    ? Object.freeze((propolis["nodes"] as unknown[]).filter((n): n is string => typeof n === "string"))
    : undefined;

  return Object.freeze({
    name: typeof propolis["name"] === "string" ? (propolis["name"] as string) : "aagaard",
    keyRoot,
    live,
    enabled,
    cadenceSeconds,
    accounts,
    ...(nodes === undefined ? {} : { nodes }),
  });
}

/** Whether a capability is operational right now: globally enabled and not
 *  locked. Locked lanes never report enabled regardless of config. */
export function capabilityEnabled(config: AagaardConfig, capability: Capability): boolean {
  return !isLocked(capability) && config.enabled.includes(capability);
}
