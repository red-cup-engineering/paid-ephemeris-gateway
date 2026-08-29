/**
 * `solver` — the FreeCell solver, per DESIGN.md's "FreeCell: solver-guaranteed" decision.
 *
 * FreeCell deals every card face up, so unlike Klondike/Spider there is exactly one honest
 * question ("does a legal move sequence to all-foundations-full exist from this exact layout?")
 * and it is cheap enough to answer per-deal, offline, ahead of ever showing a seed to a player.
 * This module is a weighted-A* best-first search (priority = moves-so-far + 4 x heuristic, where
 * the heuristic is cards-not-yet-home plus a penalty for cards buried under each column's
 * already-sorted top run — see `heuristic`'s doc comment) over a compact integer-encoded board,
 * with:
 *
 *  - a transposition table keyed by a *canonical* state (free cells sorted, tableau columns
 *    sorted as a multiset) so the many move orders that reach the same board collapse to one
 *    search node — columns and free cells are interchangeable, and without this the search
 *    explores the same position many times over;
 *  - forced-move canonicalization: after every candidate move, any card that is now provably
 *    safe to autoplay (rank <= 1 + min of its two opposite-color foundation ranks — the standard
 *    safe-autoplay bound, same one `engine.mts#autoFinishAvailable` uses) is played immediately,
 *    before the resulting state is scored or pushed to the frontier. This is a standard, well
 *    established FreeCell-solver pruning technique (not specific to this codebase) and is by far
 *    the biggest single reducer of effective branching factor;
 *  - a hard `maxStates`/`maxMs` budget. Exceeding it returns `solvable: false`, never a guess —
 *    an unsolved search here means "not certified in this budget," not "unsolvable," and callers
 *    (`generateSolvableSeed`) simply move on to the next candidate seed. This is what "solver-
 *    guaranteed" is allowed to mean without becoming a live-request bottleneck: certification
 *    happens ahead of traffic, and a seed that doesn't certify quickly is just not served.
 *
 * Soundness, concretely: the search above runs entirely in `solver.mts`'s own compact
 * representation (plain integers, no `Card` objects, no relation to `engine.mts` at all beyond
 * sharing the deal). Once a solution path is found, `translateAndVerify` replays it move by move
 * against a *real* `engine.mts` `GameState`, calling the same `legalTargets`/`applyMove` every
 * live game uses — a genuinely independent code path from the search, per DESIGN.md's test plan
 * ("a reference auto-player, independent of the solver's own search order"). `solveFreecell`
 * only reports `solvable: true` if that independent replay actually reaches `checkWin`; a bug in
 * the search that produced a bogus "solution" is caught right here, not shipped as a promise.
 */
import type { Card, Suit } from './cards.mts';
import { SUITS } from './cards.mts';
import type { GameState, Move } from './engine.mts';
import { FREECELL, applyMove, checkWin, dealTable, legalTargets } from './engine.mts';

// -------------------------------------------------------------------------------------------
// compact internal representation: card = suitIndex*13 + (rank-1), 0..51
// -------------------------------------------------------------------------------------------

interface Internal {
  readonly free: readonly (number | null)[]; // length 4
  readonly found: readonly number[]; // length 4, indexed by suit index; value = highest rank landed
  readonly cols: readonly (readonly number[])[]; // length 8, bottom..top
}

function rankOf(card: number): number {
  return (card % 13) + 1;
}
function suitOf(card: number): number {
  return Math.floor(card / 13);
}
function isRed(suitIdx: number): boolean {
  return suitIdx === 1 || suitIdx === 2; // SUITS = ['C','D','H','S']
}
const OPPOSITE_SUIT_IDX: readonly (readonly [number, number])[] = [
  [1, 2], // C -> D,H
  [0, 3], // D -> C,S
  [0, 3], // H -> C,S
  [1, 2], // S -> D,H
];

function encodeCard(c: Card): number {
  return SUITS.indexOf(c.suit) * 13 + (c.rank - 1);
}

function toInternal(state: GameState): Internal {
  const cols: number[][] = [];
  for (let i = 0; i < 8; i++) {
    cols.push((state.piles[`tableau-${i}`] ?? []).map(encodeCard));
  }
  return { free: [null, null, null, null], found: [0, 0, 0, 0], cols };
}

