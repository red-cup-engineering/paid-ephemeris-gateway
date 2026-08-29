/**
 * `engine` — the pure match/cascade heart of onestone, tiling-agnostic by construction.
 *
 * Everything downstream of `tiling.mts` is a `BoardGeometry`: cells, shared-edge adjacency,
 * a baked `fallTo` gravity field, and precomputed straight-line `rails`. This module never
 * asks "which tessellation am I on" — every rule here (matching, minting, blasting, falling,
 * refilling) is phrased purely in terms of that graph, which is the whole point of the
 * ladder: hex and rhombille (and Cairo/Penrose/hat/Wang down the roadmap) cost a cell
 * generator in `tiling-*.mts`, never a rewrite here.
 *
 * The math is load-bearing, not flavor (see DESIGN.md) — with three corners where the
 * citation is more evocative than literal, called out honestly rather than left to overclaim:
 *  - `spawnBoard`/refill reject any color that would complete an immediate 3+ run/blob
 *    against already-placed neighbors, so no tile is ever born pre-matched. That is NOT a
 *    proper coloring of the adjacency graph in the graph-homomorphism sense (a proper coloring
 *    forbids ANY two adjacent same-colored cells; this algorithm allows adjacent same-colored
 *    pairs freely — it only forbids runs/blobs of 3+, which is also why the board stays
 *    swappable-into-a-match at all). `chi(K4)=4` and the 5-color headroom are real, useful
 *    facts about the palette size; "graph homomorphism into K_palette" is not an accurate
 *    description of what `wouldCreateMatch` actually enforces. A board that still has zero
 *    legal moves after a fair fill is re-derived from a salted seed rather than special-cased
 *    — the spawn is either a legal fill with a move available, or it doesn't ship.
 *  - The settle loop's termination condition is operator idempotence, not a depth cap: each
 *    step re-scans the WHOLE board for matches, and cascades end because there is nothing left
 *    to clear, never because we stopped looking. But "Knaster-Tarski least fixed point" is the
 *    wrong citation for *why* that termination is guaranteed — Knaster-Tarski needs a monotone
 *    operator climbing a fixed lattice, and `refill` injects brand-new RNG-drawn tiles every
 *    round, so there is no such lattice. The actual reason the happy path terminates is purely
 *    graph-theoretic: `tiling-core.mts`'s `fallTo` requires strictly-greater-y alignment
 *    (`FALL_ALIGNMENT_MIN`), so the fall graph is acyclic and every tile can fall only a
 *    bounded number of times. That acyclic-fall argument is also why the exhaustive fallback
 *    above matters: a refill that ever planted an unchecked pre-made match would be exactly
 *    the kind of "new match from an unvetted placement" event the acyclic-fall bound doesn't
 *    cover, so keeping refill's rejection sampling airtight is what keeps this termination
 *    argument honest in practice, not an appeal to Knaster-Tarski.
 *  - `chaosSix` (six specials concurrently alive -> guaranteed score-burst) is a tuned design
 *    constant motivated by Ramsey's R(3,3) <= 6, not a computation of it: the code counts
 *    concurrently-live specials against a threshold of 6, and never constructs the
 *    compatible/incompatible edge-2-coloring of those six specials that R(3,3) is actually a
 *    theorem about. Any other constant could sit at this threshold with identical code-level
 *    correctness — "6" is a deliberate, Ramsey-inspired choice of a mechanic's tuning number,
 *    not a mechanical derivation from the theorem.
 *
 * Every exported function is pure: inputs are never mutated, and every return is built from
 * fresh arrays/objects. That purity is a security property too (per DESIGN.md's determinism
 * doctrine) — the server can always recompute "the" outcome of a move from a seed and replay
 * it, so a tampering client gains nothing by resending inputs out of order.
 *
 * A few contract corners are genuinely underdetermined by DESIGN.md (the exact interaction of
 * blockers with blasts, ring's target once it has decayed from "match" into "sitting special
 * tile" with no metadata slot in `Tile` to remember its original interior cell, and which
 * special+special pairs beyond the four named ones compound). Each such spot is called out
 * in a comment at the point of decision, with the interpretation chosen and why.
 */
import type {
  BlockerPlacement,
  BoardGeometry,
  BoardState,
  BoosterKind,
  CascadeStep,
  Cell,
  CellId,
  ColorId,
  MatchGroup,
  Move,
  SettleResult,
  SpecialKind,
  Tile,
} from './types.mts';
import { makeRng } from './seed.mts';

// ---------------------------------------------------------------------------------------------
// small tile/board utilities
// ---------------------------------------------------------------------------------------------

