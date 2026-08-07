/**
 * The typed-theory-of-computing theorem, assembled on real carriers.
 *
 * The load-bearing corpus result: $\mathbf{CGS}$ IS the theory of computing —
 * four established traditions embed as full, pairwise-distinct
 * sub-$*$-autonomous-categories, jointly spanning typed computation, and the
 * lattice of typed sub-theories is exactly the linear-logic fragment lattice
 * $\mathrm{MLL} \subset \mathrm{MALL} \subset \{\mathrm{ILL}, \mathrm{CLL}\}
 * \subset \mathrm{LL}$. `games/logic` names the four embeddings and the fragment
 * poset as data; the `paradigm/*` modules made each membership *executable*. This
 * module ties them together and *exhibits* the theorem: it builds one concrete
 * inhabitant of each paradigm on an actual arena/strategy/session carrier and
 * runs the real membership predicate on it, so "all four embed simultaneously" is
 * demonstrated, not merely asserted.
 *
 * The subtheory lattice is the reused `fragmentPoset()` — not re-encoded — and
 * `subtheoryLattice()` exposes it as the partial order of $*$-autonomous
 * sub-theories, with `ILL` and `CLL` incomparable exactly as the corpus requires.
 */
import { type Arena, arena, event, eventStructure, positive } from "@emsenn/gaming";
import {
  type Embedding,
  type EmbeddingName,
  type FragmentPoset,
  type SessionType,
  dialecticaObject,
  embeddings,
  fragmentPoset,
  sessionEnd,
  sessionSend,
} from "@emsenn/gaming";
import { eventName, transposition } from "@emsenn/gaming/structuring";
import { copycat } from "../categorifying/morphism.mjs";
import { bang } from "../categorifying/exponential.mjs";
import { dialecticaArenaOf, dialecticaMembership, isDialectica } from "./dialectica.mjs";
import { isNominal, nominalMembership } from "./nominal.mjs";
import { isSequential, sequentialMembership } from "./sequential.mjs";
import { isSession, sessionMembership } from "./session.mjs";

/** The four computing paradigms, named identically to the `games/logic` embeddings. */
export type ParadigmName = EmbeddingName;

/** A one-event positive arena — the smallest nontrivial sequential game type. */
const singleton = (id: string): Arena => arena(eventStructure([event(id, positive())], [], []));

const nominalCopyInput = () => Object.freeze({
  labels: Object.freeze([
    eventName("c0|a", "c0"),
    eventName("c1|a", "c1"),
  ]),
  permutations: Object.freeze([transposition("c0", "c1")]),
});

/**
 * The theory-of-computing carrier: the four embeddings (reused from
 * `games/logic`), the subtheory lattice (the reused fragment poset), and the
 * paradigm roster.
 */
export interface TheoryOfComputing {
  readonly kind: "computing.paradigm.theory";
  readonly embeddings: readonly Embedding[];
  readonly subtheoryLattice: FragmentPoset;
  readonly paradigms: readonly ParadigmName[];
}

/** The assembled theory of computing — $\mathbf{CGS}$ with its four embeddings and fragment lattice. */
export function theoryOfComputing(): TheoryOfComputing {
  return Object.freeze({
    kind: "computing.paradigm.theory" as const,
    embeddings: embeddings(),
    subtheoryLattice: fragmentPoset(),
    paradigms: Object.freeze(["hylandOng", "dialectica", "nominal", "cairesPfenning"] as const),
  });
}

/** The lattice of $*$-autonomous sub-theories — the reused LL fragment poset. */
export const subtheoryLattice = (): FragmentPoset => fragmentPoset();

export interface SimultaneousEmbeddingWitness {
  readonly kind: "computing.paradigm.simultaneousEmbedding:witness";
  /** For each paradigm, whether a concrete inhabitant was certified by its membership predicate. */
  readonly inhabited: Readonly<Record<ParadigmName, boolean>>;
}

