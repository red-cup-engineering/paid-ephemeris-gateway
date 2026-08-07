/**
 * Federation — composing many modeled players into one computer, and *computing*
 * the disagreement between them as a bigraded cohomology class.
 *
 * The corpus result (and `cgs/specification.md` §3, "federated delivery or
 * admission" as an event source): **federation IS the multiplicative parallel
 * $\|$** — putting two arenas side by side is the tensor of $\mathbf{CGS}$, the
 * same $\|$ that builds the compound $A^\perp \| B$ a morphism lives on. So a
 * federated computer's arena is the tensor-fold of its members' arenas; an empty
 * federation is the unit (the empty arena, $\top = \bot$).
 *
 * *Disagreement* between federated members — the same cell settled to different
 * charges at different sites — is the obstruction to a global section: a class in
 * $H^1$ of the predication sheaf over the federation cover. Earlier this package
 * *named* that class and deferred it. It is no longer deferred. The bilattice
 * **FOUR** is a product of two independent two-element lattices — a truth side and
 * a falsity side (`bilattice-charge.mts`: `coordinates = [truth, falsity]`) — so a
 * FOUR-valued cochain over the cover splits as a direct sum of two boolean
 * cochains, one per coordinate, and its first cohomology splits with it:
 *
 *   $$H^1(\mathrm{FOUR}\text{-sheaf}) \;\cong\; H^1_t \,\oplus\, H^1_\top,$$
 *
 * the corpus's bigraded **projection fixed point** (`…/voidmath/…/bigraded-h1-
 * projection-fixed-point/…/2026-05-26.md`): $H^1_t$ is the *truth-row* disagreement
 * (sites split affirmation-vs-refutation on a cell's truth coordinate — classical
 * content that a choice could resolve) and $H^1_\top$ is the *inconsistency-row*
 * disagreement (sites split on the falsity coordinate, gluing to the
 * knowledge-top `stable`). The two summands are independent: the knowledge-join
 * that glues the cover is idempotent and coordinate-wise, so the held
 * contradictions (`stable` cells) cannot be re-merged into the classical content —
 * "the paraconsistent content cannot be re-merged with the classical content."
 *
 * The base predication complex the cover sits over carries its own topological
 * $H^1$ (cycle rank of who-predicates-whom), read straight from relationality's
 * own derived `cohomologyOfCells`; this is orthogonal to — and reported alongside
 * — the charge-disagreement class.
 */
import { type Arena, type Event } from "@emsenn/gaming";
import {
  type Cell,
  type ChargeValue,
  type ChargeValueName,
  chargeValue,
  joinKnowledgeValue,
} from "@emsenn/relating";
import { toCount } from "@emsenn/relating/codecs";
import { cohomologyOfCells } from "@emsenn/relating";
import { tensor, unit } from "../categorifying/object.mjs";
import { type SettledMeme, cellEventId } from "./observation.mjs";

/** The federated arena of many members: the $\|$-fold of their arenas (empty → unit). */
export function federate(arenas: readonly Arena[]): Arena {
  if (arenas.length === 0) return unit();
  return arenas.reduce((left, right) => tensor(left, right));
}

/** One member of a federation: a named site and the charges it settled its cells to. */
export interface FederationSite {
  readonly kind: "computing.computer.federation.site";
  readonly site: string;
  readonly memes: readonly SettledMeme[];
}

/** Build a federation site from a name and the memes it settled. */
export const federationSite = (site: string, memes: readonly SettledMeme[]): FederationSite =>
  Object.freeze({ kind: "computing.computer.federation.site" as const, site, memes });

// ---- the bigraded core: a FOUR-valued cover splits along its two coordinates ----

/** The truth-side coordinate name of a charge value (`present`/`absent`). */
const truthSide = (value: ChargeValue): string => value.coordinates[0].name;
/** The falsity-side coordinate name of a charge value (`present`/`absent`). */
const falsitySide = (value: ChargeValue): string => value.coordinates[1].name;

/**
 * The disagreement class of one bilattice coordinate over the cover: the cell ids
 * on which the sites split on that coordinate (both `present` and `absent` occur),
 * each one a generator of $H^1$ in that grading.
 */
export interface CoordinateClass {
  readonly kind: "computing.computer.federation.coordinateClass";
  readonly coordinate: "truth" | "falsity";
  readonly generators: readonly string[];
  readonly rank: number;
  readonly vanishes: boolean;
}

const coordinateClass = (coordinate: "truth" | "falsity", generators: readonly string[]): CoordinateClass =>
  Object.freeze({
    kind: "computing.computer.federation.coordinateClass" as const,
    coordinate,
    generators: Object.freeze([...generators]),
    rank: generators.length,
    vanishes: generators.length === 0,
  });

/**
 * Witness that the first cohomology is the direct sum of its two graded pieces:
 * the total rank equals $H^1_t$ rank plus $H^1_\top$ rank. The truth-generator and
 * falsity-generator id-sets are tagged by distinct coordinates, so they contribute
 * to disjoint summands even when a single cell disagrees on both coordinates — the
 * count by coordinate refines (is $\ge$) the count by cell.
 */
