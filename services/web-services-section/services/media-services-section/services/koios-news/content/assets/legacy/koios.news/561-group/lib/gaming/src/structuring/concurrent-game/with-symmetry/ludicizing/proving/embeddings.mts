/**
 * The four embeddings that make $\mathbf{CGS}$ THE theory of computing.
 *
 * Corpus (concurrent-game-category journal, "Four full sub-$*$-autonomous-
 * categories"; the typed-theory-of-computing theorem): four established
 * traditions embed as full, pairwise-distinct sub-$*$-autonomous-categories of
 * $\mathbf{CGS}$, jointly spanning the typed theory of computing. This module
 * names each as a data-carrying functor into $\mathbf{CGS}$, with the object-map
 * realized where tractable:
 *
 *   1. Hyland-Ong sequential ($\mathbf{CGS}_{\mathrm{HO}}$): innocent /
 *      deterministic strategies on alternating, well-bracketed, trivial-symmetry
 *      arenas — the SEQUENTIAL fragment, PCF-fully-abstract (Hyland-Ong 1996/2000;
 *      Abramsky-Jagadeesan-Malacaria 2000). [hyland2000]
 *   2. Dialectica-via-$F$ ($F(\mathbf{Dial}(\mathbf{Eff}))$): objects $(U, X,
 *      \alpha)$ with $U$ = P-events, $X$ = O-events; trivial causality, all-pairs
 *      intra-polarity conflict, trivial symmetry — the CONCURRENT COMPUTABLE
 *      fragment (Hyland 2002; de Paiva 1989). The object-map is the reused
 *      `dialecticaObjectToArena`. [depaiva1989]
 *   3. AGMOS nominal ($\mathbf{CGS}_{\mathrm{AGMOS}}$): $\mathrm{FSym}(\mathbb{A})$-
 *      symmetric arenas — strategy equivalence becomes nominal equivariance /
 *      finite support; the symmetry groupoid (already game-algebra's `Arena`
 *      machinery) IS the embedding's content (Abramsky-Ghica-Murawski-Ong-Stark
 *      2004). [abramsky2004]
 *   4. Caires-Pfenning session-typed ($\mathbf{CGS}_{\mathrm{CLL}}$): session
 *      types as CLL propositions, cut = communication = strategy composition
 *      (Caires-Pfenning 2010; Wadler 2012). The object-map is the existing
 *      `propositionOfSession`. [caires2010]
 *
 * Each embedding is recorded as a frozen carrier naming its source theory, its
 * $\mathbf{CGS}$ sub-category, the structural constraint that cuts it out, and its
 * full-abstraction / faithfulness theorem; the two whose object-map is tractable
 * additionally expose a realizing function (reused, not reinvented).
 *
 * Reference castellan2014 (Castellan-Clairambault-Winskel 2014, "Symmetry in
 * Concurrent Games") for the ambient $\mathbf{CGS}$ these all land in.
 */
import { type Arena } from "../../index.mjs";
import {
  type DialecticaObject,
  dialecticaObjectToArena,
} from "./dialectica.mjs";
import { type Proposition } from "./proposition.mjs";
import { type SessionType, propositionOfSession } from "./session.mjs";

/** The four sub-$*$-autonomous-categories of $\mathbf{CGS}$, by name. */
export type EmbeddingName = "hylandOng" | "dialectica" | "nominal" | "cairesPfenning";

export const embeddingNames = (): readonly EmbeddingName[] =>
  Object.freeze(["hylandOng", "dialectica", "nominal", "cairesPfenning"] as const satisfies readonly EmbeddingName[]);

/**
 * A named embedding $E \to \mathbf{CGS}$ recorded as data: the source theory, the
 * $\mathbf{CGS}$ sub-category it carves out, the structural constraint defining
 * that sub-category, the citation, and the full-abstraction / faithfulness
 * theorem it realizes.
 */
export interface Embedding {
  readonly kind: "game.logic.embedding";
  readonly name: EmbeddingName;
  /** The source theory being embedded. */
  readonly source: string;
  /** The full sub-$*$-autonomous-category of $\mathbf{CGS}$ that is the image. */
  readonly subcategory: string;
  /** The structural constraint that cuts the sub-category out of $\mathbf{CGS}$. */
  readonly constraint: string;
  /** The bibliographic corpus key. */
  readonly citation: string;
  /** The full-abstraction or full-faithfulness theorem realized by the embedding. */
  readonly theorem: string;
}

const embedding = (data: Omit<Embedding, "kind">): Embedding =>
  Object.freeze({ kind: "game.logic.embedding" as const, ...data });

/**
 * The Hyland-Ong embedding: sequential typed computation as innocent /
 * deterministic strategies on alternating, well-bracketed, trivial-symmetry
 * arenas. The object-map (PCF types → arenas) is not realized here — it needs the
 * full arena-former for alternating game types — so this is the data carrier
 * only; the constraint NAMES the alternating fragment.
 */
