/**
 * deciding — decision as a morphism over a settled relating section.
 *
 * A decision reads a valuation (a charge, in the bilattice sense), draws a
 * *linear* budget (a resource consumed when spent and never recovered within
 * the run), and emits either a typed action or a typed abstention. Abstention
 * is a value, not a failure: a candidate the analysis won't fund is recorded
 * with its charge and the reason it was passed over.
 *
 * The substrate is domain-neutral. Curation voting, governance voting, and
 * market trading are all specializations: each supplies its own
 * `Proposal`s — a typed action, the linear cost it would draw, a scalar merit
 * (expected return in fixed-point micro-units), and the charge that justifies
 * it — and this module allocates the finite budget across them.
 *
 * Allocation is greedy by merit-per-unit-cost (capital efficiency), gated by
 * an absolute merit threshold. Greedy density is the standard practical
 * allocator for a linear resource over many small items; exact knapsack and
 * per-action weight optimization are named future work, not silently assumed.
 *
 * Pure: proposals and budget in, a decision run out. Exact integer arithmetic
 * only — merit and cost are bigint micro-units, never floats.
 */
import type { ChargeCarrier } from "@emsenn/relating";

export type { ChargeCarrier };

/** A linear resource stock, drawn down monotonically as actions are taken. */
export interface LinearBudget {
  readonly resource: string;
  /** Available stock, in the same unit as each proposal's `cost`. */
  readonly available: bigint;
}

/**
 * A proposed typed action awaiting the budget verdict.
 *
 * - `cost` is the linear resource the action draws (same unit as the budget).
 * - `merit` is expected return in fixed-point micro-units; higher is better.
 * - `justification` is the bilattice charge the valuation read for this action
 *   (paraconsistent: a contested charge is carried, not collapsed).
 */
export interface Proposal<A> {
  readonly id: string;
  readonly action: A;
  readonly cost: bigint;
  readonly merit: bigint;
  readonly justification: ChargeCarrier;
}

/**
 * Why a decision morphism abstained instead of acting: the enumerated grounds
 * for declining to commit.
 */
export type AbstainReason = "below-threshold" | "budget-exhausted" | "non-positive-cost";

/**
 * A funded decision: the proposal's typed action committed to, carrying the
 * cost drawn, the merit expected, and the bilattice charge that justified it.
 */
export interface Acted<A> {
  readonly kind: "decision.act";
  readonly id: string;
  readonly action: A;
  readonly cost: bigint;
  readonly merit: bigint;
  readonly justification: ChargeCarrier;
}

/**
 * A declined decision: a proposal passed over without acting, retaining its
 * cost, merit, and justification charge alongside the enumerated reason it was
 * not funded.
 */
export interface Abstained {
  readonly kind: "decision.abstain";
  readonly id: string;
  readonly cost: bigint;
  readonly merit: bigint;
  readonly justification: ChargeCarrier;
  readonly reason: AbstainReason;
}

/**
 * The verdict on a single proposal: either an `Acted` action or an `Abstained`
 * decline.
 */
export type Decision<A> = Acted<A> | Abstained;

/**
 * The complete result of allocating a budget: the resource name, one decision
 * per proposal, and the total spent and remaining stock of the linear resource.
 */
export interface DecisionRun<A> {
  readonly kind: "decision.run";
  readonly resource: string;
  readonly decisions: readonly Decision<A>[];
  readonly spent: bigint;
  readonly remaining: bigint;
}

/**
 * Tuning for `decide`: an optional minimum-merit floor an action must clear
 * before it draws the linear resource.
 */
export interface DecideOptions {
  /** Minimum merit for an action to be taken. Default 0n: any positive-merit,
   *  affordable, positive-cost action is taken. Set above 0 to demand a floor
   *  of expected return before spending the linear resource. */
  readonly meritThreshold?: bigint;
}

const isActed = <A,>(decision: Decision<A>): decision is Acted<A> => decision.kind === "decision.act";

/** Order by merit-per-unit-cost descending, via cross-multiplication (no
 *  division, so it stays exact for bigints). Ties break to higher absolute
 *  merit, then to lexicographic id for determinism. */
function byDensityDesc<A>(a: Proposal<A>, b: Proposal<A>): number {
  const lhs = a.merit * b.cost;
  const rhs = b.merit * a.cost;
  if (lhs > rhs) return -1;
  if (lhs < rhs) return 1;
  if (a.merit > b.merit) return -1;
  if (a.merit < b.merit) return 1;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function abstain<A>(p: Proposal<A>, reason: AbstainReason): Abstained {
  return Object.freeze({
    kind: "decision.abstain" as const,
    id: p.id,
    cost: p.cost,
    merit: p.merit,
    justification: p.justification,
    reason,
  });
}

/**
 * Allocate a linear budget across proposals.
 *
 * Each proposal is examined in capital-efficiency order. A proposal with
 * non-positive cost is never funded (`non-positive-cost`); one whose merit is
 * below the threshold abstains (`below-threshold`); one that no longer fits the
 * remaining budget abstains (`budget-exhausted`) — and the walk continues, so a
 * cheaper later proposal can still be funded. Every proposal yields exactly one
 * `Decision`, so the run is a complete, auditable record.
 */
export function decide<A>(
  proposals: readonly Proposal<A>[],
  budget: LinearBudget,
  options: DecideOptions = {},
): DecisionRun<A> {
  const threshold = options.meritThreshold ?? 0n;
  const ranked = [...proposals].sort(byDensityDesc);
  let remaining = budget.available;
  let spent = 0n;
  const decisions: Decision<A>[] = ranked.map((p) => {
    if (p.cost <= 0n) return abstain(p, "non-positive-cost");
    if (p.merit < threshold) return abstain(p, "below-threshold");
    if (p.cost > remaining) return abstain(p, "budget-exhausted");
    remaining -= p.cost;
    spent += p.cost;
    return Object.freeze({
      kind: "decision.act" as const,
      id: p.id,
      action: p.action,
      cost: p.cost,
      merit: p.merit,
      justification: p.justification,
    });
  });
  return Object.freeze({
    kind: "decision.run" as const,
    resource: budget.resource,
    decisions: Object.freeze(decisions),
    spent,
    remaining,
  });
}

/** The actions taken in a run, in allocation order — the emit set. */
export function actionsOf<A>(run: DecisionRun<A>): readonly A[] {
  return Object.freeze(run.decisions.filter(isActed).map((decision) => decision.action));
}

/** The acted decisions of a run, retaining cost/merit/justification. */
export function actedOf<A>(run: DecisionRun<A>): readonly Acted<A>[] {
  return Object.freeze(run.decisions.filter(isActed));
}
