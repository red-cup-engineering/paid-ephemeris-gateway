import { carrierFrom, type FromSchema } from "@emsenn/relating";

const nullableStringSchema = { type: ["string", "null"] } as const;
const nonnegativeIntegerSchema = { type: "integer", minimum: 0 } as const;

export const OrganizingPerformingSessionCharacterLaneSchema = {
  $id: "organizing/performing/session-character-lane",
  title: "OrganizingPerformingSessionCharacterLane",
  description: "The active development lane through which a session character is staged.",
  type: "object",
  additionalProperties: false,
  properties: {
    currentCwd: nullableStringSchema,
    focusPaths: { type: "array", items: { type: "string" } },
    lastTool: nullableStringSchema,
  },
} as const;
export type OrganizingPerformingSessionCharacterLane = FromSchema<typeof OrganizingPerformingSessionCharacterLaneSchema>;
export const organizingPerformingSessionCharacterLaneCarrier = carrierFrom(OrganizingPerformingSessionCharacterLaneSchema);

export const OrganizingPerformingSessionEventSchema = {
  $id: "organizing/performing/session-event",
  title: "OrganizingPerformingSessionEvent",
  description: "A hook/event witness admitted to the session-character chronicle.",
  type: "object",
  additionalProperties: true,
  properties: {
    session: nullableStringSchema,
    harness: nullableStringSchema,
    source: nullableStringSchema,
    activity: {},
    payload: {},
    hookEventName: {},
  },
} as const;
export type OrganizingPerformingSessionEvent = FromSchema<typeof OrganizingPerformingSessionEventSchema>;
export const organizingPerformingSessionEventCarrier = carrierFrom(OrganizingPerformingSessionEventSchema);

export const OrganizingPerformingInboxEventSchema = {
  $id: "organizing/performing/inbox-event",
  title: "OrganizingPerformingInboxEvent",
  description: "An ActivityPub inbox delivery event that may be folded into agent perception.",
  type: "object",
  additionalProperties: true,
  properties: {
    source: { type: "string" },
    activity: {},
    inboxDelivery: {
      type: "object",
      additionalProperties: true,
      properties: {
        targetActor: {},
      },
    },
  },
} as const;
export type OrganizingPerformingInboxEvent = FromSchema<typeof OrganizingPerformingInboxEventSchema>;
export const organizingPerformingInboxEventCarrier = carrierFrom(OrganizingPerformingInboxEventSchema);

const activitySummarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "actor", "published", "objectType", "content", "objectId", "to"],
  properties: {
    id: nullableStringSchema,
    type: { type: "string" },
    actor: { type: "string" },
    published: nullableStringSchema,
    objectType: nullableStringSchema,
    content: nullableStringSchema,
    objectId: nullableStringSchema,
    to: { type: "array", items: { type: "string" } },
  },
} as const;

export const OrganizingPerformingInboxPerceptionSignalSchema = {
  $id: "organizing/performing/inbox-perception-signal",
  title: "OrganizingPerformingInboxPerceptionSignal",
  description: "The performing-layer perception fold of delivered ActivityPub inbox activities.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "claim", "actor", "activities", "window", "recent", "agent"],
  properties: {
    kind: { type: "string" },
    claim: { type: "string" },
    actor: { type: "string" },
    activities: nonnegativeIntegerSchema,
    window: nonnegativeIntegerSchema,
    recent: { type: "array", items: activitySummarySchema },
    agent: {},
  },
} as const;
export type OrganizingPerformingInboxPerceptionSignal = FromSchema<typeof OrganizingPerformingInboxPerceptionSignalSchema>;
export const organizingPerformingInboxPerceptionSignalCarrier = carrierFrom(OrganizingPerformingInboxPerceptionSignalSchema);

export type OrganizingPerformingActivitySummary = FromSchema<typeof activitySummarySchema>;
