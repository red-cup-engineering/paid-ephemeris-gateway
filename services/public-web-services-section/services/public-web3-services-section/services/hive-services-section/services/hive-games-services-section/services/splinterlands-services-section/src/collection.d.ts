// Type declarations for @red-cup-engineering/splinterlands-services-section/collection.

export interface SplinterlandsCardDetail {
  readonly id: number;
  readonly name: string;
  readonly type: "Summoner" | "Monster";
  readonly color: string;
  readonly secondaryColor?: string;
  readonly editions: readonly number[];
  readonly mana: number;
}

export interface SplinterlandsOwnedCard {
  readonly uid: string;
  readonly cardDetailId: number;
  readonly edition: number;
  readonly level: number;
  readonly delegatedTo: string | null;
}

export interface SplinterlandsModernReadiness {
  readonly kind: "ready-owned-core" | "refuse";
  readonly reason: string;
  readonly summoners: readonly SplinterlandsOwnedCard[];
  readonly monsters: readonly SplinterlandsOwnedCard[];
  readonly compatibleElements: readonly string[];
}

export declare function parseSplinterlandsCardDetail(value: unknown): SplinterlandsCardDetail;
export declare function parseSplinterlandsOwnedCard(value: unknown): SplinterlandsOwnedCard;
export declare function assessSplinterlandsOwnedModernCore(
  ownedValues: readonly unknown[],
  detailValues: readonly unknown[],
  modernEditions: readonly number[],
): SplinterlandsModernReadiness;
