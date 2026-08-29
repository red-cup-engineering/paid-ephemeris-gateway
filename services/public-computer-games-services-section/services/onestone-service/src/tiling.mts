/**
 * `tiling` — the tiling registry: the one place that knows there are three chapters.
 *
 * Every other module (engine, validate, levels, scene, client) talks only in terms of
 * `BoardGeometry` and never branches on `TilingKind` — that's the whole point of compiling
 * every tessellation down to one graph shape in `tiling-core`. This module is where the
 * branching is allowed to live exactly once: pick the right unit-scale polygon producer
 * (`tiling-square` / `tiling-hex` / `tiling-rhombille`) and hand its output to
 * `compileGeometry`. Also owns the per-tiling default board sizes levels build against, so
 * "how big is a hex board" has exactly one authoritative answer.
 */
import type { BoardGeometry, TilingKind } from './types.mts';
import { compileGeometry } from './tiling-core.mts';
import { cells as squareCells } from './tiling-square.mts';
import { cells as hexCells } from './tiling-hex.mts';
import { cells as rhombilleCells } from './tiling-rhombille.mts';

/** Compile a full `BoardGeometry` for `tiling` at `size`, colored for `paletteSize`. */
export function buildGeometry(tiling: TilingKind, size: number, paletteSize: number): BoardGeometry {
  const raw = (() => {
    switch (tiling) {
      case 'square':
        return squareCells(size);
      case 'hex':
        return hexCells(size);
      case 'rhombille':
        return rhombilleCells(size);
    }
  })();
  return compileGeometry(tiling, raw, paletteSize);
}

/**
 * The size parameter levels use per tiling when none is otherwise specified: square is a
 * side length (8x8, the Candy Crush veteran's board), hex/rhombille are the radius of the
 * hex patch each is built from (hex directly, rhombille as the dual's underlying patch).
 */
export function defaultSize(tiling: TilingKind): number {
  switch (tiling) {
    case 'square':
      return 8;
    case 'hex':
      return 4;
    case 'rhombille':
      return 3;
  }
}
