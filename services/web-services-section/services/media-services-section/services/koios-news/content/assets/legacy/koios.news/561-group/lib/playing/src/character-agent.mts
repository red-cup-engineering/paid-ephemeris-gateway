/**
 * character-agent — the CAPSTONE: the substrate character-agent the 561 corpus theorizes, made
 * executable on the ludic substrate (frontier register: skills-disciplines-and-the-character-agent).
 *
 * The corpus REJECTED the industry "character-agent = governed state machine" (a face with PersonaPolicy
 * + BehaviorPolicy + VoicePolicy + IdentitySpec stacked behind it, climbing a 6-level maturity ladder).
 * This module is the refutation as a constructed object. A character-agent is NOT a policy stack; it is a
 * bundle of:
 *   - PERSONAS — the masks it presents (designs; delocations of its plays),
 *   - DISCIPLINES — the practices it inhabits (behaviours),
 *   - SKILLS — its repertoire (typed reusable designs),
 *   - PLAYS — its performance history (chronicles),
 * and three readings that carry the corpus's thesis:
 *   - `practiced` — the disciplines it actually inhabits (some persona is admitted to the behaviour);
 *   - `repertoire` — its mastered skills and its QUIESCENCE: the fraction of its skills gone material
 *     in its disciplines. This is the wičozaní "becomes better" measure — maturity as honing toward
 *     quiescence, NOT a rung climbed by accreting policy modules;
 *   - `performedSelf` — its "self" reconstructed from the union of its plays. There is no doer behind the
 *     deeds (Butler / Girard §4.7); the self is performed, not pre-specified. No state machine behind it.
 *
 * On `@emsenn/gaming`'s `Mask`: it is the participant's HANDEDNESS (recv/send/actuate/observe) — the I/O
 * FACE the agent turns to an arena (what it shows on the Player side, what it takes on the Opponent
 * side), not a self. There is NO essence behind the masks (`performativity`
 * proves the doer-behind-the-deed does not exist), so the character is not a substance the masks hang off.
 * The character is the GLUING of its masks — a global section over the cover of its faces, coherent
 * exactly when the masks agree where they overlap, with IDENTITY DRIFT (the corpus's named failure mode)
 * as the obstruction to gluing (`identity`). This is the synchronic twin of `performedSelf`, the gluing
 * over plays (diachronic). It is a sheaf reading, not a fibration: faces and whether they cohere, no
 * substance beneath. Built in `playing` because all its ingredients live here (playing cannot import
 * gaming — the dependency runs the other way).
 *
 * Consumes `discipline`/`admits`, `skill`/`mastery`, the union-of-chronicles reconstruction, and
 * `superpose` (the ∨_k gluing); re-derives no ludics.
 */
