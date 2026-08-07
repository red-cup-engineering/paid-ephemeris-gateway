/**
 * Locus-tree geometry.
 *
 * Girard's loci are addresses in a tree — finite paths of natural numbers from
 * the root, ordered by prefix (game-algebra `locus`).  A design is a charge
 * labelling over loci; its *support* is the loci it actually commits at.  The
 * support need not be prefix-closed, but a tree must be, so `locusTree` closes
 * the support under prefixes (every ancestor of a supported locus is a node).
 * The result is a genuine rooted tree: `depth` is the path length, `subtree`
 * collects the descendants under a node, and `siblings` are the co-children of
 * a parent.
 *
 * This realizes the locus side of the ludics correspondence: the dialogical
 * arena of a design is the prefix tree of its addresses.
 */
import {
  type Design,
  type Locus,
  locusDepth,
  locusKey,
  parent,
  prefixes,
  supportKeys,
  locusFromKey,
} from "../index.mjs";

export interface LocusTree {
  readonly kind: "game-geometry.locusTree";
  /** Every node of the tree (the prefix-closure of the design support), root first. */
  readonly nodes: readonly Locus[];
}

/** Depth of a locus — its path length from the root (root has depth 0). */
export const depth = (xi: Locus): number => locusDepth(xi);

const closeUnderPrefixes = (keys: readonly string[]): readonly Locus[] => {
  const present = new Set<string>([""]);
  for (const key of keys) {
    const xi = locusFromKey(key);
    for (let length = 0; length <= xi.address.length; length += 1) {
      present.add(xi.address.slice(0, length).join("."));
    }
  }
  return Object.freeze(
    [...present]
      .map((key) => locusFromKey(key))
      .sort((a, b) => a.address.length - b.address.length
        || (locusKey(a) < locusKey(b) ? -1 : locusKey(a) > locusKey(b) ? 1 : 0)),
  );
};

/**
 * The locus tree of a design: the prefix-closure of its support, as a rooted
 * tree whose nodes are loci.  Closing under prefixes guarantees a real tree
 * even when the support skips intermediate addresses.
 */
export function locusTree(design: Design): LocusTree {
  return Object.freeze({
    kind: "game-geometry.locusTree" as const,
    nodes: closeUnderPrefixes(supportKeys(design)),
  });
}

/** The locus tree of an arbitrary set of loci (prefix-closed). */
export function locusTreeFromLoci(loci: readonly Locus[]): LocusTree {
  return Object.freeze({
    kind: "game-geometry.locusTree" as const,
    nodes: closeUnderPrefixes(loci.map((xi) => locusKey(xi))),
  });
}

const contains = (tree: LocusTree, xi: Locus): boolean =>
  tree.nodes.some((node) => locusKey(node) === locusKey(xi));

/**
 * The subtree rooted at `node`: every tree node having `node` as a prefix
 * (including `node` itself).
 */
export function subtree(tree: LocusTree, node: Locus): readonly Locus[] {
  return Object.freeze(tree.nodes.filter((other) => prefixes(node, other)));
}

/**
 * The siblings of `node`: tree nodes sharing its parent but distinct from it.
 * The root has no siblings.
 */
export function siblings(tree: LocusTree, node: Locus): readonly Locus[] {
  const par = parent(node);
  if (par === null) return Object.freeze([]);
  const parentKey = locusKey(par);
  return Object.freeze(
    tree.nodes.filter((other) => {
      if (locusKey(other) === locusKey(node)) return false;
      const otherParent = parent(other);
      return otherParent !== null && locusKey(otherParent) === parentKey;
    }),
  );
}

/** The children of `node`: tree nodes whose parent is `node`. */
export function children(tree: LocusTree, node: Locus): readonly Locus[] {
  const nodeKey = locusKey(node);
  return Object.freeze(
    tree.nodes.filter((other) => {
      const par = parent(other);
      return par !== null && locusKey(par) === nodeKey;
    }),
  );
}

export function isLocusTree(value: unknown): value is LocusTree {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<LocusTree>;
  return candidate.kind === "game-geometry.locusTree"
    && Array.isArray(candidate.nodes)
    && contains(candidate as LocusTree, locusFromKey(""));
}
