// Type declarations for @red-cup-engineering/hashkings-services-section/recovery.

export interface HashKingsFungibleAsset {
  readonly symbol: "BUDS" | "HKWATER" | "MOTA";
  readonly balance: string;
  readonly precision: number;
}

export interface HashKingsNftAsset {
  readonly id: number;
  readonly type: string;
  readonly name: string;
}

export interface HashKingsRecoveryEvidence {
  readonly account: string;
  readonly observedAt: string;
  readonly providersAgree: boolean;
  readonly domainDisposition: "parked" | "operational" | "unknown";
  readonly fungibles: readonly HashKingsFungibleAsset[];
  readonly nfts: readonly HashKingsNftAsset[];
  readonly actualBuyOrderCounts: Readonly<Record<"BUDS" | "HKWATER" | "MOTA", number>>;
  readonly budsPoolExitSwapHive: string | null;
  readonly ownNftListingCount: number;
  readonly latestNftTradeUnix: number | null;
}

export interface HashKingsRecoveryPolicy {
  readonly minimumDirectRecoverySwapHive: string;
  readonly maximumComparableSaleAgeDays: number;
}

export type HashKingsRecoveryAssessment =
  | { readonly kind: "preserve-custody"; readonly reason: string; readonly nftCount: number; readonly recentComparableSale: boolean }
  | { readonly kind: "review-recovery"; readonly reason: string; readonly nftCount: number; readonly recentComparableSale: boolean }
  | { readonly kind: "refuse"; readonly reason: string };

export declare function hashKingsDecimalUnits(value: string, precision: number): bigint;
export declare function hashKingsFormatUnits(value: bigint, precision: number): string;
export declare function quoteHashKingsBudsPoolExit(budsBalance: string, baseQuantity: string, quoteQuantity: string, feeBps?: number): string;
export declare function assessHashKingsRecovery(evidence: HashKingsRecoveryEvidence, policy?: HashKingsRecoveryPolicy): HashKingsRecoveryAssessment;
export declare function statesAgree(left: HashKingsRecoveryEvidence, right: HashKingsRecoveryEvidence): boolean;
export declare function classifyDomainResponse(status: number, location: string, body: string): "parked" | "operational" | "unknown";
