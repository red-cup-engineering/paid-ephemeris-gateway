/**
 * organizing — the social gluing node: organizing's apex.
 *
 * organizing is the social-scale reading of `governing`: the settling of an open
 * plurality of agents into one bounded, law-bearing collective. It is the Gen-2
 * (inter-agent) lift of @emsenn/animating's holographic node — but NOT a mere
 * re-skin of it. The off-diagonal carries structure the diagonal cannot, and this
 * module realizes it:
 *
 *   - The gluing is a CROSS-ARENA Mayer–Vietoris over a cover of constituents
 *     (`crossArena`). On the diagonal the cover is one agent's three faces — they
 *     cannot contest, so they glue coordination-free. Off the diagonal the cover is
 *     MANY agents, so disagreement appears — but by the corpus's cross-arena MV
 *     (cross-arena-mayer-vietoris.md) disagreement-pairs live in ker(δ) and are
 *     TOLERATED (recorded ⊤, adjudicated locally), contributing NO obstruction; the
 *     genuine obstruction is `federationOnly` = coker(diff), content no single
 *     constituent can express. So a society can be glued yet deeply contested.
 *   - `adjudicate` is the gluing act — "the receiving dual of speaking" (the corpus's
 *     act of governing) — which RECEIVES many constituent sections and decomposes
 *     their merge. This is the genuinely off-diagonal act: one agent's own faces have
 *     no adjudication sibling. By Arrow/Gibbard–Satterthwaite (social-choice.md) the
 *     consensus cost it reports can be IRREDUCIBLE — the off-diagonal is the home of
 *     coordination impossibility, which the always-gluing diagonal never meets.
 *   - the four SOCIAL-DESCENT readings mirror animating's four regime readings —
 *     `socialBecoming` → `relating` → `community` → `institution` (the intrinsic
 *     settled order). The organization is the interior bulk; `socialFactor` is the
 *     per-face act-factorization.
 *   - `assemble` makes the spiral concrete: real @emsenn/animating agents re-enter as
 *     the literal constituents of the cross-arena cover.
 *   - `federate` realizes federation = PARALLEL COMPOSITION ‖ (federation-is-parallel-
 *     composition.md): it ‖-composes constituent societies, with shared members as
 *     nominal-set NAME-PASSING (FSym(𝔸)) overlap, and reads the cross-arena MV.
 *
 * The agent base and the descent substrate are reused wholesale from
 * @emsenn/animating; the three faces are threaded, not absorbed. See
 * dev/docs/notes/2026-06-21-animating-organizing-exact-mirror.md.
 */
import {
  knowledgeAggregateOfCensus,
  analysis,
  readFirstCohomologyOfSettlementFiltration,
  sectionOf,
  type JsonValue,
  type SectionCarrier,
  type SectionEntry,
  type UtteranceCarrier,
} from "@emsenn/relating";
import { cell, type RWILWitness } from "@emsenn/relating/ledger";
import {
  admitSeed,
  descend,
  chargeValueOfCarrier,
  type Agent,
  type DescentState,
} from "@emsenn/animating";
import { socializingFace, aggregatePreferences } from "@emsenn/socializing";
import { computingFace, eventualConsistency, type ComputingFace } from "@emsenn/computing";
import { gamingFace, reachability } from "@emsenn/gaming";
import type { Organization } from "./schemas.mjs";
import type { Telos } from "./schemas.mjs";
import type { Adjudication } from "./schemas.mjs";
import type { Face } from "./schemas.mjs";
import type { Relating } from "./schemas.mjs";
import type { Community } from "./schemas.mjs";
import type { SocialBecoming } from "./schemas.mjs";
import type { Institution } from "./schemas.mjs";
import type { InstitutionMembrane } from "./schemas.mjs";
import type { SocialFactorization } from "./schemas.mjs";
import type { Federation } from "./schemas.mjs";
import type { SocialProjection } from "./schemas.mjs";
import { organizationSymmetryCarrier, organizationStanceCarrier, governanceCarrier, cohesionCarrier, type OrganizationSymmetry, type OrganizationStance, type Governance, type OrganizationCohesion } from "./carriers.mjs";
// value reference so the TypeBox carriers register their $id in relating's category on import.
void organizationSymmetryCarrier;
void organizationStanceCarrier;
void governanceCarrier;
void cohesionCarrier;

/** The faces of the social boundary, in canonical order: across, inside, outside. */
const FACULTIES = ["socializing", "computing", "gaming"] as const;
type Faculty = (typeof FACULTIES)[number];

const FACE_DIRECTION: Readonly<Record<Faculty, Face["direction"]>> = Object.freeze({
  socializing: "across",
  computing: "inside",
  gaming: "outside",
});

/** The provisional agentive-triad axis each Gen-2 faculty works (mirrors Gen-1). */
const FACULTY_AXIS: Readonly<Record<Faculty, SocialFactorization["axis"]>> = Object.freeze({
  socializing: "truth",
  computing: "knowledge",
  gaming: "evidence",
});

/** A three-faced social boundary input: an inter-agent membrane seed per face. */
export interface SocialBoundary {
  readonly socializing?: JsonValue;
  readonly computing?: JsonValue;
  readonly gaming?: JsonValue;
}

/** Options for building an organization: its identity. */
export interface OrganizationOptions {
  readonly identity?: string;
}

/** The empty FOUR census — nothing told on any adjudication corner of the axis. */
const EMPTY_BELNAP: Face["belnap"] = Object.freeze({ absurd: 0, potential: 0, active: 0, stable: 0 });

const emptyFace = (faculty: Faculty): Face =>
  ({ kind: "organizing.face", faculty, direction: FACE_DIRECTION[faculty], axis: FACULTY_AXIS[faculty], cover: 0, held: 0, contested: 0, belnap: EMPTY_BELNAP, obstruction: 0, aggregate: "absurd" });

function hasContent(seed: JsonValue | undefined): seed is JsonValue {
  if (seed === undefined) return false;
  if (typeof seed === "string") return seed.trim() !== "";
  if (Array.isArray(seed)) return seed.length > 0;
  return false;
}

const chargeName = (entry: SectionEntry): string => chargeValueOfCarrier(entry.charge).name;

const countNamed = (section: SectionCarrier, name: string): number =>
  section.entries.filter((entry) => chargeName(entry) === name).length;

/** The members of a settled social descent: distinct agent-entities in the base. */
const memberCount = (state: DescentState): number => state.site.cells.entities.entities.length;

// ── the cross-arena Mayer–Vietoris (the genuinely off-diagonal gluing) ──────────

/** One constituent arena of a social cover: a named agent/society and its membrane. */
export interface Constituent {
  readonly name: string;
  readonly utterances: readonly UtteranceCarrier[];
}