import {
  cell,
  claim,
  cohomologyTerms,
  evaluateRunTerm,
  mark,
  predicateOfClaim,
  rankVanishing,
  token,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import { admits, type Discipline } from "./discipline.mjs";
import { mastery, type Skill } from "./skill.mjs";
import { superpose } from "./structuring/concurrent-game/with-symmetry/ludicizing/delocation.mjs";
import { designFromActionSet } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";
import type { Chronicle } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";
import type { Design } from "./structuring/concurrent-game/with-symmetry/ludicizing/design.mjs";

/** The parts a character-agent is bundled from. */
export interface CharacterParts {
  /** the masks it presents — designs (its faces / delocated plays). */
  readonly personas: readonly Design[];
  /** the practices it inhabits. */
  readonly disciplines: readonly Discipline[];
  /** its repertoire of typed reusable skills. */
  readonly skills: readonly Skill[];
  /** its performance history. */
  readonly plays: readonly Chronicle[];
}

/** A character-agent: a bundle of personas, disciplines, skills, and plays — not a policy stack. */
export interface CharacterAgent extends CharacterParts {
  readonly kind: "playing.character-agent";
  readonly name: string;
}

/** Bundle a character-agent from its name and parts. */
export function characterAgent(name: string, parts: CharacterParts): CharacterAgent {
  return Object.freeze({
    kind: "playing.character-agent" as const,
    name,
    personas: Object.freeze([...parts.personas]),
    disciplines: Object.freeze([...parts.disciplines]),
    skills: Object.freeze([...parts.skills]),
    plays: Object.freeze([...parts.plays]),
  });
}

/** The disciplines the agent actually PRACTICES — those admitting at least one of its personas (some
 *  mask of the agent counts as a play of the practice). */
export function practiced(agent: CharacterAgent): readonly Discipline[] {
  return Object.freeze(agent.disciplines.filter((d) => agent.personas.some((persona) => admits(d, persona))));
}

/** The repertoire reading: which skills are mastered, and the agent's quiescence. */
export interface Repertoire {
  readonly kind: "playing.repertoire";
  /** skills mastered (gone material) in at least one of the agent's disciplines. */
  readonly mastered: readonly Skill[];
  /** the total number of skills in the repertoire. */
  readonly total: number;
  /** QUIESCENCE ∈ [0,1] — the fraction of skills mastered: the wičozaní "becomes better" measure.
   *  Maturity as honing toward quiescence, not a maturity-ladder rung. */
  readonly quiescence: number;
}

/**
 * repertoire — read the agent's mastered skills and its quiescence. A skill is mastered if it has gone
 * MATERIAL (incarnated, no ballast) in some discipline the agent practices. Quiescence is the mastered
 * fraction — the substrate measure of "becoming better" (wičozaní), which replaces the industry maturity
 * ladder: an agent matures by honing its skills to quiescence, not by accreting architecture.
 */
export function repertoire(agent: CharacterAgent): Repertoire {
  const mastered = agent.skills.filter((s) => agent.disciplines.some((d) => mastery(s, d).mastered));
  const total = agent.skills.length;
  return Object.freeze({
    kind: "playing.repertoire" as const,
    mastered: Object.freeze(mastered),
    total,
    quiescence: total > 0 ? mastered.length / total : 0,
  });
}

/** The performed-self reading: the agent's self as the union of its plays. */
export interface PerformedSelf {
  readonly kind: "playing.performed-self";
  /** the self reconstructed from the union of all the agent's chronicles. */
  readonly self: Design;
  /** the number of plays the self is the union of. */
  readonly plays: number;
  /** the self is PERFORMED — reconstructed from plays, not pre-specified. */
  readonly performed: boolean;
  /** there is NO state machine behind the agent — by construction it carries no policy stack, and its
   *  self is exactly the performed union (the corpus thesis, against the governed-state-machine model). */
  readonly stateMachine: false;
}

/**
 * performedSelf — reconstruct the agent's "self" from the union of its plays (Butler's "no doer behind
 * the deed"; Girard's "a design is the union of its chronicles"). The self is performed, not a prior
 * IdentitySpec; there is no state machine behind the agent. An agent that has not yet played has only a
 * latent (empty) self — it becomes someone by performing.
 */
export function performedSelf(agent: CharacterAgent): PerformedSelf {
  const actions = agent.plays.flatMap((c) => [...c.actions]);
  return Object.freeze({
    kind: "playing.performed-self" as const,
    self: designFromActionSet(actions),
    plays: agent.plays.length,
    performed: agent.plays.length > 0,
    stateMachine: false as const,
  });
}

/** The identity reading: the character as the gluing of its masks (no essence beneath). */
export interface Identity {
  readonly kind: "playing.identity";
  /** the global section — the masks glued (∨_k superposed) into one face-family. There is no substance
   *  beneath this; the character IS the gluing. */
  readonly glued: Design;
  /** the masks present CONSISTENT faces — no locus where two masks contradict (no ⊤ collision). */
  readonly coherent: boolean;
  /** IDENTITY DRIFT — the number of loci where the masks glue to ⊤ (one mask shows what another denies).
   *  The obstruction to gluing the faces into one character (the corpus's named failure mode). */
  readonly drift: number;
  /** the loci at which the masks contradict (the drift sites). */
  readonly driftLoci: readonly string[];
  /** normalized first-cohomology receipt whose generators are the drift loci. */
  readonly cohomology: JsonRecord;
}

type NaturalCarrier = {
  readonly kind: "exactNumber.natural";
  readonly members: readonly NaturalCarrier[];
};

const natZeroCarrier: NaturalCarrier = Object.freeze({ kind: "exactNumber.natural" as const, members: Object.freeze([]) });
const successorCarrier = (value: NaturalCarrier): NaturalCarrier =>
  Object.freeze({ kind: "exactNumber.natural" as const, members: Object.freeze([...value.members, value]) });
function naturalOfSize(size: number): NaturalCarrier {
  let value = natZeroCarrier;
  for (let index = 0; index < size; index += 1) value = successorCarrier(value);
  return value;
}

const driftPredicate = predicateOfClaim(claim(mark("playing-identity-drift")));
const locusToken = (locus: string) => token(mark(locus));
const characterToken = (name: string) => token(mark(name));
const stageOfDrift = (index: number): JsonRecord => {
  const ordinal = index === 0
    ? Object.freeze({ kind: "ordinal.closure.ordinal.zero" as const })
    : Object.freeze({ kind: "ordinal.closure.ordinal.successor" as const, predecessor: Object.freeze({ kind: "ordinal.closure.ordinal.zero" as const }) });
  const stageOrdinal = Object.freeze({ kind: "predication.settling.stageOrdinal" as const, ordinal });
  return Object.freeze({
    kind: index === 0 ? "predication.settling.stage.initial" as const : "predication.settling.stage.successor" as const,
    ordinal: stageOrdinal,
  }) as JsonRecord;
};

function driftCohomologyReceipt(name: string, driftLoci: readonly string[]): JsonRecord {
  const driftCells = driftLoci.map((locus) => cell(characterToken(name), driftPredicate, locusToken(locus)));
  const rank = naturalOfSize(driftCells.length);
  const firstCohomology = Object.freeze({
    kind: "predication.settling.firstCohomology" as const,
    generators: Object.freeze(driftCells.map((driftCell, index) => Object.freeze({
      kind: "predication.settling.firstCohomologyGenerator" as const,
      stage: stageOfDrift(index),
      cell: driftCell,
    }))),
    rank,
    degree: 1 as const,
    vanishing: rankVanishing(rank),
  });
  return Object.freeze({
    kind: "playing.identity.drift-cohomology" as const,
    drift: driftCells.length,
    first: evaluateRunTerm(cohomologyTerms.settlingFirst, firstCohomology as unknown as JsonValue),
    vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, firstCohomology.vanishing as unknown as JsonValue),
  }) as JsonRecord;
}

/**
 * identity — read a character's identity as the GLUING of its masks (personas), synchronically. The masks
 * are ∨_k-superposed into one global face-family; where two masks commit opposite charges at the same
 * locus the join lands on ⊤ — a contradiction between faces, i.e. IDENTITY DRIFT. A coherent character is
 * one whose masks glue with no drift; a drifting one shows, at some locus, what another of its faces
 * denies. There is no essence behind this — the character is exactly the glued family (cf. performedSelf,
 * the same gluing over plays rather than over masks).
 */
export function identity(agent: CharacterAgent): Identity {
  const glued = superpose([...agent.personas]);
  const driftLoci = glued.entries.filter((e) => e.charge.name === "stable").map((e) => e.locusKey);
  return Object.freeze({
    kind: "playing.identity" as const,
    glued,
    coherent: driftLoci.length === 0,
    drift: driftLoci.length,
    driftLoci: Object.freeze(driftLoci),
    cohomology: driftCohomologyReceipt(agent.name, driftLoci),
  });
}
