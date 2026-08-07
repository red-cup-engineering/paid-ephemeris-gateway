/**
 * The Dialectica paradigm $F(\mathbf{Dial}(\mathbf{Eff}))$ — realizability /
 * Gödel's Dialectica (the effective topos $\mathbf{Eff}$) as a full
 * sub-$*$-autonomous-category of $\mathbf{CGS}$, via Hyland's functor $F$.
 *
 * `games/logic/embeddings.mts::dialectica` names the cut: "concurrent computable
 * games — trivial causality (all events concurrent), pairwise P-P and O-O
 * conflict, no P-O conflict, trivial symmetry groupoid", with the object-map the
 * reused `dialecticaObjectToArena`. Here that becomes an *executable* predicate:
 * `dialecticaMembership(a)` checks a real `Arena` against all four structural
 * conditions, so an arena's Dialectica-ness is decided on its carrier — and the
 * image of every `dialecticaEmbed(object)` is certified to satisfy them.
 *
 * The four cuts (all computed):
 *   - **trivial causality** — no order edges (every move concurrent);
 *   - **full intra-polarity conflict** — every same-polarity pair conflicts (the
 *     "exactly one witness, one challenge per play" discipline);
 *   - **no cross-polarity conflict** — any (witness, challenge) is a joint play;
 *   - **trivial symmetry** — no nominal copy-permutation.
 */
import { type Arena } from "@emsenn/gaming";
import {
  type DialecticaObject,
  type Embedding,
  dialectica,
  dialecticaEmbed,
} from "@emsenn/gaming";
import {
  hasTrivialCausality,
  hasTrivialSymmetry,
  intraPolarityFullyConflicting,
  noCrossPolarityConflict,
} from "./structure.mjs";

export interface DialecticaWitness {
  readonly kind: "computing.paradigm.dialectica:witness";
  readonly arena: Arena;
  readonly trivialCausality: true;
  readonly intraPolarityConflict: true;
  readonly noCrossPolarityConflict: true;
  readonly trivialSymmetry: true;
}

export interface DialecticaObstruction {
  readonly kind: "computing.paradigm.dialectica-obstruction";
  readonly arena: Arena;
  readonly trivialCausality: boolean;
  readonly intraPolarityConflict: boolean;
  readonly noCrossPolarityConflict: boolean;
  readonly trivialSymmetry: boolean;
  readonly reason: string;
}

export type DialecticaJudgment = DialecticaWitness | DialecticaObstruction;

/**
 * Membership of an arena in the Dialectica sub-category $F(\mathbf{Dial}(\mathbf{Eff}))$:
 * trivial causality, full intra-polarity conflict, no cross-polarity conflict,
 * trivial symmetry. All four are checked against the event structure; the first
 * failures are named in `reason`.
 */
export function dialecticaMembership(a: Arena): DialecticaJudgment {
  const structure = a.structure;
  const trivialCausality = hasTrivialCausality(structure);
  const intraPolarityConflict = intraPolarityFullyConflicting(structure);
  const noCross = noCrossPolarityConflict(structure);
  const trivialSymmetry = hasTrivialSymmetry(a);
  if (trivialCausality && intraPolarityConflict && noCross && trivialSymmetry) {
    return Object.freeze({
      kind: "computing.paradigm.dialectica:witness" as const,
      arena: a,
      trivialCausality: true,
      intraPolarityConflict: true,
      noCrossPolarityConflict: true,
      trivialSymmetry: true,
    });
  }
  const failures: string[] = [];
  if (!trivialCausality) failures.push("non-trivial causality (events ordered — not concurrent-computable)");
  if (!intraPolarityConflict) failures.push("intra-polarity pair not in conflict (more than one move per side admissible)");
  if (!noCross) failures.push("cross-polarity conflict present (a witness/challenge pair is not a joint play)");
  if (!trivialSymmetry) failures.push("non-trivial symmetry (nominal, not Dialectica)");
  return Object.freeze({
    kind: "computing.paradigm.dialectica-obstruction" as const,
    arena: a,
    trivialCausality,
    intraPolarityConflict,
    noCrossPolarityConflict: noCross,
    trivialSymmetry,
    reason: failures.join("; "),
  });
}

/** Whether an arena is a Dialectica (concurrent-computable) game. */
export const isDialectica = (a: Arena): boolean =>
  dialecticaMembership(a).kind === "computing.paradigm.dialectica:witness";

/**
 * The object-map of the embedding, reused verbatim from `games/logic`: build the
 * $\mathbf{CGS}$ arena of a Dialectica object $(U, X, \alpha)$. Its image is
 * always a Dialectica game (certified by `dialecticaMembership`).
 */
export const dialecticaArenaOf = (object: DialecticaObject): Arena => dialecticaEmbed(object);

/** The reused `games/logic` embedding carrier naming $F(\mathbf{Dial}(\mathbf{Eff})) \hookrightarrow \mathbf{CGS}$. */
export const dialecticaEmbedding = (): Embedding => dialectica();