/** A cell's `subject|predicate` key. */
const cellKey = (cell: SectionEntry["cell"]): string =>
  `${String(cell.subject.mark.value)}|${String(cell.predicate.mark.value)}`;

/** Settle a membrane alone and read its settled cells as cellKey → charge-name. */
function settledCharges(utterances: readonly UtteranceCarrier[]): Map<string, string> {
  const charges = new Map<string, string>();
  if (utterances.length === 0) return charges;
  for (const entry of sectionOf(descend(utterances).readings.knowledgeLeast).entries) {
    charges.set(cellKey(entry.cell), chargeName(entry));
  }
  return charges;
}

/** The cells carrying a degree-1 cohomology generator of a membrane's settlement —
 *  the non-Scott (limit-stage) firings, the genuine H¹ obstructions to Scott-continuity. */
function h1Cells(utterances: readonly UtteranceCarrier[]): Set<string> {
  if (utterances.length === 0) return new Set();
  const cohomology = readFirstCohomologyOfSettlementFiltration(descend(utterances).filtration);
  return new Set(cohomology.generators.map((generator) => cellKey(generator.cell)));
}

/** The cross-arena Mayer–Vietoris decomposition of a cover into the three corpus
 *  classes (cross-arena-mayer-vietoris.md): `shared` overlap-kernel (agreements that
 *  lift free), `contested` disagreement-pairs on overlaps (ker(δ) — tolerated, no
 *  obstruction), and `federationOnly` = coker(diff) (the H¹ obstructions the merge
 *  introduces that no single constituent carries — the genuine federation-level
 *  obstruction). `nameMobility` counts members shared across ≥2 constituents (the
 *  name-passing overlap).
 *
 *  `federationOnly` is computed EXACTLY from the proved settling-cohomology
 *  (`readFirstCohomologyOfSettlementFiltration`): the merged settlement's H¹ generators
 *  (non-Scott / limit-stage firings) whose cell is not an H¹ generator of any
 *  constituent. This respects the corpus's reading that disagreement is NOT an
 *  obstruction: a finite ⊤-conflict settles at a FINITE stage (not a limit-stage
 *  firing) so it never appears as an H¹ generator (it lives in ker(δ)); only a
 *  genuinely non-Scott-continuous composition contributes federation-only H¹. */
export interface CrossArena {
  readonly shared: number;
  readonly contested: number;
  readonly federationOnly: number;
  readonly nameMobility: number;
}

export function crossArena(constituents: readonly Constituent[]): CrossArena {
  const owners = new Map<string, number>(); // cellKey → how many constituents settle it
  const charges = new Map<string, Set<string>>(); // cellKey → distinct charge-names across constituents
  const tokenOwners = new Map<string, number>(); // member token → how many constituents it appears in
  const constituentH1 = new Set<string>(); // cells carrying a constituent's own H¹ generator
  for (const c of constituents) {
    const settled = settledCharges(c.utterances);
    const tokens = new Set<string>();
    for (const [key, name] of settled) {
      owners.set(key, (owners.get(key) ?? 0) + 1);
      const seen = charges.get(key) ?? new Set<string>();
      seen.add(name);
      charges.set(key, seen);
      tokens.add(key.slice(0, key.indexOf("|")));
    }
    for (const tok of tokens) tokenOwners.set(tok, (tokenOwners.get(tok) ?? 0) + 1);
    for (const key of h1Cells(c.utterances)) constituentH1.add(key);
  }
  let shared = 0;
  let contested = 0;
  for (const [key, count] of owners) {
    if (count >= 2) (charges.get(key)!.size === 1 ? shared++ : contested++);
  }
  // coker(diff), exactly: H¹ obstructions the parallel composition introduces that no
  // constituent carries alone (limit-stage firings novel to the merge).
  let federationOnly = 0;
  for (const key of h1Cells(constituents.flatMap((c) => [...c.utterances]))) {
    if (!constituentH1.has(key)) federationOnly++;
  }
  let nameMobility = 0;
  for (const [, count] of tokenOwners) if (count >= 2) nameMobility++;
  return { shared, contested, federationOnly, nameMobility };
}

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */
const natCount = (natural: { readonly members: readonly unknown[] }): number => natural.members.length;

/**
 * The COLLECTIVE's structural robustness, read through the substrate graph Laplacian
 * (`@emsenn/relating` analysis.laplacian). This CONSOLIDATES onto the organizing bulk the
 * consensus-robustness capability its faces expose (socializing's `spectralConsensus`, computing's
 * `spectralSociety`), lifted to the off-diagonal CONSTITUENT cover: constituents are the vertices, and
 * two are joined when they SHARE settled cells and COHERE on every shared cell (no cross-arena
 * contradiction). Then `blocs` = the connected-component count H⁰ (independent collective blocs,
 * isolated constituents counted), and `collectiveTrees` = the Matrix-Tree spanning-tree count — the
 * collective's COHESION ROBUSTNESS: `0` the collective fragments, `1` a single fragile thread of shared
 * agreement, `> 1` redundant agreement paths (resilient to losing a constituent's overlaps). The
 * federation-only H¹ obstruction (`crossArena`) is unchanged; this reads the coordination-free skeleton
 * that survives it.
 */
export interface CollectiveRobustness {
  readonly kind: "organizing.collective-robustness";
  readonly constituents: number;
  readonly blocs: number;
  readonly cohesive: boolean;
  readonly collectiveTrees: number;
  readonly robust: boolean;
  readonly fragile: boolean;
  /** CONSENSUS EQUILIBRIUM: whether the merged collective's settlement is HARMONIC — its first
   *  settling-cohomology H¹ VANISHES (no non-Scott / limit-stage firing across the whole cover),
   *  computed EXACTLY from the proved `readFirstCohomologyOfSettlementFiltration`. By the proven
   *  `harmonic ⟺ H¹ = 0` bridge (ker L ≅ independent Čech H⁰, LawvereHarmonicCohomology), this is the
   *  collective at coordination-free equilibrium — DISTINCT from the structural `robust`/`fragile`
   *  reading: the cover can be robustly connected yet still carry an H¹ obstruction (not at equilibrium). */
  readonly atEquilibrium: boolean;
  /** derivable cohesion: the EXACT/gradient flows of the constituent agreement graph `rank(L) = V − C`. */
  readonly derivable: number;
  /** irreducible cohesion cycles: the HARMONIC flows `β₁ = E − V + C` — the redundant cross-constituent
   *  agreement loops (the H¹ of the constituent agreement graph) that make the collective robust beyond
   *  a spanning tree. */
  readonly irreducible: number;
}