function plainTile(color: ColorId): Tile {
  return { color, special: 'none', moss: false, frost: false, cage: false, geode: 0 };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** frost/cage/geode all block a swap outright; only color/special-free tiles may move. */
function swappable(tile: Tile): boolean {
  return !tile.frost && !tile.cage && tile.geode === 0;
}

/** cage (locked) and geode (no tile at all) are invisible to match-finding until broken. */
function matchSkip(tile: Tile): boolean {
  return tile.cage || tile.geode > 0;
}

function swapTiles(tiles: readonly Tile[], a: CellId, b: CellId): Tile[] {
  const next = tiles.slice();
  const ta = next[a];
  const tb = next[b];
  if (ta === undefined || tb === undefined) return next;
  next[a] = tb;
  next[b] = ta;
  return next;
}

function countSpecials(tiles: readonly Tile[]): number {
  let n = 0;
  for (const t of tiles) if (t.special !== 'none') n++;
  return n;
}

// ---------------------------------------------------------------------------------------------
// spawnBoard — proper-coloring fill, rejection-sampled against already-placed neighbors
// ---------------------------------------------------------------------------------------------

/**
 * Walk every cell exactly once, ordered by tracing `fallTo` down from each spawn mouth. This
 * is the order the proper-coloring fill uses: by the time a cell is colored, everything that
 * could have fallen into it (or sits beside an earlier mouth's column) that the walk has
 * already reached is already placed, so the neighbor-rejection check below has real
 * information for the common case. It is not a full topological sort of the adjacency graph
 * (rows/rings can interleave cells from different mouths in either relative order) — that is
 * fine, because the check only ever consults neighbors *already colored at the time*, exactly
 * like any other rejection-sampled proper coloring.
 */
function fallOrder(geom: BoardGeometry): CellId[] {
  const order: CellId[] = [];
  const visited = new Set<CellId>();
  const mouths = geom.cells.filter((c) => c.fallFrom === null).map((c) => c.id);
  for (const mouth of mouths) {
    let cur: CellId | null = mouth;
    while (cur !== null && !visited.has(cur)) {
      visited.add(cur);
      order.push(cur);
      const here: Cell | undefined = geom.cells[cur];
      cur = here ? here.fallTo : null;
    }
  }
  // Defensive: a cell unreachable from any mouth (malformed geometry) still gets colored.
  for (const cell of geom.cells) if (!visited.has(cell.id)) order.push(cell.id);
  return order;
}

/**
 * Would placing `color` at `cellId` complete an immediate 3+ match, counting only cells
 * `colorAt` currently reports a color for (undefined = not-yet-placed during spawn/refill, or
 * cage/geode which never participate in matching)? Checks both rail runs through the cell and
 * blob connectivity — the same two shapes `findMatches` recognizes post-hoc.
 */
function wouldCreateMatch(
  geom: BoardGeometry,
  colorAt: (id: CellId) => ColorId | undefined,
  cellId: CellId,
  color: ColorId,
): boolean {
  for (const railIdx of geom.railsAt[cellId] ?? []) {
    const rail = geom.rails[railIdx];
    if (!rail) continue;
    const idx = rail.cells.indexOf(cellId);
    if (idx < 0) continue;
    let run = 1;
    for (let i = idx - 1; i >= 0; i--) {
      const c = rail.cells[i];
      if (c === undefined || colorAt(c) !== color) break;
      run++;
    }
    for (let i = idx + 1; i < rail.cells.length; i++) {
      const c = rail.cells[i];
      if (c === undefined || colorAt(c) !== color) break;
      run++;
    }
    if (run >= 3) return true;
  }

  const visited = new Set<CellId>([cellId]);
  const stack: CellId[] = [cellId];
  let count = 1;
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === undefined) break;
    const cell = geom.cells[cur];
    if (!cell) continue;
    for (const nb of cell.neighbors) {
      if (visited.has(nb)) continue;
      if (colorAt(nb) === color) {
        visited.add(nb);
        count++;
        stack.push(nb);
      }
    }
  }
  return count >= 3;
}

/** One rejection-sampled draw: try colors from a deterministic per-draw stream until one
 * doesn't complete an immediate match. The random attempts are a fast path, not the actual
 * safety guarantee — if every random attempt happens to land on an unsafe color (a real,
 * non-astronomical outcome at a hex cell's up to 6 already-placed neighbors, empirically
 * ~0.1% per draw at v1's 5-color palette), this falls through to an EXHAUSTIVE deterministic
 * scan of every color 0..paletteSize-1 before ever returning an unchecked color. Only if that
 * exhaustive scan also finds no safe color (meaning every single palette color is already
 * forbidden by placed neighbors — a config the "never a tile born pre-matched" invariant
 * cannot be honored for at all, since there is provably no valid choice) does this return an
 * unchecked color, and it does so deterministically from the seeded stream rather than
 * silently degrading unpredictably. */
function drawColor(
  geom: BoardGeometry,
  colorAt: (id: CellId) => ColorId | undefined,
  cellId: CellId,
  seed: string,
  drawIndex: number,
): ColorId {
  const paletteSize = Math.max(1, geom.paletteSize);
  const attempts = paletteSize * 6;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const rng = makeRng(`${seed}#draw${drawIndex}#${attempt}`);
    const color = rng.int(0, paletteSize - 1);
    if (!wouldCreateMatch(geom, colorAt, cellId, color)) return color;
  }
  // Exhaustive fallback: the random draws above are a sampling shortcut, not the guarantee.
  // Deterministically check every remaining color before conceding none are safe.
  for (let color = 0; color < paletteSize; color++) {
    if (!wouldCreateMatch(geom, colorAt, cellId, color)) return color;
  }
  return makeRng(`${seed}#draw${drawIndex}#fallback`).int(0, paletteSize - 1);
}

