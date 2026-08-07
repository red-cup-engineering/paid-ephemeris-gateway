/**
 * Loci — the addresses of ludics.
 *
 * Girard 2001 builds ludics on three primitives: loci (addresses), designs
 * (dialogical objects located at loci), and interaction.  A locus is a finite
 * path from the root of the locus tree — a sequence of natural numbers naming
 * which child to descend into at each step.  The empty sequence is the root;
 * `child(xi, i)` is the $i$-th child of $\xi$; the prefix order is the tree
 * order.  Designs (next module) are valuations defined over loci.
 */
export interface Locus {
  readonly kind: "game.locus";
  readonly address: readonly number[];
}

export function locus(address: readonly number[] = []): Locus {
  return Object.freeze({ kind: "game.locus" as const, address: Object.freeze([...address]) });
}

export const root = (): Locus => locus([]);

export const child = (xi: Locus, i: number): Locus => locus([...xi.address, i]);

export const parent = (xi: Locus): Locus | null =>
  xi.address.length === 0 ? null : locus(xi.address.slice(0, -1));

export const locusKey = (xi: Locus): string => xi.address.join(".");

export const sameLocus = (left: Locus, right: Locus): boolean => locusKey(left) === locusKey(right);

export const locusDepth = (xi: Locus): number => xi.address.length;

/** Prefix order $\xi \sqsubseteq \zeta$ — $\xi$ is an ancestor of (or equal to) $\zeta$. */
export function prefixes(xi: Locus, zeta: Locus): boolean {
  if (xi.address.length > zeta.address.length) return false;
  return xi.address.every((n, i) => zeta.address[i] === n);
}

export function locusFromKey(key: string): Locus {
  if (key === "") return root();
  return locus(key.split(".").map((part) => Number.parseInt(part, 10)));
}

export function isLocus(value: unknown): value is Locus {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Locus>;
  return candidate.kind === "game.locus"
    && Array.isArray(candidate.address)
    && candidate.address.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0);
}
