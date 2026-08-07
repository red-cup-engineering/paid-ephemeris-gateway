/**
 * The linear-logic fragment lattice — the poset of $*$-autonomous sub-theories
 * of $\mathbf{CGS}$.
 *
 * Corpus theorem (predication-typed-subtheory-lattice-is-linear-logic-fragment-lattice.md):
 *
 *   $$\mathrm{MLL} \subset \mathrm{MALL} \subset \{\mathrm{ILL}, \mathrm{CLL}\} \subset \mathrm{LL}$$
 *
 * "This lattice is fully classified. Each inclusion is a full $*$-autonomous
 * embedding." The braces are load-bearing: **ILL and CLL are incomparable** —
 * neither $\mathrm{ILL} \le \mathrm{CLL}$ nor $\mathrm{CLL} \le \mathrm{ILL}$.
 * This poset is therefore NOT a chain. We carry the covering relation explicitly
 * and close it reflexively/transitively.
 *
 * Classifying which fragment a proposition lives in: the `Proposition` carrier of
 * this package is CLASSICAL (it has $\parr$ and an involutive `dualProp`), so the
 * connective-subset classifier ranges over the classical chain
 * $\mathrm{MLL} \to \mathrm{MALL} \to \mathrm{CLL} \to \mathrm{LL}$ (the corpus's
 * `⊂` is $*$-autonomous embedding, not connective containment — MLL has $\parr$,
 * which ILL lacks, so MLL ⊄ ILL as connective sets). ILL is represented in the
 * poset for completeness as the intuitionistic sibling (no $\parr$, no $?$) and
 * is documented as not a target of the classical classifier.
 */
import { type Connective, type Proposition, connectivesOf } from "./proposition.mjs";

export type FragmentName = "MLL" | "MALL" | "ILL" | "CLL" | "LL";

export interface Fragment {
  readonly kind: "game.logic.fragment";
  readonly name: FragmentName;
}

const fragments: Readonly<Record<FragmentName, Fragment>> = Object.freeze({
  MLL: Object.freeze({ kind: "game.logic.fragment" as const, name: "MLL" as const }),
  MALL: Object.freeze({ kind: "game.logic.fragment" as const, name: "MALL" as const }),
  ILL: Object.freeze({ kind: "game.logic.fragment" as const, name: "ILL" as const }),
  CLL: Object.freeze({ kind: "game.logic.fragment" as const, name: "CLL" as const }),
  LL: Object.freeze({ kind: "game.logic.fragment" as const, name: "LL" as const }),
});

export const fragment = (name: FragmentName): Fragment => fragments[name];
export const fragmentNames = (): readonly FragmentName[] =>
  Object.freeze(["MLL", "MALL", "ILL", "CLL", "LL"] as const satisfies readonly FragmentName[]);
export const allFragments = (): readonly Fragment[] => fragmentNames().map(fragment);

/**
 * The covering (Hasse) edges of the fragment poset: MLL ⋖ MALL, MALL ⋖ ILL,
 * MALL ⋖ CLL, ILL ⋖ LL, CLL ⋖ LL. Crucially there is NO edge between ILL and
 * CLL in either direction — they are the two incomparable middle nodes.
 */
const coverings: readonly (readonly [FragmentName, FragmentName])[] = Object.freeze([
  Object.freeze(["MLL", "MALL"] as const),
  Object.freeze(["MALL", "ILL"] as const),
  Object.freeze(["MALL", "CLL"] as const),
  Object.freeze(["ILL", "LL"] as const),
  Object.freeze(["CLL", "LL"] as const),
] as const);

export const fragmentCoverings = (): readonly (readonly [FragmentName, FragmentName])[] => coverings;

/**
 * The fragment lattice as an explicit finite poset carrier: the five fragment
 * elements together with the covering (Hasse) edges of the embedding order. The
 * full $\le$ is recovered by `fragmentLeq` (reflexive-transitive closure); the
 * carrier records exactly the corpus poset MLL ⋖ MALL ⋖ {ILL, CLL} ⋖ LL with
 * ILL and CLL incomparable.
 */
export interface FragmentPoset {
  readonly kind: "game.logic.fragmentPoset";
  readonly elements: readonly Fragment[];
  readonly coverings: readonly (readonly [FragmentName, FragmentName])[];
}

export function fragmentPoset(): FragmentPoset {
  return Object.freeze({
    kind: "game.logic.fragmentPoset" as const,
    elements: Object.freeze(allFragments()),
    coverings,
  });
}

export function isFragmentPoset(value: unknown): value is FragmentPoset {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<FragmentPoset>;
  return candidate.kind === "game.logic.fragmentPoset" && Array.isArray(candidate.elements) && Array.isArray(candidate.coverings);
}

