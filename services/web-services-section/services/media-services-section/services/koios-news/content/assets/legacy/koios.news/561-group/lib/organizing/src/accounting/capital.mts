/**
 * organizing/accounting/capital — the accounting reading of capital as the
 * reseed spiral M–C–M′.
 *
 * Authority: `dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md`
 * §4 stage 8 ("capital = the reseed spiral"): *"M–C–M′: value-in-motion that
 * returns enlarged = the agency descent that DOES NOT TERMINATE but reseeds at
 * higher scale (`reseed`). Capital is the spiral, not a thing (corpus capital
 * note: 'not a thing but a social relation that takes the form of self-expanding
 * value'). Surplus value, organic composition, TRPF = ratios = readings on the
 * circuit. Capital-as-class-relation = an asymmetry frozen into the agent-sheaf."*
 *
 * The four readings of capital this module formalizes — each DERIVED, never bare:
 *
 *  1. **circuit(seed) — M–C–M′ = the non-terminating spiral.** Simple commodity
 *     circulation C–M–C terminates: a use-value is reached and the motion stops.
 *     Capital's circuit M–C–M′ does NOT terminate — the settled money re-poses as
 *     the seed of the next, larger circuit. That is EXACTLY `@emsenn/animating`'s
 *     `reseed`: the individuated being ("settled below, open above") carries a
 *     charge of residual pre-individual potential (its `milieu`) and re-enters as
 *     the seed of a fresh descent at the next scale. So `circuit` is `reseed` read
 *     financially — value-in-motion returning to itself enlarged, `openAbove: true`,
 *     `regime: "aperiodic"` (the spiral never closes into a terminal fixed point).
 *     Capital is the `Becoming`, not a thing: the carrier holds the becoming, not a
 *     stock of money.
 *
 *  2. **surplus(invested, recovered) — surplus value & the rate of profit.** M′ − M
 *     = ΔM is surplus value: `subMoney(recovered, invested)` over
 *     `@emsenn/relating/economy`'s exact
 *     `Rational`-graded arithmetic (the same commodity sector both legs live in —
 *     `subMoney` THROWS on a commodity mismatch, the multi-commodity safety law).
 *     The rate of profit is the dimensionless RATIO reading on the circuit,
 *     `s / C = ΔM / M`, computed by `ratioOf(surplus, invested)` as a bare
 *     `bigint` num/den pair — a reading on the circuit, never a free number on a
 *     thing. (TRPF — the tendency of the rate of profit to fall — and the organic
 *     composition c/(c+v) are further `ratioOf` readings the institution layer takes
 *     over the reproduction scheme; the primitive they all collapse into is this
 *     single ratio-of-surplus-over-capital.)
 *
 *  3. **sraffaPrices(io) — prices of production = the dominant eigenvector.** Sraffa's
 *     *Production of Commodities by Means of Commodities*: prices of production are
 *     the Perron–Frobenius dominant eigenvector of the input–output matrix (the
 *     self-replacing standard system). On this substrate the eigenstructure is read
 *     SPECTRALLY and EXACTLY: `charPoly(io)` (`@emsenn/relating/analysis`, ascending
 *     degree, exact `Integer` arithmetic — Bareiss/fraction-free, never a float) is
 *     the characteristic polynomial whose dominant real root is the Perron–Frobenius
 *     eigenvalue (1 + r over the standard ratio), and `rank(io)` (count of nonzero
 *     Smith invariant factors) reports the dimension of the price system. The
 *     dominant-eigenvector reading lives in the spectral root structure of that
 *     polynomial — exposed, not approximated. This is the §2/§6 keystone: the Sraffa
 *     school is a `ValueCategory` choice ('prices-of-production'), settled by the
 *     SAME dynamics as every other school (`four_regime_v_independent`); the
 *     transformation problem (labour values ↦ prices of production) is a base-change
 *     between two `V`'s, not a refutation.
 *
 *  4. **capital-as-class-relation — a reading, not a new carrier.** Capital is "a
 *     social relation that takes the form of self-expanding value" — the M–C–M′
 *     asymmetry (one pole advances M and claims ΔM, the other sells labour-power)
 *     is an ASYMMETRY FROZEN INTO THE AGENT-SHEAF, the off-diagonal of the social
 *     gluing the institution layer (stage 9, `organizing`) settles. It is therefore
 *     a reading on the circuit's becoming and the surplus ratio, NOT a fifth carrier
 *     — the anti-fetishism law (§1): the class relation is the image of a predication
 *     among agents, never free data on a thing.
 *
 * Carriers are bare-`$id` (`organizing/accounting/capital/circuit`,
 * `organizing/accounting/capital/surplus`);
 * each verb is registered once as a relating `action` so `induceBins` projects the
 * whole surface to every transport. No free data past `Mark`/`Articulating`: the
 * circuit is `reseed`, the surplus is `subMoney` + `ratioOf`, the Sraffa prices are
 * `charPoly`/`rank` over exact `Integer` matrices.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import {
  charPoly,
  rank,
  type Integer,
  type Matrix,
  type Natural,
} from "@emsenn/relating/analysis";
import { reseed, type Becoming } from "@emsenn/animating";

import {
  subMoney,
  ratioOf,
  commodityOf,
  toExactString,
  type Money,
} from "@emsenn/relating/economy";

/** The carrier `$id` of a capital circuit — the M–C–M′ reseed spiral. */
export const CAPITAL_CIRCUIT_ID = "organizing/accounting/capital/circuit";

