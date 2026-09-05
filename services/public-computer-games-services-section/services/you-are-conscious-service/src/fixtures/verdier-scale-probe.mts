/**
 * `verdier-scale-probe` — run in a CHILD PROCESS ONLY (see `eigen.fixture.test.mts`), never
 * imported directly. Calls the house's `@lenticule-science/metrologic/verdier/spectral`'s `isPrimitive` on a
 * matrix with entries at the spike's own probe scale (up to 8). This is not a bug in this house
 * module — it is the spike's finding, re-verified: `isPrimitive` computes matrix powers up to
 * `(n-1)^2+1` over von-Neumann unary naturals with no magnitude cap, and a JS-level `setTimeout`
 * cannot preempt a synchronous busy loop, so the ONLY reliable way to bound this call in a test
 * is an OS-level process timeout from a parent — which is exactly what this file exists to be a
 * safely-killable child of.
 */
import { isPrimitive } from "@lenticule-science/metrologic/verdier/spectral";

const M = [
  [0, 8, 0, 0],
  [0, 0, 8, 0],
  [0, 0, 0, 8],
  [8, 0, 0, 0],
];
const result = isPrimitive(M);
process.stdout.write(JSON.stringify({ result }));
