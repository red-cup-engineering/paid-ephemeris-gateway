/**
 * `policy` — tier 5's mechanic: record a sequence of intents as a named policy, and pay for
 * REPLAYING it in proportion to its real description length, not its raw step count. This is
 * literal minimum-description-length compression, not a metaphor for it: `descriptionLength`
 * finds the shortest `(repeating block, repeat count)` encoding that reproduces the recorded
 * steps EXACTLY, the same move MDL/Kolmogorov-complexity intuition makes for "a rule run to its
 * own fixed point" (DESIGN.md §1's phrase for this tier).
 *
 * **Why a policy can come out LONGER than what it reproduces**, per DESIGN.md §4 ("the game says
 * so, plainly, rather than crediting every macro equally"): every named policy pays a small fixed
 * `POLICY_OVERHEAD` for the fact of being a named, storable thing at all, plus the cost of its own
 * minimal block. A sequence with no repeating structure has no smaller block than itself, so its
 * description length is `POLICY_OVERHEAD + steps.length` — strictly MORE than just redoing the
 * raw steps by hand. `isRealCompression` names this plainly rather than letting the UI imply every
 * macro is a discount.
 */
export interface PolicyStepLike {
  readonly kind: string;
  readonly payload: Readonly<Record<string, string | number>>;
}

export const POLICY_OVERHEAD = 1;

function stepsEqual(a: PolicyStepLike, b: PolicyStepLike): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The shortest block length `d` (a divisor of `steps.length`) such that repeating `steps[0..d)`
 *  `steps.length/d` times reproduces `steps` exactly. Falls back to `steps.length` itself (no
 *  smaller repeating structure found) — the honest "this is its own minimal description" case. */
export function findMinimalBlockLength(steps: readonly PolicyStepLike[]): number {
  const n = steps.length;
  if (n === 0) return 0;
  for (let d = 1; d < n; d++) {
    if (n % d !== 0) continue;
    let matches = true;
    for (let i = d; i < n; i++) {
      if (!stepsEqual(steps[i]!, steps[i % d]!)) {
        matches = false;
        break;
      }
    }
    if (matches) return d;
  }
  return n;
}

/**
 * Real minimum description length of `steps`: `POLICY_OVERHEAD` (naming/storing this as a policy
 * at all) plus the minimal block itself plus one more token IF the block genuinely repeats (a
 * "repeat N times" marker — free when `N === 1`, since there is nothing to repeat).
 */
export function descriptionLength(steps: readonly PolicyStepLike[]): number {
  const n = steps.length;
  if (n === 0) return POLICY_OVERHEAD;
  const blockLen = findMinimalBlockLength(steps);
  const repeats = n / blockLen;
  const repeatMarker = repeats > 1 ? 1 : 0;
  return POLICY_OVERHEAD + blockLen + repeatMarker;
}

/** The honest, un-flattering comparison DESIGN.md §4 asks for: true only when the policy's real
 *  description length is strictly shorter than just redoing the raw steps one at a time. */
export function isRealCompression(steps: readonly PolicyStepLike[]): boolean {
  return descriptionLength(steps) < steps.length;
}

export interface PolicyCost {
  readonly rawCost: number;
  readonly compressedCost: number;
  readonly isRealCompression: boolean;
  readonly savedAttention: number;
}

/** `rawCost` = cost of manually redoing every recorded step (one Attention unit per step —
 *  `attention.mts`'s pool is the currency this is priced in). `compressedCost` = the real MDL
 *  description length. `savedAttention` can be negative — that IS the "bad compression" case
 *  surfacing as a real, signed number rather than being clamped to zero and hidden. */
export function policyCost(steps: readonly PolicyStepLike[]): PolicyCost {
  const rawCost = steps.length;
  const compressedCost = descriptionLength(steps);
  return {
    rawCost,
    compressedCost,
    isRealCompression: compressedCost < rawCost,
    savedAttention: rawCost - compressedCost,
  };
}