export interface DirectSumWitness {
  readonly kind: "computing.computer.federation.directSum:witness";
  readonly total: number;
  readonly truthRank: number;
  readonly inconsistencyRank: number;
  readonly cellsDisagreeing: number;
}

/**
 * The bigraded first cohomology of a federation cover: $H^1 \cong H^1_t \oplus
 * H^1_\top$, the truth-row and inconsistency-row disagreement classes, with the
 * direct-sum witness.
 */
export interface BigradedH1 {
  readonly kind: "computing.computer.federation.bigradedH1";
  /** $H^1_t$ — truth-coordinate disagreement (classical, resolvable by a choice). */
  readonly truthRow: CoordinateClass;
  /** $H^1_\top$ — falsity-coordinate disagreement (gluing to the held contradiction `stable`). */
  readonly inconsistencyRow: CoordinateClass;
  readonly rank: number;
  readonly decomposition: DirectSumWitness;
}

/** A stalk: per cell id, the charge values the sites that read it settled to. */
type Stalks = ReadonlyMap<string, readonly ChargeValue[]>;

/** Collect the stalks of a set of sites: cell id ↦ the per-site charge values read there. */
function stalksOf(sites: readonly FederationSite[]): Stalks {
  const stalks = new Map<string, ChargeValue[]>();
  for (const site of sites) {
    for (const meme of site.memes) {
      const id = cellEventId(meme.cell);
      const prior = stalks.get(id);
      if (prior === undefined) stalks.set(id, [meme.charge]);
      else prior.push(meme.charge);
    }
  }
  return stalks;
}

/** The bigraded $H^1$ of a stalk cover: split disagreement along each coordinate. */
function bigradedOfStalks(stalks: Stalks): BigradedH1 {
  const truthGenerators: string[] = [];
  const falsityGenerators: string[] = [];
  let cellsDisagreeing = 0;
  for (const [id, charges] of stalks) {
    const truths = new Set(charges.map(truthSide));
    const falsities = new Set(charges.map(falsitySide));
    const truthSplit = truths.size > 1;
    const falsitySplit = falsities.size > 1;
    if (truthSplit) truthGenerators.push(id);
    if (falsitySplit) falsityGenerators.push(id);
    if (truthSplit || falsitySplit) cellsDisagreeing += 1;
  }
  const truthRow = coordinateClass("truth", truthGenerators);
  const inconsistencyRow = coordinateClass("falsity", falsityGenerators);
  const total = truthRow.rank + inconsistencyRow.rank;
  return Object.freeze({
    kind: "computing.computer.federation.bigradedH1" as const,
    truthRow,
    inconsistencyRow,
    rank: total,
    decomposition: Object.freeze({
      kind: "computing.computer.federation.directSum:witness" as const,
      total,
      truthRank: truthRow.rank,
      inconsistencyRank: inconsistencyRow.rank,
      cellsDisagreeing,
    }),
  });
}

// ---- gluing the cover, and the projection fixed point ----

/** One glued cell: its id and the knowledge-join of every site's charge there. */
export interface GluedEntry {
  readonly cellId: string;
  readonly charge: ChargeValueName;
}

/**
 * The glued global section of the cover: each cell carried to the knowledge-join
 * of the sites' charges (the descent's own merge — least upper bound in the
 * knowledge order, "combine all the evidence"). Cells that glue to `stable` are
 * the held contradictions: the irreducibly paraconsistent content.
 */
export interface GluedSection {
  readonly kind: "computing.computer.federation.gluedSection";
  readonly entries: readonly GluedEntry[];
  readonly heldContradictions: readonly string[];
}

function glueStalks(stalks: Stalks): GluedSection {
  const entries: GluedEntry[] = [];
  const held: string[] = [];
  for (const [id, charges] of stalks) {
    const glued = charges.reduce((left, right) => joinKnowledgeValue(left, right));
    entries.push(Object.freeze({ cellId: id, charge: glued.name }));
    if (glued.name === "stable") held.push(id);
  }
  return Object.freeze({
    kind: "computing.computer.federation.gluedSection" as const,
    entries: Object.freeze(entries),
    heldContradictions: Object.freeze(held),
  });
}

/**
 * Witness that the bigraded split is a projection fixed point: re-gluing the
 * glued section leaves it unchanged (the knowledge-join is an idempotent
 * semilattice operation, so a section already glued has no residual disagreement
 * — both rows vanish), and the held contradictions survive re-gluing unaltered —
 * the inconsistency content cannot be re-merged into the classical content.
 */
export interface ProjectionFixedPoint {
  readonly kind: "computing.computer.federation.projectionFixedPoint:witness";
  readonly idempotent: boolean;
  readonly regluedDisagreementRank: number;
  readonly survivingContradictions: readonly string[];
}

