/**
 * genre — the synthesis object of the affect/dramaturgy frontier (first cut): GENRE = behaviour ×
 * affect-arc, with Berlant's IMPASSE as its pathology (dev/docs/notes in @emsenn/gaming,
 * 2026-06-25-affect-and-dramaturgy-in-play.md).
 *
 * A genre is two things at once. FORMALLY it is a behaviour — the set of plays that "count" within a
 * frame (in full ludics, designs closed under bi-orthogonality; here, a set of chronicles, each a
 * sanctioned play of the genre). AFFECTIVELY it is Berlant's genre (Cruel Optimism, 2011): a promised
 * FEELING-ARC, an expectation of how the affect of a play will move from opening to close
 * (tension→release, escalation→catharsis, …). The killer case is the IMPASSE — Berlant's genre of
 * stuckness — a genre in which NO play resolves: every chronicle ends in a Daimon (give-up), never at a
 * played-out leaf. That is cruel optimism formalized: a frame you keep playing because it lets you
 * neither win nor leave, only surrender-and-continue.
 *
 * Reads the affect-arc with `playAffect` (./affect.mts) over the genre's chronicles; consumes nothing
 * else. A chronicle resolves iff it ends at a leaf (its last action is not the Daimon).
 */
import type { Chronicle } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";
import { playAffect, type AffectName } from "./affect.mjs";

const resolves = (c: Chronicle): boolean => {
  const last = c.actions[c.actions.length - 1];
  return last !== undefined && last.variety !== "daimon";
};

/** The affect-arc of a genre's exemplar play: the dominant affect of its opening vs its closing half. */
export interface AffectArc {
  /** the dominant affect of the opening half of the exemplar play. */
  readonly opening: AffectName;
  /** the dominant affect of the closing half. */
  readonly closing: AffectName;
  /** the arc MOVES (opening ≠ closing) — a genre that takes its players somewhere affectively, vs a flat
   *  genre that holds one affect throughout. */
  readonly moves: boolean;
}

/** The genre reading over a set of sanctioned plays (the behaviour's chronicles). */
export interface Genre {
  readonly kind: "playing.genre";
  /** the number of sanctioned plays (the behaviour's chronicles). */
  readonly plays: number;
  /** plays that RESOLVE — end at a played-out leaf, not a give-up. */
  readonly resolving: number;
  /** plays that end in SURRENDER — a Daimon (†) give-up. */
  readonly surrenders: number;
  /** the IMPASSE (Berlant): plays exist but NONE resolves — every play only ever gives up. Cruel
   *  optimism: a genre you can neither win nor leave. */
  readonly impasse: boolean;
  /** the affect-arc of the exemplar (longest) play — opening affect → closing affect. */
  readonly arc: AffectArc;
  /** the most common dominant affect across all plays — the genre's affective signature. */
  readonly signature: AffectName;
}

function exemplar(chronicles: readonly Chronicle[]): Chronicle | undefined {
  let longest: Chronicle | undefined;
  for (const c of chronicles) if (longest === undefined || c.actions.length > longest.actions.length) longest = c;
  return longest;
}

function halves(c: Chronicle): { readonly opening: Chronicle; readonly closing: Chronicle } {
  const mid = Math.ceil(c.actions.length / 2);
  return {
    opening: Object.freeze({ kind: "game.chronicle" as const, actions: Object.freeze(c.actions.slice(0, mid)) }),
    closing: Object.freeze({ kind: "game.chronicle" as const, actions: Object.freeze(c.actions.slice(mid)) }),
  };
}

function signatureAffect(chronicles: readonly Chronicle[]): AffectName {
  const tally = new Map<AffectName, number>();
  for (const c of chronicles) {
    const affect = playAffect(c).dominant;
    tally.set(affect, (tally.get(affect) ?? 0) + 1);
  }
  let best: AffectName = "interest";
  let bestCount = -1;
  for (const [affect, count] of tally) if (count > bestCount) { bestCount = count; best = affect; }
  return best;
}

/**
 * genre — read a genre off the set of plays that count within its frame (the behaviour's chronicles):
 * how many resolve vs surrender, whether it is an IMPASSE (no play resolves — Berlant's cruel optimism),
 * the affect-arc of its exemplar play (opening affect → closing affect), and its affective signature.
 * The formal half (which plays count) is the behaviour the caller supplies; this reads the felt half.
 */
export function genre(chronicles: readonly Chronicle[]): Genre {
  const plays = chronicles.length;
  const resolving = chronicles.filter(resolves).length;
  const surrenders = chronicles.filter((c) => c.actions[c.actions.length - 1]?.variety === "daimon").length;
  const sample = exemplar(chronicles);
  const arc: AffectArc = sample === undefined
    ? { opening: "interest", closing: "interest", moves: false }
    : (() => {
        const { opening, closing } = halves(sample);
        const o = playAffect(opening).dominant;
        const c = playAffect(closing).dominant;
        return { opening: o, closing: c, moves: o !== c };
      })();
  return Object.freeze({
    kind: "playing.genre" as const,
    plays,
    resolving,
    surrenders,
    impasse: plays > 0 && resolving === 0,
    arc,
    signature: signatureAffect(chronicles),
  });
}