export function collectiveRobustness(constituents: readonly Constituent[]): CollectiveRobustness {
  const charges = constituents.map((c) => settledCharges(c.utterances));
  const edges: [number, number][] = [];
  for (let left = 0; left < constituents.length; left += 1) {
    for (let right = left + 1; right < constituents.length; right += 1) {
      const a = charges[left]!;
      const b = charges[right]!;
      let shares = false;
      let contradicts = false;
      for (const [key, name] of a) {
        if (b.has(key)) { shares = true; if (b.get(key) !== name) { contradicts = true; break; } }
      }
      if (shares && !contradicts) edges.push([left, right]);
    }
  }
  const spectrum = analysis.graphSpectrum(constituents.length, edges);
  const blocs = natCount(spectrum.components);
  const collectiveTrees = natCount(analysis.magnitude(spectrum.spanningTrees));
  // equilibrium = the merged collective's settlement is harmonic ⟺ its first settling-cohomology
  // H¹ vanishes (the proven `harmonic ⟺ H¹ = 0` bridge), read off the upstream cohomology directly.
  const atEquilibrium = h1Cells(constituents.flatMap((c) => [...c.utterances])).size === 0;
  const hodge = analysis.hodgeDecompositionOfWeights(analysis.weightsOfEdges(constituents.length, edges));
  return Object.freeze({
    kind: "organizing.collective-robustness" as const,
    constituents: constituents.length,
    blocs,
    cohesive: blocs === 1,
    collectiveTrees,
    robust: collectiveTrees > 1,
    atEquilibrium,
    fragile: collectiveTrees === 1,
    derivable: natCount(hodge.exact),
    irreducible: natCount(hodge.harmonic),
  });
}

/** The non-empty faces of a boundary, each as a constituent of the social cover. */
function boundaryConstituents(input: SocialBoundary): Constituent[] {
  return FACULTIES.flatMap((faculty) => {
    const seed = input[faculty];
    return hasContent(seed) ? [{ name: faculty, utterances: descend(admitSeed(seed)).utterances }] : [];
  });
}

/** All of a boundary's faces' membrane utterances, concatenated. */
function boundaryUtterances(input: SocialBoundary): UtteranceCarrier[] {
  return boundaryConstituents(input).flatMap((c) => [...c.utterances]);
}

/** The boundary's gaming (outside/evidence) membrane — the cover gaming's face reads its arena
 *  symmetry off, so the bulk can consolidate it. Empty when the boundary has no gaming face. */
function boundaryGamingMembrane(input: SocialBoundary): readonly UtteranceCarrier[] {
  return hasContent(input.gaming) ? descend(admitSeed(input.gaming)).utterances : [];
}

// ── face readings (threaded, not absorbed) ───────────────────────────────────────

/** The local-section reading each sibling faculty's OWN face exposes on its agentive-triad
 *  axis: the thin trio { cover, held, contested } PLUS the thick `belnap` FOUR census it is
 *  read from — read as ADJUDICATION's disciplines (the receiving-dual; content/_archive
 *  adjudication.md): ⊥ held-open / t held-for / f held-against / ⊤ held-contested. The bulk
 *  consumes both and re-types them with the face's direction/axis — no generic
 *  descend-then-count, and no longer DISCARDING the four-valued census each face computed. */
interface FaceTrio {
  readonly cover: number;
  readonly held: number;
  readonly contested: number;
  readonly belnap: Face["belnap"];
  /** the face's within-cover gluing obstruction H¹ (content/…/settling-cohomology.md):
   *  socializing's opposition-H¹, computing's contested concerns, gaming's arena conflict
   *  edges — each read off its OWN structure. 0 ⟺ the face coheres coordination-free. */
  readonly obstruction: number;
}

/** The real face reading for each faculty: call the sibling's exported face on its
 *  inter-agent membrane (a readonly UtteranceCarrier[] log) and project its trio + the
 *  canonical adjudication census. socializing reads TRUTH (≤_t, the across face), computing
 *  reads KNOWLEDGE (≤_k, the inside face), gaming reads EVIDENCE (⟨a₊,a₋⟩, the outside
 *  face). socializing and gaming expose the canonical {absurd,potential,active,stable}
 *  census directly; computing exposes the SAME FOUR under its knowledge-axis names
 *  ({undecidable,verified,refuted,contradictory}) — mapped here onto the canonical corners
 *  (undecidable→held-open ⊥, verified→held-for t, refuted→held-against f, contradictory→
 *  held-contested ⊤). The bulk imports the three faces (bulk → faces); the faces never
 *  import the bulk. */
const computingTrio = (face: ComputingFace): FaceTrio => ({
  cover: face.cover,
  held: face.held,
  contested: face.contested,
  belnap: {
    absurd: face.belnap.undecidable,
    potential: face.belnap.verified,
    active: face.belnap.refuted,
    stable: face.belnap.contradictory,
  },
  // computing's within-face H¹: the contested concerns — where the society's members
  // disagree (relayed to ⊤) and the inside section fails to glue coordination-free.
  obstruction: face.contested,
});

const FACE_READING: Readonly<Record<Faculty, (membrane: readonly UtteranceCarrier[]) => FaceTrio>> =
  Object.freeze({
    socializing: socializingFace,
    computing: (membrane) => computingTrio(computingFace(membrane)),
    gaming: gamingFace,
  });

/** The face's collective standing — PARAMETERIZED from relating's proof-tree ∨_k math
 *  (`knowledgeAggregateOfCensus`, positing/bilattice-charge): the ≤_k join over the face's
 *  whole cover, which IS adjudication's ACCUMULATION discipline (the monotone converged record;
 *  content/_archive adjudication.md) ≡ "the fixed point settling reaches is a join". The
 *  aggregation LAW lives in relating; the bulk supplies its census. Equals computing's OWN
 *  member-join `aggregate` by associativity of ∨_k. */
const aggregateOf = (belnap: Face["belnap"]): Face["aggregate"] => knowledgeAggregateOfCensus(belnap);

/** Re-type a sibling face's reading as organizing's axis-typed local section, carrying
 *  through the thick `belnap` FOUR census (adjudication's disciplines) the face read on
 *  its axis — the bulk consolidates it rather than collapsing to the thin trio. */
const asFace = (faculty: Faculty, trio: FaceTrio): Face => ({
  kind: "organizing.face",
  faculty,
  direction: FACE_DIRECTION[faculty],
  axis: FACULTY_AXIS[faculty],
  cover: trio.cover,
  held: trio.held,
  contested: trio.contested,
  belnap: { absurd: trio.belnap.absurd, potential: trio.belnap.potential, active: trio.belnap.active, stable: trio.belnap.stable },
  obstruction: trio.obstruction,
  aggregate: aggregateOf(trio.belnap),
});

