/**
 * `tiling-hex` — the chapter 2 board: a radius-`size` pointy-top hexagon of unit hexes.
 *
 * Chapter 2 keeps every verb from chapter 1 (swap, line-match, specials, blockers) and moves
 * them onto axial hex coordinates — the ladder's first step away from the square grid a
 * veteran already knows. Axial `(q, r)` with the third cube coordinate `s = -q - r` implicit;
 * the board is the hexagon of hexes `|q|, |r|, |q+r| <= size` (a "radius `size`" hex patch,
 * cell count `3*size*(size+1)+1`). Cells are pointy-top (a vertex points along +y/-y) so the
 * three natural rail families (q-, r-, s-constant lines) run at 0/60/120 degrees to each
 * other — `tiling-core`'s rail walker discovers all three from shared-edge adjacency alone,
 * this module only has to lay out correct unit-circumradius geometry.
 *
 * Centers come from the standard axial-to-pixel map for pointy-top hexes at circumradius 1
 * (redblobgames' convention): `x = sqrt(3)*(q + r/2)`, `y = 1.5*r`. +y grows downward, same
 * convention as `tiling-square`, so `compileGeometry`'s +y gravity alignment check works
 * unmodified across tilings.
 */
import type { RawCell } from './tiling-core.mts';

/** sqrt(3), the horizontal spacing constant for pointy-top axial-to-pixel conversion. */
const SQRT3 = Math.sqrt(3);

/**
 * The 6 unit-circumradius corner offsets of a pointy-top hex, in a fixed angular order
 * (starting at the top vertex, sweeping through increasing angle) so every emitted polygon
 * winds the same direction — `compileGeometry`'s edge-key adjacency only needs shared
 * endpoints, but a consistent winding keeps the client's SVG fill rule sane.
 */
function hexCorners(cx: number, cy: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((Math.PI / 180) * (60 * i - 90));
    out.push(cx + Math.cos(angle), cy + Math.sin(angle));
  }
  return out;
}

/**
 * Build the radius-`size` hexagon of unit-circumradius pointy-top hexes: every axial `(q, r)`
 * with `|q| <= size`, `|r| <= size`, `|q + r| <= size`. Emitted in row-major `(r, q)` order,
 * though as with the other producers `compileGeometry` never depends on array order.
 */
export function cells(size: number): RawCell[] {
  const out: RawCell[] = [];
  for (let r = -size; r <= size; r++) {
    const qMin = Math.max(-size, -r - size);
    const qMax = Math.min(size, -r + size);
    for (let q = qMin; q <= qMax; q++) {
      const cx = SQRT3 * (q + r / 2);
      const cy = 1.5 * r;
      out.push({
        poly: hexCorners(cx, cy),
        cx,
        cy,
        shade: 0,
      });
    }
  }
  return out;
}
