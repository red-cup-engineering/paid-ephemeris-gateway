


import type { Arc, FoldPath, FoldTower } from "./types.mjs";

export interface FoldResult {
  readonly paths: readonly FoldPath[];
  readonly tower: FoldTower;
}

/** Fold arcs to their transitive closure (head-of-head path composition).
 * Returns the derived multi-step paths and statistics about the fold tower. */
export function fold(arcs: readonly Arc[], opts?: { maxDepth?: number }): FoldResult {
  const maxDepth = opts?.maxDepth ?? 16;
  const sizes: number[] = [];

  
  const adj = new Map<string, Array<{ rel: string; dep: string }>>();
  for (const a of arcs) {
    const list = adj.get(a.head) ?? [];
    list.push({ rel: a.rel, dep: a.dependent });
    adj.set(a.head, list);
  }

  
  const pathKey = (h: string, p: readonly string[], d: string): string =>
    `${h}\x00${p.join(",")}\x00${d}`;
  const seen = new Set<string>();
  const paths: FoldPath[] = [];

  for (const a of arcs) {
    const k = pathKey(a.head, [a.rel], a.dependent);
    if (!seen.has(k)) {
      seen.add(k);
    }
  }

  let prev: FoldPath[] = [];
  let frontier: FoldPath[] = arcs.map((a) => ({ head: a.head, path: [a.rel], dependent: a.dependent }));

  let folds = 0;
  let fixedPoint = false;

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextFrontier: FoldPath[] = [];
    for (const fp of frontier) {
      const ext = adj.get(fp.dependent);
      if (!ext) continue;
      for (const { rel, dep } of ext) {
        const newPath = [...fp.path, rel];
        const k = pathKey(fp.head, newPath, dep);
        if (!seen.has(k)) {
          seen.add(k);
          const composed: FoldPath = { head: fp.head, path: newPath, dependent: dep };
          nextFrontier.push(composed);
          paths.push(composed);
        }
      }
    }
    sizes.push(paths.length);
    if (nextFrontier.length === 0) {
      fixedPoint = true;
      folds = depth + 1;
      break;
    }
    prev = frontier;
    frontier = nextFrontier;
    folds = depth + 1;
  }

  return {
    paths,
    tower: { folds, fixedPoint, sizes },
  };
}