/** Read one social face from its inter-agent membrane: the sibling faculty's OWN
 *  local-section reading on its axis, re-typed into organizing's Face. */
export function faceOfMembrane(faculty: Faculty, membrane: readonly UtteranceCarrier[]): Face {
  if (membrane.length === 0) return emptyFace(faculty);
  return asFace(faculty, FACE_READING[faculty](membrane));
}

/** Read one social face off a settled descent state: the sibling faculty's OWN
 *  local-section reading over that state's inter-agent membrane (no generic
 *  descend-then-count). */
export function faceOf(faculty: Faculty, state: DescentState): Face {
  return faceOfMembrane(faculty, state.utterances);
}

/** Settle one faculty's inter-agent membrane seed into its boundary face by calling
 *  that faculty's real face reading. An empty seed yields the empty face. */
export function face(faculty: Faculty, seed: JsonValue | undefined): Face {
  if (!hasContent(seed)) return emptyFace(faculty);
  return faceOfMembrane(faculty, descend(admitSeed(seed)).utterances);
}

/** Settle the union of all faces' inter-agent membranes into the SOCIAL descent —
 *  the one settled state the society's collective readings all project. At least one
 *  face must carry content. */
export function socialUnion(input: SocialBoundary, verb: string): DescentState {
  const utterances = boundaryUtterances(input);
  if (utterances.length === 0) throw new TypeError(`${verb}: an empty social boundary has no society to settle`);
  return descend(utterances);
}

/** Render one inter-agent membrane utterance as a `member|predicate` label. */
const memberLabel = (carrier: UtteranceCarrier): string =>
  `${String(carrier.token.mark.value)}|${String(carrier.claim.mark.value)}`;

// ── the four social-descent stage readings (Gen-2 mirror of animating's regimes) ──

/** Read the social BECOMING (stage 1): the re-entered individuals posed as a
 *  plurality in pure social potential. Gen-2 mirror of animating's `animate`. */
export function socialBecomingOf(state: DescentState, scale: SocialBecoming["scale"] = "social"): SocialBecoming {
  return {
    kind: "organizing.social-becoming",
    scale,
    stage: "becoming",
    face: "animate",
    epistemic: "question",
    seed: state.utterances.map(memberLabel),
    members: memberCount(state),
    openAbove: true,
  };
}

/** Read the social DOING (stage 2): relating — the directed bonds among agents. */
export function relatingOf(state: DescentState): Relating {
  return {
    kind: "organizing.relating",
    scale: "social",
    stage: "doing",
    face: "agential",
    epistemic: "judgement",
    bonds: state.site.cells.cells.length,
    agents: memberCount(state),
  };
}

/** The transindividual field's recorded held-contradiction ⊤ substrate, by the
 *  cross-arena Mayer–Vietoris decomposition (cross-arena-mayer-vietoris.md): both the
 *  WITHIN-constituent ⊤ each face adjudicates "by its own machinery" (Σ face.belnap.stable,
 *  the involution-aware ⊤ the sibling face computes — NOT the all-positive descent, which
 *  never applies negation ~) AND the cross-arena OVERLAP ⊤ on the cover (`crossArena.contested`
 *  = ker δ). "Disagreement is recorded as substrate content via the bilattice's ⊤ value when
 *  both sides assert, made visible to both constituents and to the federation." The H⁰ field
 *  carries the FULL ⊤ substrate; the federation-level `adjudication` carries only the ker(δ)
 *  overlap term. */
function heldContradiction(faces: readonly Face[], constituents: readonly Constituent[]): number {
  const withinConstituent = faces.reduce((sum, f) => sum + f.belnap.stable, 0);
  const overlap = crossArena(constituents).contested;
  return withinConstituent + overlap;
}

/** Read the social WORKING (stage 3): community — the shared field (transindividual). The
 *  held-contradiction `contested` is the FULL ⊤ substrate the transindividual field records
 *  (within-constituent ⊕ cross-arena overlap; cross-arena-mayer-vietoris.md), consolidated
 *  from the constituent faces' involution-aware census — not recomputed off the all-positive
 *  descent (which applies no negation, so reads every cell potential and never records ⊤). */
export function communityOf(state: DescentState, faces: readonly Face[], constituents: readonly Constituent[]): Community {
  const section = sectionOf(state.readings.knowledgeLeast);
  return {
    kind: "organizing.community",
    scale: "social",
    stage: "working",
    face: "agentic",
    epistemic: "belief",
    field: section.entries.length,
    members: memberCount(state),
    contested: heldContradiction(faces, constituents),
    transindividual: true,
  };
}

/** Read the social GOVERNING (stage 4): the institution — the intrinsic settled
 *  order (single-filtration H¹). Gen-2 mirror of animating's `individuate`. */
export function instituteOf(state: DescentState): Institution {
  const cohomology = readFirstCohomologyOfSettlementFiltration(state.filtration);
  const cohomologyRank = cohomology.generators.length;
  return {
    kind: "organizing.institution",
    scale: "social",
    stage: "governing",
    face: "individual",
    epistemic: "knowledge",
    settled: true,
    glued: cohomologyRank === 0,
    cohomologyRank,
    field: sectionOf(state.readings.knowledgeLeast).entries.length,
  };
}

/** social-becoming — the stage-1 social-descent reading over a boundary. */
export function socialBecoming(input: SocialBoundary): SocialBecoming {
  return socialBecomingOf(socialUnion(input, "social-becoming"));
}

/** relating — the social doing reading over a boundary: the bonds among agents. */
export function relate(input: SocialBoundary): Relating {
  return relatingOf(socialUnion(input, "relate"));
}

/** community — the social working reading over a boundary: the shared field. The
 *  held-contradiction ⊤ is consolidated from the boundary's own constituent faces (the
 *  involution-aware census), so a transindividual field that holds p and ¬p records it. */
export function community(input: SocialBoundary): Community {
  return communityOf(socialUnion(input, "community"), socialFaces(input), boundaryConstituents(input));
}

/** institute — the stage-4 social-governing reading over a boundary: the settled order. */
export function institute(input: SocialBoundary): Institution {
  return instituteOf(socialUnion(input, "institute"));
}

/** A leading-negation prefix on a claim — the evidence-side split (the role's polarity). */
const SYMMETRY_NEGATION = /^\s*(?:!|¬|-|not\s+|no\s+|never\s+)/i;