function fillOnce(geom: BoardGeometry, seed: string): Tile[] {
  const order = fallOrder(geom);
  const colors = new Array<ColorId | undefined>(geom.cells.length).fill(undefined);
  const colorAt = (id: CellId): ColorId | undefined => colors[id];
  let drawIndex = 0;
  for (const cellId of order) {
    colors[cellId] = drawColor(geom, colorAt, cellId, seed, drawIndex);
    drawIndex++;
  }
  return colors.map((c) => plainTile(c ?? 0));
}

/**
 * Spawn a fresh board: a proper-coloring fill (no tile born already matched), re-derived from
 * a salted seed (`seed#1`, `seed#2`, ...) until the result also has at least one legal move —
 * a board that's merely match-free but dead-locked is not a legal spawn either.
 */
export function spawnBoard(geom: BoardGeometry, seed: string): BoardState {
  for (let attempt = 0; ; attempt++) {
    const salted = attempt === 0 ? seed : `${seed}#${attempt}`;
    const tiles = fillOnce(geom, salted);
    const state: BoardState = { tiles, seed, draws: 0 };
    if (legalMoves(geom, state).length > 0) return state;
  }
}

/** Overlay blocker placements onto a spawned board. Colors are untouched — only the
 * orthogonal moss/frost/cage/geode flags change. */
export function applyBlockers(state: BoardState, blockers: readonly BlockerPlacement[]): BoardState {
  const tiles = state.tiles.map((t) => ({ ...t }));
  for (const b of blockers) {
    const tile = tiles[b.cell];
    if (!tile) continue;
    if (b.kind === 'moss') tile.moss = true;
    else if (b.kind === 'frost') tile.frost = true;
    else if (b.kind === 'cage') tile.cage = true;
    else if (b.kind === 'geode') tile.geode = clamp(Math.trunc(b.hp ?? 3), 1, 3);
  }
  return { tiles, seed: state.seed, draws: state.draws };
}

// ---------------------------------------------------------------------------------------------
// findMatches
// ---------------------------------------------------------------------------------------------

/** The member cell with the most in-group neighbors (ties broken by lowest id) — doubles as
 * both the nova "junction" test subject and the generic rail/blob "center" used for origin. */
function centerOf(geom: BoardGeometry, cells: readonly CellId[]): CellId {
  const set = new Set(cells);
  let best = cells[0] ?? 0;
  let bestCount = -1;
  for (const c of cells) {
    const cell = geom.cells[c];
    const count = cell ? cell.neighbors.filter((n) => set.has(n)).length : 0;
    if (count > bestCount || (count === bestCount && c < best)) {
      best = c;
      bestCount = count;
    }
  }
  return best;
}

function findJunction(geom: BoardGeometry, cells: readonly CellId[]): CellId | undefined {
  const set = new Set(cells);
  let best: CellId | undefined;
  let bestCount = 2;
  for (const c of cells) {
    const cell = geom.cells[c];
    if (!cell) continue;
    const count = cell.neighbors.filter((n) => set.has(n)).length;
    if (count > bestCount || (count === bestCount && (best === undefined || c < best))) {
      best = c;
      bestCount = count;
    }
  }
  return best;
}

/** Bounded interior test: does some cell NOT in the group have every one of ITS neighbors
 * inside the group? That is exactly "the group closes a cycle around it" — geometrically
 * reachable on hex/rhombille (a cell can have all its neighbors be one connected run/blob)
 * and unreachable on square (a cell's 4 orthogonal neighbors are mutually non-adjacent, so no
 * single connected match group can contain all of them without also containing the center). */
function closesRing(geom: BoardGeometry, groupCells: readonly CellId[]): boolean {
  const set = new Set(groupCells);
  const candidates = new Set<CellId>();
  for (const c of groupCells) {
    const cell = geom.cells[c];
    if (!cell) continue;
    for (const n of cell.neighbors) if (!set.has(n)) candidates.add(n);
  }
  for (const cand of candidates) {
    const cell = geom.cells[cand];
    if (!cell || cell.neighbors.length === 0) continue;
    if (cell.neighbors.every((n) => set.has(n))) return true;
  }
  return false;
}

/**
 * Find every match on the board: rail runs of 3+ (scanned per rail, cage/geode cells break a
 * run without extending it) plus same-color blob components of 3+ found among the cells no
 * rail run already claimed. A cell claimed by a rail run is removed from blob search entirely
 * — this is the reading of "not already covered by a single rail run" that keeps clearing
 * cell-disjoint and deterministic: a branch hanging off a straight run of exactly 3 cells
 * doesn't get double-counted, but also doesn't extend that run into a mint it didn't earn.
 */