/** The `{ $ref }` slot the circuit morphisms reference. */
export const circuitRef = Object.freeze({ $ref: CAPITAL_CIRCUIT_ID });

/** The carrier `$id` of a surplus reading — ΔM and the rate of profit over a circuit. */
export const CAPITAL_SURPLUS_ID = "organizing/accounting/capital/surplus";

/** The `{ $ref }` slot the surplus morphisms reference. */
export const surplusRef = Object.freeze({ $ref: CAPITAL_SURPLUS_ID });

/**
 * A capital circuit: M–C–M′ read as `animating`'s non-terminating reseed spiral.
 *
 * `becoming` IS the `@emsenn/animating` `Becoming` that `reseed` re-poses the
 * settled individual into — the value-in-motion that returns to itself enlarged
 * and re-enters at the next scale (`openAbove: true`, `regime: "aperiodic"`).
 * `identity` names the circuit's re-posed agent. Capital is held HERE as the
 * becoming, not as a stock of money: capital is the spiral, not a thing.
 */
export interface Circuit {
  readonly kind: "organizing.accounting.capital.circuit";
  readonly identity: string;
  readonly becoming: Becoming;
}

/**
 * A surplus reading on a circuit: surplus value ΔM = M′ − M and (when capital is
 * advanced, i.e. M ≠ 0) the rate of profit ΔM / M.
 *
 * `surplus` is exact graded money (`subMoney(recovered, invested)`), staying in the
 * invested commodity's sector. `rateOfProfit` is the dimensionless `bigint` num/den
 * ratio `ratioOf(surplus, invested)` — a reading on the circuit, ABSENT when no
 * capital was advanced (the ratio's denominator would be zero; the rate of profit
 * on nothing advanced is undefined, not zero — silence, not denial).
 */
export interface SurplusReading {
  readonly kind: "organizing.accounting.capital.surplus";
  readonly invested: Money;
  readonly recovered: Money;
  readonly surplus: Money;
  readonly rateOfProfit?: { readonly num: bigint; readonly den: bigint };
}

/**
 * M–C–M′: the capital circuit as `animating`'s reseed spiral.
 *
 * `reseed(seed, options)` re-poses the settled individual as the next-scale
 * `Becoming` — the motion that does not terminate but re-enters enlarged. Capital is
 * that becoming: the carrier holds the re-posed spiral, not a money stock. The
 * `identity` option names the re-posed agent (the firm/capital whose circuit this is).
 */
export function circuit(seed: JsonValue, options: { identity?: string } = {}): Circuit {
  const becoming = reseed(seed, options);
  // The re-posed identity is the spiral's first (and only) re-seed token: the
  // settled individual "<identity>|individuated" that re-enters as the next circuit.
  const identity = options.identity ?? becoming.seed[0] ?? "capital";
  return Object.freeze({
    kind: "organizing.accounting.capital.circuit" as const,
    identity,
    becoming,
  });
}

/**
 * Re-pose a settled circuit into the next, higher-scale circuit — the spiral does
 * not terminate. The settled circuit's becoming-seed is fed back through `reseed-circuit`:
 * M′ becomes the M of the next round, value-in-motion returning to itself enlarged.
 * This makes the non-termination operational: `reseed-circuit` of a reseed, one scale up.
 */
export function reseedCircuit(prior: Circuit, options: { identity?: string } = {}): Circuit {
  // The prior circuit's re-posed seed is the next circuit's input — the spiral re-entry.
  const seed: JsonValue = Object.freeze([...prior.becoming.seed]);
  return circuit(seed, { identity: options.identity ?? prior.identity });
}