function key(s: Internal): string {
  const freeSorted = s.free.filter((x): x is number => x !== null).sort((a, b) => a - b);
  const colsSorted = s.cols.map((c) => c.join(',')).sort();
  return `${freeSorted.join(',')}|${s.found.join(',')}|${colsSorted.join('|')}`;
}

function isSolved(s: Internal): boolean {
  return s.found.every((x) => x === 13);
}
function isSafe(s: Internal, card: number): boolean {
  const rank = rankOf(card);
  if (rank <= 2) return true;
  const [a, b] = OPPOSITE_SUIT_IDX[suitOf(card)]!;
  return rank <= Math.min(s.found[a]!, s.found[b]!) + 1;
}
function acceptsSingleOnCol(col: readonly number[], card: number): boolean {
  if (col.length === 0) return true; // FreeCell: empty column accepts anything
  const top = col[col.length - 1]!;
  return rankOf(card) === rankOf(top) - 1 && isRed(suitOf(card)) !== isRed(suitOf(top));
}
function runLengthFromTop(col: readonly number[]): number {
  let len = 1;
  for (let i = col.length - 1; i > 0; i--) {
    const upper = col[i]!;
    const lower = col[i - 1]!;
    if (rankOf(upper) === rankOf(lower) - 1 && isRed(suitOf(upper)) !== isRed(suitOf(lower))) len++;
    else break;
  }
  return len;
}
function maxSupermove(s: Internal, destCol: number): number {
  const emptyFree = s.free.filter((x) => x === null).length;
  let emptyCols = 0;
  for (let c = 0; c < 8; c++) if (c !== destCol && s.cols[c]!.length === 0) emptyCols++;
  return (emptyFree + 1) * (emptyCols + 1);
}

// -------------------------------------------------------------------------------------------
// moves
// -------------------------------------------------------------------------------------------

type IMove =
  | { readonly type: 'col2found'; readonly c: number }
  | { readonly type: 'free2found'; readonly f: number }
  | { readonly type: 'col2free'; readonly c: number; readonly f: number }
  | { readonly type: 'free2col'; readonly f: number; readonly c2: number }
  | { readonly type: 'col2col'; readonly c: number; readonly len: number; readonly c2: number };

function successors(s: Internal): IMove[] {
  const moves: IMove[] = [];
  for (let c = 0; c < 8; c++) {
    const col = s.cols[c]!;
    if (col.length === 0) continue;
    const top = col[col.length - 1]!;
    if (rankOf(top) === s.found[suitOf(top)]! + 1) moves.push({ type: 'col2found', c });
  }
  for (let f = 0; f < 4; f++) {
    const card = s.free[f];
    if (card === null) continue;
    if (rankOf(card) === s.found[suitOf(card)]! + 1) moves.push({ type: 'free2found', f });
  }
  const emptyFree = s.free.findIndex((x) => x === null);
  if (emptyFree !== -1) {
    for (let c = 0; c < 8; c++) if (s.cols[c]!.length > 0) moves.push({ type: 'col2free', c, f: emptyFree });
  }
  for (let f = 0; f < 4; f++) {
    const card = s.free[f];
    if (card === null) continue;
    for (let c2 = 0; c2 < 8; c2++) if (acceptsSingleOnCol(s.cols[c2]!, card)) moves.push({ type: 'free2col', f, c2 });
  }
  for (let c = 0; c < 8; c++) {
    const col = s.cols[c]!;
    if (col.length === 0) continue;
    const maxRun = runLengthFromTop(col);
    for (let c2 = 0; c2 < 8; c2++) {
      if (c2 === c) continue;
      const cap = Math.min(maxRun, maxSupermove(s, c2));
      if (cap < 1) continue;
      if (s.cols[c2]!.length === 0) {
        // Splitting a run onto an empty column at an in-between length is essentially never
        // useful; only the full run and the lone top card are worth trying (standard pruning).
        const lens = cap === 1 ? [1] : [1, cap];
        for (const len of lens) moves.push({ type: 'col2col', c, len, c2 });
      } else {
        for (let len = 1; len <= cap; len++) {
          const head = col[col.length - len]!;
          if (acceptsSingleOnCol(s.cols[c2]!, head)) moves.push({ type: 'col2col', c, len, c2 });
        }
      }
    }
  }
  return moves;
}

