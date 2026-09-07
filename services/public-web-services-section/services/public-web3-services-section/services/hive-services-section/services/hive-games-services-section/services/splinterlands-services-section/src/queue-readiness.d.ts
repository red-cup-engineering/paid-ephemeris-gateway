// Type declarations for @red-cup-engineering/splinterlands-services-section/queue-readiness.

export interface SplinterlandsOperatorPolicy {
  readonly format: "modern";
  readonly matchType: "Modern Ranked";
  readonly minimumEnergy: number;
  readonly maximumMatchesPerRun: number;
  readonly minimumSubmitWindowMs: number;
  readonly authority: "posting";
  readonly inventory: "owned-only";
}

export declare const SPLINTERLANDS_OPERATOR_POLICY: SplinterlandsOperatorPolicy;

export interface SplinterlandsQueueAdmission {
  readonly kind: "queue-one" | "refuse";
  readonly reason: string;
}

export declare function admitOneSplinterlandsQueue(input: Readonly<{
  account: string;
  energy: number;
  outstandingMatches: number;
  collectionReady: boolean;
  coverageReady: boolean;
  alreadyAttempted: number;
}>): SplinterlandsQueueAdmission;
