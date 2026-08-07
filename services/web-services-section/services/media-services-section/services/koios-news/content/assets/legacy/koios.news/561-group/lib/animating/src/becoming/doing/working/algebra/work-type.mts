/**
 * work-type — the {process, procedure, derivation, inquiry} quartet, DERIVED
 * from a task's closure structure rather than declared.
 *
 * Theory: `topical-archive/social-sciences/economics/work/archive/work-type-as-closure-structure.md`.
 * A task's type is a property of its closure-rule subsystem S_T, fixed by two
 * binary structural predicates:
 *
 *   meaning-settled(T):   the target valuation is the unique fixed point of the
 *                         closure operator on the initial valuation — every goal
 *                         cell is determined at dispatch, with none whose value
 *                         must arrive as a later witness increment.
 *   execution-settled(T): S_T contains no disjunctive (branching) antecedents —
 *                         every firing is deterministic.
 *
 * The 2x2 is exhaustive — the nuclear-quartet theorem proves no fifth canonical
 * type exists:
 *
 *                  execution-settled │ ¬execution-settled
 *      meaning  →     process        │     procedure
 *     ¬meaning  →     derivation     │     inquiry
 *
 * The settlement path inquiry → {derivation, procedure} → process is the
 * progressive binding of free variables: determining a goal cell raises
 * meaning-settledness; collapsing a branch raises execution-settledness.
 */

export type WorkType = "process" | "procedure" | "derivation" | "inquiry";

/** Ordered from least settled (inquiry) to most settled (process). */
export const WORK_TYPES: readonly WorkType[] = Object.freeze([
  "inquiry",
  "derivation",
  "procedure",
  "process",
]);

/** A goal cell of the task. `determinedAtDispatch` is false when its value is not
 *  fixed from the initial valuation — it must arrive as a witness increment
 *  during settling (meaning is open on this cell). */
export interface GoalCell {
  readonly cell: string;
  readonly determinedAtDispatch: boolean;
}

/** A closure rule of the task. `branching` is true for a disjunctive antecedent —
 *  a rule that routes execution along different paths depending on which increment
 *  arrives first (execution is open). */
export interface ClosureRule {
  readonly name: string;
  readonly branching: boolean;
}

/** The structural description of a task from which its work-type is read off. */
export interface TaskClosure {
  readonly goalCells: readonly GoalCell[];
  readonly rules: readonly ClosureRule[];
}

/** meaning-settled(T): every goal cell is determined at dispatch (vacuously true
 *  for a task with no goal cells). */
export function meaningSettled(task: TaskClosure): boolean {
  return task.goalCells.every((goal) => goal.determinedAtDispatch);
}

/** execution-settled(T): no rule branches (vacuously true for a task with no
 *  rules). */
export function executionSettled(task: TaskClosure): boolean {
  return task.rules.every((rule) => !rule.branching);
}

/** The pure 2x2 map from the two structural predicates to the quartet. */
export function workTypeOf(meaning: boolean, execution: boolean): WorkType {
  return meaning
    ? execution ? "process" : "procedure"
    : execution ? "derivation" : "inquiry";
}

/** Read a task's work-type off its closure structure. */
export function deriveWorkType(task: TaskClosure): WorkType {
  return workTypeOf(meaningSettled(task), executionSettled(task));
}

const COORDINATES: Readonly<Record<WorkType, readonly [meaning: boolean, execution: boolean]>> =
  Object.freeze({
    process: Object.freeze([true, true] as const),
    procedure: Object.freeze([true, false] as const),
    derivation: Object.freeze([false, true] as const),
    inquiry: Object.freeze([false, false] as const),
  });

/** The settlement order is the product lattice on (meaning, execution): `a` is
 *  below-or-equal `b` iff wherever `a` is settled, `b` is too. process is the top,
 *  inquiry the bottom; procedure and derivation are incomparable. */
export function settlementLeq(a: WorkType, b: WorkType): boolean {
  const [aMeaning, aExecution] = COORDINATES[a];
  const [bMeaning, bExecution] = COORDINATES[b];
  return (!aMeaning || bMeaning) && (!aExecution || bExecution);
}
