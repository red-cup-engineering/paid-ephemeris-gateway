import {
  ACTIVITYSTREAMS_CONTEXT,
  actorOfAgent,
  agentCardOfSessionCharacter,
  perceive,
  type Agent,
  type AgentCard,
  type Activity,
  type Actor,
  type SessionCharacterA2ASurface,
} from "@emsenn/animating";
import {
  chronicle,
  daimonAction,
  designFromActionSet,
  locus,
  negativeAction,
  positiveAction,
  sessionCharacterReading,
  stage,
  type Action,
  type Design,
  type SessionCharacterReading,
  type SessionEventWitness,
} from "@emsenn/playing";

import { cast, stageTroupeMember, type Troupe } from "../casting/index.mjs";
import { situation, type Situation, type SituationScene } from "../situation/index.mjs";
import type { Camp } from "../writing/activitypub/index.mjs";
import type {
  OrganizingPerformingSessionCharacterLane,
  OrganizingPerformingSessionEvent,
} from "./carriers.mjs";

export interface OrganizingTheatreServiceConfig {
  readonly baseUrl: string;
}

export type OrganizingTheatreSessionEvent = OrganizingPerformingSessionEvent;
export type OrganizingTheatreSessionCharacterLane = OrganizingPerformingSessionCharacterLane;

export interface OrganizingTheatreSessionCharacterOptions {
  readonly actorId?: string;
  readonly events?: readonly OrganizingTheatreSessionEvent[];
  readonly activities?: readonly Activity[];
  readonly lane?: Readonly<OrganizingTheatreSessionCharacterLane> | null;
  readonly situation?: Situation;
  readonly troupeDesigns?: readonly Design[];
  readonly universe?: readonly Design[];
  readonly admittedActions?: readonly string[];
  readonly version?: string;
}

export interface organizingTheatreSessionCharacterSurface {
  readonly kind: "organizing.theatre.session-character";
  readonly actor: string;
  readonly camp: Camp | null;
  readonly situation: Situation;
  readonly troupe: Troupe | null;
  readonly reading: SessionCharacterReading<Agent>;
  readonly agentCard: AgentCard;
}

interface OrganizingTheatreSessionStage {
  readonly camp: Camp | null;
  readonly situation: Situation;
  readonly troupe: Troupe | null;
  readonly troupeDesigns: readonly Design[];
  readonly universe: readonly Design[];
}

export function organizingTheatreSessionCharacter(
  config: OrganizingTheatreServiceConfig,
  harness: string,
  session: string,
  options: OrganizingTheatreSessionCharacterOptions = {},
): organizingTheatreSessionCharacterSurface {
  const actorId = options.actorId ?? organizingTheatreAgentActorId(config, harness, session);
  const events = options.events ?? [];
  const eventActivities = options.activities ?? events.map((event) => event.activity).filter(organizingTheatreIsActivity);
  const eventWitnesses = organizingTheatreSessionEventWitnesses(events, {
    actorId,
    harness,
    session,
    ...(options.lane === undefined ? {} : { lane: options.lane }),
  });
  const witnesses = eventWitnesses.length === 0
    ? organizingTheatreSessionActivityWitnesses(eventActivities, {
      actorId,
      harness,
      session,
      ...(options.lane === undefined ? {} : { lane: options.lane }),
    })
    : eventWitnesses;
  const standing = organizingTheatreStandingSessionStage(config, actorId, events, witnesses, options);
  const reading = sessionCharacterReading(
    witnesses,
    options.troupeDesigns ?? standing.troupeDesigns,
    options.universe ?? standing.universe,
    {
      name: actorId,
      perceive: (input, memory, perceiveOptions) =>
        perceive(
          organizingTheatreWitnessSeed(input, actorId),
          memory === undefined ? undefined : organizingTheatreWitnessSeed(memory, actorId),
          perceiveOptions,
        ),
    },
  );
  const surface: SessionCharacterA2ASurface = {
    kind: "animating.writing.a2a.session-character-surface",
    url: `${actorId.replace(/\/+$/u, "")}/.well-known/agent-card.json`,
    version: options.version ?? "0.0.0",
    session: reading,
    publishedMasks: reading.masks.map((entry) => `mask:${entry.axis}:${entry.label}`),
    admittedActions: Object.freeze([...(options.admittedActions ?? organizingTheatreActionNamesFromActivities(eventActivities))]),
  };
  return Object.freeze({
    kind: "organizing.theatre.session-character" as const,
    actor: actorId,
    camp: standing.camp,
    situation: standing.situation,
    troupe: standing.troupe,
    reading,
    agentCard: agentCardOfSessionCharacter(surface),
  });
}

