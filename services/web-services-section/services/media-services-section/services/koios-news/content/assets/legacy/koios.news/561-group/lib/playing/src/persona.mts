/**
 * persona — the mask/character/persona world of performance theory, read off the REAL ludics
 * (frontier register, Layer A continued). Persona is Latin for the actor's MASK; this module reads the
 * mask, the relation of mask to face, and the modes of wearing one, through Girard's operators.
 *
 *   MASK (Deleuze; Lévi-Strauss) = DELOCATION. A persona is a design worn at an address: `mask` relocates
 *   a design under a prefix (the same dialogical content, re-staged as a different character). Masks
 *   COMPOSE — `mask(mask(d))` is again a mask (delocation is a monoid action) — so there is no privileged
 *   "face" beneath: behind every mask, another mask (Deleuze, Difference and Repetition).
 *
 *   PERFORMATIVITY (Butler) — a theorem, not a slogan. Butler: there is no doer behind the deed; the
 *   appearance of a substantive self is an effect of the repeated performances. Ludics proves exactly
 *   this: "a design is the union of its chronicles" (Girard 2001 §4.7). `performativity` reconstructs the
 *   persona from its plays alone (`designChronicles` → `designFromActionSet`) and finds it FAITHFUL — the
 *   reconstruction equals the design. The deeds ARE the doer; there is no residual essence behind them.
 *
 *   PERSONA / SHADOW (Jung) = the stage split. The persona is the mask SHOWN — the incarnation, the front
 *   stage met by the audience; the shadow is the disowned — the ballast, the back stage no counter visits.
 *
 *   ROLE DISTANCE (Goffman) / identification vs demonstration (Stanislavski vs Brecht). An actor that
 *   equals its incarnation (MATERIAL — no reserve) IS the role: full identification, the Method. An actor
 *   that holds a large back-stage reserve SHOWS the role from a distance: Brecht's gestus / Verfremdung,
 *   Goffman's role distance — the self that exceeds the part it plays.
 *
 * Consumes `delocate`/`sameDesign` (delocation), `designChronicles`/`designFromActionSet` (the
 * union-of-chronicles theorem), and `stage` (the incarnation split); re-derives no ludics.
 */
import { stage } from "./dramaturgy.mjs";
import { delocate, sameDesign } from "./structuring/concurrent-game/with-symmetry/ludicizing/delocation.mjs";
import { locus } from "./structuring/concurrent-game/with-symmetry/ludicizing/locus.mjs";
import { designChronicles, designFromActionSet } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";
import type { Design } from "./structuring/concurrent-game/with-symmetry/ludicizing/design.mjs";

// ── Mask = delocation (Deleuze: masks of masks) ──

/** Don a persona: relocate a design's whole play under an address — the same actor as a new character.
 *  Masks compose (delocation is a monoid action), so there is no original face beneath. */
export function mask(actor: Design, at: readonly number[]): Design {
  return delocate(actor, locus(at));
}

/** Whether `worn` is `actor` wearing the mask at `at` — i.e. `worn` is the persona of the same
 *  underlying play, relocated. (Two characters that are one actor under different masks.) */
export function sameActor(actor: Design, worn: Design, at: readonly number[]): boolean {
  return sameDesign(worn, mask(actor, at));
}

// ── Performativity (Butler): the doer is the deeds ──

/** The performativity reading of a persona — reconstructed from its performances. */
export interface Performativity {
  readonly kind: "playing.performativity";
  /** the number of chronicles (performances) the persona is the union of. */
  readonly plays: number;
  /** the design reconstructed from the union of its chronicles' actions. */
  readonly reconstructed: Design;
  /** the reconstruction equals the persona — "a design is the union of its chronicles". */
  readonly faithful: boolean;
  /** NO ESSENCE behind the performances: the doer is exactly the deeds (Butler). Equals `faithful`. */
  readonly noEssence: boolean;
}

/**
 * performativity — demonstrate Butler's "no doer behind the deed" on the ludics: reconstruct the persona
 * from its chronicles alone (the union of the plays it performs) and find the reconstruction FAITHFUL.
 * The persona has no substantive interior prior to its performances; it IS their sedimented union.
 */
export function performativity(actor: Design): Performativity {
  const chronicles = designChronicles(actor);
  const actions = chronicles.flatMap((c) => [...c.actions]);
  const reconstructed = designFromActionSet(actions);
  const faithful = sameDesign(reconstructed, actor);
  return Object.freeze({
    kind: "playing.performativity" as const,
    plays: chronicles.length,
    reconstructed,
    faithful,
    noEssence: faithful,
  });
}

// ── Persona / shadow (Jung) ──

/** The Jungian split of an actor before an audience. */
export interface PersonaShadow {
  readonly kind: "playing.persona-shadow";
  /** the PERSONA — the mask shown: the incarnation/front stage the audience meets. */
  readonly persona: Design;
  /** the SHADOW — the disowned: the ballast/back stage no counter visits. */
  readonly shadow: Design;
  readonly personaLoci: number;
  readonly shadowLoci: number;
}

/** personaShadow — split an actor into persona (the mask shown to the audience) and shadow (the disowned
 *  reserve), via the incarnation stage split. Jung's persona/shadow as front/back stage. */
export function personaShadow(actor: Design, troupe: readonly Design[], universe: readonly Design[]): PersonaShadow {
  const s = stage(actor, troupe, universe);
  return Object.freeze({
    kind: "playing.persona-shadow" as const,
    persona: s.frontStage,
    shadow: s.backStage,
    personaLoci: s.frontLoci,
    shadowLoci: s.backLoci,
  });
}

// ── Role distance (Goffman) / identification vs demonstration (Stanislavski ↔ Brecht) ──

/** The role-distance reading: how much the actor exceeds the role it shows. */
export interface RoleDistance {
  readonly kind: "playing.role-distance";
  /** the reserve held back as a fraction of the whole: shadow / (persona + shadow) ∈ [0,1]. */
  readonly distance: number;
  /** the actor equals its incarnation — no reserve (MATERIAL). */
  readonly material: boolean;
  /** the mode: `identification` (the actor IS the role — Stanislavski/Method) or `role-distance` (the
   *  actor SHOWS the role from a reserve — Brecht's gestus / Goffman's role distance). */
  readonly mode: "identification" | "role-distance";
}

/**
 * roleDistance — read the actor's relation to its role: an actor with no reserve (material — its whole
 * commitment is incarnated/shown) IS the role (identification, the Method); an actor holding back a
 * shadow shows the role at a distance (Brechtian demonstration). `distance` is the held-back fraction.
 */
export function roleDistance(actor: Design, troupe: readonly Design[], universe: readonly Design[]): RoleDistance {
  const s = stage(actor, troupe, universe);
  const total = s.frontLoci + s.backLoci;
  const distance = total > 0 ? s.backLoci / total : 0;
  return Object.freeze({
    kind: "playing.role-distance" as const,
    distance,
    material: s.material,
    mode: s.material ? "identification" : "role-distance",
  });
}
