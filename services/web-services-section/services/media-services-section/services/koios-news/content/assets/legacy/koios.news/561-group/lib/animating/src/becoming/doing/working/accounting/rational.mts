// rational.ts — exact rational money. An Amount is { num: bigint, den: bigint, commodity: string }
// kept in reduced form (gcd = 1, den > 0). Division is exact; a decimal string appears ONLY at
// format() — the single saturation point. BigInt arithmetic is closed and exact: 1/3 + 1/3 + 1/3
// === 1, 0.1 + 0.2 === 0.3. Never a float. Throws ONLY on programmer error (zero denominator,
// commodity mismatch), never on ledger data.

import type { Amount } from "./model/types.mjs";

const absBig = (x: bigint): bigint => (x < 0n ? -x : x);

const gcd = (a: bigint, b: bigint): bigint => {
  a = absBig(a); b = absBig(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a;
};

const reduce = (num: bigint, den: bigint): [bigint, bigint] => {
  if (den === 0n) throw new RangeError("rational: zero denominator");
  if (num === 0n) return [0n, 1n];
  if (den < 0n) { num = -num; den = -den; }
  const g = gcd(num, den);
  return [num / g, den / g];
};

export const rational = (num: bigint | number, den: bigint | number = 1n): { num: bigint; den: bigint } => {
  const [n, d] = reduce(BigInt(num), BigInt(den));
  return { num: n, den: d };
};

export const amount = (num: bigint | number, den: bigint | number, commodity: string): Amount => {
  const [n, d] = reduce(BigInt(num), BigInt(den));
  return { num: n, den: d, commodity };
};

export const zero = (commodity: string): Amount => ({ num: 0n, den: 1n, commodity });

export const isAmount = (x: unknown): x is Amount =>
  !!x && typeof x === "object" &&
  typeof (x as Amount).num === "bigint" &&
  typeof (x as Amount).den === "bigint" &&
  typeof (x as Amount).commodity === "string";

// toExactString — the lossless audit form "num/den commodity". Equal values give equal strings
// (both are reduced), so it is also the canonical key for exact comparison.
export const toExactString = (a: Amount): string => `${a.num}/${a.den} ${a.commodity}`;

const sameCommodity = (a: Amount, b: Amount): void => {
  if (a.commodity !== b.commodity) throw new TypeError(`commodity mismatch: ${a.commodity} vs ${b.commodity}`);
};

export const add = (a: Amount, b: Amount): Amount => {
  sameCommodity(a, b);
  return amount(a.num * b.den + b.num * a.den, a.den * b.den, a.commodity);
};

export const sub = (a: Amount, b: Amount): Amount => {
  sameCommodity(a, b);
  return amount(a.num * b.den - b.num * a.den, a.den * b.den, a.commodity);
};

export const negate = (a: Amount): Amount => ({ num: -a.num, den: a.den, commodity: a.commodity });
export const isZero = (a: Amount): boolean => a.num === 0n;
export const cmp = (a: Amount, b: Amount): -1 | 0 | 1 => {
  sameCommodity(a, b);
  const l = a.num * b.den, r = b.num * a.den;
  return l < r ? -1 : l > r ? 1 : 0;
};
export const eq = (a: Amount, b: Amount): boolean =>
  a.commodity === b.commodity && a.num * b.den === b.num * a.den;

export const absAmount = (a: Amount): Amount => ({ num: absBig(a.num), den: a.den, commodity: a.commodity });
export const withinTolerance = (a: Amount, tol: Amount): boolean => cmp(absAmount(a), absAmount(tol)) <= 0;

export const scale = (a: Amount, r: { num: bigint; den: bigint }): Amount =>
  amount(a.num * r.num, a.den * r.den, a.commodity);

// times — multiply two Amount magnitudes into a NEW commodity. Used for cost/price weighting.
// (10 STOCK) × (5 USD per unit) = 50 USD.
export const times = (a: Amount, b: Amount, commodity: string): Amount =>
  amount(a.num * b.num, a.den * b.den, commodity);
