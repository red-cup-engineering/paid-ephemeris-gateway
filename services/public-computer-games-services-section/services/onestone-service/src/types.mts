/**
 * `types` — the shared contract every onestone module is written against.
 *
 * onestone's one big idea is that the *board is a graph, not a grid*: every tessellation
 * (square, hex, rhombille, and later Cairo/Penrose/hat/Wang) compiles down to the same
 * `BoardGeometry` — cells with polygons, shared-edge adjacency, precomputed straight-line
 * `rails`, and a baked `fallTo` gravity pointer — so ONE match/cascade engine serves every
 * tiling and never branches on tiling kind. These types are that compilation target.
 *
 * Everything here is data (plain JSON-serializable shapes, no classes, no methods) so the
 * pure modules stay pure, snapshots stay exact, and the server can stream any of it to the
 * client verbatim.
 */

/** Stable id of a cell within one board: an integer index into `BoardGeometry.cells`. */
export type CellId = number;

/**
 * Match colors are small integers `0..paletteSize-1`. The palette size per tiling is not a
 * taste decision: the spawn algorithm is a proper coloring of the match-adjacency graph, so
 * the palette must exceed that graph's local clique number (chi(K4)=4 — a king-adjacency
 * junction provably forces 4 colors). Square/hex chapters ship 5; headroom above the bound.
 */
export type ColorId = number;

/** The tilings the geometry registry can build today (the ladder grows over time). */
export type TilingKind = 'square' | 'hex' | 'rhombille';

/** One cell of a compiled board. */
export interface Cell {
  id: CellId;
  /** Closed polygon in board coordinates, [x0,y0, x1,y1, ...] — rendered verbatim as SVG. */
  poly: readonly number[];
  /** Centroid, for tile sprites, animation targets, and drag math. */
  cx: number;
  cy: number;
  /** Ids of cells sharing an edge with this one (the ONLY adjacency the engine knows). */
  neighbors: readonly CellId[];
  /**
   * The cell whose tile falls INTO this cell when this cell empties (the neighbor "above"
   * in the baked gravity field). null = spawn mouth: this cell refills from off-board.
   */
  fallFrom: CellId | null;
  /**
   * The cell this cell's tile falls into when that cell empties (the neighbor "below").
   * null = bottom of the gravity field. Always the inverse of `fallFrom`.
   */
  fallTo: CellId | null;
  /**
   * Rhombille only: orientation index 0|1|2 for the three rhombus orientations — drives the
   * cube-illusion shading. Cosmetic; NEVER consulted by match logic. 0 for other tilings.
   */
  shade: number;
}

/**
 * A rail is a maximal straight chain of cells (a row/column analog): ordered cell ids.
 * Square boards have 2 rail families (rows, columns); hex boards have 3 axis families;
 * blob-only tilings (future Penrose/hat) simply emit zero rails.
 */
export interface Rail {
  /** Which family this rail belongs to (0-based; family count is per-tiling). */
  family: number;
  cells: readonly CellId[];
}

/** A compiled, tiling-agnostic board shape. Pure data; never mutated after build. */
export interface BoardGeometry {
  tiling: TilingKind;
  cells: readonly Cell[];
  rails: readonly Rail[];
  /** For each cell, the rails (indices into `rails`) passing through it. */
  railsAt: ReadonlyArray<readonly number[]>;
  /** Bounding box of all polygons, for the client's viewBox. */
  width: number;
  height: number;
  /** Palette size this geometry was built for (>= its match-adjacency clique bound). */
  paletteSize: number;
}

/** Special tiles, created by match shapes, reinterpreted for graph adjacency. */
export type SpecialKind =
  | 'none'
  /** Rail run of exactly 4 → clears its whole rail (the row/column-striped analog). */
  | 'striped'
  /** Blob of 5+ with a junction (cell where 3+ matched neighbors meet) → clears the full 1-ring neighborhood. */
  | 'nova'
  /** Rail run or compact blob of 5+ → clears every cell of the swapped-with color. */
  | 'prism'
  /**
   * Ring: a match whose cells close a cycle around one non-matched cell (possible on hex/
   * rhombille, impossible on square) → converts the enclosed cell to a prism and fires it.
   */
  | 'ring';