/** A member's ROLE: the sorted set of for/against predicate commitments it asserts across the
 *  social field (negation-aware, so an asserter and a denier of one predicate are DIFFERENT
 *  roles). Two members with the same role are STRUCTURALLY EQUIVALENT — interchangeable under
 *  the social FSym(𝔸): permuting them is an automorphism of the social structure. */
function roleOf(predicates: ReadonlySet<string>): string {
  return [...predicates].sort().join("");
}

/**
 * socialSymmetryOf — the organization's SYMMETRY reading: the FSym(𝔸) structure of its
 * membership (the social-scale lift of gaming's arena symmetry groupoid Ẽ). Members are
 * partitioned into ROLES by structural equivalence (same for/against predicate commitments);
 * `interchangeable`/`roles` are the symmetry GROUPOID (members one could permute), `mobile` is
 * the name-PASSING `nameMobility` (entity-mobility across constituents) — the two distinct
 * FSym(𝔸) phenomena (federation-is-parallel-composition.md). `arenaUniform` CONSOLIDATES the
 * gaming (outside/evidence) face's own arena symmetry, which the bulk otherwise discards.
 */
export function socialSymmetryOf(state: DescentState, constituents: readonly Constituent[], gamingMembrane: readonly UtteranceCarrier[]): OrganizationSymmetry {
  const roles = new Map<string, Set<string>>(); // member → the for/against predicates it commits
  for (const carrier of state.utterances) {
    const member = String(carrier.token.mark.value);
    const raw = carrier.claim.mark.value;
    const text = raw === false ? "false" : typeof raw === "string" ? raw.trim() : String(raw);
    const against = raw === false || SYMMETRY_NEGATION.test(text);
    const bare = against ? text.replace(SYMMETRY_NEGATION, "").trim() || text : text;
    const commitment = `${against ? "-" : "+"}${bare}`;
    const prior = roles.get(member) ?? new Set<string>();
    prior.add(commitment);
    roles.set(member, prior);
  }
  // partition members by role (structural equivalence) — the orbits 𝔸/Ẽ.
  const byRole = new Map<string, number>();
  for (const predicates of roles.values()) {
    const key = roleOf(predicates);
    byRole.set(key, (byRole.get(key) ?? 0) + 1);
  }
  let interchangeable = 0;
  for (const count of byRole.values()) if (count >= 2) interchangeable += count;
  const mobile = crossArena(constituents).nameMobility;
  const arena = gamingMembrane.length === 0 ? undefined : gamingFace(gamingMembrane).symmetry;
  return {
    kind: "organizing.symmetry",
    members: roles.size,
    roles: byRole.size,
    interchangeable,
    mobile,
    uniform: interchangeable > 0,
    arenaUniform: arena !== undefined && arena.uniform,
  };
}

/** socialSymmetry — the organization's FSym(𝔸) membership symmetry over a boundary: which
 *  members are interchangeable (structural equivalence), which are mobile (name-passing), and
 *  the gaming face's arena symmetry it consolidates. */
export function socialSymmetry(input: SocialBoundary): OrganizationSymmetry {
  return socialSymmetryOf(socialUnion(input, "social-symmetry"), boundaryConstituents(input), boundaryGamingMembrane(input));
}

/** The boundary's socializing (across/truth) membrane — the cover its truth lean is read off. */
function boundarySocializingMembrane(input: SocialBoundary): readonly UtteranceCarrier[] {
  return hasContent(input.socializing) ? descend(admitSeed(input.socializing)).utterances : [];
}

/** socialStance — the organization's collective STANCE over a boundary: which way the society
 *  leans on the truth order ≤_t, CONSOLIDATED from the socializing (across/truth) face's `lean`
 *  (the ∨_t truth-aggregate, negation-antitone). The Gen-2 lift of the agent's `stance`; the bulk
 *  no longer discards the socializing face's lean direction. An empty across face is uncommitted. */
export function socialStance(input: SocialBoundary): OrganizationStance {
  const membrane = boundarySocializingMembrane(input);
  const face = socializingFace(membrane);
  return {
    kind: "organizing.stance",
    lean: membrane.length === 0 ? "absurd" : face.lean,
    coordinationFree: face.leans,
  };
}

const POSITIVE_SENTIMENT = /^(?:likes?|loves?|trusts?|befriends?|admires?|supports?|allies?(?:-with)?)\b/i;
const NEGATIVE_SENTIMENT = /^(?:dislikes?|hates?|distrusts?|opposes?|fears?|rejects?|betrays?)\b/i;

/**
 * cohesion — the organization's structural balance, read at TWO nested strengths off the society's
 * SENTIMENT network (likes/trusts = +, dislikes/distrusts = − ties off the socializing membrane):
 *
 *  - `balanced` — Cartwright–Harary 1956 structural balance, the SAME signed-graph Z₂/H¹ obstruction
 *    knowing's `contextuality` reads (union–find with PARITY): balanced ⟺ the society splits into ≤2
 *    antagonistic factions. This is the agent's `coherence` (Heider balance) lifted flat to scale-2.
 *  - `clusterable` — Davis 1967 CLUSTERABILITY, the proper scale-2 GENERALIZATION: the society
 *    partitions into k internally-positive COALITIONS (the connected components of the POSITIVE
 *    subgraph) with hostility only BETWEEN them — equivalently no negative tie falls inside a
 *    coalition (no cycle with exactly one negative edge). RICHER than balance: a TRIPOLAR polity
 *    (three mutually-hostile blocs) is clusterable yet NOT 2-balanced — the multipolar coalition
 *    structure a single agent's belief graph never needs (so `cohesion` is a genuine scale-2
 *    enrichment of `coherence`, per the bulk-over-faces RICHNESS principle, not a mirror).
 *
 * `balanced ⟹ clusterable`; `frustration ≤ dissonance` always. `factions` is the coalition count
 * (positive-subgraph components), ALWAYS computed — agreeing with the Cartwright–Harary camp count on
 * balanced networks and generalizing it on clusterable-but-unbalanced ones.
 */
