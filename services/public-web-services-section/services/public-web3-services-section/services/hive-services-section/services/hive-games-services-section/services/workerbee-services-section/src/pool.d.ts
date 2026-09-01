// Type declarations for @red-cup-engineering/workerbee-services-section/pool.

export declare const WORKER_BEE_POOL_DISTRIBUTION_SCHEMA: "aagaard.workerbee-pool-distribution.v1";
export declare const WORKER_BEE_POOL_DISTRIBUTION_CATEGORY: "aagaard.workerbee-pool-distribution-event";
export declare const WORKER_BEE_POOL_ACCOUNT: "ph1102";
export declare const WORKER_BEE_POOL_BENEFICIARY: "michael561";

export interface WorkerBeePoolTransferCandidate {
  readonly sourceId: string;
  readonly historyIndex: number;
  readonly hiveBlock: number;
  readonly actionIndex: number;
  readonly timestamp: string;
  readonly transactionId: string;
  readonly from: "ph1102";
  readonly to: "michael561";
  readonly symbol: string;
  readonly quantity: string;
  readonly memo: string;
}

export interface WorkerBeePoolDistribution extends WorkerBeePoolTransferCandidate {
  readonly status: "settled";
  readonly hiveEngineBlock: number;
  readonly confirmationProviders: readonly string[];
}

export interface WorkerBeePoolDistributionEvent {
  readonly workerBeePoolDistributionSchema: "aagaard.workerbee-pool-distribution.v1";
  readonly eventId: string;
  readonly recordedAt: string;
  readonly distribution: WorkerBeePoolDistribution;
  readonly valuation: Readonly<{ swapHive: null; reason: "distribution-asset-not-independently-valued" }>;
}

export interface WorkerBeeEngineObservation {
  readonly provider: string;
  readonly result: unknown;
}

export declare function workerBeePoolTransfersFromHistoryRow(row: unknown, delegatedAt: string): readonly WorkerBeePoolTransferCandidate[];
export declare function reconcileWorkerBeePoolDistribution(
  candidate: WorkerBeePoolTransferCandidate,
  observations: readonly WorkerBeeEngineObservation[],
): WorkerBeePoolDistribution;
export declare function recordPoolDistributionEvents(
  distributions: readonly WorkerBeePoolDistribution[],
  recordedAt?: string,
): readonly WorkerBeePoolDistributionEvent[];
