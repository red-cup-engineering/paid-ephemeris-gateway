// Type declarations for @lenticule-science/metrologic/readout.
import type { Charge } from "../../bilattice/src/index.d.ts";

export const PLACES: readonly ["absurd", "potential", "active", "stable"];
export type Place = "absurd" | "potential" | "active" | "stable";

export function place(charge: Charge): Place;
export function knowledgeWeight(charge: Charge): 0 | 1 | 2;
export function salience(charge: Charge): number;
export function readout(charge: Charge): { place: Place; knowledgeWeight: 0 | 1 | 2; salience: number; top: boolean };
export function styleFor<T>(charge: Charge, table: Record<Place, T>): T;
export function assertStyleTable(table: Record<string, unknown>): void;
