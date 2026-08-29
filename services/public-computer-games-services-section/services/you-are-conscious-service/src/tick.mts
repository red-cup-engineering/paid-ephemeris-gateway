/**
 * `tick` — the pure stock-evolution engine. `advance(state, fromTs, toTs)` is the whole story:
 * one call covers both "the player clicked a second ago" and "the player was offline for three
 * weeks" — there is no separate offline-progression code path, per the house convention this
 * service was built under ("an idle game's offline progression is a pure function of
 * (lastSeen, now) parameters, NEVER wall-clock reads inside domain logic"). This module never
 * calls `Date.now()`.
 *
 * **Stock-evolution rule.** For a production graph with edge matrix `M` (`graph.mts::toMatrix`,
 * `M[target][source] = rate`) and exogenous base-generation vector `b`
 * (`graph.mts::baseVector`), one tick is the affine step:
 *
 *     stock_{t+1} = (I + M) * stock_t + b
 *
 * `I` (identity) is what makes this additive rather than replacing: a node's existing stock
 * persists tick to tick, and `M`'s edges ADD production on top, `b` adds each node's own
 * unconditional per-tick generation. This is deliberately a different convention from the
 * spike's own toy dynamical system (`v_{t+1} = M v_t`, no identity, no exogenous term) — that
 * convention was right for isolating the growth-mixture math in `eigen.mts`, but wrong for an
 * actual game's stock counts, which must never spontaneously reset. `eigen.mts`/`prestige.mts`
 * still run their power iteration on the bare edge matrix `M` (see `graph.mts`'s header) — adding
 * `I` uniformly would just shift every eigenvalue by exactly 1 and change nothing about which
 * graph structure grows fastest, so the prestige number is computed on `M`, while the actual tick
 * step here runs on `(I + M)`.
 *
 * **Ticks are counted from the absolute epoch, not from state.** `ticksBetween` uses
 * `floor(ts / TICK_INTERVAL_MS)`, so the number of ticks between two timestamps depends only on
 * those two timestamps — never on where a caller happens to have split the interval. That is
 * exactly what makes `advance` a well-defined function of `(state, fromTs, toTs)` with no hidden
 * dependency on call history.
 *
 * **Performance / no-cap-needed.** `advance` computes `(I+M)^n` via binary exponentiation
 * (repeated squaring, O(log n) matrix multiplications) rather than simulating n ticks in a loop —
 * a player who was offline for a year is ~25 matrix multiplications, not 31 million tick steps.
 * This is *also* the honest reason `offline-progression.test.mts`'s associativity property holds
 * only approximately: repeated squaring groups the same n multiplications differently depending
 * on how n is split (e.g. computing `A^7` directly multiplies `A^4 * A^2 * A^1`, while splitting
 * as `A^3` then `A^4` groups differently), and floating-point multiplication is not exactly
 * associative. See that test file for the stated tolerance.
 *
 * **Numerical-safety ceiling, not a gameplay cap.** A real, honestly-built production graph (e.g.
 * a two-node loop upgraded partway to `MAX_EDGE_RATE`, ticked over an ordinary multi-hour-to-one-
 * day offline gap) compounds, one second at a time, straight through float64's finite range:
 * stocks reach literal `Infinity` in well under a day of elapsed ticks. Worse than the `Infinity`
 * itself: once any entry of an intermediate matrix power is `Infinity`, the next squaring step's
 * dot-products can multiply that `Infinity` against a genuine structural zero elsewhere in the
 * matrix — `0 * Infinity === NaN` — silently corrupting every node's stock, including totally
 * unconnected dead-end nodes sitting at an honest, unrelated value. `NaN` is worse than `Infinity`
 * for a currency: `intents.mts`'s `spend()` checks `balance < cost`, and `NaN < cost` is `false`
 * in IEEE-754 for every `cost` — a `NaN` stock silently passes every future affordability check,
 * making every subsequent build/connect/upgrade paid from it free forever. `STOCK_CLAMP` and
 * `clampFinite` exist to make that structurally impossible: every matrix entry `advance` computes
 * or reuses is clamped back into a finite range immediately after each multiplication, so no
 * `Infinity` is ever available to multiply against a zero. The ceiling itself (1e250) sits far
 * above anything `offline-progression.test.mts`'s real fixtures or any reachable in-game graph
 * produces (two weeks against that suite's growth fixture tops out around 1e84 — see that file's
 * own header), so it changes nothing about honestly-sized numbers and only engages once growth
 * has already run past the point where the number was going to be meaningless (`Infinity`/`NaN`)
 * anyway. A stock pinned at the ceiling is still an honest, finite, displayable number — "very
 * large" rather than "undefined."
 */
import type { ProductionGraph } from "./graph.mts";
import { baseVector, nodeOrder, toMatrix } from "./graph.mts";

/** One tick = one second of real elapsed time. A named domain constant, not a magic number
 *  scattered through call sites — `cartridge.mts` and the web UI both import this rather than
 *  re-deriving it. */
export const TICK_INTERVAL_MS = 1000;

export interface StockState {
  readonly graph: ProductionGraph;
  readonly stocks: Readonly<Record<string, number>>;
}

/** Ticks elapsed between two absolute timestamps, anchored to the epoch (not to either state) —
 *  this is the property that makes `advance` exactly composable at the tick-count level:
 *  `ticksBetween(t0,t1) + ticksBetween(t1,t2) === ticksBetween(t0,t2)` always, exact integer
 *  arithmetic, for any t0 <= t1 <= t2. */