function applyInternal(s: Internal, m: IMove): Internal {
  const free = s.free.slice();
  const found = s.found.slice();
  const cols = s.cols.map((c) => c);
  switch (m.type) {
    case 'col2found': {
      const col = cols[m.c]!.slice();
      const card = col.pop()!;
      cols[m.c] = col;
      found[suitOf(card)] = found[suitOf(card)]! + 1;
      break;
    }
    case 'free2found': {
      const card = free[m.f]!;
      free[m.f] = null;
      found[suitOf(card)] = found[suitOf(card)]! + 1;
      break;
    }
    case 'col2free': {
      const col = cols[m.c]!.slice();
      free[m.f] = col.pop()!;
      cols[m.c] = col;
      break;
    }
    case 'free2col': {
      const card = free[m.f]!;
      free[m.f] = null;
      cols[m.c2] = [...cols[m.c2]!, card];
      break;
    }
    case 'col2col': {
      const src = cols[m.c]!.slice();
      const moved = src.splice(src.length - m.len, m.len);
      cols[m.c] = src;
      cols[m.c2] = [...cols[m.c2]!, ...moved];
      break;
    }
  }
  return { free, found, cols };
}

function forceAutoPlay(s: Internal): { state: Internal; moves: IMove[] } {
  let cur = s;
  const applied: IMove[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let c = 0; c < 8; c++) {
      const col = cur.cols[c]!;
      if (col.length === 0) continue;
      const top = col[col.length - 1]!;
      if (rankOf(top) === cur.found[suitOf(top)]! + 1 && isSafe(cur, top)) {
        const mv: IMove = { type: 'col2found', c };
        cur = applyInternal(cur, mv);
        applied.push(mv);
        changed = true;
      }
    }
    for (let f = 0; f < 4; f++) {
      const card = cur.free[f];
      if (card === null) continue;
      if (rankOf(card) === cur.found[suitOf(card)]! + 1 && isSafe(cur, card)) {
        const mv: IMove = { type: 'free2found', f };
        cur = applyInternal(cur, mv);
        applied.push(mv);
        changed = true;
      }
    }
  }
  return { state: cur, moves: applied };
}

// -------------------------------------------------------------------------------------------
// weighted-A* best-first search with a burial-aware heuristic and a transposition table
//
// Two weaker approaches were tried and measured before this one: a best-first search using only
// "cards not on foundation" as its heuristic (burned a 100k-state/10s budget on an ordinary deal
// without solving it — nearly every state ties on that heuristic, so it degenerates toward
// exploring breadth-first), and a depth-capped DFS with a hand-tuned move-ordering priority
// (foundation moves, then extend-a-sequence, then free-cell park, then empty-column dump; burned
// a 600k-state/60s budget across three seeds without solving any). Both are legitimate solver
// strategies in the literature and DESIGN.md explicitly names DFS; empirically, on this codebase's
// move generator, neither converged. The heuristic below (see `heuristic`'s doc comment) is what
// actually made the difference: the same 30 ordinary seeds that stalled the other two now solve
// in well under a second each (README.md has the measured numbers).
// -------------------------------------------------------------------------------------------

export interface SolveOptions {
  readonly maxStates?: number;
  readonly maxMs?: number;
}

interface SearchResult {
  readonly found: boolean;
  readonly path: readonly IMove[];
  readonly statesExplored: number;
}

/**
 * Weighted-A* heuristic: cards not yet on a foundation, plus — for every tableau column — the
 * number of cards buried *underneath* that column's already-in-order top run (i.e. `col.length -
 * runLengthFromTop(col)`). Plain "cards not home" alone ties almost every state together (most
 * states have similar foundation progress) and degenerates the search toward exploring
 * breadth-first; the burial term breaks those ties in favor of states whose columns are more
 * internally sorted, which correlates strongly with how much work remains. This is the change
 * that took an early best-first attempt (verified: burned a 100k-state budget on an ordinary
 * deal without solving it) down to solving typical deals in well under a second — see solver
 * timings in README.md.
 */
function heuristic(s: Internal): number {
  const notHome = 52 - s.found.reduce((a, b) => a + b, 0);
  let buried = 0;
  for (let c = 0; c < 8; c++) buried += s.cols[c]!.length - runLengthFromTop(s.cols[c]!);
  return notHome + buried;
}