export function cohesion(input: SocialBoundary): OrganizationCohesion {
  // signed graph with PARITY (Heider balance) — the strict ≤2-faction reading.
  const parent = new Map<string, string>();
  const parity = new Map<string, 0 | 1>();
  const members = new Set<string>();
  const ensure = (x: string): void => { if (!parent.has(x)) { parent.set(x, x); parity.set(x, 0); members.add(x); } };
  const find = (x: string): { root: string; par: 0 | 1 } => {
    let n = x; let p: 0 | 1 = 0;
    while (parent.get(n) !== n) { p = (p ^ (parity.get(n) as 0 | 1)) as 0 | 1; n = parent.get(n)!; }
    return { root: n, par: p };
  };
  // POSITIVE-only union–find (no parity) — the coalitions Davis clusterability partitions into. A
  // coalition is a connected component of the likes/trusts subgraph; negative ties are checked
  // AFTER all coalitions are formed, so a − tie inside one coalition is the clusterability obstruction.
  const posParent = new Map<string, string>();
  const ensurePos = (x: string): void => { if (!posParent.has(x)) posParent.set(x, x); };
  const posFind = (x: string): string => { let n = x; while (posParent.get(n) !== n) n = posParent.get(n)!; return n; };
  const negativeTies: Array<[string, string]> = [];

  let ties = 0;
  let dissonance = 0;
  for (const carrier of boundarySocializingMembrane(input)) {
    const subject = String(carrier.token.mark.value).trim();
    const claim = String(carrier.claim.mark.value).trim();
    const match = POSITIVE_SENTIMENT.exec(claim) ?? NEGATIVE_SENTIMENT.exec(claim);
    if (match === null) continue;
    const positive = POSITIVE_SENTIMENT.test(claim);
    const target = claim.slice(match[0].length).replace(/^[\s-]+/, "").trim();
    if (subject === "" || target === "" || subject === target) continue;
    ensure(subject); ensure(target);
    ensurePos(subject); ensurePos(target);
    ties += 1;
    // Heider (parity): + ⇒ same faction, − ⇒ opposite faction.
    const want: 0 | 1 = positive ? 0 : 1;
    const fa = find(subject); const fb = find(target);
    if (fa.root === fb.root) { if (((fa.par ^ fb.par) as 0 | 1) !== want) dissonance += 1; }
    else { parent.set(fb.root, fa.root); parity.set(fb.root, ((fa.par ^ fb.par ^ want) as 0 | 1)); }
    // Davis (coalitions): merge positive ties into coalitions now; defer negative ties.
    if (positive) { posParent.set(posFind(subject), posFind(target)); }
    else { negativeTies.push([subject, target]); }
  }

  // a − tie inside a single coalition is a clusterability violation (an internal enmity); count them.
  let frustration = 0;
  for (const [a, b] of negativeTies) if (posFind(a) === posFind(b)) frustration += 1;
  const clusterable = frustration === 0;
  const balanced = dissonance === 0;
  // factions = the coalitions (distinct positive-subgraph roots), ALWAYS — the Davis partition that
  // agrees with the Cartwright–Harary camp count when balanced and generalizes it when not.
  const coalitions = new Set<string>();
  for (const m of members) coalitions.add(posFind(m));
  return {
    kind: "organizing.cohesion",
    members: members.size,
    ties,
    balanced,
    clusterable,
    factions: coalitions.size,
    dissonance,
    frustration,
  };
}

/** The three governance dimensions: a membrane seed per dimension (any omitted). `preferences`
 *  are `voter|X>Y` ballots (deciding), `knowledge` is an `agent|claim` log (knowing), `dominance`
 *  is `winner|loser` outcomes (competing). */
export interface GovernanceInput {
  readonly preferences?: JsonValue;
  readonly knowledge?: JsonValue;
  readonly dominance?: JsonValue;
}

/**
 * governance — the CAPSTONE consolidation: organizing reads its three faculties' impossibility-
 * escapes at once. socializing's `aggregatePreferences` (Arrow/Condorcet), computing's
 * `eventualConsistency` (FLP/CALM), and gaming's `reachability` (best-response cycles) are the SAME
 * escape — the monotone ≤_k settling has no non-trivial periodic orbit, so it converges coordination-
 * free and cycle-free, holding conflict as ⊤. `governable` is the unified guarantee (acyclic ∧
 * coordination-free ∧ reachable); `irreducible` is the total ⊤-core the three classical theorems are
 * really about. An omitted dimension contributes its trivial (no-conflict) escape.
 */
export function governance(input: GovernanceInput): Governance {
  const preferenceSeed = hasContent(input.preferences) ? input.preferences : "";
  const knowledgeMembrane = hasContent(input.knowledge) ? descend(admitSeed(input.knowledge)).utterances : [];
  const choice = aggregatePreferences(hasContent(input.preferences) ? descend(admitSeed(preferenceSeed)).utterances : []);
  const consensus = eventualConsistency(knowledgeMembrane);
  const equilibrium = reachability(hasContent(input.dominance) ? input.dominance : "");
  const socialChoice = { acyclic: choice.acyclic, contested: choice.contested, majorityCyclic: choice.majorityCyclic };
  const consensusReading = { coordinationFree: consensus.coordinationFree, converges: consensus.converges, contested: consensus.contested, flpEscaped: consensus.flpEscaped };
  const equilibriumReading = { reachable: equilibrium.reachable, bestResponseCyclic: equilibrium.bestResponseCyclic, contested: equilibrium.contested };
  return {
    kind: "organizing.governance",
    socialChoice,
    consensus: consensusReading,
    equilibrium: equilibriumReading,
    governable: socialChoice.acyclic && consensusReading.coordinationFree && equilibriumReading.reachable,
    irreducible: socialChoice.contested + consensusReading.contested + equilibriumReading.contested,
  };
}

/**
 * socialFactor — the social-scale per-face act-factorization, the Gen-2 mirror of
 * animating's `factor` and the RECEIVING dual of it (adjudication, the receiving dual
 * of speaking; content/_archive adjudication.md). It factors ONE Gen-2 face's act into
 * locution/illocution/perlocution, CONSOLIDATED from the sibling faculty's OWN face
 * reading (socializing's field consensus / computing's society relay / gaming's arena),
 * no longer FAKED with a generic descend section. The Austin/Searle three layers read
 * dually (the receiving funnel): LOCUTION = the cover RECEIVED — the membrane's
 * contributions selected into the cover (receiving dual of cell-selection); ILLOCUTION =
 * the charges HELD — the distinct charged cells held across agents (the face's `cover`);
 * PERLOCUTION = the record CONVERGED — the cells that monotonically settled into the
 * standing record (the face's `held`, the uptake the collective converges on). `belnap`
 * is the face's OWN axis-typed FOUR census (adjudication's disciplines: held-open/for/
 * against/contested), computing's knowledge-names mapped to canonical by FACE_READING.
 * The genuinely RICHER off-diagonal content of "the receiving dual" still lives in
 * `crossArena`/`adjudicate` (the multi-constituent Mayer–Vietoris); this is the per-face
 * local reading. The axis map is PROVISIONAL (session synthesis; see the design note).
 */
export function socialFactor(faculty: Faculty, state: DescentState): SocialFactorization {
  const reading = FACE_READING[faculty](state.utterances);
  return {
    kind: "organizing.social-factorization",
    faculty,
    axis: FACULTY_AXIS[faculty],
    dual: "receiving",
    locution: state.utterances.length,
    illocution: reading.cover,
    perlocution: reading.held,
    belnap: { absurd: reading.belnap.absurd, potential: reading.belnap.potential, active: reading.belnap.active, stable: reading.belnap.stable },
  };
}