function projectionFixedPoint(glued: GluedSection): ProjectionFixedPoint {
  // The glued section as a single-site cover: one charge per cell id.
  const regluedStalks = new Map<string, readonly ChargeValue[]>(
    glued.entries.map((entry) => [entry.cellId, [chargeValue(entry.charge)] as const]),
  );
  const reglued = glueStalks(regluedStalks);
  const idempotent = reglued.entries.every((entry) => {
    const original = glued.entries.find((candidate) => candidate.cellId === entry.cellId);
    return original !== undefined && original.charge === entry.charge;
  });
  return Object.freeze({
    kind: "computing.computer.federation.projectionFixedPoint:witness" as const,
    idempotent,
    regluedDisagreementRank: bigradedOfStalks(regluedStalks).rank,
    survivingContradictions: reglued.heldContradictions,
  });
}

// ---- the full federation cohomology ----

/** The topological $H^1$ of the base predication complex (cycle rank), read from relationality. */
export interface BaseComplexH1 {
  readonly kind: "computing.computer.federation.baseComplexH1";
  readonly rank: number;
  readonly vanishes: boolean;
}

/**
 * The full cohomological reading of a federation: the bigraded charge-disagreement
 * class $H^1_t \oplus H^1_\top$, the glued global section, the base predication
 * complex's topological $H^1$, the projection-fixed-point witness, and the overall
 * agreement judgment (agreement iff the bigraded rank vanishes).
 */
export interface FederationCohomology {
  readonly kind: "computing.computer.federation.cohomology";
  readonly sites: number;
  readonly bigraded: BigradedH1;
  readonly glued: GluedSection;
  readonly baseComplexH1: BaseComplexH1;
  readonly projection: ProjectionFixedPoint;
  readonly agrees: boolean;
}

/** Deduplicate cells by their event id, keeping first occurrence. */
function uniqueCells(sites: readonly FederationSite[]): readonly Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const site of sites) {
    for (const meme of site.memes) {
      const id = cellEventId(meme.cell);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(meme.cell);
      }
    }
  }
  return Object.freeze(out);
}

/**
 * Compute the federation cohomology of a set of charged sites. The disagreement
 * class is computed for real and split bigraded; the base complex's $H^1$ is read
 * from relationality's `cohomologyOfCells` over the union of the cover's cells.
 */
export function federationCohomology(sites: readonly FederationSite[]): FederationCohomology {
  const stalks = stalksOf(sites);
  const bigraded = bigradedOfStalks(stalks);
  const glued = glueStalks(stalks);
  const cells = uniqueCells(sites);
  const base = cohomologyOfCells(cells).firstCohomology;
  const baseRank = toCount(base.rank);
  return Object.freeze({
    kind: "computing.computer.federation.cohomology" as const,
    sites: sites.length,
    bigraded,
    glued,
    baseComplexH1: Object.freeze({
      kind: "computing.computer.federation.baseComplexH1" as const,
      rank: baseRank,
      vanishes: baseRank === 0,
    }),
    projection: projectionFixedPoint(glued),
    agrees: bigraded.rank === 0,
  });
}

// ---- the coarse, events-based overlap check (charge-IS-polarity lifted) ----

export interface FederationAgreement {
  readonly kind: "computing.computer.federation.agreement:witness";
  readonly members: number;
}

export interface FederationDisagreement {
  readonly kind: "computing.computer.federation.disagreement";
  readonly members: number;
  /** Event ids on which the members' lifted charges disagree — the cocycle support. */
  readonly conflictingIds: readonly string[];
  readonly cohomologyClass: "H^1(predication-sheaf)";
  /** The disagreement, now computed and split bigraded rather than deferred. */
  readonly bigraded: BigradedH1;
}

export type FederationJudgment = FederationAgreement | FederationDisagreement;

/** Lift an event's polarity to a charge value (charge-IS-polarity): P ↦ potential, O ↦ active. */
const liftPolarity = (event: Event): ChargeValue =>
  chargeValue(event.polarity.name === "positive" ? "potential" : "active");

/**
 * Whether per-member observations agree where they overlap. Each member is its
 * observed events; polarities are lifted to charges (positive ↦ `potential`,
 * negative ↦ `active`, the same charge-IS-polarity identity `observe` uses) and
 * the bigraded disagreement is computed over the shared ids. Members agree when
 * the bigraded rank vanishes; otherwise the clash is returned as a real, split
 * $H^1$ class — no longer deferred.
 */
export function federationAgreement(members: readonly (readonly Event[])[]): FederationJudgment {
  const stalks = new Map<string, ChargeValue[]>();
  for (const events of members) {
    for (const event of events) {
      const prior = stalks.get(event.id);
      if (prior === undefined) stalks.set(event.id, [liftPolarity(event)]);
      else prior.push(liftPolarity(event));
    }
  }
  const bigraded = bigradedOfStalks(stalks);
  if (bigraded.rank === 0) {
    return Object.freeze({
      kind: "computing.computer.federation.agreement:witness" as const,
      members: members.length,
    });
  }
  const conflicting = new Set<string>([...bigraded.truthRow.generators, ...bigraded.inconsistencyRow.generators]);
  return Object.freeze({
    kind: "computing.computer.federation.disagreement" as const,
    members: members.length,
    conflictingIds: Object.freeze([...conflicting]),
    cohomologyClass: "H^1(predication-sheaf)" as const,
    bigraded,
  });
}