export function ticksBetween(fromTs: number, toTs: number): number {
  if (toTs < fromTs) throw new RangeError(`ticksBetween: toTs (${toTs}) is before fromTs (${fromTs}) — time does not run backward in this engine`);
  return Math.floor(toTs / TICK_INTERVAL_MS) - Math.floor(fromTs / TICK_INTERVAL_MS);
}

/** See the module header ("Numerical-safety ceiling") for why this exists and why 1e250 is a safe
 *  choice: comfortably above any value a real playthrough's honest arithmetic produces today, and
 *  comfortably below float64's actual overflow point (~1.7976931348623157e308), leaving a wide
 *  margin so a single multiplication step landing on a clamped operand still cannot itself
 *  overflow to `Infinity`. */
export const STOCK_CLAMP = 1e250;

/** Pin `x` back into `[-STOCK_CLAMP, STOCK_CLAMP]`, and — the specific failure this exists to make
 *  structurally unreachable — turn a `NaN` (which can only arise from a `0 * Infinity` this
 *  function's own callers are written to prevent, but is handled defensively anyway) into `0`
 *  rather than let it propagate. A stock or matrix entry must never surface as `NaN`: see the
 *  module header for why that specific value, not just `Infinity`, is the one that silently
 *  breaks `intents.mts`'s `spend()` affordability check. */
function clampFinite(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x > STOCK_CLAMP) return STOCK_CLAMP;
  if (x < -STOCK_CLAMP) return -STOCK_CLAMP;
  return x;
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

/** Clamps every output entry (`clampFinite`) before returning — the load-bearing step that keeps
 *  `matPow`'s repeated squaring from ever handing a later multiplication step a genuine `Infinity`
 *  operand, which is what would otherwise let a `0 * Infinity = NaN` corrupt an unrelated entry
 *  (see the module header). */
function matmul(A: readonly (readonly number[])[], B: readonly (readonly number[])[]): number[][] {
  const n = A.length;
  const m = B[0]?.length ?? 0;
  const k = B.length;
  const out: number[][] = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < k; p++) {
      const a = A[i]![p]!;
      if (a === 0) continue;
      const brow = B[p]!;
      for (let j = 0; j < m; j++) out[i]![j] += a * brow[j]!;
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) out[i]![j] = clampFinite(out[i]![j]!);
  }
  return out;
}

function matVec(A: readonly (readonly number[])[], v: readonly number[]): number[] {
  return A.map((row) => clampFinite(row.reduce((s, x, i) => s + x * (v[i] ?? 0), 0)));
}

/** Binary exponentiation (repeated squaring): A^n in O(log n) matrix multiplications. n=0 yields
 *  the identity. Iterative, not recursive — n can be large (years of offline ticks) but its bit
 *  length never is. */
function matPow(A: readonly (readonly number[])[], n: number): number[][] {
  const size = A.length;
  let result = identity(size);
  let base: number[][] = A.map((row) => [...row]);
  let e = n;
  while (e > 0) {
    if (e & 1) result = matmul(result, base);
    base = matmul(base, base);
    e = Math.floor(e / 2);
  }
  return result;
}

/**
 * Advance `state` by however many ticks fall in `[fromTs, toTs)`, in one closed-form step — the
 * exact function the house convention requires: pure, injected timestamps, no wall-clock read,
 * one call whether the elapsed time is a second or a season. Throws if `toTs < fromTs`.
 */
export function advance(state: StockState, fromTs: number, toTs: number): StockState {
  const n = ticksBetween(fromTs, toTs);
  if (n === 0) return state;
  const order = nodeOrder(state.graph);
  const dim = order.length;
  if (dim === 0) return state;
  const { matrix: M } = toMatrix(state.graph);
  const b = baseVector(state.graph, order);
  const I = identity(dim);
  const A: number[][] = I.map((row, i) => row.map((x, j) => x + (M[i]?.[j] ?? 0)));

  // Homogeneous-coordinate trick: augment the affine step v -> A v + b into a LINEAR map on
  // (v, 1) via the (dim+1)x(dim+1) matrix [[A, b], [0, 1]]. Its n-th power's top-right block is
  // exactly sum_{k=0}^{n-1} A^k * b (the accumulated base generation across all n ticks), and its
  // top-left block is A^n — both obtained from ONE binary-exponentiation pass, without ever
  // materializing the n-term sum directly (which would defeat the point of going O(log n)).
  const aug: number[][] = A.map((row, i) => [...row, b[i] ?? 0]);
  aug.push([...Array(dim).fill(0), 1]);
  const augPow = matPow(aug, n);

  const v0 = order.map((id) => state.stocks[id] ?? 0);
  const homogeneous = [...v0, 1];
  const vn = matVec(augPow, homogeneous).slice(0, dim);

  const stocks: Record<string, number> = { ...state.stocks };
  order.forEach((id, i) => {
    // vn is already clampFinite()-ed inside matVec; clamping again here is a cheap, explicit
    // belt-and-suspenders guarantee at the one point this function actually writes into state,
    // rather than trusting that invariant silently across a call boundary.
    stocks[id] = clampFinite(vn[i] ?? 0);
  });
  return { graph: state.graph, stocks };
}
