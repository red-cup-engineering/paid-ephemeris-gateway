/**
 * `attention` — tier 3's mechanic: a scarce pool reassigned live across faculties, each with its
 * own concave marginal-yield curve. The pedagogy IS the mechanic: `marginalYield` is the literal
 * derivative of `yield_`, so the sparkline the web face draws from it is the slope itself, not a
 * flavor number shaped to look decreasing (DESIGN.md §2's own claim, made checkable here).
 *
 * `yield_(k, a) = k * sqrt(a)` — an authored curve shape (disclosed `designed-flavor`), chosen
 * specifically because its derivative `k / (2*sqrt(a))` is strictly decreasing in `a` for every
 * `a > 0` and every `k > 0`: allocating a second unit of Attention to an already-fed faculty is
 * ALWAYS worth strictly less than the first unit was, for any starting allocation. That property,
 * not the particular exponent, is what makes this "diminishing returns" rather than just "a curve
 * that happens to bend."
 */
import type { FacultyId } from "./state.mts";
import { FACULTY_IDS } from "./state.mts";
import { authored, type Tagged } from "./provenance.mts";

/** Per-faculty productivity constant — an authored balance choice, one value per faculty so the
 *  three aren't forced to be identical (a game where every faculty behaves identically would have
 *  no real allocation DECISION, only a slider that doesn't matter). */
export const FACULTY_K: Readonly<Record<FacultyId, number>> = {
  memory: 1.2,
  perception: 1.0,
  synthesis: 0.9,
};

export function yield_(facultyId: FacultyId, allocation: number): number {
  if (allocation < 0) throw new RangeError(`attention.yield_: allocation must be nonnegative, got ${allocation}`);
  const k = FACULTY_K[facultyId];
  return k * Math.sqrt(allocation);
}

/** The literal derivative of `yield_` with respect to `allocation`: `k / (2*sqrt(a))`. Defined as
 *  `+Infinity` at `a = 0` (the true limit of the derivative) so a caller can still render "the
 *  very first unit is worth the most" honestly rather than dividing by zero into `NaN`. */
export function marginalYield(facultyId: FacultyId, allocation: number): number {
  if (allocation < 0) throw new RangeError(`attention.marginalYield: allocation must be nonnegative, got ${allocation}`);
  const k = FACULTY_K[facultyId];
  if (allocation === 0) return Infinity;
  return k / (2 * Math.sqrt(allocation));
}

export interface AllocationTotals {
  readonly totalAllocated: number;
  readonly totalYield: Tagged<number>;
  readonly perFaculty: Readonly<Record<FacultyId, { readonly allocation: number; readonly yield: number; readonly marginalYield: number }>>;
}

/** Reads off the whole allocation at once — the shape the web face's sparkline row and
 *  `intents.mts::doAllocateAttention` both want, computed in exactly one place. */
export function summarizeAllocation(allocation: Readonly<Record<FacultyId, number>>): AllocationTotals {
  const perFaculty = {} as Record<FacultyId, { allocation: number; yield: number; marginalYield: number }>;
  let totalAllocated = 0;
  let totalYield = 0;
  for (const id of FACULTY_IDS) {
    const a = allocation[id] ?? 0;
    const y = yield_(id, a);
    perFaculty[id] = { allocation: a, yield: y, marginalYield: marginalYield(id, a) };
    totalAllocated += a;
    totalYield += y;
  }
  return {
    totalAllocated,
    totalYield: authored(totalYield, "sum of k*sqrt(allocation) across faculties — an authored concave yield curve, not a computed graph readout"),
    perFaculty,
  };
}

/** Redistribute a fixed pool across the three faculties, clamped so nothing goes negative and the
 *  total never exceeds `pool` — the reducer `intents.mts::doAllocateAttention` calls directly. */
export function reallocate(
  pool: number,
  requested: Readonly<Partial<Record<FacultyId, number>>>,
): Readonly<Record<FacultyId, number>> {
  const clamped = {} as Record<FacultyId, number>;
  let total = 0;
  for (const id of FACULTY_IDS) {
    const v = Math.max(0, requested[id] ?? 0);
    clamped[id] = v;
    total += v;
  }
  if (total <= pool || total === 0) return clamped;
  // Over-request: scale every faculty down proportionally rather than refusing outright — an
  // honest "you asked for more than you have, here is what that request actually buys" instead of
  // a hard error for what is, in play, just a UI slider going slightly past 100%.
  const scale = pool / total;
  const scaled = {} as Record<FacultyId, number>;
  for (const id of FACULTY_IDS) scaled[id] = clamped[id] * scale;
  return scaled;
}
