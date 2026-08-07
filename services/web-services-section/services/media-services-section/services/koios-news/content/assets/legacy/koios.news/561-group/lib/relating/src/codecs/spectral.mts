/**
 * Native-number boundary helpers for spectral polynomial carriers.
 */
import { integerPolynomial, type IntegerPolynomial } from "../articulating/predicating/positing/settling/analysis/spectral.mjs";
import type { Integer } from "../articulating/carriers.mjs";
import { fromInt, toInt } from "./exact-number.mjs";

/**
 * Builds an IntegerPolynomial from native integer coefficients in ascending
 * degree order.
 */
export const polyFromInts = (values: readonly number[]): IntegerPolynomial =>
  integerPolynomial(values.map(fromInt));

/**
 * Reads an IntegerPolynomial's coefficients as native integers in ascending
 * degree order.
 */
export const polyToInts = (poly: readonly Integer[]): readonly number[] =>
  Object.freeze(poly.map(toInt));
