// Type declarations for @red-cup-engineering/holozing-services-section/rewards.

export interface HoloZingPendingRewards {
  readonly account: string;
  readonly observedAt: string;
  readonly delegation: string;
  readonly stakeZing: string;
  readonly holdingRewards: string;
  readonly total: string;
  readonly alphaVialIds: readonly number[];
}

export interface HoloZingZingBalance {
  readonly liquid: string;
  readonly staked: string;
}

export interface HoloZingClaimPlan {
  readonly kind: "ready" | "refuse";
  readonly reason: string;
  readonly minimumClaimZing?: string;
}

export interface HoloZingStakeEvent {
  readonly transactionId: string;
  readonly blockNumber: number;
  readonly quantity: string;
  readonly memo: string;
}

export type HoloZingClaimReconciliation =
  | { readonly confirmed: true; readonly claimedZing: string }
  | { readonly confirmed: false; readonly reason: string };

export interface HoloZingKeychainLoginEnvelope {
  readonly success: true;
  readonly error: null;
  readonly result: string;
  readonly data: Readonly<{
    type: "signBuffer";
    username: string;
    message: string;
    method: "Posting";
    rpc: null;
    title: "Login to HoloZing";
    domain: "holozing.com";
  }>;
  readonly message: "Message signed!";
  readonly request_id: 1;
  readonly publicKey: string;
}

export declare function holozingDecimalUnits(value: string): bigint;
export declare function holozingFormatUnits(value: bigint): string;
export declare function parseHoloZingPendingRewards(
  account: string,
  observedAt: string,
  value: unknown,
  alphaVialIds: readonly number[],
): HoloZingPendingRewards;
export declare function planHoloZingRewardClaim(pending: HoloZingPendingRewards, minimumClaimZing?: string): HoloZingClaimPlan;
export declare function reconcileHoloZingRewardClaim(
  beforePending: HoloZingPendingRewards,
  afterPending: HoloZingPendingRewards,
  beforeBalance: HoloZingZingBalance,
  afterBalance: HoloZingZingBalance,
  events: readonly HoloZingStakeEvent[],
): HoloZingClaimReconciliation;
export declare function balancesAgree(left: HoloZingZingBalance, right: HoloZingZingBalance): boolean;
export declare function loginMessage(account: string, expiryUnix: number): string;
export declare function keychainLoginEnvelope(account: string, message: string, signature: string, publicKey: string): HoloZingKeychainLoginEnvelope;
export declare function attachHolozingDurableRecord<Receipt extends Readonly<Record<string, unknown>>>(
  receipt: Receipt,
  recorder: (receipt: Receipt) => Promise<{ readonly eventId: string }>,
): Promise<Receipt & { readonly durableRecord: Readonly<{ confirmed: boolean; eventId?: string; error?: string }> }>;
