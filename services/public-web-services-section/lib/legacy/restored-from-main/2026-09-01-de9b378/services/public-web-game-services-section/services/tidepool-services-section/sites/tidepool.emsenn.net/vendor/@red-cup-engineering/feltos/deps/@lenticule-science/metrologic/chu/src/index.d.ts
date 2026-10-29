// Type declarations for @lenticule-science/metrologic/chu (the barrel export covers every subpath).

/** The four Belnap–Ginsberg bilattice values, by name. Compare with `===`. */
export type Four = "t" | "f" | "bot" | "top";

/** A math-kernel charge: a four-valued `value` over a lossless `evidence` carrier. */
export interface Charge {
  value: [boolean, boolean];
  evidence: [unknown[], unknown[]];
}

// ── four.mjs ──────────────────────────────────────────────────────────────────
export const FOUR: { readonly T: "t"; readonly F: "f"; readonly BOT: "bot"; readonly TOP: "top" };
export const GLYPH: { readonly t: string; readonly f: string; readonly bot: string; readonly top: string };
export function isFour(v: unknown): v is Four;
export function asFour(v: unknown): Four;
export function toCharge(v: Four): Charge;
export function fromCharge(charge: Charge): Four;
export function negate(v: Four): Four;
export function conflate(v: Four): Four;
export function knowledgeJoin(a: Four, b: Four): Four;
export function knowledgeMeet(a: Four, b: Four): Four;
export function truthJoin(a: Four, b: Four): Four;
export function truthMeet(a: Four, b: Four): Four;

// ── chu.mjs ───────────────────────────────────────────────────────────────────
export interface Cell {
  state: string;
  value: Four;
}
export interface CoCell {
  point: string;
  value: Four;
}
export interface ChuSpace {
  readonly kind: "chu.space";
  readonly points: readonly string[];
  readonly states: readonly string[];
  readonly absent: Four;
  at(point: string, state: string): Four;
}
export type ValueAt = (point: string, state: string) => Four | null | undefined;

export function chuSpace(
  points: Iterable<string>,
  states: Iterable<string>,
  valueAt: ValueAt,
  options?: { absent?: Four },
): ChuSpace;
export function fromMatrix(
  points: Iterable<string>,
  states: Iterable<string>,
  matrix: Record<string, Record<string, Four>>,
  options?: { absent?: Four },
): ChuSpace;
export function isChuSpace(value: unknown): value is ChuSpace;
export function row(space: ChuSpace, point: string): Cell[];
export function col(space: ChuSpace, state: string): CoCell[];
export function extension(space: ChuSpace, state: string): string[];
export function transpose(space: ChuSpace): ChuSpace;
export function dual(space: ChuSpace): ChuSpace;
export function settleColumn(space: ChuSpace, state: string, join?: (a: Four, b: Four) => Four, identity?: Four): Four;
export function settleRow(space: ChuSpace, point: string, join?: (a: Four, b: Four) => Four, identity?: Four): Four;

// ── chu-transform.mjs ───────────────────────────────────────────────────────────
export type Forward = (point: string) => string;
export type Backward = (state: string) => string;
export type Failure =
  | { kind: "domain"; point?: string; state?: string; mapped: string; why: string }
  | { kind: "adjointness"; point: string; state: string; left: Four; right: Four };
export interface CheckResult {
  ok: boolean;
  failures: Failure[];
}
export interface ChuTransform {
  readonly kind: "chu.transform";
  readonly label: string | null;
  readonly source: ChuSpace;
  readonly target: ChuSpace;
  readonly forward: Forward;
  readonly backward: Backward;
}

export function checkChuTransform(source: ChuSpace, target: ChuSpace, forward: Forward, backward: Backward): CheckResult;
export function chuTransform(
  source: ChuSpace,
  target: ChuSpace,
  forward: Forward,
  backward: Backward,
  options?: { label?: string },
): ChuTransform;
export function isChuTransform(value: unknown): value is ChuTransform;
export function idTransform(space: ChuSpace, options?: { label?: string }): ChuTransform;
export function composeTransforms(t1: ChuTransform, t2: ChuTransform, options?: { label?: string }): ChuTransform;
export function dualTransform(t: ChuTransform, options?: { label?: string }): ChuTransform;
