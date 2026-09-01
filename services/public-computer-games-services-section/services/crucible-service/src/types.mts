/**
 * `types` — the shared vocabulary for the whole engine, one central file (DESIGN.md).
 *
 * A `Tangle` is a reaction network: `claims` (nodes, the foam's "claims" — a region a token's
 * distinction produces) joined by `bonds` (edges, the "walls" between two claims, one per
 * token). The four move verbs (`merge`, `split`, `rebond`, `catalyze`) are the game's own names;
 * see `obstruction.mts`'s header for exactly which parts of the resulting cost are literal
 * `@lenticule-science/metrologic` output and which are game-authored scaffolding around it.
 *
 * Domain module APIs (this file included) are named plainly — "claim", "bond", "move" — not in
 * the corpus's waidan/foam vocabulary; that vocabulary lives in `web/`'s UI layer, per the theme
 * digest's instruction to keep mechanics and fiction the same objects while keeping the engine's
 * own names plain.
 */

/** A bond's rigidity geometry, in the corpus's own terms (theme digest §3): a `panel` is a
 * rigid, angle-locked strut; a `hinge` has visible angular play. Purely a render/flavor tag —
 * it does not change legality or cost, which are driven by `state` and the graph shape alone. */
export type BondGeometry = 'panel' | 'hinge';

/** A bond's chemical/mechanical state, from the theme digest's wall types. Only `pinned` is ever
 * truly untouchable: it marks the daily generator's own backbone spanning tree, and removing a
 * backbone edge is never offered by any move, at any cost, full stop.
 *
 * `compliant-permanent` and `catalyzed` both mark a bond the player themselves locked down
 * (via MERGE or CATALYZE respectively) — "no take-backs" describes the *ordinary* chemistry
 * (clean SPLIT, REBOND, re-CATALYZE all correctly refuse both), but forced SPLIT (thermal
 * homolysis — "the unauthorized route the whole apparatus exists to avoid", per the theme digest)
 * still applies to *any* non-`pinned` bond, this one pair included, at severe (transfinite) cost.
 * This is deliberate: MERGE and CATALYZE must stay strict, costly mistakes — a skilled player
 * never needs them — but neither may be allowed to *permanently* strand a cycle the way an
 * un-reversible lock would, since the daily generator's spanning tree guarantees every cycle has
 * exactly one non-`pinned` edge, and that edge must always remain forced-splittable or the daily
 * becomes truly unwinnable (see `engine.test.mts`'s "no permanent softlock" property test and
 * `validate.mts`'s module doc for the precise guarantee this state design now provides):
 * - `compliant-permanent` — a thioether formed by MERGE.
 * - `exchangeable` — the REBOND-able, freely SPLIT-able (clean or forced), CATALYZE-able
 *   population; the daily generator's chord bonds start here.
 * - `catalyzed` — an exchangeable bond CATALYZE locked down. Distinct from `pinned` on purpose:
 *   it is a bond *the player* removed from ordinary circulation, not the generator's backbone,
 *   so — unlike genuine backbone `pinned` bonds — it must remain forced-SPLIT-able.
 * - `pinned` — a pre-seated backbone bond, seated once at spawn time as part of the generator's
 *   spanning tree (see `tangle.mts`). Settled and immovable: never selectable by any move, ever,
 *   at any cost. */
export type BondState = 'compliant-permanent' | 'exchangeable' | 'catalyzed' | 'pinned';

export interface Bond {
  readonly id: string;
  readonly a: string; // claim id
  readonly b: string; // claim id
  readonly geometry: BondGeometry;
  readonly state: BondState;
}

export interface Claim {
  readonly id: string;
  /** Degree of ossification in [0, 1] — a purely cosmetic progress readout (theme digest §1's
   * "ossification / degree of ossification φ"), NOT read by any cost or legality check. Derived
   * once at spawn time from the claim's coordination number and never mutated by moves; it is
   * flavor labeled as flavor, not a second obstruction signal. */
  readonly phi: number;
}

