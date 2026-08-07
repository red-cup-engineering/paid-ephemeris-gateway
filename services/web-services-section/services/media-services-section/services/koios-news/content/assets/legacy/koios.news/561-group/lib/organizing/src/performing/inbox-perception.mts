import {
  ACTIVITYSTREAMS_CONTEXT,
  perceiveInbox,
  type Activity,
} from "@emsenn/animating";
import type {
  OrganizingPerformingActivitySummary,
  OrganizingPerformingInboxEvent,
  OrganizingPerformingInboxPerceptionSignal,
} from "./carriers.mjs";

export type OrganizingTheatreInboxEvent = OrganizingPerformingInboxEvent;

export interface OrganizingTheatreInboxActivitiesOptions {
  readonly inboxSource?: string;
}

export interface OrganizingTheatreInboxPerceptionOptions {
  readonly kind?: string;
  readonly claim?: string;
  readonly perceivedAgentKind?: string;
  readonly window?: number;
  readonly recent?: number;
  readonly contentLimit?: number;
  readonly toLimit?: number;
}

export type OrganizingTheatreActivitySummary = OrganizingPerformingActivitySummary;
export type organizingTheatreInboxPerceptionSignal = OrganizingPerformingInboxPerceptionSignal;

export function organizingTheatreActivityAddressedTo(activity: unknown): readonly string[] {
  const values: string[] = [];
  if (activity === null || typeof activity !== "object") return Object.freeze(values);
  const record = activity as Record<string, unknown>;
  for (const key of ["to", "cc", "bto", "bcc", "audience"]) {
    const value = record[key];
    if (typeof value === "string") values.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "string") values.push(item);
    }
  }
  if (typeof record.target === "string") values.push(record.target);
  return Object.freeze([...new Set(values)]);
}

export function organizingTheatreIsActivity(value: unknown): value is Activity {
  return value !== null
    && typeof value === "object"
    && (value as Record<string, unknown>)["@context"] === ACTIVITYSTREAMS_CONTEXT
    && typeof (value as Record<string, unknown>).type === "string"
    && typeof (value as Record<string, unknown>).actor === "string"
    && (value as Record<string, unknown>).object !== undefined;
}

export function organizingTheatreInboxActivitiesFor(
  events: readonly OrganizingTheatreInboxEvent[],
  actorId: string,
  options: OrganizingTheatreInboxActivitiesOptions = {},
): readonly Activity[] {
  const inboxSource = options.inboxSource ?? "organizing.theatre.activitypub-inbox";
  return Object.freeze(events
    .filter((event) => event.source === inboxSource && organizingTheatreIsActivity(event.activity))
    .filter((event) => event.inboxDelivery?.targetActor === actorId || organizingTheatreActivityAddressedTo(event.activity).includes(actorId))
    .map((event) => event.activity as Activity));
}

export function organizingTheatreCompactActivitySummary(
  activity: Activity,
  options: OrganizingTheatreInboxPerceptionOptions = {},
): OrganizingTheatreActivitySummary {
  const object = activity.object !== null && typeof activity.object === "object" ? activity.object as Record<string, unknown> : {};
  return Object.freeze({
    id: typeof activity.id === "string" ? activity.id : null,
    type: activity.type,
    actor: activity.actor,
    published: typeof activity.published === "string" ? activity.published : null,
    objectType: typeof object.type === "string" ? object.type : null,
    content: typeof object.content === "string"
      ? compactText(object.content, options.contentLimit)
      : typeof activity.object === "string"
      ? compactText(activity.object, options.contentLimit)
      : null,
    objectId: typeof object.id === "string" ? object.id : null,
    to: Object.freeze(organizingTheatreActivityAddressedTo(activity).slice(0, options.toLimit ?? 8)),
  });
}

export function organizingTheatreInboxPerceptionSignal(
  actorId: string,
  inboxActivities: readonly Activity[],
  options: OrganizingTheatreInboxPerceptionOptions = {},
): organizingTheatreInboxPerceptionSignal {
  const window = inboxActivities.slice(-(options.window ?? 64));
  const perceived = window.length === 0 ? null : perceiveInbox(window, undefined, { identity: actorId });
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.activitypub-inbox-perception",
    claim: options.claim ?? "Inbound ActivityPub Activities are folded through animating's perceiveInbox leg, so an agent inbox is read as an agent membrane.",
    actor: actorId,
    activities: inboxActivities.length,
    window: window.length,
    recent: Object.freeze(window.slice(-(options.recent ?? 6)).map((activity) => organizingTheatreCompactActivitySummary(activity, options))),
    agent: perceived === null ? null : OrganizingTheatreCompactAgentPerception(perceived, options),
  });
}

function compactText(value: string, limit = 4000): string {
  const compacted = value.replace(/\s+/gu, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, Math.max(0, limit - 3))}...` : compacted;
}

function OrganizingTheatreCompactAgentPerception(agent: unknown, options: OrganizingTheatreInboxPerceptionOptions): unknown {
  if (agent === null || typeof agent !== "object") return null;
  const value = agent as Record<string, unknown>;
  return Object.freeze({
    kind: options.perceivedAgentKind ?? "organizing.theatre.activitypub-inbox-perceived-agent",
    identity: value.identity,
    loop: value.loop,
    glued: value.glued,
    perception: value.perception,
    action: value.action,
    stance: value.stance,
    cognition: value.cognition,
    coherence: value.coherence,
    goal: value.goal,
    character: value.character,
    work: value.work,
    governing: value.governing,
    faces: Object.freeze(Array.isArray(value.faces) ? value.faces.map(compactOrganizingTheatreFace) : []),
  });
}

function compactOrganizingTheatreFace(face: unknown): unknown {
  if (face === null || typeof face !== "object") return {};
  const value = face as Record<string, unknown>;
  return Object.freeze({
    faculty: value.faculty,
    direction: value.direction,
    axis: value.axis,
    cover: value.cover,
    held: value.held,
    contested: value.contested,
    aggregate: value.aggregate,
    belnap: value.belnap,
  });
}