// ── the gluing act and the interior bulk ──────────────────────────────────────────

/** The adjudication over a cover — the receiving dual of speaking read as the
 *  cross-arena Mayer–Vietoris: `contested` disagreement (ker(δ), tolerated), `open`
 *  absence, `monotone` accumulation, and `federationOnly` = coker(diff) (the genuine
 *  obstruction; `cohomologyRank` is its rank, possibly Arrow-irreducible). */
export function adjudicationOf(state: DescentState, constituents: readonly Constituent[]): Adjudication {
  const ca = crossArena(constituents);
  const section = sectionOf(state.readings.knowledgeLeast);
  return {
    kind: "organizing.adjudication",
    contested: ca.contested,
    open: countNamed(section, "absurd"),
    monotone: true,
    federationOnly: ca.federationOnly,
    cohomologyRank: ca.federationOnly,
  };
}

// ── the telos: the collective's aperiodic reason-for-running ──────────────────────

/** The collective's dominant standing concern: the most frequent predicate among
 *  social-field cells NOT yet settled to contradiction (`stable`) — what the society
 *  is still striving toward, not what it has already brought to a held verdict. The
 *  social-union lift of `buildGoal`'s "first claim" default. */
function dominantConcern(state: DescentState): string {
  const tally = new Map<string, number>();
  for (const entry of sectionOf(state.readings.knowledgeLeast).entries) {
    if (chargeName(entry) === "stable") continue;
    const predicate = String(entry.cell.predicate.mark.value);
    tally.set(predicate, (tally.get(predicate) ?? 0) + 1);
  }
  let concern: string | undefined;
  let best = 0;
  for (const [predicate, count] of tally) if (count > best) { concern = predicate; best = count; }
  if (concern !== undefined) return concern;
  return state.utterances[0] === undefined ? "persist" : String(state.utterances[0].claim.mark.value);
}

/** Options for declaring a telos: who declares it, the predicate it orients toward,
 *  the charge it strives for, and the operations-loop cycles already advanced over it. */
export interface TelosOptions {
  readonly declaredBy?: string;
  readonly predicate?: string;
  readonly charge?: Telos["charge"];
  readonly advanced?: number;
}

/**
 * buildTelos — the organization's telos: the Gen-2 lift of the animating agent's
 * `goal` as its APERIODIC DUAL, not a satisfiable target. Where `buildGoal` derives a
 * finite, satisfiable goal (charge defaulting to `potential`, with a `satisfied`
 * test that halts on arrival), a telos is pinned to the aperiodic regime (κ ≥ ω₁) and
 * is structurally never satisfied — its non-arrival is the only reason the operations
 * loop runs forever ("the means change; the function does not"). So it carries no
 * `satisfied` boolean (a category error here) but a monotone `advanced` count: the
 * Scott-continuous operations-loop cycles are fibers over this aperiodic base, each
 * advancing the settling one step without reaching it. `predicate` defaults to the
 * social union's dominant unsatisfied concern (the collective's standing concern);
 * `declaredBy` keeps it auditable (an undeclared telos is malformed).
 * `goal : telos :: finite : aperiodic :: arrival : direction`.
 */
export function buildTelos(state: DescentState, options: TelosOptions = {}): Telos {
  const predicate = options.predicate !== undefined && options.predicate.trim() !== "" ? options.predicate.trim() : dominantConcern(state);
  const declaredBy = options.declaredBy !== undefined && options.declaredBy.trim() !== "" ? options.declaredBy.trim() : "organization";
  return {
    kind: "organizing.organization.telos",
    predicate,
    charge: options.charge ?? "potential",
    regime: "aperiodic",
    satisfiable: false,
    declaredBy,
    advanced: options.advanced ?? 0,
  };
}

function identityOf(options: OrganizationOptions): string {
  return options.identity !== undefined && options.identity.trim() !== "" ? options.identity.trim() : "organization";
}

function membraneWitness(identity: string, line: string, index: number): RWILWitness {
  return cell(
    Object.freeze({
      bridge: "organizing.reseed",
      organization: identity,
    }) as JsonValue,
    index === 0 ? "institution-node" : "institution-boundary",
    line,
    Object.freeze({
      witness: `organizing:institution:${identity}:${index}`,
    }) as JsonValue,
  );
}

function institutionMembraneOf(identity: string, constituents: readonly Constituent[]): InstitutionMembrane {
  const node = `${identity}|institution`;
  const boundary = constituents.flatMap((constituent) => constituent.utterances.map(memberLabel));
  const seed = Object.freeze([node, ...boundary]);
  return Object.freeze({
    kind: "organizing.institution.membrane" as const,
    identity,
    node,
    seed,
    witnesses: Object.freeze(seed.map((line, index) => membraneWitness(identity, line, index))),
  }) as InstitutionMembrane;
}

/** Build the interior organization: the global section glued from its constituents,
 *  read by the cross-arena Mayer–Vietoris. `glued` is federationOnly = 0 (the genuine
 *  obstruction), NOT broken by tolerated disagreement. Carries the intrinsic order
 *  (`institution`), the gluing act (`adjudication`), and the residual `milieu`. */
function buildOrganization(
  state: DescentState,
  faces: readonly Face[],
  constituents: readonly Constituent[],
  options: OrganizationOptions,
): Organization {
  const identity = identityOf(options);
  const institution = instituteOf(state);
  const adjudication = adjudicationOf(state, constituents);
  const section = sectionOf(state.readings.knowledgeLeast);
  const glued = adjudication.federationOnly === 0;
  // the associated milieu (Simondon): social-field cells not yet at the knowledge-top.
  const milieu = section.entries.filter((entry) => chargeName(entry) !== "stable").length;
  return {
    kind: "organizing.organization",
    identity,
    members: memberCount(state),
    faces: [...faces],
    glued,
    coordination: glued ? "coordination-free" : "consensus-required",
    institution,
    membrane: institutionMembraneOf(identity, constituents),
    adjudication,
    settledBelow: true,
    openAbove: true,
    milieu,
    telos: buildTelos(state, options.identity === undefined ? {} : { declaredBy: options.identity }),
  };
}

/** Settle the three social faces: each face faculty's OWN local-section reading over
 *  that face's inter-agent membrane seed (threaded from the sibling, not absorbed). */