export function findMatches(geom: BoardGeometry, state: BoardState): MatchGroup[] {
  const tiles = state.tiles;
  const groups: MatchGroup[] = [];
  const claimed = new Set<CellId>();

  for (const rail of geom.rails) {
    let i = 0;
    while (i < rail.cells.length) {
      const startCell = rail.cells[i];
      if (startCell === undefined) {
        i++;
        continue;
      }
      const startTile = tiles[startCell];
      if (!startTile || matchSkip(startTile)) {
        i++;
        continue;
      }
      const color = startTile.color;
      let j = i + 1;
      while (j < rail.cells.length) {
        const c = rail.cells[j];
        if (c === undefined) break;
        const t = tiles[c];
        if (!t || matchSkip(t) || t.color !== color) break;
        j++;
      }
      const runLen = j - i;
      if (runLen >= 3) {
        const cells = rail.cells.slice(i, j);
        for (const c of cells) claimed.add(c);
        const base: SpecialKind = runLen >= 5 ? 'prism' : runLen === 4 ? 'striped' : 'none';
        groups.push({
          cells,
          color,
          shape: 'rail',
          mints: closesRing(geom, cells) ? 'ring' : base,
          origin: centerOf(geom, cells),
        });
      }
      i = j;
    }
  }

  const visited = new Set<CellId>(claimed);
  for (const cell of geom.cells) {
    if (visited.has(cell.id)) continue;
    const tile = tiles[cell.id];
    if (!tile || matchSkip(tile)) {
      visited.add(cell.id);
      continue;
    }
    const color = tile.color;
    const component: CellId[] = [];
    const stack = [cell.id];
    visited.add(cell.id);
    while (stack.length > 0) {
      const cur = stack.pop();
      if (cur === undefined) continue;
      component.push(cur);
      const curCell = geom.cells[cur];
      if (!curCell) continue;
      for (const nb of curCell.neighbors) {
        if (visited.has(nb)) continue;
        const nbTile = tiles[nb];
        if (!nbTile || matchSkip(nbTile) || nbTile.color !== color) continue;
        visited.add(nb);
        stack.push(nb);
      }
    }
    if (component.length >= 3) {
      const junction = findJunction(geom, component);
      const base: SpecialKind = component.length >= 5 && junction !== undefined ? 'nova' : 'none';
      groups.push({
        cells: component,
        color,
        shape: 'blob',
        mints: closesRing(geom, component) ? 'ring' : base,
        origin: junction ?? centerOf(geom, component),
      });
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------------------------
// legalMoves
// ---------------------------------------------------------------------------------------------

function canSwap(geom: BoardGeometry, state: BoardState, a: CellId, b: CellId): boolean {
  const ta = state.tiles[a];
  const tb = state.tiles[b];
  if (!ta || !tb) return false;
  if (!swappable(ta) || !swappable(tb)) return false;
  if (ta.special === 'prism' || tb.special === 'prism') return true;
  const swapped: BoardState = { tiles: swapTiles(state.tiles, a, b), seed: state.seed, draws: state.draws };
  return findMatches(geom, swapped).length > 0;
}

/** Every adjacent pair whose swap is playable: either it yields a match, or one side is a
 * prism (a prism swap always fires, match or not). Frost/cage/geode tiles can't be swapped at
 * all, on either side. */
export function legalMoves(geom: BoardGeometry, state: BoardState): Move[] {
  const moves: Move[] = [];
  const seen = new Set<string>();
  for (const cell of geom.cells) {
    for (const nb of cell.neighbors) {
      const a = Math.min(cell.id, nb);
      const b = Math.max(cell.id, nb);
      const key = `${a}:${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (canSwap(geom, state, a, b)) moves.push({ a, b });
    }
  }
  return moves;
}

// ---------------------------------------------------------------------------------------------
// special blasts
// ---------------------------------------------------------------------------------------------

function railBlast(geom: BoardGeometry, cell: CellId): CellId[] {
  const railIdxs = geom.railsAt[cell] ?? [];
  let longest: readonly CellId[] | undefined;
  for (const idx of railIdxs) {
    const rail = geom.rails[idx];
    if (!rail) continue;
    if (!longest || rail.cells.length > longest.length) longest = rail.cells;
  }
  return longest ? longest.slice() : [cell];
}

/** Every rail through the cell, unioned — the striped+striped compound blast. A strict
 * superset of railBlast(cell) whenever the cell lies on more than one rail, which is what
 * makes the compound strictly better than either solo regardless of which rail the solo
 * tie-break would have picked (two same-rail striped specials previously combined to a
 * no-op improvement). */
function allRailsBlast(geom: BoardGeometry, cell: CellId): CellId[] {
  const railIdxs = geom.railsAt[cell] ?? [];
  const out = new Set<CellId>([cell]);
  for (const idx of railIdxs) {
    const rail = geom.rails[idx];
    if (!rail) continue;
    for (const c of rail.cells) out.add(c);
  }
  return [...out];
}

function novaBlast(geom: BoardGeometry, cell: CellId): CellId[] {
  const c = geom.cells[cell];
  return c ? [cell, ...c.neighbors] : [cell];
}

function mostCommonColor(tiles: readonly Tile[]): ColorId {
  const counts = new Map<ColorId, number>();
  for (const t of tiles) {
    if (t.cage || t.geode > 0) continue;
    counts.set(t.color, (counts.get(t.color) ?? 0) + 1);
  }
  let best: ColorId = 0;
  let bestCount = -1;
  for (const [color, count] of counts) {
    if (count > bestCount || (count === bestCount && color < best)) {
      best = color;
      bestCount = count;
    }
  }
  return best;
}

function prismBlast(tiles: readonly Tile[], color: ColorId): CellId[] {
  const out: CellId[] = [];
  tiles.forEach((t, id) => {
    if (!t.cage && t.geode === 0 && t.color === color) out.push(id);
  });
  return out;
}

/**
 * A ring tile persists on the board as a normal special (per `SpecialKind`'s doc, it renders
 * with its own glyph) — but `Tile` has no field to remember which cell was "the interior" at
 * mint time. So a ring re-derives its target purely from present geometry when it fires: the
 * neighbor cell whose OWN neighbors are all the ring's color is "the" enclosed cell. This is
 * exactly the `closesRing` bounded-interior test, just anchored on one surviving cell instead
 * of the original whole match group — a necessary reinterpretation given the fixed `Tile`
 * shape, not a contract deviation in the color-safety sense.
 */
function ringInterior(geom: BoardGeometry, tiles: readonly Tile[], ringCell: CellId): CellId | undefined {
  const ringTile = tiles[ringCell];
  if (!ringTile) return undefined;
  const cell = geom.cells[ringCell];
  if (!cell) return undefined;
  for (const n of cell.neighbors) {
    const nCell = geom.cells[n];
    if (!nCell || nCell.neighbors.length === 0) continue;
    const enclosed = nCell.neighbors.every((nn) => {
      const t = tiles[nn];
      return t !== undefined && !t.cage && t.geode === 0 && t.color === ringTile.color;
    });
    if (enclosed) return n;
  }
  return undefined;
}

/** Fire one special that is NOT part of a direct player swap (caught in a match, or chained
 * from another blast): prism uses the board's most common color, per contract ("...or the
 * most common color when fired by blast"). */
function fireSolo(geom: BoardGeometry, tiles: readonly Tile[], cell: CellId, kind: SpecialKind): CellId[] {
  switch (kind) {
    case 'striped':
      return railBlast(geom, cell);
    case 'nova':
      return novaBlast(geom, cell);
    case 'prism':
      return prismBlast(tiles, mostCommonColor(tiles));
    case 'ring': {
      const interior = ringInterior(geom, tiles, cell);
      if (interior === undefined) return [cell];
      return [cell, interior, ...prismBlast(tiles, mostCommonColor(tiles))];
    }
    case 'none':
      return [cell];
  }
}

/** aCell/bCell are POST-swap positions: aCell is wherever the tile that carried `aKind`/
 * `aColor` ended up after the swap (so blasts fire from where the special actually sits). */
interface SwapFireInfo {
  aCell: CellId;
  bCell: CellId;
  aKind: SpecialKind;
  bKind: SpecialKind;
  aColor: ColorId;
  bColor: ColorId;
}

/**
 * The player just swapped `aCell`/`bCell` and at least one side is a special. Handles the four
 * named compound pairs explicitly; any other special+special combination (nova+nova,
 * prism+nova, ring+anything, ...) is not in DESIGN.md's compound table, so each side just
 * fires its own solo blast independently — total, sane, and never silently drops a special the
 * player swapped.
 */
function fireSwapSpecials(
  geom: BoardGeometry,
  tiles: readonly Tile[],
  info: SwapFireInfo,
  seed: string,
  drawIndex: { n: number },
): CellId[] {
  const { aCell, bCell, aKind, bKind, aColor, bColor } = info;
  const out = new Set<CellId>();
  const bothSpecial = aKind !== 'none' && bKind !== 'none';

  if (!bothSpecial) {
    const sCell = aKind !== 'none' ? aCell : bCell;
    const sKind = aKind !== 'none' ? aKind : bKind;
    const otherColor = aKind !== 'none' ? bColor : aColor;
    if (sKind === 'none') return [];
    if (sKind === 'prism') {
      prismBlast(tiles, otherColor).forEach((c) => out.add(c));
      out.add(sCell);
      return [...out];
    }
    fireSolo(geom, tiles, sCell, sKind).forEach((c) => out.add(c));
    return [...out];
  }

  if (aKind === 'striped' && bKind === 'striped') {
    allRailsBlast(geom, aCell).forEach((c) => out.add(c));
    allRailsBlast(geom, bCell).forEach((c) => out.add(c));
  } else if ((aKind === 'striped' && bKind === 'nova') || (aKind === 'nova' && bKind === 'striped')) {
    const novaCell = aKind === 'nova' ? aCell : bCell;
    for (const c of novaBlast(geom, novaCell)) railBlast(geom, c).forEach((x) => out.add(x));
  } else if (aKind === 'prism' && bKind === 'prism') {
    tiles.forEach((_, id) => out.add(id));
  } else if ((aKind === 'prism' && bKind === 'striped') || (aKind === 'striped' && bKind === 'prism')) {
    // "all tiles of a random color become striped and fire" — draw the color deterministically
    // from the same seeded stream refills use, then fire a striped blast from every cell of it.
    const rng = makeRng(`${seed}#draw${drawIndex.n}`);
    drawIndex.n++;
    const color = rng.int(0, Math.max(0, geom.paletteSize - 1));
    tiles.forEach((t, id) => {
      if (!t.cage && t.geode === 0 && t.color === color) {
        out.add(id);
        railBlast(geom, id).forEach((x) => out.add(x));
      }
    });
  } else {
    fireSolo(geom, tiles, aCell, aKind).forEach((c) => out.add(c));
    fireSolo(geom, tiles, bCell, bKind).forEach((c) => out.add(c));
  }
  return [...out];
}

// ---------------------------------------------------------------------------------------------
// blocker hit resolution
// ---------------------------------------------------------------------------------------------

interface HitResult {
  /** Post-hit tiles; cleared cells are `null` (still to be filled by fall/refill). */
  mutated: (Tile | null)[];
  clearedSet: Set<CellId>;
  mossCleared: CellId[];
  frostBroken: CellId[];
  cageBroken: CellId[];
  geodeHit: CellId[];
}

/**
 * Turn a raw set of match/blast target cells into actual clears plus blocker state changes.
 * Direct hits: geode absorbs one hit (clears only at 0 hp, never has a color to begin with);
 * cage absorbs one hit and unlocks (its tile survives — cage blocks matching entirely, so a
 * cage cell is never itself a rail/blob match member, only ever a direct blast target); moss
 * and frost tiles clear like normal tiles (frost only ever blocked SWAPPING, never matching).
 * Adjacency effects: every neighbor of a raw target also gets its frost/cage broken or its
 * geode hit once, even when that neighbor was never itself targeted — this is the "match/blast
 * ADJACENT breaks the blocker" rule DESIGN.md calls out separately from direct hits.
 */
function resolveHits(geom: BoardGeometry, tiles: readonly Tile[], rawTargets: ReadonlySet<CellId>): HitResult {
  const mutated: (Tile | null)[] = tiles.map((t) => ({ ...t }));
  const clearedSet = new Set<CellId>();
  const mossCleared: CellId[] = [];
  const frostBroken: CellId[] = [];
  const cageBroken: CellId[] = [];
  const geodeHit: CellId[] = [];

  for (const id of rawTargets) {
    const tile = mutated[id];
    if (!tile) continue;
    if (tile.geode > 0) {
      tile.geode -= 1;
      geodeHit.push(id);
      if (tile.geode === 0) clearedSet.add(id);
      continue;
    }
    if (tile.cage) {
      tile.cage = false;
      cageBroken.push(id);
      continue;
    }
    if (tile.moss) mossCleared.push(id);
    if (tile.frost) {
      tile.frost = false;
      frostBroken.push(id);
    }
    clearedSet.add(id);
  }

  const frostSeen = new Set<CellId>(frostBroken);
  const cageSeen = new Set<CellId>(cageBroken);
  const geodeSeen = new Set<CellId>(geodeHit);
  for (const id of rawTargets) {
    const cell = geom.cells[id];
    if (!cell) continue;
    for (const nb of cell.neighbors) {
      if (rawTargets.has(nb)) continue; // already handled as a direct hit above
      const tile = mutated[nb];
      if (!tile) continue;
      if (tile.frost && !frostSeen.has(nb)) {
        tile.frost = false;
        frostBroken.push(nb);
        frostSeen.add(nb);
      }
      if (tile.cage && !cageSeen.has(nb)) {
        tile.cage = false;
        cageBroken.push(nb);
        cageSeen.add(nb);
      }
      if (tile.geode > 0 && !geodeSeen.has(nb)) {
        tile.geode -= 1;
        geodeHit.push(nb);
        geodeSeen.add(nb);
        if (tile.geode === 0) clearedSet.add(nb);
      }
    }
  }

  for (const id of clearedSet) mutated[id] = null;
  return { mutated, clearedSet, mossCleared, frostBroken, cageBroken, geodeHit };
}

// ---------------------------------------------------------------------------------------------
// fall + refill
// ---------------------------------------------------------------------------------------------

/** Iterate "pull a tile down into every empty cell whose fallFrom neighbor is full" to its
 * fixed point. Correct regardless of scan order because it only stops when nothing changed;
 * every empty cell that survives is therefore transitively rooted at a spawn mouth. */
function settleFall(geom: BoardGeometry, working: (Tile | null)[]): Array<{ from: CellId; to: CellId }> {
  const falls: Array<{ from: CellId; to: CellId }> = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const cell of geom.cells) {
      if (working[cell.id] !== null) continue;
      const from = cell.fallFrom;
      if (from === null) continue;
      const src = working[from];
      if (src === null || src === undefined) continue;
      working[cell.id] = src;
      working[from] = null;
      falls.push({ from, to: cell.id });
      changed = true;
    }
  }
  return falls;
}

function refill(
  geom: BoardGeometry,
  working: (Tile | null)[],
  seed: string,
  drawIndex: { n: number },
): Array<{ cell: CellId; tile: Tile }> {
  const spawned: Array<{ cell: CellId; tile: Tile }> = [];
  const colorAt = (id: CellId): ColorId | undefined => {
    const t = working[id];
    if (!t || t.cage || t.geode > 0) return undefined;
    return t.color;
  };
  for (const cell of geom.cells) {
    if (working[cell.id] !== null) continue;
    const color = drawColor(geom, colorAt, cell.id, seed, drawIndex.n);
    drawIndex.n++;
    const tile = plainTile(color);
    working[cell.id] = tile;
    spawned.push({ cell: cell.id, tile });
  }
  return spawned;
}

// ---------------------------------------------------------------------------------------------
// one settle step
// ---------------------------------------------------------------------------------------------

function runStep(
  geom: BoardGeometry,
  working: readonly Tile[],
  matches: readonly MatchGroup[],
  swapFire: SwapFireInfo | undefined,
  extraTargets: ReadonlySet<CellId> | undefined,
  stepIndex: number,
  seed: string,
  drawIndex: { n: number },
): { step: CascadeStep; tiles: Tile[] } | null {
  const snapshot = working.map((t) => ({ ...t }));
  const fired: Array<{ cell: CellId; kind: SpecialKind }> = [];
  const mintPlacements = new Map<CellId, Tile>();
  const matchCells = new Set<CellId>();

  for (const group of matches) {
    for (const c of group.cells) matchCells.add(c);
    if (group.mints !== 'none') {
      mintPlacements.set(group.origin, {
        color: group.color,
        special: group.mints,
        moss: false,
        frost: false,
        cage: false,
        geode: 0,
      });
    }
  }

  const rawTargets = new Set<CellId>();
  for (const c of matchCells) if (!mintPlacements.has(c)) rawTargets.add(c);
  if (extraTargets) for (const c of extraTargets) if (!mintPlacements.has(c)) rawTargets.add(c);

  const alreadyFired = new Set<CellId>();
  const drainSpecials = (seedCells: Iterable<CellId>): void => {
    const queue = [...seedCells];
    while (queue.length > 0) {
      const c = queue.shift();
      if (c === undefined) break;
      if (alreadyFired.has(c) || mintPlacements.has(c)) continue;
      const tile = snapshot[c];
      if (!tile || tile.special === 'none') continue;
      alreadyFired.add(c);
      fired.push({ cell: c, kind: tile.special });
      for (const hit of fireSolo(geom, snapshot, c, tile.special)) {
        if (mintPlacements.has(hit)) continue;
        if (!rawTargets.has(hit)) queue.push(hit);
        rawTargets.add(hit);
      }
    }
  };
  drainSpecials(rawTargets);

  if (swapFire) {
    const { aCell, bCell, aKind, bKind } = swapFire;
    if (aKind !== 'none' && !alreadyFired.has(aCell)) {
      fired.push({ cell: aCell, kind: aKind });
      alreadyFired.add(aCell);
    }
    if (bKind !== 'none' && !alreadyFired.has(bCell)) {
      fired.push({ cell: bCell, kind: bKind });
      alreadyFired.add(bCell);
    }
    rawTargets.add(aCell);
    rawTargets.add(bCell);
    const swapHits = fireSwapSpecials(geom, snapshot, swapFire, seed, drawIndex);
    const fresh: CellId[] = [];
    for (const hit of swapHits) {
      if (mintPlacements.has(hit)) continue;
      if (!rawTargets.has(hit)) fresh.push(hit);
      rawTargets.add(hit);
    }
    drainSpecials(fresh);
  }

  if (rawTargets.size === 0 && mintPlacements.size === 0) return null;

  const hits = resolveHits(geom, snapshot, rawTargets);
  const work: (Tile | null)[] = hits.mutated;
  const clearedList = new Set<CellId>(hits.clearedSet);
  for (const [origin, tile] of mintPlacements) {
    clearedList.add(origin);
    work[origin] = tile;
  }

  const falls = settleFall(geom, work);
  const spawned = refill(geom, work, seed, drawIndex);
  const finalTiles = work.map((t) => t ?? plainTile(0));

  const clearedFinal = [...clearedList];
  const step: CascadeStep = {
    matches,
    cleared: clearedFinal,
    fired,
    mossCleared: hits.mossCleared,
    frostBroken: hits.frostBroken,
    cageBroken: hits.cageBroken,
    geodeHit: hits.geodeHit,
    falls,
    spawned,
    score: 10 * clearedFinal.length * stepIndex,
  };
  return { step, tiles: finalTiles };
}

// ---------------------------------------------------------------------------------------------
// reshuffle
// ---------------------------------------------------------------------------------------------

/** Re-spawn colors only (blockers carry over unchanged) from the `#r<draws>-<attempt>` salt
 * namespace — kept distinct from spawnBoard's own `#1`, `#2`, ... retries so a reshuffled mid-
 * game board and a freshly spawned level never derive from the same salted stream. Salting on
 * `state.draws` (rather than a bare `attempt` that always restarts at 1) is load-bearing: two
 * reshuffle calls back-to-back with no cascade in between (two dead-ends in a row, or the
 * player firing the shuffle booster twice) must not reproduce the identical "random" layout,
 * so every call also returns `draws` bumped by one, guaranteeing the NEXT reshuffle salts
 * differently even when nothing else about the board state changed in between. */
function reshuffle(geom: BoardGeometry, state: BoardState): BoardState {
  for (let attempt = 1; ; attempt++) {
    const salted = `${state.seed}#r${state.draws}-${attempt}`;
    const freshColors = fillOnce(geom, salted);
    const tiles = state.tiles.map((t, id) => {
      const fresh = freshColors[id] ?? plainTile(0);
      return { ...fresh, moss: t.moss, frost: t.frost, cage: t.cage, geode: t.geode };
    });
    const candidate: BoardState = { tiles, seed: state.seed, draws: state.draws + 1 };
    if (legalMoves(geom, candidate).length > 0) return candidate;
  }
}

// ---------------------------------------------------------------------------------------------
// settle loop (shared by applyMove and the hammer booster)
// ---------------------------------------------------------------------------------------------

interface FirstStep {
  swapFire?: SwapFireInfo;
  extraTargets?: ReadonlySet<CellId>;
}

function settleLoop(
  geom: BoardGeometry,
  initialTiles: Tile[],
  seed: string,
  initialDraws: number,
  first: FirstStep | null,
): { steps: CascadeStep[]; state: BoardState; chaosSix: boolean; score: number; reshuffled: boolean } {
  const drawIndex = { n: initialDraws };
  let working: Tile[] = initialTiles;
  let peakSpecials = countSpecials(working);
  const steps: CascadeStep[] = [];
  let stepIndex = 1;
  let pending = first;

  for (;;) {
    const matches = findMatches(geom, { tiles: working, seed, draws: drawIndex.n });
    const firstInfo = pending;
    pending = null;
    if (matches.length === 0 && !firstInfo) break;
    const outcome = runStep(
      geom,
      working,
      matches,
      firstInfo?.swapFire,
      firstInfo?.extraTargets,
      stepIndex,
      seed,
      drawIndex,
    );
    if (outcome === null) break;
    working = outcome.tiles;
    steps.push(outcome.step);
    peakSpecials = Math.max(peakSpecials, countSpecials(working));
    stepIndex++;
  }

  let finalState: BoardState = { tiles: working, seed, draws: drawIndex.n };
  let reshuffled = false;
  if (legalMoves(geom, finalState).length === 0) {
    finalState = reshuffle(geom, finalState);
    reshuffled = true;
  }

  const rawScore = steps.reduce((s, st) => s + st.score, 0);
  const chaosSix = peakSpecials >= 6;
  const score = chaosSix ? rawScore * 2 : rawScore;
  return { steps, state: finalState, chaosSix, score, reshuffled };
}

// ---------------------------------------------------------------------------------------------
// applyMove / applyBooster
// ---------------------------------------------------------------------------------------------

function illegal(state: BoardState): SettleResult {
  return { legal: false, steps: [], score: 0, chaosSix: false, state, reshuffled: false };
}

/**
 * Swap two adjacent cells and settle to the fixed point. Illegal (state echoed back
 * unchanged) unless the swap yields at least one match or involves a prism (prism swaps
 * always fire). Otherwise: mint specials at their match origins, fire any special caught in
 * the match or in the swap itself (including the four named compound pairs), decrement
 * blockers, fall, refill, and rescan — repeating until idempotent.
 */
export function applyMove(geom: BoardGeometry, state: BoardState, move: Move): SettleResult {
  const ta = state.tiles[move.a];
  const tb = state.tiles[move.b];
  const cellA = geom.cells[move.a];
  if (!ta || !tb || !cellA || !cellA.neighbors.includes(move.b)) return illegal(state);
  if (!swappable(ta) || !swappable(tb)) return illegal(state);

  const swappedTiles = swapTiles(state.tiles, move.a, move.b);
  const swappedState: BoardState = { tiles: swappedTiles, seed: state.seed, draws: state.draws };
  const initialMatches = findMatches(geom, swappedState);
  const isSpecialSwap = ta.special !== 'none' || tb.special !== 'none';
  if (initialMatches.length === 0 && !isSpecialSwap) return illegal(state);

  // NB: aCell/bCell name the POST-swap cell each original tile now occupies (ta started at
  // move.a and lands at move.b, and vice versa) — the blast must fire from where the special
  // actually is after the swap, not from where the player picked it up.
  const swapFire: SwapFireInfo | undefined = isSpecialSwap
    ? { aCell: move.b, bCell: move.a, aKind: ta.special, bKind: tb.special, aColor: ta.color, bColor: tb.color }
    : undefined;

  const result = settleLoop(geom, swappedTiles, state.seed, state.draws, { swapFire });
  return { legal: true, ...result };
}

/**
 * hammer: hard-clears one cell (still routed through blocker-hit rules — a caged/geode cell
 * takes a hit rather than vanishing outright) and settles; shuffle: deterministic reshuffle,
 * blockers preserved, no cascade. extraMoves/prismStart are meta-level grants the scene/
 * economy layer owns; the engine only recognizes them as valid booster kinds and leaves the
 * board untouched.
 */
export function applyBooster(
  geom: BoardGeometry,
  state: BoardState,
  booster: BoosterKind,
  cell?: CellId,
): SettleResult {
  if (booster === 'shuffle') {
    const shuffled = reshuffle(geom, state);
    return { legal: true, steps: [], score: 0, chaosSix: false, state: shuffled, reshuffled: true };
  }
  if (booster === 'hammer') {
    if (cell === undefined || !geom.cells[cell]) return illegal(state);
    const result = settleLoop(geom, state.tiles.slice(), state.seed, state.draws, {
      extraTargets: new Set([cell]),
    });
    return { legal: true, ...result };
  }
  if (booster === 'extraMoves' || booster === 'prismStart') {
    return { legal: true, steps: [], score: 0, chaosSix: false, state, reshuffled: false };
  }
  return illegal(state);
}