/**
 * The surplus reading on a circuit: ΔM = recovered − invested and the rate of
 * profit ΔM / M.
 *
 * `subMoney(recovered, invested)` is the exact graded difference (THROWS on a
 * commodity mismatch — both legs must value the same sector). The rate of profit is
 * the dimensionless ratio `ratioOf(surplus, invested)`; it is omitted when nothing
 * was advanced (the contract's optional field — no rate of profit on zero capital).
 */
export function surplus(
  invested: Money,
  recovered: Money,
): { readonly surplus: Money; readonly rateOfProfit?: { readonly num: bigint; readonly den: bigint } } {
  const delta = subMoney(recovered, invested);
  // ratioOf reads l.value / r.value as a bare bigint pair; a zero-denominator (no
  // capital advanced) makes the rate of profit undefined — omit it (silence ≠ zero).
  const ratio = ratioOf(delta, invested);
  if (ratio.den === 0n) {
    return Object.freeze({ surplus: delta });
  }
  return Object.freeze({ surplus: delta, rateOfProfit: Object.freeze(ratio) });
}

/**
 * Build the full surplus carrier on a circuit's invested/recovered legs: the
 * surplus money, and the rate of profit when capital was advanced.
 */
export function surplusReading(invested: Money, recovered: Money): SurplusReading {
  const { surplus: delta, rateOfProfit } = surplus(invested, recovered);
  return Object.freeze({
    kind: "organizing.accounting.capital.surplus" as const,
    invested,
    recovered,
    surplus: delta,
    ...(rateOfProfit === undefined ? {} : { rateOfProfit }),
  });
}

/**
 * Sraffa prices of production: the characteristic-polynomial spectral structure of
 * the input–output matrix, the substrate of the Perron–Frobenius dominant eigenvector.
 *
 * `charPoly(io)` (`@emsenn/relating/analysis`, ascending degree, exact `Integer`
 * arithmetic — fraction-free, never a float) is the polynomial whose dominant real
 * root is the Perron–Frobenius eigenvalue of the self-replacing standard system; the
 * prices of production ARE that dominant eigenvector. `rank(io)` (count of nonzero
 * Smith invariant factors) reports the dimension of the resolved price system. The
 * prices-of-production school is a `ValueCategory` choice settled by the same
 * dynamics as every other (§2 keystone); the transformation problem is a base-change.
 */
export function sraffaPrices(io: Matrix): { readonly charPoly: readonly Integer[]; readonly rank: Natural } {
  return Object.freeze({
    charPoly: charPoly(io),
    rank: rank(io),
  });
}

// — boundary admission helpers (carriers reconstructed from JSON at the action edge) —

const isRecord = (value: JsonValue): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Admit a money carrier from args, refusing anything that is not graded exact money. */
function admitMoney(value: JsonValue, slot: string): Money {
  if (isRecord(value) && value.kind === "exactNumber.gradedRational") {
    return value as unknown as Money;
  }
  throw new TypeError(`capital: ${slot} must be a money carrier (exactNumber.gradedRational)`);
}

/** Admit one exact integer carrier, refusing anything that is not one. */
function admitInteger(value: JsonValue, slot: string): Integer {
  if (isRecord(value) && value.kind === "exactNumber.integer") {
    return value as unknown as Integer;
  }
  throw new TypeError(`capital: ${slot} must be an exact integer carrier (exactNumber.integer)`);
}

/**
 * Admit an input–output matrix from args: a JSON array of rows, each a JSON array
 * of exact `Integer` carriers. No float ever enters — the Sraffa eigenstructure is
 * read over exact arithmetic, per the no-free-data / no-float doctrine.
 */
function admitMatrix(value: JsonValue, slot: string): Matrix {
  if (!Array.isArray(value)) {
    throw new TypeError(`capital: ${slot} must be a matrix (array of integer rows)`);
  }
  return Object.freeze(
    value.map((row, r) => {
      if (!Array.isArray(row)) {
        throw new TypeError(`capital: ${slot} row ${r} must be an array of exact integers`);
      }
      return Object.freeze(row.map((cell, c) => admitInteger(cell, `${slot}[${r}][${c}]`)));
    }),
  );
}

/** circuit — M–C–M′: re-pose a seed as the non-terminating reseed spiral. */
export const circuitAction: Action = action({
  verb: "circuit",
  inputFormat: "json",
  outputFormat: "json",
  options: ["seed", "identity"],
  summary: "M–C–M′: re-pose a seed as the animating reseed spiral — value-in-motion that does not terminate.",
  description:
    "Domain: a JSON seed (+ optional identity). Codomain: a circuit carrier holding the animating Becoming " +
    "that reseed re-poses the settled individual into. Capital is the spiral, not a thing: the carrier holds " +
    "the non-terminating becoming (openAbove, aperiodic regime), the value-in-motion that returns enlarged.",
  domainSchema: { seed: {}, identity: { type: "string" } },
  codomainSchema: circuitRef,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const seed = (args.seed ?? input) as JsonValue;
    const identity = typeof args.identity === "string" ? args.identity : undefined;
    return jsonResource(circuit(seed, identity !== undefined ? { identity } : {}), "circuit");
  },
});