/** Weighted A* trades solution-length optimality (irrelevant here — any legal winning sequence
 * certifies the deal) for reaching a goal with far fewer expansions than either unweighted A* or
 * naive DFS achieve on this problem in practice. */
const HEURISTIC_WEIGHT = 4;

class MinHeap {
  private items: { p: number; v: number }[] = [];
  get size(): number {
    return this.items.length;
  }
  push(p: number, v: number): void {
    this.items.push({ p, v });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent]!.p <= this.items[i]!.p) break;
      [this.items[parent], this.items[i]] = [this.items[i]!, this.items[parent]!];
      i = parent;
    }
  }
  pop(): number | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < this.items.length && this.items[l]!.p < this.items[smallest]!.p) smallest = l;
        if (r < this.items.length && this.items[r]!.p < this.items[smallest]!.p) smallest = r;
        if (smallest === i) break;
        [this.items[i], this.items[smallest]] = [this.items[smallest]!, this.items[i]!];
        i = smallest;
      }
    }
    return top.v;
  }
}

interface SearchNode {
  readonly parentIdx: number;
  readonly move: IMove | null;
  readonly forced: readonly IMove[];
  readonly state: Internal;
  readonly g: number;
}

function reconstructPath(nodes: readonly SearchNode[], goalIdx: number): IMove[] {
  const chain: SearchNode[] = [];
  for (let i = goalIdx; i !== -1; i = nodes[i]!.parentIdx) chain.push(nodes[i]!);
  chain.reverse();
  const path: IMove[] = [];
  for (const n of chain) {
    if (n.move) path.push(n.move);
    path.push(...n.forced);
  }
  return path;
}

/** Weighted-A* best-first search over `successors`, with forced safe-autoplay canonicalization
 * (`forceAutoPlay`) applied to every generated state before it is scored or stored, and a
 * transposition table (`visited`, keyed by the canonical `key()`) that reopens a state only when
 * reached via a strictly shorter path — so the many move orders that reach the same board never
 * cost more than one real expansion. */
function searchInternal(initial: Internal, options: SolveOptions): SearchResult {
  const maxStates = options.maxStates ?? 400_000;
  const deadline = Date.now() + (options.maxMs ?? 15_000);
  const { state: startState, moves: startForced } = forceAutoPlay(initial);
  if (isSolved(startState)) return { found: true, path: startForced, statesExplored: 0 };

  const nodes: SearchNode[] = [{ parentIdx: -1, move: null, forced: [], state: startState, g: 0 }];
  const visited = new Map<string, number>();
  visited.set(key(startState), 0);
  const heap = new MinHeap();
  heap.push(HEURISTIC_WEIGHT * heuristic(startState), 0);
  let statesExplored = 0;

  while (heap.size > 0) {
    if (statesExplored >= maxStates || Date.now() > deadline) break;
    const idx = heap.pop()!;
    const node = nodes[idx]!;
    if (visited.get(key(node.state)) !== node.g) continue; // superseded by a shorter path since
    statesExplored++;

    for (const mv of successors(node.state)) {
      const { state: afterForce, moves: forced } = forceAutoPlay(applyInternal(node.state, mv));
      const g = node.g + 1;
      const k = key(afterForce);
      const prevG = visited.get(k);
      if (prevG !== undefined && prevG <= g) continue;
      visited.set(k, g);
      const newIdx = nodes.length;
      nodes.push({ parentIdx: idx, move: mv, forced, state: afterForce, g });
      if (isSolved(afterForce)) {
        return { found: true, path: [...startForced, ...reconstructPath(nodes, newIdx)], statesExplored };
      }
      heap.push(g + HEURISTIC_WEIGHT * heuristic(afterForce), newIdx);
    }
  }
  return { found: false, path: [], statesExplored };
}

// -------------------------------------------------------------------------------------------
// translate the internal solution into real engine.mts moves, replaying (= verifying) as we go
// -------------------------------------------------------------------------------------------