export function organizingTheatreAgentActorsForEvents(
  events: readonly OrganizingTheatreSessionEvent[],
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreSessionCharacterOptions = {},
): readonly Actor[] {
  const sessions = new Map<string, { harness: string; session: string }>();
  for (const event of events) {
    const harness = String(event.harness ?? "agent");
    const session = String(event.session ?? "unknown-session");
    const actorId = organizingTheatreIsActivity(event.activity)
      ? event.activity.actor
      : organizingTheatreAgentActorId(config, harness, session);
    sessions.set(actorId, { harness, session });
  }
  return Object.freeze([...sessions.entries()]
    .map(([actorId, item]) => actorOfAgent(organizingTheatreSessionCharacter(config, item.harness, item.session, {
      ...options,
      actorId,
      events,
    }).reading.interior))
    .sort((left, right) => left.id.localeCompare(right.id)));
}

export function organizingTheatreAgentActorId(
  config: OrganizingTheatreServiceConfig,
  harness: string,
  session: string,
): string {
  return `${trimmedBase(config.baseUrl)}/agents/${encodeURIComponent(String(harness || "agent"))}/${encodeURIComponent(String(session || "unknown-session"))}`;
}

export function organizingTheatreActionNamesFromActivities(activities: readonly Activity[]): readonly string[] {
  const names = activities
    .map((activity) => activity.object)
    .filter((object): object is Record<string, unknown> => object !== null && typeof object === "object" && !Array.isArray(object))
    .map((object) => typeof object.name === "string" ? object.name : typeof object.id === "string" ? object.id.split("/").at(-1) : null)
    .filter((name): name is string => typeof name === "string" && name !== "");
  return Object.freeze([...new Set(names)].sort());
}

function organizingTheatreSessionEventWitnesses(
  events: readonly OrganizingTheatreSessionEvent[],
  context: Readonly<{
    actorId: string;
    harness: string;
    session: string;
    lane?: OrganizingTheatreSessionCharacterOptions["lane"];
  }>,
): readonly SessionEventWitness[] {
  const relevant = events.filter((event) =>
    String(event.session ?? context.session) === context.session
    || (organizingTheatreIsActivity(event.activity) && event.activity.actor === context.actorId));
  return Object.freeze(relevant.map((event, index) => {
    const hook = OrganizingTheatreHookEventName(event);
    const witness = {
      kind: "playing.session-character.event:witness" as const,
      session: String(event.session ?? context.session),
      harness: String(event.harness ?? context.harness),
      via: typeof event.source === "string" ? event.source : "organizing.theatre.event-chronicle",
      lane: OrganizingTheatreLaneLabel(event, context.lane),
      ...(hook === null ? {} : { office: hook }),
      chronicle: chronicle([OrganizingTheatreActionForEvent(event, index)]) as unknown as SessionEventWitness["chronicle"],
    };
    return Object.freeze(witness) as SessionEventWitness;
  }));
}

function organizingTheatreSessionActivityWitnesses(
  activities: readonly Activity[],
  context: Readonly<{
    actorId: string;
    harness: string;
    session: string;
    lane?: OrganizingTheatreSessionCharacterOptions["lane"];
  }>,
): readonly SessionEventWitness[] {
  const relevant = activities.filter((activity) => activity.actor === context.actorId);
  return Object.freeze(relevant.map((activity, index) => {
    const witness = {
      kind: "playing.session-character.event:witness" as const,
      session: context.session,
      harness: context.harness,
      via: "activitypub",
      lane: context.lane?.currentCwd ?? "activitypub",
      office: activity.type,
      chronicle: chronicle([OrganizingTheatreActionForActivity(activity, index)]) as unknown as SessionEventWitness["chronicle"],
    };
    return Object.freeze(witness) as SessionEventWitness;
  }));
}

function organizingTheatreStandingSessionStage(
  config: OrganizingTheatreServiceConfig,
  actorId: string,
  events: readonly OrganizingTheatreSessionEvent[],
  actorWitnesses: readonly SessionEventWitness[],
  options: OrganizingTheatreSessionCharacterOptions,
): OrganizingTheatreSessionStage {
  const designs = OrganizingTheatreSessionDesigns(config, actorId, events, actorWitnesses);
  const universe = Object.freeze([...(options.universe ?? designs.values())]);
  const members = Object.freeze([...designs.keys()].sort().map((id) => OrganizingTheatreBareActor(id)));
  const scene = options.situation ?? OrganizingTheatreSituationForActor(actorId, options, Math.max(2, members.length));
  const camp = members.length < 2
    ? null
    : Object.freeze({
      id: `${trimmedBase(config.baseUrl)}/camps/standing`,
      members,
      sharedInbox: `${trimmedBase(config.baseUrl)}/camps/standing/inbox`,
    });
  const troupe = camp === null || camp.members.length < scene.matchSize ? null : cast(camp, scene);
  const troupeDesigns = troupe === null
    ? Object.freeze([])
    : Object.freeze(troupe.memberIds
      .filter((memberId) => memberId !== actorId)
      .map((memberId) => designs.get(memberId))
      .filter((design): design is Design => design !== undefined));
  if (troupe !== null && troupe.memberIds.includes(actorId)) {
    stageTroupeMember({
      troupe,
      memberId: actorId,
      designs: Object.fromEntries(designs.entries()),
      universe,
      stage: (actor, troupe, stagedUniverse) =>
        stage(actor as Design, troupe as readonly Design[], stagedUniverse as readonly Design[]),
    });
  }
  return Object.freeze({
    camp,
    situation: scene,
    troupe,
    troupeDesigns,
    universe,
  });
}

