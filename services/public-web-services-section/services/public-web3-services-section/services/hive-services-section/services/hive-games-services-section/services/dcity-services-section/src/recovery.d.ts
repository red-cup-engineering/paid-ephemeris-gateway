// Type declarations for @red-cup-engineering/dcity-services-section/recovery.

export interface DCityRecoveryState {
  readonly account: string;
  readonly observedAt: string;
  readonly simBalance: string;
  readonly swapHiveBalance: string;
  readonly simPrecision: number;
  readonly swapHivePrecision: number;
  readonly tokenPair: "SWAP.HIVE:SIM" | "SIM:SWAP.HIVE";
  readonly baseQuantity: string;
  readonly quoteQuantity: string;
  readonly nftCount: number;
  readonly nftLockedSim: string;
}

export interface DCityRecoveryQuote {
  readonly quantitySim: string;
  readonly expectedSwapHive: string;
  readonly minimumSwapHive: string;
  readonly slippageBps: number;
  readonly operation: readonly unknown[];
}

export type DCityRecoveryPlan =
  | { readonly kind: "ready"; readonly reason: string; readonly quote: DCityRecoveryQuote }
  | { readonly kind: "refuse"; readonly reason: string };

export declare function dcityDecimalUnits(value: string, precision: number): bigint;
export declare function dcityFormatUnits(value: bigint, precision: number): string;
export declare function swapTokensOperation(
  account: string,
  tokenPair: string,
  tokenSymbol: string,
  tokenAmount: string,
  tradeType: "exactInput" | "exactOutput",
  bound?: string,
): readonly unknown[];
export declare function planDCityLiquidSimRecovery(state: DCityRecoveryState, slippageBps?: number): DCityRecoveryPlan;
export declare function statesAgree(left: DCityRecoveryState, right: DCityRecoveryState): boolean;
