import type { FiberCarrier, Valuation } from "../fiber.mjs";
import { predicationSite } from "../../../../articulating/carriers.mjs";

/**
 * A posit presheaf over a predication fiber: holds the fiber carrier together
 * with the list of valuation traces accumulated over it, seeded with the
 * fiber's own valuation.
 */
export interface PositPresheaf {
  readonly kind: "predication.posit.presheaf";
  readonly fiber: FiberCarrier;
  readonly traces: readonly Valuation[];
}

/**
 * A trace through a posit presheaf: an ordered list of the valuations recorded over
 * the fiber.
 */
export interface PresheafTrace {
  readonly kind: "predication.valuation.sheaf.trace";
  readonly valuations: readonly Valuation[];
}

/**
 * A sheaf carrier: holds the single global section valuation that the
 * posit presheaf's traces glue to.
 */
export interface SheafCarrier {
  readonly kind: "predication.valuation.sheaf.carrier";
  readonly section: Valuation;
}

/**
 * The result of commutating a posit presheaf: holds the saturated carrier
 * together with the residue of valuations left over from gluing its traces.
 */
export interface CommutationCarrier {
  readonly kind: "predication.valuation.sheaf.commutation";
  readonly saturated: PositPresheaf;
  readonly residue: readonly Valuation[];
}

/**
 * Constructs the posit presheaf over a fiber carrier: seeds its trace list with
 * the fiber's valuation.
 */
export function presheaf(fiber: FiberCarrier): PositPresheaf {
  return Object.freeze({ kind: "predication.posit.presheaf" as const, fiber, traces: Object.freeze([fiber.valuation]) });
}

/**
 * Builds a posit presheaf from a valuation: rebuilds a predication site from
 * the cells of all the valuation's assignments, wraps it as a fiber carrier,
 * and posits that.
 */
export function presheafFromValuation(valuation: Valuation): PositPresheaf {
  const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
  const predication = predicationSite(cells);
  return presheaf(Object.freeze({ kind: "predication.fiber.carrier" as const, predication, valuation }));
}

/**
 * Builds a sheaf carrier from a valuation: takes the valuation as the sheaf's
 * global section.
 */
export function sheafFromValuation(section: Valuation): SheafCarrier {
  return Object.freeze({ kind: "predication.valuation.sheaf.carrier" as const, section });
}

/**
 * Commutates a posit presheaf into a commutation carrier: keeps the carrier as
 * the saturated component and exposes its traces as the residue.
 */
export function commutate(p: PositPresheaf): CommutationCarrier {
  return Object.freeze({
    kind: "predication.valuation.sheaf.commutation" as const,
    saturated: p,
    residue: p.traces,
  });
}