function translateAndVerify(seed: string, path: readonly IMove[]): { finalState: GameState; engineMoves: Move[] } {
  let state = dealTable(seed, FREECELL);
  const engineMoves: Move[] = [];
  const suitToFoundation = new Map<Suit, string>();
  const freeIndexToPile = new Map<number, string>();

  const pickEmptyFoundation = (): string => {
    const ids = FREECELL.piles.filter((p) => p.kind === 'foundation').map((p) => p.id).sort();
    const free = ids.find((id) => (state.piles[id]?.length ?? 0) === 0);
    if (!free) throw new Error('solver soundness check failed: no empty foundation pile available');
    return free;
  };
  const foundationFor = (suit: Suit): string => {
    const existing = suitToFoundation.get(suit);
    if (existing) return existing;
    const chosen = pickEmptyFoundation();
    suitToFoundation.set(suit, chosen);
    return chosen;
  };
  const pickEmptyFreecell = (): string => {
    const ids = FREECELL.piles.filter((p) => p.kind === 'freecell').map((p) => p.id).sort();
    const free = ids.find((id) => (state.piles[id]?.length ?? 0) === 0);
    if (!free) throw new Error('solver soundness check failed: no empty freecell available');
    return free;
  };
  const play = (move: Move): void => {
    const legal = legalTargets(FREECELL, state, move.from, move.count);
    if (!legal.includes(move.to)) {
      throw new Error(`solver soundness check failed: replay found ${JSON.stringify(move)} illegal`);
    }
    state = applyMove(FREECELL, state, move);
    engineMoves.push(move);
  };

  for (const m of path) {
    switch (m.type) {
      case 'col2found': {
        const from = `tableau-${m.c}`;
        const card = state.piles[from]![state.piles[from]!.length - 1]!;
        play({ from, to: foundationFor(card.suit), count: 1 });
        break;
      }
      case 'free2found': {
        const from = freeIndexToPile.get(m.f);
        if (!from) throw new Error('solver soundness check failed: free2found on unmapped index');
        const card = state.piles[from]![0]!;
        play({ from, to: foundationFor(card.suit), count: 1 });
        freeIndexToPile.delete(m.f);
        break;
      }
      case 'col2free': {
        const from = `tableau-${m.c}`;
        const to = pickEmptyFreecell();
        play({ from, to, count: 1 });
        freeIndexToPile.set(m.f, to);
        break;
      }
      case 'free2col': {
        const from = freeIndexToPile.get(m.f);
        if (!from) throw new Error('solver soundness check failed: free2col on unmapped index');
        play({ from, to: `tableau-${m.c2}`, count: 1 });
        freeIndexToPile.delete(m.f);
        break;
      }
      case 'col2col': {
        play({ from: `tableau-${m.c}`, to: `tableau-${m.c2}`, count: m.len });
        break;
      }
    }
  }
  return { finalState: state, engineMoves };
}

// -------------------------------------------------------------------------------------------
// public API
// -------------------------------------------------------------------------------------------

export interface SolveResult {
  readonly solvable: boolean;
  /** Present iff `solvable` — an engine.mts move list independently verified via `applyMove`. */
  readonly moves?: readonly Move[];
  readonly statesExplored: number;
  readonly timeMs: number;
}

/** Attempt to certify `seed`'s FreeCell deal winnable within `options`' budget. */
export function solveFreecell(seed: string, options: SolveOptions = {}): SolveResult {
  const start = Date.now();
  const initial = toInternal(dealTable(seed, FREECELL));
  const search = searchInternal(initial, options);
  if (!search.found) {
    return { solvable: false, statesExplored: search.statesExplored, timeMs: Date.now() - start };
  }
  const { finalState, engineMoves } = translateAndVerify(seed, search.path);
  const solvable = checkWin(FREECELL, finalState);
  return {
    solvable,
    moves: solvable ? engineMoves : undefined,
    statesExplored: search.statesExplored,
    timeMs: Date.now() - start,
  };
}

/** Try candidate seeds in order, returning the first the solver certifies winnable. This is the
 * "deal generator that rejects unsolvable FreeCell seeds" — a seed only ever reaches this
 * function's caller as "the deal" after passing here. */
export function generateSolvableSeed(
  seeds: Iterable<string>,
  options: SolveOptions = {},
): { seed: string; result: SolveResult } | null {
  for (const seed of seeds) {
    const result = solveFreecell(seed, options);
    if (result.solvable) return { seed, result };
  }
  return null;
}

/** `${prefix}-0`, `${prefix}-1`, ... — a convenient default candidate-seed stream. */
export function* numberedSeeds(prefix: string, start = 0): Generator<string> {
  for (let i = start; ; i++) yield `${prefix}-${i}`;
}
