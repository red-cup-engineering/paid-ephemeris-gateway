// Type declarations for @red-cup-engineering/dcrops-services-section/dcrops.

export interface DCropsNftInstance {
  readonly _id: number;
  readonly account: string;
  readonly soulBound?: boolean;
  readonly properties: Readonly<Record<string, string>>;
}

export interface DCropsSeasonState {
  readonly index: 0 | 1 | 2 | 3;
  readonly name: "Spring" | "Summer" | "Fall" | "Winter";
  readonly startedAtUnix: number;
  readonly endsAtUnix: number;
}

export interface DCropsLandState {
  readonly id: number;
  readonly account: string;
  readonly name: string;
  readonly plots: readonly string[];
  readonly plantedAtUnix: readonly (number | null)[];
}

export interface DCropsSeedState {
  readonly id: number;
  readonly account: string;
  readonly name: string;
  readonly seasons: readonly number[];
  readonly growthDays: number;
  readonly cooldownAtUnix: number;
}

export interface DCropsCustomJsonIntent {
  readonly role: "active";
  readonly approvedForBroadcast: false;
  readonly operation: readonly ["custom_json", Readonly<{
    required_auths: readonly string[];
    required_posting_auths: readonly [];
    id: "dcrops";
    json: string;
  }>];
}

export interface DCropsClient {
  readInstance(id: number): Promise<DCropsNftInstance>;
  readSeason(): Promise<DCropsSeasonState>;
}

export type DCropsPlotPlan =
  | { readonly kind: "remove-expired" | "plant" | "harvest"; readonly reason: string; readonly intent: DCropsCustomJsonIntent }
  | { readonly kind: "wait"; readonly reason: string; readonly nextEligibleAtUnix: number }
  | { readonly kind: "refuse"; readonly reason: string };

export declare function parseDCropsInstance(value: unknown): DCropsNftInstance;
export declare function parseDCropsSeason(value: unknown): DCropsSeasonState;
export declare function parseDCropsLand(value: unknown, expectedAccount?: string): DCropsLandState;
export declare function parseDCropsSeed(value: unknown, expectedAccount?: string): DCropsSeedState;
export declare function dcropsRemoveIntent(account: string, landID: number, plotNo: number): DCropsCustomJsonIntent;
export declare function dcropsHarvestIntent(account: string, landID: number, plotNo: number): DCropsCustomJsonIntent;
export declare function dcropsPlantIntent(account: string, landID: number, seedID: number, plotNo: number): DCropsCustomJsonIntent;
export declare function planDCropsPlot(
  account: string,
  season: DCropsSeasonState,
  land: DCropsLandState,
  seed: DCropsSeedState,
  plotNo: number,
  nowUnix?: number,
): DCropsPlotPlan;
export declare function createDCropsClient(options?: { readonly nodes?: readonly string[]; readonly fetchImpl?: typeof fetch }): DCropsClient;
export declare function validateDCropsActionJson(value: unknown): void;