function OrganizingTheatreSessionDesigns(
  config: OrganizingTheatreServiceConfig,
  actorId: string,
  events: readonly OrganizingTheatreSessionEvent[],
  actorWitnesses: readonly SessionEventWitness[],
): ReadonlyMap<string, Design> {
  const byActor = new Map<string, SessionEventWitness[]>();
  byActor.set(actorId, [...actorWitnesses]);
  for (const event of events) {
    const harness = String(event.harness ?? "agent");
    const session = String(event.session ?? "unknown-session");
    const id = organizingTheatreIsActivity(event.activity)
      ? event.activity.actor
      : organizingTheatreAgentActorId(config, harness, session);
    const group = byActor.get(id) ?? [];
    group.push(...organizingTheatreSessionEventWitnesses([event], {
      actorId: id,
      harness,
      session,
    }));
    byActor.set(id, group);
  }
  const designs = new Map<string, Design>();
  for (const [id, witnesses] of byActor) {
    designs.set(id, designFromActionSet(witnesses.flatMap((witness) => [...witness.chronicle.actions])));
  }
  if (!designs.has(actorId)) designs.set(actorId, designFromActionSet([]));
  return designs;
}

function OrganizingTheatreSituationForActor(
  actorId: string,
  options: OrganizingTheatreSessionCharacterOptions,
  matchSize: number,
): Situation {
  const focusPaths = options.lane?.focusPaths?.filter((item) => item !== "") ?? [];
  const substrate = focusPaths.length === 0 ? [actorId] : focusPaths;
  const scene: SituationScene = focusPaths.length === 0 ? "frontier-node" : "task-to-be-done";
  return situation({
    id: `${actorId}#situation`,
    scene,
    subject: actorId,
    substrate,
    matchSize,
    description: "OrganizingTheatre session-character scene over the active dev substrate.",
  });
}

function OrganizingTheatreBareActor(id: string): Actor {
  const trimmed = id.replace(/\/+$/u, "");
  const handle = trimmed.split("/").filter(Boolean).at(-1) ?? "agent";
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: trimmed,
    type: "Service",
    preferredUsername: handle,
    inbox: `${trimmed}/inbox`,
    outbox: `${trimmed}/outbox`,
    followers: `${trimmed}/followers`,
    following: `${trimmed}/following`,
    summary: `OrganizingTheatre standing-pool actor ${handle}.`,
  });
}

function OrganizingTheatreActionForEvent(event: OrganizingTheatreSessionEvent, index: number): Action {
  if (organizingTheatreIsActivity(event.activity)) return OrganizingTheatreActionForActivity(event.activity, index);
  const hook = OrganizingTheatreHookEventName(event);
  if (hook === "Stop" || hook === "SubagentStop") return daimonAction(locus([index + 1, 0]));
  return positiveAction(locus([index + 1, 0]));
}

function OrganizingTheatreActionForActivity(activity: Activity, index: number): Action {
  if (activity.type === "Undo" || activity.type === "Remove") return negativeAction(locus([index + 1]));
  return positiveAction(locus([index + 1, 0]));
}

function OrganizingTheatreHookEventName(event: OrganizingTheatreSessionEvent): string | null {
  const value = event.hookEventName;
  return typeof value === "string" && value !== "" ? value : null;
}

function OrganizingTheatreLaneLabel(event: OrganizingTheatreSessionEvent, lane: OrganizingTheatreSessionCharacterOptions["lane"]): string {
  const payload = event !== null && typeof event === "object" ? OrganizingTheatreRecord(event.payload) : null;
  const cwd = typeof payload?.cwd === "string" ? payload.cwd : null;
  return cwd ?? lane?.currentCwd ?? event.source ?? "unknown-lane";
}

function organizingTheatreWitnessSeed(witnesses: readonly SessionEventWitness[], identity: string): readonly (readonly [string, string])[] {
  if (witnesses.length === 0) return Object.freeze([Object.freeze([identity, "playing.session-character.unperformed"] as const)]);
  return Object.freeze(witnesses.map((witness, index) => Object.freeze([
    `${witness.session}:${index}`,
    [
      witness.kind,
      witness.harness ?? "unknown-harness",
      witness.via ?? "unknown-source",
      witness.lane ?? "unknown-lane",
      witness.office ?? "unknown-office",
      witness.chronicle.actions.map((action) => `${action.variety}@${action.locus.address.join(".")}`).join(","),
    ].join("|"),
  ] as const)));
}

function organizingTheatreIsActivity(value: unknown): value is Activity {
  return value !== null
    && typeof value === "object"
    && (value as Record<string, unknown>)["@context"] === ACTIVITYSTREAMS_CONTEXT
    && typeof (value as Record<string, unknown>).type === "string"
    && typeof (value as Record<string, unknown>).actor === "string"
    && (value as Record<string, unknown>).object !== undefined;
}

function OrganizingTheatreRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function trimmedBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}
