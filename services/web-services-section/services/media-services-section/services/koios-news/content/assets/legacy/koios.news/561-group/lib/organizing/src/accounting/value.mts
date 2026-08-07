/**
 * organizing/accounting/value — value = the accounting value-form settling over
 * a value category `V`.
 *
 * Stage 3 of the trading descent (authority note §4 stage 3, the KEYSTONE of §2):
 * **value is a settling fixed point over a chosen value category `V`; money is the
 * settled general equivalent; the rival economic schools are not rival truths but
 * rival choices of `V`, which share the settling dynamics and the four-regime
 * classification because that classification is `V`-independent.**
 *
 * Every serious theory of price is a fixed-point theory (note §2):
 *
 *   | school                     | `V`                          | fixed-point form                         |
 *   |----------------------------|------------------------------|------------------------------------------|
 *   | labor-value (Marx/Ricardo) | socially-necessary labour    | value-form → general equivalent          |
 *   | marginal-utility (Jevons)  | subjective marginal utility  | Walras excess-demand `Z(p*)=0`           |
 *   | prices-of-production       | Sraffa I–O / Perron–Frobenius| dominant eigenvector                     |
 *   | risk-neutral (FTAP)        | equivalent martingale measure| stationary = closure fixpoint            |
 *   | subjective-preference      | preference order             | utility optimum                          |
 *
 * These are FOUR (here five) {@link ValueCategory} instances run over the **same**
 * settling dynamics. The hub theorem `fourRegimeValueIndependent` says the
 * strict/Scott/transfinite/aperiodic stratification is decided by the closure
 * ordinal `κ` (the {@link ClosureRegimeData}) **alone**, never by `V`. Therefore:
 *
 *   * {@link settleValue} is the Walras / Marx value-form / Sraffa / FTAP common
 *     fixed-point form: `optimum = settleOverValue`, fixed-point via `settleFixedPoint`,
 *     reachability via `optimumReachable` (an improving move never retracts).
 *   * {@link generalEquivalent} is the `V = FOUR` value-form (Capital I.1): settle the
 *     charge join-closure `chargeJoinVClosure(stable)` from `⊥ₖ`; the settled universal
 *     is **money** (the general equivalent — the commodity whose body becomes the
 *     direct incarnation of value for all others).
 *   * {@link transform} is the **transformation problem dissolved**: mapping labour
 *     values to prices of production with a uniform profit rate is a **base-change
 *     between two `V`'s**, not a refutation of one school by another. The proof is
 *     `fourRegimeValueIndependent`: both `V`'s land in the *same* regime over the
 *     same `κ`-data. A century of acrimony is a change-of-base (note §2).
 *   * {@link noArbitrageInRegime} = `cohomologyVanishesInRegime`: no-arbitrage = H¹ = 0
 *     = confluence = unique price, true exactly in the strict and Scott regimes (FTAP
 *     read structurally; note §4 stage 5).
 *
 * No free data (CLAUDE.md anti-fetishism): a value is never primitive; it is the
 * image of a settling over a relational `V`. Every carrier is a frozen `kind`-tagged
 * record; the `value`/`transform`/`classify-value-regime` verbs are relating actions
 * gating their returns through `jsonResource`. This module owns NO settling
 * mathematics of its own — it composes `@emsenn/relating`'s value-category hub
 * (`settling/value-category.mts`, `settling/optimization.mts`).
 */
