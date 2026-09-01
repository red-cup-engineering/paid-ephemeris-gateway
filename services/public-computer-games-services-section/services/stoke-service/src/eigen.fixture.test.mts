/**
 * `eigen.fixture` — offline validation ONLY, per the spike's engine-design recommendation:
 * "Reserve @lenticule-science/metrologic/verdier/spectral's exact tools for offline validation only ... never
 * the hot path." This file never runs inside the game engine; it exists so that if `eigen.mts`'s
 * power iteration and the house's own exact PF-hypothesis check ever disagree on a small toy
 * matrix, CI catches it here rather than a player noticing a wrong-looking multiplier.
 *
 * Deliberately does NOT call `perronConvergent`: re-verifying the spike's numbers here found that
 * function hangs (no return within a generous timeout) even on the tiny 4x4 0/1-entry matrix
 * below at as few as 20 iterations — a strictly smaller, "safer" case than anything the spike
 * itself tried. `isPrimitive` alone (the boolean PF-hypothesis check, not a numeric eigenvalue)
 * is fast and safe at this scale, so that's the cross-check this file actually runs; the second
 * test below re-confirms, at the spike's own probe size, that going further genuinely does hang —
 * using a real OS-level subprocess timeout rather than a JS `setTimeout`, because a synchronous
 * busy loop (which is what this hang is) cannot be preempted by anything running on the same
 * thread it's blocking.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isPrimitive } from "@lenticule-science/metrologic/verdier/spectral";
import { dominantEigen } from "./eigen.mts";

const PROBE = fileURLToPath(new URL("./fixtures/verdier-scale-probe.mts", import.meta.url));

test("small-integer primitive matrix: eigen.mts and the house's exact isPrimitive agree on the PF hypothesis", () => {
  // The spike's Graph B topology (4-cycle plus a self-loop on node 0), small integer weights —
  // safely inside the scale the earlier probe confirmed fast.
  const M = [
    [1, 0, 0, 1],
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
  ];
  assert.equal(isPrimitive(M), true, "fixture matrix must actually be primitive for this cross-check to mean anything");
  const { lambda, converged } = dominantEigen(M);
  assert.equal(converged, true);
  assert.ok(lambda > 0, `a primitive matrix must have a real positive dominant eigenvalue, got ${lambda}`);
});

test(
  "the house's own isPrimitive is confirmed unsafe at game-relevant scale (spike's finding, re-verified via a real process-level timeout)",
  { timeout: 20_000 },
  () => {
    // Not a test of eigen.mts — a documentation-by-test of WHY eigen.mts exists at all rather
    // than calling @lenticule-science/metrologic directly on every tick. Runs the spike's own probe-scale
    // matrix (entries up to 8) in a CHILD PROCESS with an OS-enforced 8s wall-clock cap: a JS
    // `setTimeout` cannot interrupt this call (it is a synchronous busy loop hogging the one
    // thread that would run the timeout callback), so only spawnSync's process-level `timeout`
    // can actually bound it.
    const result = spawnSync(process.execPath, ["--experimental-strip-types", PROBE], {
      timeout: 8_000,
      killSignal: "SIGKILL",
      encoding: "utf8",
    });
    assert.equal(result.signal, "SIGKILL", `expected the probe to be killed for exceeding 8s (confirming the hang); got signal=${result.signal} status=${result.status} stdout=${result.stdout}`);
  },
);
