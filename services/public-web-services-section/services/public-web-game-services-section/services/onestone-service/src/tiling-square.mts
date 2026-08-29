/**
 * `tiling-square` — the chapter 1 board: a plain size×size grid of unit squares.
 *
 * This is the tessellation a Candy Crush veteran already knows, and deliberately the
 * simplest possible producer for `tiling-core`'s `compileGeometry`: every cell is a unit
 * square, axis-aligned, laid out in row-major order with +y pointing DOWN the board (row 0
 * is the top row) so `compileGeometry`'s +y gravity convention falls straight down through
 * columns exactly the way a Candy-Crush-shaped grid expects. `compileGeometry` derives all
 * adjacency, fall pointers, and rails purely from these polygons' shared edges — this module
 * only has to emit correct unit-scale geometry, nothing tiling-specific about rules.
 */
import type { RawCell } from './tiling-core.mts';

/**
 * Build a `size` x `size` grid of unit squares. Cell `(row, col)` occupies the unit square
 * with its top-left corner at `(col, row)`; emitted in row-major order (row 0 first, top to
 * bottom) though `compileGeometry` never depends on array order — only shared edges matter.
 */
export function cells(size: number): RawCell[] {
  const out: RawCell[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const x0 = col;
      const y0 = row;
      const x1 = col + 1;
      const y1 = row + 1;
      out.push({
        poly: [x0, y0, x1, y0, x1, y1, x0, y1],
        cx: col + 0.5,
        cy: row + 0.5,
        shade: 0,
      });
    }
  }
  return out;
}
