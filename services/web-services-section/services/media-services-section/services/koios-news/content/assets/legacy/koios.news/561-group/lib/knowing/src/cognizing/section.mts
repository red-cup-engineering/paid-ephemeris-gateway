/**
 * cognizing/section — the C(Meme) knowledge-state grain: helpers over a held section.
 *
 * knowing is the comonad on Meme (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md).
 * Its richer carrier is the comonad CONTEXT C(Meme) = a held SECTION of memes (the
 * knower's whole standing body of knowledge — "the depth is the memory"). These
 * helpers fold a collection of memes into that section by the knowledge order ≤_k
 * (coincident cells joined by `joinKnowledge`, exactly relating's `composeFibers`
 * over a manual base), summarize it into knowing's own `knowing/knowledge-state`
 * carrier, and read the section back out. The fold is confluent: in FOUR, conflicts
 * accumulate as the ≤_k top (stable) rather than trivializing (settling-monotonicity),
 * so the section always glues (sheaf cohomologyVanishes, H¹=0) — `contested` exposes
 * how many cells hold a both-sides-witnessed contradiction settled stable.
 */
import {
  isMeme,
  meme,
  joinKnowledge,
  type JsonValue,
  type Meme,
} from "@emsenn/relating";
import type { KnowledgeState, HeldMeme } from "./carriers.mjs";

/** The FOUR knowledge-order standing named by a meme's charge sides. */
export function standingOf(m: Meme): "absurd" | "active" | "potential" | "stable" {
  const truth = m.charge.value[0].name === "present";
  const falsity = m.charge.value[1].name === "present";
  if (truth && falsity) return "stable";
  if (truth) return "potential";
  if (falsity) return "active";
  return "absurd";
}

/** Whether a cell holds a both-sides-witnessed contradiction settled stable. */
function contestedMeme(m: Meme): boolean {
  return standingOf(m) === "stable" && m.charge.evidence[0].length > 0 && m.charge.evidence[1].length > 0;
}

/** Two cells coincide (wire-structural, the section's equality on Φ = E×Π×E). */
const sameCell = (a: Meme, b: Meme): boolean => JSON.stringify(a.cell) === JSON.stringify(b.cell);

/** Fold memes into a section: coincident cells joined by ≤_k (joinKnowledge). */
export function foldSection(memes: readonly Meme[]): Meme[] {
  const folded: Meme[] = [];
  for (const m of memes) {
    const i = folded.findIndex((f) => sameCell(f, m));
    if (i >= 0) folded[i] = meme(folded[i]!.cell, joinKnowledge(folded[i]!.charge, m.charge));
    else folded.push(m);
  }
  return folded;
}

/** Admit a collection of memes from the wire: an array, or `{ memes: [...] }`. */
export function admitMemes(input: JsonValue, verb: string): Meme[] {
  const raw = Array.isArray(input)
    ? input
    : input !== null && typeof input === "object" && Array.isArray((input as { memes?: unknown }).memes)
      ? (input as { readonly memes: readonly unknown[] }).memes
      : null;
  if (raw === null) throw new TypeError(`${verb}: expected an array of memes or { memes: [...] }`);
  const memes: Meme[] = [];
  for (const x of raw) {
    if (typeof x !== "object" || x === null || !isMeme(x as object)) throw new TypeError(`${verb}: every element must be a meme carrier`);
    memes.push(x as unknown as Meme);
  }
  return memes;
}

/** The held memes of a knowledge-state, read back as relating memes. */
export const heldMemesOf = (state: KnowledgeState): readonly Meme[] => state.memes as unknown as readonly Meme[];

/** Admit a knowledge-state from the wire, refusing a non-state at the boundary. */
export function admitState(input: JsonValue, verb: string): KnowledgeState {
  if (input !== null && typeof input === "object" && !Array.isArray(input)
    && (input as { kind?: unknown }).kind === "knowing.knowledge-state"
    && Array.isArray((input as { memes?: unknown }).memes)) {
    return input as unknown as KnowledgeState;
  }
  throw new TypeError(`${verb}: expected a knowing/knowledge-state carrier (knowing.knowledge-state)`);
}

/** The predicate label a meme's cell carries (its predicate Mark's value). */
const predicateLabel = (m: Meme): string => {
  const value = (m.cell.predicate as { readonly mark?: { readonly value?: unknown } }).mark?.value;
  return value === undefined ? "?" : String(value);
};

/**
 * The canonical structural fingerprint of a held section: the sorted multiset of
 * (predicate-label, ≤_k-standing) over its cells. Two sections are mutually locally
 * derivable iff their fingerprints agree (the H¹-class match, here made concrete).
 */
export function sectionSignature(state: KnowledgeState): string {
  return heldMemesOf(state)
    .map((m) => `${predicateLabel(m)}:${standingOf(m)}`)
    .sort()
    .join("|");
}

/** Summarize a folded section into knowing's own knowledge-state carrier. */
export function summarizeState(base: string, folded: readonly Meme[]): KnowledgeState {
  return {
    kind: "knowing.knowledge-state",
    base,
    memes: folded as unknown as HeldMeme[],
    held: folded.length,
    settled: folded.filter((m) => standingOf(m) === "stable").length,
    contested: folded.filter(contestedMeme).length,
    // the bilattice fold is confluent: conflicts accumulate as the ≤_k top rather than
    // trivializing, so a folded section always glues (sheaf H¹=0). `contested` carries the tension.
    glues: true,
  };
}

/** Build a knowledge-state directly from a collection of memes (fold + summarize). */
export const stateFromMemes = (base: string, memes: readonly Meme[]): KnowledgeState => summarizeState(base, foldSection(memes));

/** A FOUR knowledge-order standing. */
export type Standing = "absurd" | "active" | "potential" | "stable";

// The knowledge order ≤_k on FOUR is the lattice with bottom = absurd, top = stable,
// and potential / active incomparable in between. These tables are its meet and join.
const JOIN_K: { readonly [a in Standing]: { readonly [b in Standing]: Standing } } = {
  absurd: { absurd: "absurd", active: "active", potential: "potential", stable: "stable" },
  active: { absurd: "active", active: "active", potential: "stable", stable: "stable" },
  potential: { absurd: "potential", active: "stable", potential: "potential", stable: "stable" },
  stable: { absurd: "stable", active: "stable", potential: "stable", stable: "stable" },
};
const MEET_K: { readonly [a in Standing]: { readonly [b in Standing]: Standing } } = {
  absurd: { absurd: "absurd", active: "absurd", potential: "absurd", stable: "absurd" },
  active: { absurd: "absurd", active: "active", potential: "absurd", stable: "active" },
  potential: { absurd: "absurd", active: "absurd", potential: "potential", stable: "potential" },
  stable: { absurd: "absurd", active: "active", potential: "potential", stable: "stable" },
};

/** The knowledge-order join ∨_k on FOUR (bottom = absurd). */
export const joinK = (a: Standing, b: Standing): Standing => JOIN_K[a][b];
/** The knowledge-order meet ∧_k on FOUR (top = stable). */
export const meetK = (a: Standing, b: Standing): Standing => MEET_K[a][b];

/** The standing of a meme's cell within a held section: absurd (≤_k bottom) when absent. */
export function lookupStanding(state: KnowledgeState, m: Meme): Standing {
  const key = JSON.stringify(m.cell);
  for (const held of heldMemesOf(state)) {
    if (JSON.stringify(held.cell) === key) return standingOf(held);
  }
  return "absurd";
}