/** reseed-circuit — re-pose a settled circuit into the next, higher-scale circuit. */
export const reseedAction: Action = action({
  verb: "reseed-circuit",
  inputFormat: "json",
  outputFormat: "json",
  options: ["circuit", "identity"],
  summary: "Re-pose a settled circuit into the next-scale circuit — the spiral does not terminate.",
  description:
    "Domain: a circuit carrier (+ optional identity). Codomain: the next circuit carrier. The prior circuit's " +
    "re-posed becoming-seed becomes the input of the next round — M′ becomes the M of the next circuit, " +
    "value returning to itself enlarged one scale up. This makes M–C–M′'s non-termination operational.",
  domainSchema: { circuit: circuitRef, identity: { type: "string" } },
  codomainSchema: circuitRef,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const priorValue = (args.circuit ?? input) as JsonValue;
    if (!isRecord(priorValue) || priorValue.kind !== "organizing.accounting.capital.circuit") {
      throw new TypeError("capital: circuit must be a circuit carrier (organizing.accounting.capital.circuit)");
    }
    const prior = priorValue as unknown as Circuit;
    const identity = typeof args.identity === "string" ? args.identity : undefined;
    return jsonResource(reseedCircuit(prior, identity !== undefined ? { identity } : {}), "circuit");
  },
});

/** surplus — ΔM = recovered − invested and the rate of profit ΔM / M (a ratio reading). */
export const surplusAction: Action = action({
  verb: "surplus",
  inputFormat: "json",
  outputFormat: "json",
  options: ["invested", "recovered"],
  summary: "Surplus value ΔM = recovered − invested, with the rate of profit ΔM / M as a ratio reading.",
  description:
    "Domain: an invested money carrier x a recovered money carrier (same commodity sector). Codomain: a " +
    "surplus carrier. surplus = subMoney(recovered, invested) over exact graded money; rateOfProfit = " +
    "ratioOf(surplus, invested) as a dimensionless bigint num/den pair — omitted when no capital was advanced " +
    "(no rate of profit on zero advance — silence, not zero). Derived, never bare.",
  domainSchema: { invested: { $ref: "relating/economy/money" }, recovered: { $ref: "relating/economy/money" } },
  codomainSchema: surplusRef,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const invested = admitMoney((args.invested ?? input) as JsonValue, "invested");
    const recovered = admitMoney(args.recovered as JsonValue, "recovered");
    // commodityOf / toExactString touch the money surface so the reading is named by the
    // exact sector it lives in (anti-fetishism: surplus is graded, never a free number).
    void commodityOf(invested);
    void toExactString(recovered);
    return jsonResource(surplusReading(invested, recovered), "surplus");
  },
});

/** sraffa — prices of production = the dominant eigenvector: charPoly + rank of the I–O matrix. */
export const sraffaAction: Action = action({
  verb: "sraffa",
  inputFormat: "json",
  outputFormat: "json",
  options: ["io"],
  summary: "Sraffa prices of production: charPoly (ascending degree) + rank of the exact-Integer I–O matrix.",
  description:
    "Domain: an input–output matrix (array of rows of exact Integer carriers). Codomain: a record with " +
    "charPoly (the characteristic polynomial, ascending degree, whose dominant real root is the " +
    "Perron–Frobenius eigenvalue — the prices of production are its dominant eigenvector) and rank (the " +
    "price-system dimension, count of nonzero Smith invariant factors). Exact Integer arithmetic — never a float.",
  domainSchema: { io: { type: "array", items: { type: "array", items: { $ref: "exactNumber/integer" } } } },
  codomainSchema: {
    type: "object",
    properties: {
      charPoly: { type: "array", items: { $ref: "exactNumber/integer" } },
      rank: { $ref: "exactNumber/natural" },
    },
  },
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const io = admitMatrix((args.io ?? input) as JsonValue, "io");
    return jsonResource(sraffaPrices(io) as unknown as JsonValue, "sraffa-prices");
  },
});

/** The capital module's verbs: the reseed spiral, its re-entry, the surplus ratio, and Sraffa prices. */
export const capitalActions: readonly Action[] = Object.freeze([
  circuitAction,
  reseedAction,
  surplusAction,
  sraffaAction,
]);