export const hylandOng = (): Embedding =>
  embedding({
    name: "hylandOng",
    source: "Hyland-Ong sequential typed computation (PCF)",
    subcategory: "CGS_HO",
    constraint:
      "innocent (deterministic, positional) strategies on arenas that are alternating, well-bracketed, deterministic, with trivial symmetry groupoid — the sequential fragment",
    citation: "hyland2000",
    theorem:
      "Hyland-Ong 1996/2000 (with Abramsky-Jagadeesan-Malacaria 2000): the denotational functor PCF → CGS_HO is fully abstract — observational equivalence iff equal innocent strategy denotation.",
  });

/**
 * The Dialectica embedding $F : \mathbf{Dial}(\mathbf{Eff}) \to \mathbf{CGS}$. Its
 * object-map IS realized: `dialecticaEmbed(object)` reuses
 * `dialecticaObjectToArena` to build the polarized event structure with P-events
 * $U$, O-events $X$, trivial causality, intra-polarity conflict, trivial symmetry.
 */
export const dialectica = (): Embedding =>
  embedding({
    name: "dialectica",
    source: "Dialectica category Dial(Eff) — realizability / Gödel's Dialectica (Hyland 2002, de Paiva 1989)",
    subcategory: "F(Dial(Eff))",
    constraint:
      "concurrent computable games: trivial causality (all events concurrent), pairwise P-P and O-O conflict, no P-O conflict, trivial symmetry groupoid",
    citation: "depaiva1989",
    theorem:
      "Hyland 2002: F is a fully faithful *-autonomous functor; its image is the full sub-*-autonomous-category of concurrent computable games with trivial symmetry. F^! carries Eff into the Kleisli sub-CCC of CGS.",
  });

/**
 * The object-map of the Dialectica embedding: a Dialectica object $(U, X, \alpha)$
 * to its $\mathbf{CGS}$ arena. Reuses `dialecticaObjectToArena` (defined once in
 * `dialectica.mts`) — this is the tractable object component of $F$.
 */
export const dialecticaEmbed = (object: DialecticaObject): Arena => dialecticaObjectToArena(object);

/**
 * The AGMOS nominal embedding: nominal computation ($\nu$-calculus) as equivariant
 * strategies on $\mathrm{FSym}(\mathbb{A})$-symmetric arenas. The defining feature
 * is the NON-TRIVIAL symmetry groupoid — already game-algebra's `Arena.symmetry`;
 * the embedding reuses arena symmetry rather than minting nominal machinery. No
 * separate object-map is realized (it requires the full $\mathrm{FSym}(\mathbb{A})$
 * groupoid former); the constraint names the equivariance condition.
 */
export const nominal = (): Embedding =>
  embedding({
    name: "nominal",
    source: "AGMOS nominal computation (nu-calculus, fresh-name allocation)",
    subcategory: "CGS_AGMOS",
    constraint:
      "arenas whose symmetry groupoid contains FSym(A) (finite name-permutations); strategies equivariant under the FSym(A)-action — the finite-support condition of nominal sets, carried by game-algebra Arena symmetry",
    citation: "abramsky2004",
    theorem:
      "Abramsky-Ghica-Murawski-Ong-Stark 2004: the denotational functor nuC → CGS_AGMOS is fully abstract; equivariance (nominal equivariance) is preserved by strategy composition.",
  });

/**
 * The Caires-Pfenning embedding: session-typed concurrency as CLL propositions
 * and proofs. Its object-map IS realized via the existing `propositionOfSession`
 * (the CLL-fragment object-map already in `session.mts`): a session type maps to
 * its CLL proposition, the syntactic name of a $\mathbf{CGS}_{\mathrm{CLL}}$
 * behaviour.
 */
export const cairesPfenning = (): Embedding =>
  embedding({
    name: "cairesPfenning",
    source: "Caires-Pfenning session-typed concurrency (session pi-calculus)",
    subcategory: "CGS_CLL",
    constraint:
      "arenas corresponding to classical linear logic propositions, with both ! and ? present and (-)^perp involutive at every object — the CLL fragment",
    citation: "caires2010",
    theorem:
      "Caires-Pfenning 2010 / Wadler 2012: the map session-typed process → CLL proof → concurrent strategy is full and faithful; cut-elimination = channel communication = strategy composition.",
  });

/**
 * The object-map of the Caires-Pfenning embedding: a session type to the CLL
 * proposition naming its $\mathbf{CGS}_{\mathrm{CLL}}$ behaviour. Reuses the
 * existing `propositionOfSession` — the embedding does not reimplement the map.
 */
export const cairesPfenningEmbed = (session: SessionType): Proposition => propositionOfSession(session);

/** All four embeddings, in canonical order. */
export const embeddings = (): readonly Embedding[] =>
  Object.freeze([hylandOng(), dialectica(), nominal(), cairesPfenning()]);

/** Look up an embedding carrier by name. */
export function embeddingByName(name: EmbeddingName): Embedding {
  switch (name) {
    case "hylandOng":
      return hylandOng();
    case "dialectica":
      return dialectica();
    case "nominal":
      return nominal();
    case "cairesPfenning":
      return cairesPfenning();
  }
}

export function isEmbeddingName(value: unknown): value is EmbeddingName {
  return typeof value === "string" && embeddingNames().includes(value as EmbeddingName);
}

export function isEmbedding(value: unknown): value is Embedding {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Embedding>;
  return candidate.kind === "game.logic.embedding" && isEmbeddingName(candidate.name);
}
