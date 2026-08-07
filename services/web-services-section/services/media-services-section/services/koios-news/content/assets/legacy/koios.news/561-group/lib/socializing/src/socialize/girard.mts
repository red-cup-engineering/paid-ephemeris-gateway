/**
 * girard — René Girard's MIMETIC SCAPEGOAT mechanism as PATHOLOGICAL CONSENSUS (frontier register §5).
 *
 * Girard's sacrificial crisis is a community dissolved into undifferentiated mimetic rivalry — in the
 * package's terms a field SATURATED with ⊤ (held contradictions everywhere). The scapegoat mechanism
 * resolves it by unanimity-minus-one: the collective converges on a single victim, EXPELS them, and the
 * remainder emerges unanimous and at peace. It is a forced convergence by EXPULSION — a coerced `secede`
 * imposed on one member rather than a chosen withdrawal — and so it is the malign twin of `consensusClose`
 * (consensus reached by sacrifice, not agreement) and the most violent case of recuperation (the crisis's
 * ⊤ discharged onto a body).
 *
 * The detector reads the signature across a before/after pair: high prior contestation, exactly one
 * member removed and removed NOT by their own choice, and posterior unanimity among the remainder.
 *
 * Reuses `contestedCells` (`recuperation.mts`) for the ⊤-saturation reading; re-derives nothing.
 */
import { contestedCells } from "./recuperation.mjs";
import type { Field, FieldMember } from "./field.mjs";

const memberNames = (field: Field): readonly string[] =>
  field.members.map((member: FieldMember) => String((member.agent as { readonly name?: unknown }).name ?? ""));

/** The scapegoat reading over a before/after transition. */
export interface ScapegoatVerdict {
  readonly kind: "socializing.scapegoat";
  /** contested (⊤) cells before — the sacrificial crisis: undifferentiated mimetic rivalry. */
  readonly priorContested: number;
  /** contested cells after the expulsion. */
  readonly posteriorContested: number;
  /** the expelled was present before. */
  readonly expelledPresentBefore: boolean;
  /** the expelled is absent after. */
  readonly expelledAbsentAfter: boolean;
  /** exactly ONE member was removed (unanimity-minus-one, not a general schism). */
  readonly exactlyOneRemoved: boolean;
  /** the remainder is UNANIMOUS after — the peace the expulsion purchased (no contested cells left). */
  readonly unanimousAfter: boolean;
  /** the expulsion was COERCED (not the victim's own choice) — a scapegoating, not a voluntary secession. */
  readonly coerced: boolean;
  /** the SCAPEGOAT mechanism: a crisis resolved by coercively expelling one member into posterior
   *  unanimity — forced convergence by sacrifice, the malign twin of consensus. */
  readonly scapegoat: boolean;
}

/**
 * scapegoatDetector — detect Girard's scapegoat mechanism across a before/after transition: a field in
 * sacrificial crisis (contested ⊤ present) resolved by coercively expelling exactly one member, after
 * which the remainder is unanimous. This is consensus reached by expulsion rather than agreement — a
 * coerced secession imposed on a victim, distinct from a voluntary withdrawal (`voluntary` true), and the
 * worst case of recuperation (the crisis discharged onto a body).
 */
export function scapegoatDetector(before: Field, after: Field, expelled: string, voluntary: boolean): ScapegoatVerdict {
  const priorContested = contestedCells(before);
  const posteriorContested = contestedCells(after);
  const beforeNames = memberNames(before);
  const afterNames = memberNames(after);
  const expelledPresentBefore = beforeNames.includes(expelled);
  const expelledAbsentAfter = !afterNames.includes(expelled);
  const exactlyOneRemoved = before.members.length - after.members.length === 1;
  const unanimousAfter = posteriorContested === 0;
  const coerced = !voluntary;
  return Object.freeze({
    kind: "socializing.scapegoat" as const,
    priorContested,
    posteriorContested,
    expelledPresentBefore,
    expelledAbsentAfter,
    exactlyOneRemoved,
    unanimousAfter,
    coerced,
    scapegoat: priorContested > 0 && exactlyOneRemoved && expelledPresentBefore && expelledAbsentAfter && unanimousAfter && coerced,
  });
}
