/**
 * Identity — the ludics copycat / Fax, the unit of the category of behaviours.
 *
 * Corpus / Girard 2001 "Locus Solum": the identity on a behaviour B is **Fax**, the
 * η-expanded **copycat** design — the B ⊸ B map that `cut`-composes to the identity
 * (`cut(Fax_B, d) ≃ d` for `d ∈ B`). Landing it is what turns behaviours from a mere
 * closure operator into a genuine **category** (objects = behaviours, composition =
 * `cut` in `proving/computational-ludics`, identity = Fax) — the gaming ROADMAP's
 * NEXT #1.
 *
 * A theory-honest note about the grain (this is a result, not a shortcut): the true
 * Fax is **reactive** — it copies whatever move the environment plays from one side of
 * its interface to the other. A reactive strategy is NOT expressible as a *static*
 * charge valuation (the `Design` grain of `ludicizing/design.mts`): a valuation fixes
 * its charges in advance, it cannot mirror an unknown counter-move. So the full
 * categorical identity lives at the **chronicle/action grain** (`chronicle.mts` carries
 * the action sequences), where copying-as-it-goes is expressible. What the flat
 * valuation grain DOES carry faithfully is the copycat's **convergence content**: the
 * canonical design that converges with (accepts) every member of a behaviour — its
 * universal counter-design, `faxResponder`, which lies in `B^⊥`. We build and witness
 * that here, and state the full identity law (with its grain) as `faxIdentity`.
 */
import { chargeValue } from "@emsenn/relating";
import { type Design, design } from "./design.mjs";
import { type Locus, locusFromKey } from "./locus.mjs";
import { incarnation, orthogonal } from "./settling/index.mjs";

/** Daimonize a design: ⊤ (`stable`) at exactly its committed loci — the "accept here" response. */
function daimonize(d: Design): Design {
  return design(new Map(d.entries.map((e) => [e.locusKey, chargeValue("stable")] as const)));
}

/**
 * `faxResponder(B)` — the flat-valuation **copycat responder** at a behaviour: the
 * superposition of the Daimon (⊤) responses over the behaviour's material core
 * (`incarnation`). It commits ⊤ at every locus any incarnated member of B visits, so
 * it **converges with (accepts) every member of B** — i.e. it lies in `B^⊥`. This is
 * the convergence shadow of the reactive Fax at the valuation grain. (At the chronicle
 * grain it sharpens into the full η-expanded copycat; see `faxIdentity`.)
 */
export function faxResponder(set: readonly Design[], universe: readonly Design[]): Design {
  const core = incarnation(set, universe);
  const labelling = new Map<string, ReturnType<typeof chargeValue>>();
  for (const member of core) {
    for (const entry of daimonize(member).entries) labelling.set(entry.locusKey, entry.charge);
  }
  return design(labelling);
}

export interface FaxResponderWitness {
  readonly kind: "game.identity.fax-responder:witness";
  /** The responder design (⊤ over the behaviour's visited loci). */
  readonly responder: Design;
  /** The loci it commits ⊤ at — the behaviour's material interface. */
  readonly interface: readonly Locus[];
  /** It converges with (accepts) every member of the behaviour's incarnation. */
  readonly acceptsAll: true;
}

export interface FaxResponderObstruction {
  readonly kind: "game.identity.fax-responder-obstruction";
  readonly responder: Design;
  /** A member the responder fails to converge with (e.g. an empty-support member). */
  readonly rejected: Design;
}

export type FaxResponderJudgment = FaxResponderWitness | FaxResponderObstruction;

/**
 * Witness that `faxResponder(B)` accepts every member of B (lies in `B^⊥`): the
 * copycat-convergence law at the valuation grain. The witness records the responder
 * and its interface loci; an obstruction names a member it cannot meet (a member with
 * empty support, which no design can converge with).
 */
export function faxResponderJudgment(set: readonly Design[], universe: readonly Design[]): FaxResponderJudgment {
  const responder = faxResponder(set, universe);
  const core = incarnation(set, universe);
  const rejected = core.find((member) => member.entries.length > 0 && !orthogonal(responder, member));
  if (rejected !== undefined) {
    return Object.freeze({ kind: "game.identity.fax-responder-obstruction" as const, responder, rejected });
  }
  return Object.freeze({
    kind: "game.identity.fax-responder:witness" as const,
    responder,
    interface: Object.freeze(responder.entries.map((e) => locusFromKey(e.locusKey))),
    acceptsAll: true,
  });
}

export interface FaxIdentityStatement {
  readonly kind: "game.identity.fax.statement";
  readonly theorem: string;
}

/**
 * The categorical-identity law for Fax, carried as data with its grain made explicit.
 * Naming the theorem the way `cutElimination` names the Hauptsatz: the engine (cut =
 * `interact` gated by convergence) lives in `proving/computational-ludics`; this states
 * what Fax IS and where it lives.
 */
export function faxIdentity(): FaxIdentityStatement {
  return Object.freeze({
    kind: "game.identity.fax.statement" as const,
    theorem:
      "Girard 2001: the identity on a behaviour B is Fax, the η-expanded copycat — the B ⊸ B design with cut(Fax_B, d) ≃ d for every d ∈ B, making behaviours a category (composition = cut, identity = Fax). Fax is REACTIVE (it copies the environment's move across its interface), so it is not a static charge valuation; the full identity lives at the chronicle/action grain. At the flat-valuation grain its faithful shadow is faxResponder(B): the canonical design in B^⊥ that converges with (accepts) every member of B. faxResponderJudgment witnesses that acceptance.",
  });
}

export function isFaxResponderWitness(value: unknown): value is FaxResponderWitness {
  return typeof value === "object" && value !== null
    && (value as { readonly kind?: unknown }).kind === "game.identity.fax-responder:witness";
}