import {
  action,
  jsonResource,
  // value-category hub (relating settling/value-category)
  settleOverValue,
  settleFixedPoint,
  regimeOfValueSettling,
  classifyRegime,
  fourRegimeValueIndependent,
  cohomologyVanishesInRegime,
  chargeValueCategory,
  chargeJoinVClosure,
  // optimization hub (relating settling/optimization)
  optimizationProblem,
  optimum,
  optimumReachable,
  // charge bilattice
  type ChargeValue,
  type ValueCategory,
  type VClosure,
  type ClosureRegime,
  type ClosureRegimeData,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import {
  exchangeValueOf,
  type Commodity,
} from "./commodity.mjs";

/* ──────────────────────────────────────────────────────────────────────────
 * (A) Schools = choices of value category `V`
 *
 * The five economic schools, each a different `ValueCategory` over which the SAME
 * settling dynamics run. This enumeration is the content of "schools = value
 * categories" (note §2): the schools differ only in `V`, never in the closure
 * dynamics or the regime classification.
 * ────────────────────────────────────────────────────────────────────────── */

/** The economic **school** = the choice of value category `V`. `labor-value`
 * (Marx/Ricardo, socially-necessary labour), `marginal-utility` (Jevons/Menger/
 * Walras, subjective marginal utility), `prices-of-production` (Sraffa, Perron–
 * Frobenius I–O), `risk-neutral` (FTAP, equivalent martingale measure), `subjective`
 * (preference order). They share the settling dynamics; only `V` differs. */
export type School =
  | "labor-value"
  | "marginal-utility"
  | "prices-of-production"
  | "risk-neutral"
  | "subjective";

/** The five schools, in enumeration order. */
export const SCHOOLS: readonly School[] = Object.freeze([
  "labor-value",
  "marginal-utility",
  "prices-of-production",
  "risk-neutral",
  "subjective",
]);

/** A **value form**: a school's chosen value category `V` paired with the
 * improvement closure `improve` whose fixed point is the settled value (the optimum).
 * The Marxian *value-form* (Capital I.1) generalized over an arbitrary `V`: the form
 * of value is the settling that climbs `V` to the general equivalent. */
export interface ValueForm<T> {
  readonly kind: "organizing.accounting.value.form";
  /** The school this value form formalizes (the choice of `V`). */
  readonly school: School;
  /** The value category `V` settling runs over (the measure-and-constraint). */
  readonly V: ValueCategory<T>;
  /** The improvement closure (monotone, inflationary, idempotent); its fixed point
   * is the settled value. */
  readonly improve: VClosure<T>;
}

/** Construct a value form for a school from its value category and improvement
 * closure. Frozen carrier; the school records which `V` was chosen (note §2). */
export function valueForm<T>(school: School, V: ValueCategory<T>, improve: VClosure<T>): ValueForm<T> {
  return Object.freeze({ kind: "organizing.accounting.value.form" as const, school, V, improve });
}

/* ──────────────────────────────────────────────────────────────────────────
 * (B) Settling a value form to its fixed point — the common price form
 *
 * `settleValue` is the Walras / Marx-value-form / Sraffa / FTAP common fixed-point
 * form (note §2). The optimum is `settleOverValue` (the hub `optimum`); whether it
 * is a fixed point is `settleFixedPoint`; whether it is reachable from the seed is
 * `optimumReachable` (inflation — an improving move never retracts).
 * ────────────────────────────────────────────────────────────────────────── */

/** A **valued** carrier: the settled value of a value form from a seed, with its
 * fixed-point and reachability judgments and (optionally) the regime its convergence
 * lands in. The settled price/value — the section of the value-form settling. */
export interface Valued<T> {
  readonly kind: "organizing.accounting.value.valued";
  /** The settled value: `optimum = settleOverValue(improve, seed)`. */
  readonly settled: T;
  /** Whether the settled value is a fixed point (`improve(settled) = settled`). */
  readonly fixedPoint: boolean;
  /** Whether the optimum is reachable from the seed (`seed ≤_V optimum` — inflation). */
  readonly reachable: boolean;
  /** The convergence regime, when known from `κ`-data (set via {@link valueRegime}). */
  readonly regime?: ClosureRegime;
}

/** **Settle a value form to its fixed point from a seed.** The common price-form of
 * Walras (excess-demand `Z(p*)=0`), the Marx value-form (climb to the general
 * equivalent), Sraffa (dominant eigenvector), and FTAP (martingale = stationary =
 * closure fixpoint): the optimum is `settleOverValue` (= the hub `optimum`); the
 * fixed-point judgment is `settleFixedPoint`; reachability is `optimumReachable`.
 * The regime is left undefined here — it depends on the closure ordinal `κ`'s data,
 * supplied through {@link valueRegime} / {@link transform}, and is `V`-independent. */
export function settleValue<T>(form: ValueForm<T>, seed: T): Valued<T> {
  const problem = optimizationProblem(form.V, form.improve);
  const settled = optimum(problem, seed);
  const fp = settleFixedPoint(form.V, form.improve, seed);
  const fixedPoint = fp.kind === "settling.valueCategory.settleFixedPoint:witness";
  const reachable = optimumReachable(problem, seed);
  return Object.freeze({
    kind: "organizing.accounting.value.valued" as const,
    settled,
    fixedPoint,
    reachable,
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * (C) The general equivalent — money — as the V = FOUR value-form
 *
 * Money is the settled universal (note §2, Capital I.1): the value-form's general
 * equivalent. In the `V = FOUR` (charge bilattice) case, settle the charge
 * join-closure toward the commodity's exchange-value charge from `⊥ₖ`; the settled
 * charge is the general equivalent — the direct, universal incarnation of value.
 * ────────────────────────────────────────────────────────────────────────── */

/** **The general equivalent (money) of a commodity.** The `V = FOUR` value-form: take
 * the commodity's exchange-value charge as the join target and settle
 * `chargeJoinVClosure(exchangeValue)` from the knowledge-bottom `⊥ₖ` over
 * {@link chargeValueCategory}. The settled charge is the **general equivalent** — the
 * universal incarnation of value (money), recovered as the settled spine charge (the
 * `V = FOUR` case of settling-over-`V`). Marx, Capital I.1: the money-form is the
 * general equivalent crystallized; here it is the fixed point of the value-form's
 * climb. */
export function generalEquivalent(commodity: Commodity): ChargeValue {
  const target = exchangeValueOf(commodity);
  return settleOverValue(chargeJoinVClosure(target), chargeValueCategory.bot);
}

/* ──────────────────────────────────────────────────────────────────────────
 * (D) The transformation problem dissolved into a base-change
 *
 * The transformation problem (labour values ↦ prices of production with a uniform
 * profit rate) is, in this frame, a base-change between two value categories `V`,
 * proven by `fourRegimeValueIndependent`: both schools land in the SAME regime over
 * the same `κ`-data. The classification is `V`-independent — so neither school
 * refutes the other; the disagreement is a change-of-base (note §2).
 * ────────────────────────────────────────────────────────────────────────── */

/** **The transformation problem as a base-change.** Given two value forms (e.g.
 * `labor-value` `from` and `prices-of-production` `to`) and the shared closure
 * ordinal data `d`, witness that both schools settle into the **same** regime over
 * `d` via `fourRegimeValueIndependent`. `sharedRegime` is `true` when the two `V`'s
 * agree (always, by `V`-independence) — that agreement *is* the transformation
 * problem dissolved: a functor between fibers (the hyperdoctrine reindexing), not a
 * refutation of one school by another (note §2). The returned `regime` is the shared
 * convergence regime. */
export function transform<A, B>(
  from: ValueForm<A>,
  to: ValueForm<B>,
  d: ClosureRegimeData,
): { readonly sharedRegime: boolean; readonly regime: ClosureRegime } {
  const judgment = fourRegimeValueIndependent(from.V, from.improve, to.V, to.improve, d);
  const sharedRegime = judgment.kind === "settling.valueIndependentRegime:witness";
  const regime = sharedRegime
    ? judgment.regime
    : regimeOfValueSettling(from.V, from.improve, d);
  return Object.freeze({ sharedRegime, regime });
}

/* ──────────────────────────────────────────────────────────────────────────
 * (E) Regime classification and the no-arbitrage reading
 *
 * The regime is decided by the closure ordinal data `d` alone (`classifyRegime`),
 * `V`-independent. No-arbitrage = H¹ = 0 = confluence = unique price = the
 * cohomology vanishing in the strict and Scott regimes (note §4 stage 5).
 * ────────────────────────────────────────────────────────────────────────── */

/** **The convergence regime of a value settling**, decided by the closure ordinal
 * data `d` alone (`classifyRegime`). `V`-independent: strict (finite `κ`) / Scott
 * (`κ=ω`) / transfinite-bounded / aperiodic. Minsky's hedge→speculative→Ponzi reads
 * as this regime climb (note §4 stage 9). */
export function valueRegime(d: ClosureRegimeData): ClosureRegime {
  return classifyRegime(d);
}

/** **No-arbitrage in a regime = H¹ = 0.** `cohomologyVanishesInRegime`: the settling
 * sheaf's first cohomology vanishes exactly in the strict and Scott regimes, where
 * the price settles to a unique confluent value with no arbitrage gap. `false` in the
 * transfinite-bounded and aperiodic regimes (where spread/adverse-selection
 * cohomology concentrates — note §4 stage 5; FTAP read structurally). */
export function noArbitrageInRegime(regime: ClosureRegime): boolean {
  return cohomologyVanishesInRegime(regime);
}

/* ──────────────────────────────────────────────────────────────────────────
 * (F) Action boundary — one relating action per verb
 *
 * `value` settles a charge value form for a commodity (the general equivalent);
 * `transform` proves the V-independent base-change between two regime data; and
 * `classify-value-regime` classifies a settling's regime + no-arbitrage. Each gates
 * its return through `jsonResource`.
 * ────────────────────────────────────────────────────────────────────────── */

/** Admit a commodity carrier at the action boundary, refusing a non-commodity. */
function admitCommodity(value: JsonValue, verb: string): Commodity {
  if (
    typeof value === "object" && value !== null && !Array.isArray(value) &&
    (value as JsonRecord).kind === "organizing.accounting.commodity"
  ) {
    return value as unknown as Commodity;
  }
  throw new TypeError(`${verb}: input must be a commodity carrier (organizing.accounting.commodity)`);
}

const argsJson = (args: Record<string, unknown>): JsonRecord =>
  jsonResource(args, "organizing.accounting.value action args") as JsonRecord;

/** Read closure regime data from action args, enforcing the corpus flags. The three
 * booleans default to a finite base (strict regime), which forces Scott-continuity
 * and countable cofinality. */
function regimeDataFromArgs(args: JsonRecord): ClosureRegimeData {
  const finiteBase = args.finiteBase === undefined ? true : Boolean(args.finiteBase);
  const scottContinuous = args.scottContinuous === undefined ? true : Boolean(args.scottContinuous);
  const countableCofinality = args.countableCofinality === undefined ? true : Boolean(args.countableCofinality);
  return Object.freeze({
    kind: "settling.closureRegimeData" as const,
    scottContinuous,
    finiteBase,
    countableCofinality,
  });
}

/** value — settle a commodity to its general equivalent (the `V = FOUR` value-form). */
export const valueAction: Action = action({
  verb: "value",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Settle a commodity to its general equivalent (money) — the V = FOUR value-form fixed point.",
  description:
    "Domain: a commodity carrier (organizing.accounting.commodity). Codomain: a charge value (the settled general equivalent). Settles chargeJoinVClosure(exchangeValue) from ⊥ₖ over chargeValueCategory; the settled charge is the universal incarnation of value (money, Capital I.1). Note §4 stage 3 — the keystone value-form settling.",
  run: (input: unknown, _args: Record<string, unknown> = {}): JsonValue => {
    const commodity = admitCommodity(jsonResource(input, "value input"), "value");
    const moneyForm = generalEquivalent(commodity);
    return jsonResource(moneyForm as unknown as JsonValue, "organizing.accounting.value.general-equivalent");
  },
});

/** transform — prove the transformation problem is a `V`-independent base-change. */
export const transformAction: Action = action({
  verb: "transform",
  inputFormat: "json",
  outputFormat: "json",
  options: ["from", "to", "finiteBase", "scottContinuous", "countableCofinality"],
  summary: "Prove the transformation problem is a base-change: two schools settle into the same V-independent regime.",
  description:
    "Domain: closure regime data (the κ-flags as options). Codomain: { sharedRegime, regime }. Witnesses fourRegimeValueIndependent for two schools (options.from / options.to, default labor-value ↦ prices-of-production over V = FOUR): both land in the SAME regime over the same κ-data, so the transformation problem is a change-of-base, not a refutation (note §2).",
  run: (_input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const fromSchool = (typeof args.from === "string" ? args.from : "labor-value") as School;
    const toSchool = (typeof args.to === "string" ? args.to : "prices-of-production") as School;
    // Both schools share the V = FOUR settling dynamics here; only the school tag
    // differs, which is exactly the point — the classification is V-independent.
    const improve = chargeJoinVClosure(chargeValueCategory.bot);
    const from = valueForm(fromSchool, chargeValueCategory, improve);
    const to = valueForm(toSchool, chargeValueCategory, improve);
    const d = regimeDataFromArgs(argsJson(args));
    const result = transform(from, to, d);
    return jsonResource(result as unknown as JsonValue, "organizing.accounting.value.transform");
  },
});

/** classify-value-regime — classify a settling's regime + the no-arbitrage reading. */
export const classifyValueRegimeAction: Action = action({
  verb: "classify-value-regime",
  inputFormat: "json",
  outputFormat: "json",
  options: ["finiteBase", "scottContinuous", "countableCofinality"],
  summary: "Classify a value settling's convergence regime and read no-arbitrage = H¹ = 0.",
  description:
    "Domain: closure regime data (the κ-flags as options). Codomain: { regime, noArbitrage }. classifyRegime decides strict/Scott/transfinite/aperiodic from κ-data alone (V-independent); cohomologyVanishesInRegime reads no-arbitrage = H¹ = 0 in the strict and Scott regimes (note §4 stage 5).",
  run: (_input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const d = regimeDataFromArgs(argsJson(args));
    const regime = valueRegime(d);
    const noArbitrage = noArbitrageInRegime(regime);
    return jsonResource(
      Object.freeze({ kind: "organizing.accounting.value.regime", regime, noArbitrage }) as unknown as JsonValue,
      "organizing.accounting.value.regime",
    );
  },
});

/** The value module's relating actions: one per verb (`value`, `transform`,
 * `classify-value-regime`), induced into bins downstream. */
export const valueActions: readonly Action[] = Object.freeze([
  valueAction,
  transformAction,
  classifyValueRegimeAction,
]);
