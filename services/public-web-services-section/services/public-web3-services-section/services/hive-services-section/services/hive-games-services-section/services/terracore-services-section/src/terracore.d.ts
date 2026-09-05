// Type declarations for @red-cup-engineering/terracore-services-section/terracore.

export interface TerraCorePlayerState {
  readonly account: string;
  readonly scrap: string;
  readonly mineRate: string;
  readonly health: number;
  readonly damage: number;
  readonly defense: number;
  readonly engineering: number;
  readonly effectiveDamage: number;
  readonly effectiveDefense: number;
  readonly effectiveDodge: number;
  readonly effectiveCrit: number;
  readonly effectiveProtection: number;
  readonly attacks: number;
  readonly maxAttacks: number;
  readonly lastClaimMs?: number;
  readonly lastBattleMs?: number;
  readonly lastUpgradeMs?: number;
  readonly observedAt: string;
}

export interface TerraCoreClient {
  readPlayer(account: string): Promise<TerraCorePlayerState>;
}

export interface TerraCoreClientOptions {
  readonly endpoint?: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}

export interface TerraCoreCustomJsonIntent {
  readonly operation: readonly ["custom_json", Readonly<{
    required_auths: readonly string[];
    required_posting_auths: readonly string[];
    id: "terracore_claim" | "terracore_battle" | "ssc-mainnet-hive";
    json: string;
  }>];
  readonly role: "posting" | "active";
  readonly approvedForBroadcast: false;
}

export interface TerraCoreClaimCandidate extends TerraCoreCustomJsonIntent {
  readonly kind: "claim-scrap";
  readonly account: string;
  readonly amount: string;
  readonly observedScrap: string;
  readonly reason: string;
}

export interface TerraCoreActionRefusal {
  readonly action: "claim-scrap" | "battle";
  readonly reason: string;
}

export interface TerraCoreActionPlan {
  readonly account: string;
  readonly observedAt: string;
  readonly actions: readonly TerraCoreClaimCandidate[];
  readonly refusals: readonly TerraCoreActionRefusal[];
  readonly locked: true;
}

export interface TerraCoreBattleTargetState {
  readonly account: string;
  readonly scrap: string;
  readonly defense: number;
  readonly dodge: number;
  readonly protection: number;
  readonly observedAt: string;
}

export interface TerraCoreBattleSnapshot {
  readonly observedAt: string;
  readonly targets: readonly TerraCoreBattleTargetState[];
}

export interface TerraCoreBattlePolicy {
  readonly minimumTargetScrap: string;
  readonly maximumTargetDodge: number;
  readonly maximumDefenseNumerator: number;
  readonly maximumDefenseDenominator: number;
  readonly maximumObservationAgeMs: number;
}

export type TerraCoreBattleSelection =
  | (TerraCoreCustomJsonIntent & { readonly kind: "battle"; readonly account: string; readonly target: TerraCoreBattleTargetState; readonly reason: string })
  | { readonly kind: "refuse"; readonly reason: string };

export interface TerraCoreEngineeringUpgradeState {
  readonly player: TerraCorePlayerState;
  readonly liquidScrap: string;
  readonly scrapPrecision: number;
}

export interface TerraCoreEngineeringUpgradeQuote {
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly costScrap: string;
  readonly retainedLiquidScrap: string;
  readonly currentScrapPerDay: string;
  readonly expectedScrapPerDay: string;
  readonly incrementalScrapPerDay: string;
  readonly paybackMilliDays: number;
}

export type TerraCoreEngineeringUpgradePlan =
  | { readonly kind: "ready"; readonly reason: string; readonly quote: TerraCoreEngineeringUpgradeQuote }
  | { readonly kind: "refuse"; readonly reason: string };

export declare function parseTerraCorePlayer(body: string, observedAt?: string): TerraCorePlayerState;
export declare function createTerraCoreClient(options?: TerraCoreClientOptions): TerraCoreClient;
export declare function terraCoreClaimIntent(account: string, amount: string): TerraCoreCustomJsonIntent;
export declare function terraCoreBattleIntent(account: string, target: string): TerraCoreCustomJsonIntent;
export declare function terraCoreBattleTargetFromPlayer(player: TerraCorePlayerState): TerraCoreBattleTargetState;
export declare function parseTerraCoreBattleTargets(body: string, observedAt?: string): TerraCoreBattleSnapshot;
export declare function selectTerraCoreBattleTarget(
  actor: TerraCorePlayerState,
  snapshot: TerraCoreBattleSnapshot,
  excludedAccounts: readonly string[],
  now?: Date,
  policy?: TerraCoreBattlePolicy,
): TerraCoreBattleSelection;
export declare function planTerraCoreActions(state: TerraCorePlayerState, minimumClaimScrap?: string): TerraCoreActionPlan;
export declare function terraCoreEngineeringUpgradeIntent(account: string, costScrap: string, actionNonce: string): TerraCoreCustomJsonIntent;
export declare function planTerraCoreEngineeringUpgrade(
  state: TerraCoreEngineeringUpgradeState,
  minimumRetainedScrap?: string,
  maximumPaybackMilliDays?: number,
): TerraCoreEngineeringUpgradePlan;
export declare function reconcileTerraCoreEngineeringUpgrade(
  before: TerraCoreEngineeringUpgradeState,
  after: TerraCoreEngineeringUpgradeState,
  quote: TerraCoreEngineeringUpgradeQuote,
): Readonly<{ confirmed: boolean; reason: string }>;