export interface Tangle {
  readonly seed: string;
  readonly claims: readonly Claim[];
  readonly bonds: readonly Bond[];
  /** The free-thiol reserve (theme digest): REBOND's fuel. MERGE and CATALYZE draw it down;
   * REBOND leaves it unchanged ("the sulfur that did the work is un-consumed"); it never
   * regenerates once spent. At zero, REBOND becomes illegal (oxidative exhaustion) — only
   * SPLIT remains, exactly as the corpus's failure-state table describes. */
  readonly freeReserve: number;
  /** A generous, honestly-computed upper bound on the real cost of settling this tangle (see
   * `validate.mts`) — the number the end-of-daily summary compares the player's spend against.
   * Not a designer guess: it is the actual summed cost of one concrete solving sequence the
   * generator verifies at spawn time. */
  readonly energyBudget: number;
}

export type MoveVerb = 'merge' | 'split' | 'rebond' | 'catalyze';

export interface MergeMove {
  readonly verb: 'merge';
  readonly a: string;
  readonly b: string;
}

export interface SplitMove {
  readonly verb: 'split';
  readonly bondId: string;
  /** `clean` = retro-Diels–Alder: catalyst-free, thermally gated, a bounded reset (scott
   * regime — a limit reached with nothing new firing there). Only ever legal on an `exchangeable`
   * bond — it is the ordinary exchange chemistry, and neither a thioether (`compliant-permanent`)
   * nor a catalyzed lock (`catalyzed`) has one. `forced` = thermal homolysis: no third party,
   * connectivity genuinely drops before it recovers (transfinite regime — "the unauthorized
   * route the whole apparatus exists to avoid"). `forced` is legal on any non-`pinned` bond —
   * `exchangeable`, `compliant-permanent`, or `catalyzed` alike — because it is the one recovery
   * valve strong enough to override even a player's own permanent locks; the cost difference
   * between the two modes, and between reversing an ordinary bond versus a locked one, is the
   * entire point (see `types.mts`'s `BondState` doc and `obstruction.mts`). */
  readonly mode: 'clean' | 'forced';
}

export interface RebondMove {
  readonly verb: 'rebond';
  readonly bondId: string;
  /** The claim the exchanged end moves to (disulfide exchange — a third-party thiolate attacks,
   * displaces, leaves free; connectivity never drops mid-move). */
  readonly toClaimId: string;
}

export interface CatalyzeMove {
  readonly verb: 'catalyze';
  /** The catalyst claim — participates without its own count changing (`N[x,r]=0`). */
  readonly claimId: string;
  /** The exchangeable bond the catalyst locks down to `pinned`. */
  readonly bondId: string;
}

export type Move = MergeMove | SplitMove | RebondMove | CatalyzeMove;

/** What applying one move actually cost, per `obstruction.mts`. */
export interface MoveCost {
  readonly cost: number;
  readonly regime: 'finite' | 'scott' | 'transfinite' | 'aperiodic';
  readonly depth: number;
  readonly temporalH1: number;
  readonly spatialH1: number;
}

export interface MoveResult {
  readonly tangle: Tangle;
  readonly moveCost: MoveCost;
}

/** One entry in a move log — the durable, replayable record (theme digest's "germline"). */
export interface MoveLogEntry {
  readonly move: Move;
}

/** The full state of a run: the seed it started from, the log applied so far, the resulting
 * tangle, and the running total cost — exactly what `replay.mts` folds into existence. */
export interface RunState {
  readonly seed: string;
  readonly log: readonly MoveLogEntry[];
  readonly tangle: Tangle;
  readonly totalCost: number;
  readonly settled: boolean;
}

/** A completed daily run, in the exact shape a future server-side leaderboard endpoint would
 * accept verbatim (README.md): seed + moveLog + the claimed total cost. */
export interface HistoryRecord {
  readonly seed: string;
  readonly moveLog: readonly MoveLogEntry[];
  readonly totalCost: number;
  readonly finishedAt: string; // ISO-8601, injected clock only — see history.mts
}