export interface SimultaneousEmbeddingObstruction {
  readonly kind: "computing.paradigm.simultaneousEmbedding-obstruction";
  readonly inhabited: Readonly<Record<ParadigmName, boolean>>;
  readonly reason: string;
}

export type SimultaneousEmbeddingJudgment =
  | SimultaneousEmbeddingWitness
  | SimultaneousEmbeddingObstruction;

/**
 * Exhibit the theorem "all four paradigms embed simultaneously" by constructing a
 * concrete inhabitant of each on a real carrier and running its membership
 * predicate:
 *
 *   - **sequential** — the copycat $\mathrm{cc}_A$ of a one-event arena: trivial
 *     symmetry, alternating, innocent;
 *   - **nominal** — $!^{(2)}A$ (two interchangeable copies): the $S_2$ copy-
 *     permutation gives a non-trivial symmetry groupoid;
 *   - **dialectica** — the arena of the Dialectica object $(\{u_1,u_2\},
 *     \{x_1,x_2\})$: trivial causality, full intra-polarity conflict, no cross
 *     conflict, trivial symmetry;
 *   - **session** — the session $\mathbf{send}(\mathbf{end}, \mathbf{end})
 *     \mapsto 1 \otimes 1$, in the CLL fragment.
 *
 * A witness iff every inhabitant is certified; otherwise an obstruction naming the
 * empty paradigms.
 */
export function simultaneousEmbeddingJudgment(): SimultaneousEmbeddingJudgment {
  const a = singleton("a");
  const sequentialInhabitant = copycat(a);
  const nominalInhabitant = bang(a, 2);
  const dialecticaInhabitant = dialecticaArenaOf(dialecticaObject(["u1", "u2"], ["x1", "x2"]));
  const sessionInhabitant: SessionType = sessionSend(sessionEnd(), sessionEnd());

  const inhabited: Record<ParadigmName, boolean> = {
    hylandOng: isSequential(sequentialInhabitant),
    nominal: isNominal(nominalInhabitant, nominalCopyInput()),
    dialectica: isDialectica(dialecticaInhabitant),
    cairesPfenning: isSession(sessionInhabitant),
  };
  const frozen = Object.freeze({ ...inhabited });
  const empty = (Object.keys(inhabited) as ParadigmName[]).filter((name) => !inhabited[name]);
  if (empty.length === 0) {
    return Object.freeze({
      kind: "computing.paradigm.simultaneousEmbedding:witness" as const,
      inhabited: frozen,
    });
  }
  return Object.freeze({
    kind: "computing.paradigm.simultaneousEmbedding-obstruction" as const,
    inhabited: frozen,
    reason: `paradigms with no certified inhabitant: ${empty.join(", ")}`,
  });
}

/**
 * The full membership reports for the canonical inhabitants — the verbose form of
 * `simultaneousEmbeddingJudgment`, exposing each paradigm's witness/obstruction
 * (not just the boolean) for inspection and testing.
 */
export function paradigmInhabitants(): {
  readonly sequential: ReturnType<typeof sequentialMembership>;
  readonly nominal: ReturnType<typeof nominalMembership>;
  readonly dialectica: ReturnType<typeof dialecticaMembership>;
  readonly session: ReturnType<typeof sessionMembership>;
} {
  const a = singleton("a");
  return Object.freeze({
    sequential: sequentialMembership(copycat(a)),
    nominal: nominalMembership(bang(a, 2), nominalCopyInput()),
    dialectica: dialecticaMembership(dialecticaArenaOf(dialecticaObject(["u1", "u2"], ["x1", "x2"]))),
    session: sessionMembership(sessionSend(sessionEnd(), sessionEnd())),
  });
}

export function isTheoryOfComputing(value: unknown): value is TheoryOfComputing {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TheoryOfComputing>;
  return candidate.kind === "computing.paradigm.theory";
}
