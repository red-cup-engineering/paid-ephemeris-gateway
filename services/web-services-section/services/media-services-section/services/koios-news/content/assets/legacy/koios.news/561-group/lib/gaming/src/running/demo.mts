/**
 * demo — named demo arenas, so a game can be created without hand-authoring an
 * arena JSON.
 *
 * Per the corpus, "the theory of computing is $\mathbf{CGS}$" (concurrent games
 * with symmetry): an arena is a *polarized prime event structure with a symmetry
 * groupoid* — the board on which Player and Opponent move.  These demos are
 * nothing new: each is a configuration of the `@emsenn/gaming`
 * constructors (`event`, `eventStructure`, `arena`, `discreteArena`) with
 * polarities drawn from the Belnap reading (positive = potential, negative =
 * active).  The `game` scripts and the server both offer them by name so a
 * running game can be minted from a single token.
 */
import { arena, discreteArena, event, eventStructure, positive, negative } from "../index.mjs";
import type { Arena } from "../index.mjs";

/** A demo arena under a stable name plus a one-line description for the dashboard. */
export interface DemoArena {
  readonly name: string;
  readonly description: string;
  readonly arena: Arena;
}

/** The empty board: a discrete event structure with no events — the unit object. */
const emptyArena: Arena = discreteArena(eventStructure([]));

/**
 * A single Opponent question enabling a single Proponent answer: the smallest
 * non-trivial dialogue, a causality edge `q <= a` with `q` negative (active /
 * Opponent) and `a` positive (potential / Proponent).
 */
const dialogueArena: Arena = discreteArena(
  eventStructure(
    [event("q", negative()), event("a", positive())],
    [["q", "a"]],
  ),
);

/**
 * A boolean fork: one Opponent question `q` enables two Proponent answers
 * `tt`, `ff` in conflict — the canonical "choose a branch" arena, with the
 * conflict making the two answers mutually exclusive positions.
 */
const booleanArena: Arena = arena(
  eventStructure(
    [event("q", negative()), event("tt", positive()), event("ff", positive())],
    [["q", "tt"], ["q", "ff"]],
    [["tt", "ff"]],
  ),
);

/** All demo arenas, keyed by name. */
const DEMOS: ReadonlyMap<string, DemoArena> = new Map<string, DemoArena>([
  ["empty", { name: "empty", description: "the empty board: no events (the unit object)", arena: emptyArena }],
  ["dialogue", { name: "dialogue", description: "one Opponent question enabling one Proponent answer (q <= a)", arena: dialogueArena }],
  ["boolean", { name: "boolean", description: "one question forking into two conflicting answers (tt # ff)", arena: booleanArena }],
]);

/** The names of every available demo arena. */
export function demoNames(): readonly string[] {
  return [...DEMOS.keys()];
}

/** Every demo arena, for listing on the dashboard. */
export function demoArenas(): readonly DemoArena[] {
  return [...DEMOS.values()];
}

/** The demo arena registered under `name`, or `undefined`. */
export function demoArena(name: string): DemoArena | undefined {
  return DEMOS.get(name);
}