function socialFaces(input: SocialBoundary): Face[] {
  return FACULTIES.map((faculty) => {
    const seed = input[faculty];
    return hasContent(seed) ? faceOfMembrane(faculty, descend(admitSeed(seed)).utterances) : emptyFace(faculty);
  });
}

/**
 * organize — the social gluing over a three-faced boundary. The cross-arena cover is
 * the non-empty faces; the organization is glued from them (federationOnly = 0 ⟺
 * coherent), with disagreement on overlaps tolerated.
 */
export function organize(input: SocialBoundary, options: OrganizationOptions = {}): Organization {
  return buildOrganization(socialUnion(input, "organize"), socialFaces(input), boundaryConstituents(input), options);
}

/** The social-membrane lines a settled animating agent contributes on re-entry: its
 *  re-posing (`id|individuated`, exactly animating's `reseed` emission) and its
 *  standing concern (`id|goalPredicate`), the shared potential that bonds it to
 *  others (Simondon's transindividual field). */
function agentLines(a: Agent): string[] {
  const lines = [`${a.identity}|individuated`];
  const predicate = a.goal.predicate;
  if (typeof predicate === "string" && predicate.trim() !== "") lines.push(`${a.identity}|${predicate.trim()}`);
  return lines;
}

/**
 * assemble — the concrete spiral: a plurality of real @emsenn/animating agents glued
 * into one collective, each agent a LITERAL constituent of the cross-arena cover. So
 * an animating agent is a member of organizing's social base, and the gluing is the
 * genuine multi-constituent Mayer–Vietoris over the agents (not a single merge):
 * agents agreeing on a concern lift it coordination-free, disagreement is tolerated,
 * and the federation-only content (concerns that exist only collectively) is the
 * obstruction. The re-entry is the ACROSS leg — relating, "the act one self directs
 * toward another" (relating.md) — so it populates the socializing face; the interior
 * (computing) and exterior (gaming) Gen-2 faces are mounted by their own siblings.
 */
export function assemble(agents: readonly Agent[], options: OrganizationOptions = {}): Organization {
  if (agents.length === 0) throw new TypeError("assemble: no agents to organize into a collective");
  const constituents: Constituent[] = agents.map((a) => ({ name: a.identity, utterances: admitSeed(agentLines(a).join("\n")) }));
  const state = descend(constituents.flatMap((c) => [...c.utterances]));
  const faces = socialFaces({ socializing: agents.flatMap(agentLines).join("\n") });
  return buildOrganization(state, faces, constituents, options);
}

/**
 * reseed — the settled organization ("settled below, open above") re-poses its
 * institution as the next-scale relating node. Byte-for-byte with animating's
 * `identity|individuated`, this emits `identity|institution`; the full witnessed
 * membrane remains on `organization.membrane` for federation composition.
 */
export function reseed(organization: Organization): SocialBecoming {
  const membrane = organization.membrane as InstitutionMembrane;
  return {
    kind: "organizing.social-becoming",
    scale: "federation",
    stage: "becoming",
    face: "animate",
    epistemic: "question",
    seed: [membrane.node],
    members: 1,
    openAbove: true,
  };
}

/** adjudicate — the gluing act over a boundary, standalone: the cross-arena
 *  Mayer–Vietoris decomposition (contested tolerated / federationOnly obstruction). */
export function adjudicate(input: SocialBoundary): Adjudication {
  return adjudicationOf(socialUnion(input, "adjudicate"), boundaryConstituents(input));
}

/** The corpus's coordination-cost reading carried on the projection. */
export type Coordination = Organization["coordination"];

/** project — restrict the organization (the bulk) to its three social boundary views. */
export function project(organization: Organization): SocialProjection {
  const byFaculty = (faculty: Faculty): Face => {
    const found = (organization.faces as readonly Face[]).find((f) => f.faculty === faculty);
    return found ?? emptyFace(faculty);
  };
  return {
    kind: "organizing.projection",
    identity: organization.identity,
    glued: organization.glued,
    coordination: organization.coordination,
    socializing: byFaculty("socializing"),
    computing: byFaculty("computing"),
    gaming: byFaculty("gaming"),
  };
}

/**
 * federate — the next scale up, realized as the corpus's PARALLEL COMPOSITION ‖
 * (federation-is-parallel-composition.md): ‖-compose a plurality of constituent
 * societies (given as their social boundaries) into one federation. Entity-mobility
 * — a member belonging to more than one constituent — is nominal-set name-passing
 * (`nameMobility`). The federated cohomology decomposes by the cross-arena
 * Mayer–Vietoris: `shared` lifts free, `contested` is tolerated (ker δ), and
 * `federationOnly` (coker diff) is the genuine federation obligation; `glued` is
 * federationOnly = 0, possibly Arrow-irreducible when not. This is genuinely richer
 * than the diagonal — one agent has no ‖ and no name-permutation symmetry.
 */
export type FederationInput = SocialBoundary | Organization;

function isOrganization(input: FederationInput): input is Organization {
  return (input as Organization).kind === "organizing.organization";
}

function federationConstituent(input: FederationInput, index: number): Constituent {
  if (isOrganization(input)) {
    const membrane = input.membrane as InstitutionMembrane;
    return {
      name: input.identity,
      utterances: admitSeed(membrane.seed.join("\n")),
    };
  }
  return {
    name: `polity-${index}`,
    utterances: boundaryUtterances(input),
  };
}

export function federate(covers: readonly FederationInput[]): Federation {
  if (covers.length === 0) throw new TypeError("federate: no constituent societies to compose into a federation");
  const constituents: Constituent[] = covers.map(federationConstituent);
  const allUtterances = constituents.flatMap((c) => [...c.utterances]);
  if (allUtterances.length === 0) throw new TypeError("federate: the constituent societies are empty");
  const ca = crossArena(constituents);
  const glued = ca.federationOnly === 0;
  return {
    kind: "organizing.federation",
    monoidal: "parallel-composition",
    constituents: constituents.length,
    members: memberCount(descend(allUtterances)),
    nameMobility: ca.nameMobility,
    shared: ca.shared,
    contested: ca.contested,
    federationOnly: ca.federationOnly,
    glued,
    coordination: glued ? "coordination-free" : "consensus-required",
  };
}

export type { Organization } from "./schemas.mjs";
export type { Telos } from "./schemas.mjs";
export type { Adjudication } from "./schemas.mjs";
export type { Face } from "./schemas.mjs";
export type { Relating } from "./schemas.mjs";
export type { Community } from "./schemas.mjs";
export type { SocialBecoming } from "./schemas.mjs";
export type { Institution } from "./schemas.mjs";
export type { SocialFactorization } from "./schemas.mjs";
export type { Federation } from "./schemas.mjs";
export type { SocialProjection } from "./schemas.mjs";