/** One tile occupying a cell. */
export interface Tile {
  color: ColorId;
  special: SpecialKind;
  /**
   * Blocker state, orthogonal to color:
   *  - moss: cleared when a match happens on this cell (jelly analog; tile still swappable)
   *  - frost: tile cannot be swapped until a match fires adjacent to it (ice analog)
   *  - cage: tile cannot be swapped or matched until an adjacent match breaks the cage
   *  - geode(n): no tile; n adjacent-match hits to break (crate analog), n in 1..3
   */
  moss: boolean;
  frost: boolean;
  cage: boolean;
  /** 0 = not a geode. Geodes have no matchable color; `color` is ignored while > 0. */
  geode: number;
}

/** The mutable board state the engine transforms. Always paired with a BoardGeometry. */
export interface BoardState {
  /** One entry per cell; index = CellId. */
  tiles: Tile[];
  /** Seed string the deterministic refill stream derives from. */
  seed: string;
  /** How many refill draws have been consumed (so replays are exact). */
  draws: number;
}

/** A player move: swap the tiles of two shared-edge-adjacent cells. */
export interface Move {
  a: CellId;
  b: CellId;
}

/** One matched group found on the board. */
export interface MatchGroup {
  cells: readonly CellId[];
  color: ColorId;
  /** 'rail' if the group is a straight run on one rail, else 'blob'. */
  shape: 'rail' | 'blob';
  /** The special tile this match mints (at `origin`), or 'none'. */
  mints: SpecialKind;
  /** Where a minted special lands (the swap cell if in the group, else the group's junction/center). */
  origin: CellId;
}

/**
 * One settling step of a cascade: what cleared, what was minted, what fell, what refilled.
 * A full cascade is a sequence of these, applied until idempotent (no matches remain) —
 * that's the termination condition, deliberately no max-depth cap. (Not literally a
 * Knaster-Tarski least fixed point: refill injects fresh RNG-drawn tiles every round, so
 * there's no monotone-climbing lattice for that theorem to apply to. See engine.mts's module
 * header for the actual — graph-theoretic, fallTo-acyclicity — termination argument.)
 */
export interface CascadeStep {
  matches: readonly MatchGroup[];
  /** Cells cleared this step (matches + special blasts + broken blockers' cells). */
  cleared: readonly CellId[];
  /** Specials that fired this step (position at time of firing). */
  fired: ReadonlyArray<{ cell: CellId; kind: SpecialKind }>;
  /** Blockers hit this step. */
  mossCleared: readonly CellId[];
  frostBroken: readonly CellId[];
  cageBroken: readonly CellId[];
  geodeHit: readonly CellId[];
  /** Tile movements: tile previously at `from` is now at `to`. */
  falls: ReadonlyArray<{ from: CellId; to: CellId }>;
  /** Cells refilled from off-board with brand-new tiles this step. */
  spawned: ReadonlyArray<{ cell: CellId; tile: Tile }>;
  /** Score earned this step (settling height × step multiplier — see engine docs). */
  score: number;
}

/** The result of applying one move (or booster) to a board. */
export interface SettleResult {
  legal: boolean;
  steps: readonly CascadeStep[];
  /** Total score across steps. */
  score: number;
  /** True when 6+ specials were concurrently live during settling (Ramsey R(3,3)<=6 event). */
  chaosSix: boolean;
  /** Board state after settling (the input state is never mutated). */
  state: BoardState;
  /** True if settling ended with zero legal moves and a deterministic reshuffle was applied. */
  reshuffled: boolean;
}

/** Level objectives. A level completes when ALL goals are met; fails when moves run out. */
export interface Goal {
  kind: 'score' | 'clearMoss' | 'breakGeodes' | 'collectColor';
  /** For collectColor: which color. Ignored otherwise. */
  color?: ColorId;
  target: number;
}

/** Where blockers sit at level start. */
export interface BlockerPlacement {
  cell: CellId;
  kind: 'moss' | 'frost' | 'cage' | 'geode';
  /** geode hit points 1..3. */
  hp?: number;
}

/** A playable level, fully deterministic given its id. */
export interface LevelSpec {
  id: number;
  /** Chapter index (0-based); chapters map 1:1 onto tilings in v1: 0 square, 1 hex, 2 rhombille. */
  chapter: number;
  tiling: TilingKind;
  /** Tiling size parameter (square: side; hex: radius; rhombille: hex-radius of the underlying hexagon). */
  size: number;
  paletteSize: number;
  moves: number;
  goals: readonly Goal[];
  blockers: readonly BlockerPlacement[];
  /** Board-generation seed. */
  seed: string;
  /**
   * Mean coordination number of the blocker constraint graph — the rigidity-percolation
   * difficulty dial. Levels ramp this smoothly toward the isostatic point 2.4 within a
   * chapter; the generator refuses layouts whose pebble-game validation fails.
   */
  meanCoordination: number;
}

