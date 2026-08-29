import { test } from "node:test";
import assert from "node:assert/strict";
import { assessGraphMatrix, dominantEigen } from "./eigen.mts";

test("Fibonacci matrix converges to the golden ratio (spike's analytic validation case)", () => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const { lambda, vector, converged } = dominantEigen([
    [1, 1],
    [1, 0],
  ]);
  assert.equal(converged, true);
  assert.ok(Math.abs(lambda - phi) < 1e-9, `lambda=${lambda} vs phi=${phi}`);
  const expected = [phi / (phi + 1), 1 / (phi + 1)];
  assert.ok(Math.abs(vector[0]! - expected[0]!) < 1e-9);
  assert.ok(Math.abs(vector[1]! - expected[1]!) < 1e-9);
});

test("identity matrix: lambda = 1", () => {
  const { lambda } = dominantEigen([
    [1, 0],
    [0, 1],
  ]);
  assert.ok(Math.abs(lambda - 1) < 1e-9);
});

test("strictly triangular (nilpotent) chain: lambda = 0, exactly (Graph A's shape)", () => {
  const { lambda, converged } = dominantEigen([
    [0, 0, 0],
    [0.5, 0, 0],
    [0, 0.4, 0],
  ]);
  assert.equal(lambda, 0);
  assert.equal(converged, true);
});

test("symmetric primitive matrix's eigenvector L1-normalizes to sum 1", () => {
  const { vector } = dominantEigen([
    [2, 1],
    [1, 2],
  ]);
  const sum = vector.reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test("negative-entry matrix does not fabricate a positive mixture (mixed sign preserved, no NaN)", () => {
  const { vector } = dominantEigen([
    [0, -2],
    [1, 0],
  ]);
  assert.equal(vector.some((x) => Number.isNaN(x)), false);
});

test("the sign-agnostic convergence fix: a negative dominant eigenvalue still reports converged=true", () => {
  // The spike's own negative-synergy probe found `converged: false` under the old
  // iterate-*point*-distance check, because a negative dominant eigenvalue flips the iterate's
  // sign every single step forever even after the direction itself has settled — the exact bug
  // this module's header says was fixed by measuring distance to the eigenvector's LINE instead.
  // M = [[-3,1],[2,-1]]: char. poly lambda^2 + 4*lambda + 1 = 0, real roots -2 +/- sqrt(3), so
  // the dominant (larger-magnitude) eigenvalue -2 - sqrt(3) is real, negative, and unique.
  const M = [
    [-3, 1],
    [2, -1],
  ];
  const expected = -2 - Math.sqrt(3);
  const { lambda, converged, history } = dominantEigen(M);
  assert.equal(converged, true, `expected convergence to be detected; history tail: ${history.slice(-6)}`);
  assert.ok(lambda < 0, `expected a negative dominant eigenvalue, got ${lambda}`);
  assert.ok(Math.abs(lambda - expected) < 1e-9, `lambda=${lambda} vs analytic ${expected}`);
});

test("assessGraphMatrix rejects a negative entry", () => {
  const v = assessGraphMatrix([
    [0, -1],
    [1, 0],
  ]);
  assert.equal(v.valid, false);
  assert.match(v.reason ?? "", /negative/);
});

test("assessGraphMatrix rejects an acyclic (nilpotent) matrix as 'no growth loop yet'", () => {
  const v = assessGraphMatrix([
    [0, 0, 0],
    [0.5, 0, 0],
    [0, 0.4, 0],
  ]);
  assert.equal(v.valid, false);
  assert.match(v.reason ?? "", /acyclic|no growth loop/);
});

test("assessGraphMatrix accepts a nonnegative matrix with a real cycle", () => {
  const v = assessGraphMatrix([
    [0.5, 0.5],
    [0.5, 0.5],
  ]);
  assert.equal(v.valid, true);
});

test("zero row (isolated node): lambda unaffected, that node's eigenvector share is exactly 0", () => {
  // spike §4: Mv = lambda v forces 0 = lambda * v_i for an isolated node's row.
  const M = [
    [0.6, 0.4, 0],
    [0.4, 0.6, 0],
    [0, 0, 0],
  ];
  const { lambda, vector } = dominantEigen(M);
  assert.ok(lambda > 0.9, `expected lambda near 1, got ${lambda}`);
  assert.ok(Math.abs(vector[2]!) < 1e-6, `isolated node's share should be ~0, got ${vector[2]}`);
});