/**
 * The reflexive-transitive closure of the covering relation: `fragmentLeq(a, b)`
 * holds iff $a$ embeds (as a $*$-autonomous sub-theory) into $b$. Computed by
 * reachability over `coverings`, so the incomparability of ILL and CLL is exact.
 */
export function fragmentLeq(lower: FragmentName, upper: FragmentName): boolean {
  if (lower === upper) return true;
  const reached: FragmentName[] = [lower];
  for (let index = 0; index < reached.length; index += 1) {
    const at = reached[index]!;
    for (const [from, to] of coverings) {
      if (from === at && !reached.includes(to)) {
        if (to === upper) return true;
        reached.push(to);
      }
    }
  }
  return false;
}

/** Whether two fragments are comparable in the poset (one embeds into the other). */
export const fragmentsComparable = (left: FragmentName, right: FragmentName): boolean =>
  fragmentLeq(left, right) || fragmentLeq(right, left);

/**
 * The connectives admitted by each fragment of the CLASSICAL chain. Atoms and
 * the multiplicatives live in MLL; the additives are added at MALL; the
 * exponentials at CLL; LL admits everything. (ILL is intentionally absent — it is
 * the intuitionistic sibling without $\parr$/$?$, not a node of this classifier.)
 */
function admittedConnectives(name: FragmentName): readonly Connective[] | null {
  // Shifts (↑/↓) are the Andreoli polarity-change operators of the focused/polarized
  // presentation; they manage phase boundaries throughout the hierarchy, so they are
  // admitted from MLL up (carried with the multiplicative core, not a separate tier).
  const multiplicatives: readonly Connective[] = ["atom", "tensor", "par", "one", "bottom", "up", "down"];
  const additives: readonly Connective[] = ["with", "plus", "top", "zero"];
  const exponentials: readonly Connective[] = ["ofCourse", "whyNot"];
  switch (name) {
    case "MLL":
      return Object.freeze([...multiplicatives]);
    case "MALL":
      return Object.freeze([...multiplicatives, ...additives]);
    case "CLL":
    case "LL":
      return Object.freeze([...multiplicatives, ...additives, ...exponentials]);
    case "ILL":
      return null;
  }
}

export interface InFragmentWitness {
  readonly kind: "game.logic.inFragment:witness";
  readonly proposition: Proposition;
  readonly fragment: Fragment;
  readonly used: readonly Connective[];
}

export interface InFragmentObstruction {
  readonly kind: "game.logic.inFragment-obstruction";
  readonly proposition: Proposition;
  readonly fragment: Fragment;
  readonly used: readonly Connective[];
  readonly forbidden: readonly Connective[];
  readonly reason: string;
}

export type InFragmentJudgment = InFragmentWitness | InFragmentObstruction;

/**
 * Witness/obstruction that proposition $p$ lives in fragment $F$: $p$ is in $F$
 * iff every connective it uses is admitted by $F$. ILL is never a target (it is
 * not on the classical chain this carrier inhabits); asking for it yields an
 * obstruction naming the reason.
 */
export function inFragment(p: Proposition, name: FragmentName): InFragmentJudgment {
  const used = connectivesOf(p);
  const admitted = admittedConnectives(name);
  if (admitted === null) {
    return Object.freeze({
      kind: "game.logic.inFragment-obstruction" as const,
      proposition: p,
      fragment: fragment(name),
      used,
      forbidden: used,
      reason: "ILL is the intuitionistic sibling (no par, no why-not); classical propositions are classified on the MLL<MALL<CLL<LL chain",
    });
  }
  const forbidden = Object.freeze(used.filter((connective) => !admitted.includes(connective)));
  return forbidden.length === 0
    ? Object.freeze({
      kind: "game.logic.inFragment:witness" as const,
      proposition: p,
      fragment: fragment(name),
      used,
    })
    : Object.freeze({
      kind: "game.logic.inFragment-obstruction" as const,
      proposition: p,
      fragment: fragment(name),
      used,
      forbidden,
      reason: `proposition uses connectives not admitted by ${name}: ${forbidden.join(", ")}`,
    });
}

export const isInFragment = (p: Proposition, name: FragmentName): boolean =>
  inFragment(p, name).kind === "game.logic.inFragment:witness";

/**
 * The least fragment of the classical chain containing $p$ — the tightest
 * $*$-autonomous sub-theory it inhabits. Returns the first of MLL, MALL, CLL, LL
 * (in embedding order) that admits every connective of $p$.
 */
export function classifyFragment(p: Proposition): Fragment {
  const chain: readonly FragmentName[] = ["MLL", "MALL", "CLL", "LL"];
  for (const name of chain) {
    if (isInFragment(p, name)) return fragment(name);
  }
  return fragment("LL");
}

export function isFragment(value: unknown): value is Fragment {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Fragment>;
  return candidate.kind === "game.logic.fragment" && fragmentNames().includes(candidate.name as FragmentName);
}