/** Star rating thresholds and result for a finished level. */
export interface LevelResult {
  levelId: number;
  won: boolean;
  score: number;
  stars: 0 | 1 | 2 | 3;
  movesLeft: number;
  chaosSix: boolean;
}

/** ——— Meta / economy ——— */

/** Soft currency: shards (earned). Hard currency: prisms (bought/rare-earned). */
export interface Wallet {
  shards: number;
  prisms: number;
}

export type BoosterKind = 'hammer' | 'shuffle' | 'extraMoves' | 'prismStart';

export interface PlayerMeta {
  /** Highest unlocked level id + per-level stars. */
  unlocked: number;
  stars: Record<number, 0 | 1 | 2 | 3>;
  wallet: Wallet;
  boosters: Record<BoosterKind, number>;
  /** Lives system: cap 5 (8 with pass), regen 1 per LIFE_REGEN_MS. */
  lives: number;
  /** Epoch ms when the next life regenerates (0 = at cap). */
  nextLifeAt: number;
  /** Consecutive-win streak (resets on loss). */
  streak: number;
  /** Garden trophy pieces earned (tiling names unlocked for the Lattice Garden). */
  garden: readonly string[];
  /** Season pass active until (epoch ms; 0 = none). */
  passUntil: number;
  /**
   * Per-level soft-retry credits (TILESLOTS-DESIGN.md §4.3 "sparks") — a second, orthogonal,
   * non-monetary resource that softens only the single worst moment: failing a level and
   * wanting to try it again, right now. Never sold, never a `Sku.grant` variant, never a gate
   * on the existing lives system. Absent key == full (`SPARK_CAP`, `economy.mts`) — a level a
   * player has never lost yet has never had a reason to allocate an entry here. Scoped to one
   * levelId: losing level 12 never affects level 13's sparks.
   */
  sparks: Record<number, { n: number; nextAt: number }>;
}

/** ——— Payments (mirrors the sibling PaymentProvider boundary) ——— */

export interface Sku {
  id: string;
  title: string;
  /** Price in USD cents (display; providers may convert). */
  cents: number;
  /**
   * What the SKU grants. Bounded by doctrine: currency, consumable boosters, lives, or a
   * time-limited pass — never flat power and never level-solvability shortcuts (solvability
   * is a validated property of the board; selling it would falsify the game's own math).
   */
  grant:
    | { kind: 'prisms'; amount: number }
    | { kind: 'booster'; booster: BoosterKind; amount: number }
    | { kind: 'lives'; refill: true }
    | { kind: 'pass'; days: number };
}

export type OrderStatus = 'pending' | 'cleared' | 'failed';

export interface Order {
  id: string;
  account: string;
  skuId: string;
  provider: string;
  status: OrderStatus;
  createdAt: number;
  clearedAt: number | null;
  /** Provider-specific handle (Stripe PaymentIntent id, Hive memo, mock token). */
  ref: string;
}

/** ——— Wire protocol (server <-> client) ——— */

/** What the server streams to the client after each accepted input (and on connect). */
export interface ClientFrame {
  kind: 'state';
  levelId: number;
  geometry: BoardGeometry;
  tiles: Tile[];
  movesLeft: number;
  goals: ReadonlyArray<Goal & { progress: number }>;
  score: number;
  /** Steps of the most recent settle, for animation; empty on plain state pushes. */
  lastSteps: readonly CascadeStep[];
  chaosSix: boolean;
  finished: LevelResult | null;
  meta: PlayerMeta;
}

/** Player → server inputs. */
export type ClientInput =
  | { kind: 'start'; levelId: number }
  | { kind: 'swap'; a: CellId; b: CellId }
  | { kind: 'booster'; booster: BoosterKind; cell?: CellId }
  | { kind: 'abandon' }
  /** Spend shards (soft currency, default) or prisms (hard currency, `currency: 'prisms'`) on
   * consumable boosters — `economy.buyBooster`/`buyBoosterWithPrisms`'s wire shape. The only
   * spend path for either currency: without it, the earn side of the economy (winReward, SKU
   * purchases) had nothing to spend into. */
  | { kind: 'buy'; booster: BoosterKind; count?: number; currency?: 'shards' | 'prisms' };
