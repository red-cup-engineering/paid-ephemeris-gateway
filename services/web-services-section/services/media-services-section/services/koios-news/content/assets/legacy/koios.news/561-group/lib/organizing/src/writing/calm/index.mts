/**
 * writing/calm - the CALM theorem read over organizing federation.
 *
 * CALM (Consistency As Logical Monotonicity) gives the external theorem joint:
 * coordination-free iff monotone. In this package that is not a new ontology.
 * The federation witness is still organizing's cross-arena Mayer-Vietoris
 * decomposition, and ActivityPub still reaches it through `federateActivities`.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";
import type { Activity } from "@emsenn/animating";
import { federate, type Federation, type SocialBoundary } from "../../organizing.mjs";
import { federateActivities } from "../activitypub/index.mjs";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 } as const;

export const calmReadingSchema = {
  $id: "organizing/writing/calm/reading",
  title: "CalmReading",
  description:
    "A CALM theorem reading of organizing federation: coordination-free iff monotone. The witness is the existing federation decomposition: shared lifts, contested top-introducing overlap, and federationOnly non-Scott H1 obstruction.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "theorem", "operation", "monotone", "coordination", "witness"],
  properties: {
    kind: { const: "organizing.writing.calm.reading" },
    theorem: { const: "CALM" },
    operation: { const: "federate" },
    monotone: {
      type: "boolean",
      description: "true exactly when the federation introduces no contested top and no federation-only non-Scott H1 obstruction",
    },
    coordination: {
      enum: ["coordination-free", "consensus-required"],
      description: "CALM classification: coordination-free iff monotone, consensus-required otherwise",
    },
    witness: {
      type: "object",
      additionalProperties: false,
      required: ["shared", "contested", "federationOnly"],
      properties: {
        shared: {
          ...nonnegativeIntegerSchema,
          description: "agreement that lifts through the federation without coordination",
        },
        contested: {
          ...nonnegativeIntegerSchema,
          description: "top-introducing overlap: disagreement held as contested rather than agreement-only accumulation",
        },
        federationOnly: {
          ...nonnegativeIntegerSchema,
          description: "non-Scott H1 obstruction introduced by the federation rather than any constituent alone",
        },
      },
    },
  },
} as const;
export type CalmReading = FromSchema<typeof calmReadingSchema>;
export const calmReadingCarrier = carrierFrom(calmReadingSchema);

/**
 * readCalmFederation - classify an existing organizing federation by CALM.
 *
 * Monotone here means agreement-only accumulation: no contested top introduced
 * across an overlap and no federation-only non-Scott H1 step.
 */
export function readCalmFederation(federation: Federation): CalmReading {
  const witness = {
    shared: federation.shared,
    contested: federation.contested,
    federationOnly: federation.federationOnly,
  };
  const monotone = witness.contested === 0 && witness.federationOnly === 0;
  return {
    kind: "organizing.writing.calm.reading",
    theorem: "CALM",
    operation: "federate",
    monotone,
    coordination: monotone ? "coordination-free" : "consensus-required",
    witness,
  };
}

/**
 * readCalmCovers - classify organizing's own federation operation by CALM.
 *
 * The covers are passed straight through `federate`; this helper exists so CALM is
 * mounted on the public organizing operation rather than a parallel merge.
 */
export function readCalmCovers(covers: readonly SocialBoundary[]): CalmReading {
  return readCalmFederation(federate(covers));
}

/**
 * readCalmActivities - ActivityPub-backed CALM reading.
 *
 * This is the WMAP/S2S path: Activities become camp membranes through
 * `federateActivities`, then the resulting federation is classified by CALM.
 */
export function readCalmActivities(campActivities: readonly (readonly Activity[])[]): CalmReading {
  return readCalmFederation(federateActivities(campActivities));
}
