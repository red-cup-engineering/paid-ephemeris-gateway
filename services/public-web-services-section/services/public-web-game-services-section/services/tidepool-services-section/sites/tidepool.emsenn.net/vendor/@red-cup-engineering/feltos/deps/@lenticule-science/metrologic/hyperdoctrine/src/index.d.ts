// Type declarations for @lenticule-science/metrologic/hyperdoctrine (the barrel covers every subpath).
import type { Charge } from "../../bilattice/src/index.d.ts";

export type Order = "knowledge" | "truth";
export const KNOWLEDGE: "knowledge";
export const TRUTH: "truth";

export interface OrderOps {
  join: (pair: { left: Charge; right: Charge }) => Charge;
  meet: (pair: { left: Charge; right: Charge }) => Charge;
  leq: (a: Charge, b: Charge) => boolean;
  bottom: Charge;
  top: Charge;
}
export function orderOps(order: Order): OrderOps;
export function orderKind(order: Order): Order;
export function designated(charge: Charge, order: Order): boolean;
export function sameValue(a: Charge, b: Charge): boolean;

export interface IndexMorphism {
  source: string[];
  target: string[];
  map: (sourceKey: string) => string;
}
export type Fiber = Map<string, Charge>;

export function assertMorphism(u: IndexMorphism): void;
export function assertFiberComplete(fiber: Fiber, keys: string[]): void;

export function reindex(u: IndexMorphism, targetFiber: Fiber): Fiber;
export function existsAlong(u: IndexMorphism, sourceFiber: Fiber, order: Order): Fiber;
export function forallAlong(u: IndexMorphism, sourceFiber: Fiber, order: Order): Fiber;
export function meetFiber(a: Fiber, b: Fiber, keys: string[], order: Order): Fiber;
export function leqFiber(a: Fiber, b: Fiber, keys: string[], order: Order): boolean;
export function pullbackSquare(f: IndexMorphism, g: IndexMorphism): { K: string[]; p: IndexMorphism; q: IndexMorphism };

export function comprehend(fiber: Fiber, keys: string[], order: Order): string[];
export function extend(support: string[], keys: string[], order: Order): Fiber;
