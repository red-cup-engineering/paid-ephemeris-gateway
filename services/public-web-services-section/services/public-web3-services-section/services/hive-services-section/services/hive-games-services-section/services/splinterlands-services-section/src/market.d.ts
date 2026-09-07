// Type declarations for @red-cup-engineering/splinterlands-services-section/market.

export interface SplinterlandsRosterCardTarget {
  readonly cardDetailId: number;
  readonly edition: number;
  readonly level: number;
  readonly name: string;
}

export interface SplinterlandsRosterPurchasePolicy {
  readonly currency: "CREDITS";
  readonly maximumCredits: number;
  readonly minimumCreditReserve: number;
  readonly lane: "gaming";
  readonly target: string;
  readonly cards: readonly SplinterlandsRosterCardTarget[];
}

export declare const SPLINTERLANDS_ROSTER_PURCHASE_POLICY: SplinterlandsRosterPurchasePolicy;

export interface SplinterlandsRosterListing {
  readonly marketId: string;
  readonly uid: string;
  readonly cardDetailId: number;
  readonly edition: number;
  readonly level: number;
  readonly seller: string;
  readonly usdPrice: number;
  readonly expiresAt: string;
}

export interface SplinterlandsRosterPurchasePlan {
  readonly account: string;
  readonly currency: "CREDITS";
  readonly credits: number;
  readonly creditReserve: number;
  readonly listings: readonly SplinterlandsRosterListing[];
  readonly operation: readonly ["custom_json", Readonly<{
    required_auths: readonly [string];
    required_posting_auths: readonly [];
    id: "sm_market_purchase";
    json: string;
  }>];
}

export declare function parseSplinterlandsRosterListing(value: unknown, now?: Date): SplinterlandsRosterListing;
export declare function planSplinterlandsRosterPurchase(input: Readonly<{
  account: string;
  creditBalance: number;
  clientVersion: string;
  nonce: string;
  listingsByCard: ReadonlyMap<number, readonly unknown[]>;
  now?: Date;
}>): SplinterlandsRosterPurchasePlan;
export declare function assertExactSplinterlandsRosterPurchaseOperation(operation: unknown, expected: SplinterlandsRosterPurchasePlan): void;
export declare function reconcileSplinterlandsRosterPurchase(input: Readonly<{
  plan: SplinterlandsRosterPurchasePlan;
  beforeCredits: number;
  afterCredits: number;
  beforeUids: readonly string[];
  afterUids: readonly string[];
}>): Readonly<{ confirmed: true; creditsSpent: number; acquiredUids: readonly string[] }>;
