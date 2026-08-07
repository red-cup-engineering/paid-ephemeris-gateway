import {
  ACTIVITYSTREAMS_CONTEXT,
  actorOfAgent,
  orderedCollection,
  outboxOf,
  type Activity,
  type Actor,
  type OrderedCollection,
} from "@emsenn/animating";
import {
  organizingTheatreSessionCharacter,
  type OrganizingTheatreSessionCharacterOptions,
} from "../performing/session-character.mjs";
import { deliverToCamps, federateActivities, reach } from "../writing/activitypub/index.mjs";

export interface OrganizingTheatreServiceConfig {
  readonly baseUrl: string;
  readonly name?: string;
  readonly preferredUsername?: string;
  readonly summary?: string;
}

export interface organizingTheatreServiceProjection {
  readonly actor: Actor;
  readonly outboxId: string;
  readonly inboxId: string;
  readonly actionSubjectId: string;
}

export type OrganizingTheatreActivityPubEndpoint = "actor" | "inbox" | "outbox";

export interface organizingTheatreActivityPubRoute {
  readonly endpoint: OrganizingTheatreActivityPubEndpoint;
  readonly actorId: string;
  readonly limit?: string;
  readonly eventScanLimit?: string;
}

export interface organizingTheatreWebFingerActor {
  readonly resource: string;
  readonly actorId: string;
}

export interface OrganizingTheatreActivityPubCamp {
  readonly id: string;
  readonly members: readonly Actor[];
  readonly sharedInbox: string;
}

export interface OrganizingTheatreActivityPubDelivery {
  readonly kind: "organizing.theatre.activitypub.delivery";
  readonly context: string;
  readonly activity: string | null;
  readonly type: string;
  readonly actor: string;
  readonly targets: readonly string[];
  readonly reach: number;
}

export interface organizingTheatreActivityPubFederation {
  readonly kind: "organizing.theatre.activitypub.federation";
  readonly camps: readonly Readonly<{
    readonly id: string;
    readonly members: readonly string[];
    readonly sharedInbox: string;
  }>[];
  readonly deliveries: readonly OrganizingTheatreActivityPubDelivery[];
  readonly reading: unknown;
}

export interface organizingTheatreActivityPubFederationProjectionOptions {
  readonly kind?: string;
  readonly claim?: string;
  readonly deliveryKind?: string;
}

export interface organizingTheatreActivityPubFederationProjection {
  readonly kind: string;
  readonly claim: string;
  readonly camps: readonly Readonly<{
    readonly id: string;
    readonly members: readonly string[];
    readonly sharedInbox: string | null;
  }>[];
  readonly deliveries: readonly Readonly<Omit<OrganizingTheatreActivityPubDelivery, "kind"> & { readonly kind: string }>[];
  readonly reading: unknown;
}

export interface organizingTheatreActivityPubSignal {
  readonly kind: "organizing.theatre.activitypub.signal";
  readonly context: typeof ACTIVITYSTREAMS_CONTEXT;
  readonly activityWindow: number;
  readonly actorCount: number;
  readonly camps: readonly Readonly<{
    readonly id: string;
    readonly members: number;
    readonly sharedInbox: string;
  }>[];
  readonly deliveryReach: number;
  readonly reading: unknown;
}

export interface organizingTheatreActivityPubSignalProjectionOptions {
  readonly kind?: string;
}

export type organizingTheatreActivityPubSignalProjection = Omit<organizingTheatreActivityPubSignal, "kind"> & Readonly<{ readonly kind: string }>;

export interface OrganizingTheatreAgentActorLocus {
  readonly session: string;
  readonly harnesses?: readonly string[];
  readonly hooks?: number;
  readonly lastTool?: string | null;
  readonly lane?: Readonly<{
    readonly currentCwd?: string | null;
    readonly focusPaths?: readonly string[];
    readonly lastTool?: string | null;
  }> | null;
}

export interface organizingTheatreAgentActorSession {
  readonly harness: string;
  readonly session: string;
}

function actorIdOf(config: OrganizingTheatreServiceConfig): string {
  return `${trimmedBase(config.baseUrl)}/`;
}

export function organizingTheatreServiceProjection(config: OrganizingTheatreServiceConfig): organizingTheatreServiceProjection {
  const actorId = actorIdOf(config);
  const name = config.name ?? `${new URL(actorId).hostname} Modeled Agent Semiotic Hub`;
  const actor: Actor = {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: actorId,
    type: "Service",
    preferredUsername: config.preferredUsername ?? "OrganizingTheatre",
    summary: config.summary ?? `${name}: a service actor where workspace agents coordinate through ActivityPub and admitted actions.`,
    inbox: `${actorId}inbox`,
    outbox: `${actorId}outbox`,
    followers: `${actorId}followers`,
    following: `${actorId}following`,
  };
  return Object.freeze({
    actor: Object.freeze(actor),
    outboxId: actor.outbox,
    inboxId: actor.inbox,
    actionSubjectId: `${actorId}#admitted-actions`,
  });
}

export function organizingTheatreOutbox(
  activities: readonly Activity[],
  config: OrganizingTheatreServiceConfig,
): OrderedCollection {
  return outboxOf(activities, organizingTheatreServiceProjection(config).outboxId);
}

export function organizingTheatreInbox(
  activities: readonly Activity[],
  config: OrganizingTheatreServiceConfig,
): OrderedCollection {
  return orderedCollection(activities, organizingTheatreServiceProjection(config).inboxId);
}

export function acceptsOrganizingTheatreActivityPub(accept: string | readonly string[] | undefined): boolean {
  const values = Array.isArray(accept) ? accept : accept === undefined ? [] : [accept];
  return values.some((header) => header.split(",").some((item: string) => {
    const mediaType = item.split(";")[0]?.trim().toLowerCase();
    return mediaType === "application/activity+json"
      || mediaType === "application/ld+json"
      || mediaType === "application/json";
  }));
}

export function organizingTheatreActivityPubRoute(
  input: Readonly<{
    pathname: string;
    method?: string;
    accept?: string | readonly string[];
    searchParams?: URLSearchParams;
  }>,
  config: OrganizingTheatreServiceConfig,
): organizingTheatreActivityPubRoute | null {
  const method = input.method?.toUpperCase() ?? "GET";
  let endpoint: OrganizingTheatreActivityPubEndpoint | null = null;
  if (input.pathname === "/" && method === "GET" && acceptsOrganizingTheatreActivityPub(input.accept)) endpoint = "actor";
  else if (input.pathname === "/inbox" && (method === "GET" || method === "POST")) endpoint = "inbox";
  else if (input.pathname === "/outbox" && method === "GET") endpoint = "outbox";
  if (endpoint === null) return null;
  const window = queryWindow(input.searchParams);
  return Object.freeze({
    endpoint,
    actorId: organizingTheatreServiceProjection(config).actor.id,
    ...(window.limit === undefined ? {} : { limit: window.limit }),
    ...(window.eventScanLimit === undefined ? {} : { eventScanLimit: window.eventScanLimit }),
  });
}

export function organizingTheatreWebFingerActor(resource: string, config: OrganizingTheatreServiceConfig): organizingTheatreWebFingerActor | null {
  if (!resource.startsWith("acct:")) return null;
  const acct = resource.slice("acct:".length);
  const at = acct.lastIndexOf("@");
  const local = at === -1 ? acct : acct.slice(0, at);
  const domain = at === -1 ? "" : acct.slice(at + 1);
  const projection = organizingTheatreServiceProjection(config);
  const expectedLocal = config.preferredUsername ?? projection.actor.preferredUsername;
  const expectedDomain = new URL(projection.actor.id).hostname;
  if (local !== expectedLocal || (domain !== "" && domain !== expectedDomain)) return null;
  return Object.freeze({
    resource,
    actorId: projection.actor.id,
  });
}

export function organizingTheatreActivityPubActors(
  activities: readonly Activity[],
  config: OrganizingTheatreServiceConfig,
  seedActors: readonly Actor[] = [],
): readonly Actor[] {
  const actors = new Map<string, Actor>();
  for (const actor of seedActors) actors.set(actor.id, actor);
  for (const activity of activities) {
    if (!actors.has(activity.actor)) actors.set(activity.actor, organizingTheatreAgentActorFromIri(activity.actor, config, { activities }));
  }
  return Object.freeze([...actors.values()].sort((left, right) => left.id.localeCompare(right.id)));
}

export function organizingTheatreAgentActor(
  config: OrganizingTheatreServiceConfig,
  harness: string,
  session: string,
  options: OrganizingTheatreSessionCharacterOptions = {},
): Actor {
  return actorOfAgent(organizingTheatreSessionCharacter(config, harness, session, options).reading.interior);
}

export function organizingTheatreAgentActorFromIri(
  id: string,
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreSessionCharacterOptions = {},
): Actor {
  const parsed = organizingTheatreAgentActorSession(id, config);
  if (parsed !== null) return organizingTheatreAgentActor(config, parsed.harness, parsed.session, {
    ...options,
    actorId: id.trim(),
  });
  const actorId = id.trim();
  return actorOfAgent(organizingTheatreSessionCharacter(config, "external", actorId, {
    ...options,
    actorId,
  }).reading.interior);
}

export function organizingTheatreAgentActorForLocus(
  config: OrganizingTheatreServiceConfig,
  harness: string,
  locus: OrganizingTheatreAgentActorLocus,
  options: OrganizingTheatreSessionCharacterOptions = {},
): Actor {
  return organizingTheatreAgentActor(config, harness, locus.session, {
    ...options,
    lane: options.lane ?? locus.lane ?? {
      lastTool: locus.lastTool ?? null,
    },
  });
}

export function organizingTheatreAgentActorsForLoci(
  loci: readonly OrganizingTheatreAgentActorLocus[],
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreSessionCharacterOptions = {},
): readonly Actor[] {
  const actors = new Map<string, Actor>();
  for (const locus of loci) {
    for (const harness of locus.harnesses ?? []) {
      const actor = organizingTheatreAgentActorForLocus(config, harness, locus, options);
      actors.set(actor.id, actor);
    }
  }
  return Object.freeze([...actors.values()].sort((left, right) => left.id.localeCompare(right.id)));
}

export function organizingTheatreAgentActorSession(id: string, config: OrganizingTheatreServiceConfig): organizingTheatreAgentActorSession | null {
  return OrganizingTheatreActorSession(id, config);
}

export function organizingTheatreActivityPubCamps(
  actors: readonly Actor[],
  config: OrganizingTheatreServiceConfig,
): readonly OrganizingTheatreActivityPubCamp[] {
  const groups = new Map<string, Actor[]>();
  for (const actor of actors) {
    const harness = OrganizingTheatreHarnessForActor(actor.id, config);
    const group = groups.get(harness) ?? [];
    group.push(actor);
    groups.set(harness, group);
  }
  const base = trimmedBase(config.baseUrl);
  return Object.freeze([...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([harness, members]) => {
      const id = `${base}/camps/${encodeURIComponent(harness)}`;
      return Object.freeze({
        id,
        members: Object.freeze(members.sort((left, right) => left.id.localeCompare(right.id))),
        sharedInbox: `${id}/inbox`,
      });
    }));
}

export function organizingTheatreActivityPubFederation(
  activities: readonly Activity[],
  config: OrganizingTheatreServiceConfig,
  seedActors: readonly Actor[] = [],
): organizingTheatreActivityPubFederation {
  const actors = organizingTheatreActivityPubActors(activities, config, seedActors);
  const camps = organizingTheatreActivityPubCamps(actors, config);
  const deliveries = activities.slice(-12).map((activity) => {
    const delivery = deliverToCamps(activity, camps);
    return Object.freeze({
      kind: "organizing.theatre.activitypub.delivery" as const,
      context: delivery["@context"],
      activity: activity.id ?? null,
      type: activity.type,
      actor: activity.actor,
      targets: delivery.targets,
      reach: reach(delivery),
    });
  });
  const activeCamps = camps
    .map((camp) => Object.freeze({
      camp,
      activities: activities.filter((activity) => camp.members.some((member) => member.id === activity.actor)),
    }))
    .filter((item) => item.activities.length > 0);
  return Object.freeze({
    kind: "organizing.theatre.activitypub.federation" as const,
    camps: camps.map((camp) => Object.freeze({
      id: camp.id,
      members: camp.members.map((member) => member.id),
      sharedInbox: camp.sharedInbox,
    })),
    deliveries: Object.freeze(deliveries),
    reading: activeCamps.length === 0 ? null : federateActivities(activeCamps.map((item) => item.activities)),
  });
}

export function organizingTheatreActivityPubSignal(
  activities: readonly Activity[],
  config: OrganizingTheatreServiceConfig,
  seedActors: readonly Actor[] = [],
): organizingTheatreActivityPubSignal {
  const recent = activities.slice(-24);
  const actors = organizingTheatreActivityPubActors(recent, config, seedActors);
  const federation = organizingTheatreActivityPubFederation(recent, config, seedActors);
  const reading = federation.reading;
  return Object.freeze({
    kind: "organizing.theatre.activitypub.signal" as const,
    context: ACTIVITYSTREAMS_CONTEXT,
    activityWindow: recent.length,
    actorCount: actors.length,
    camps: federation.camps.map((camp) => Object.freeze({
      id: camp.id,
      members: camp.members.length,
      sharedInbox: camp.sharedInbox,
    })),
    deliveryReach: federation.deliveries.reduce((sum, delivery) => sum + delivery.reach, 0),
    reading: compactFederationReading(reading),
  });
}

export function organizingTheatreActivityPubFederationProjection(
  activities: readonly Activity[],
  config: OrganizingTheatreServiceConfig,
  seedActors: readonly Actor[] = [],
  options: organizingTheatreActivityPubFederationProjectionOptions = {},
): organizingTheatreActivityPubFederationProjection {
  const federation = organizingTheatreActivityPubFederation(activities, config, seedActors);
  return organizingTheatreActivityPubFederationProjectionFrom(federation, options);
}

export function organizingTheatreActivityPubSignalProjection(
  activities: readonly Activity[],
  config: OrganizingTheatreServiceConfig,
  seedActors: readonly Actor[] = [],
  options: organizingTheatreActivityPubSignalProjectionOptions = {},
): organizingTheatreActivityPubSignalProjection {
  return Object.freeze({
    ...organizingTheatreActivityPubSignal(activities, config, seedActors),
    kind: options.kind ?? "organizing.theatre.activitypub-signal",
  });
}

function organizingTheatreActivityPubFederationProjectionFrom(
  federation: organizingTheatreActivityPubFederation,
  options: organizingTheatreActivityPubFederationProjectionOptions,
): organizingTheatreActivityPubFederationProjection {
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.activitypub-federation",
    claim: options.claim ?? "OrganizingTheatre sessions are ActivityPub actors grouped into harness camps and delivered through organizing federation.",
    camps: Object.freeze(federation.camps.map((camp) => Object.freeze({
      id: camp.id,
      members: camp.members,
      sharedInbox: camp.sharedInbox ?? null,
    }))),
    deliveries: Object.freeze(federation.deliveries.map((delivery) => Object.freeze({
      ...delivery,
      kind: options.deliveryKind ?? delivery.kind,
    }))),
    reading: federation.reading,
  });
}

export function organizingTheatreAgentActorId(
  config: OrganizingTheatreServiceConfig,
  harness: string,
  session: string,
): string {
  return `${trimmedBase(config.baseUrl)}/agents/${encodeURIComponent(String(harness || "agent"))}/${encodeURIComponent(String(session || "unknown-session"))}`;
}

function OrganizingTheatreHarnessForActor(id: string, config: OrganizingTheatreServiceConfig): string {
  return OrganizingTheatreActorSession(id, config)?.harness ?? "external";
}

function OrganizingTheatreActorSession(id: string, config: OrganizingTheatreServiceConfig): { readonly harness: string; readonly session: string } | null {
  try {
    const parsed = new URL(id);
    const base = new URL(organizingTheatreServiceProjection(config).actor.id);
    if (parsed.origin !== base.origin) return null;
    const baseSegments = base.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
    const pathSegments = parsed.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
    if (!baseSegments.every((segment, index) => pathSegments[index] === segment)) return null;
    const segments = pathSegments.slice(baseSegments.length);
    if (segments[0] !== "agents" || segments.length < 3) return null;
    const harness = segments[1];
    if (harness === undefined) return null;
    return { harness, session: segments.slice(2).join("/") };
  } catch {
    return null;
  }
}

function compactFederationReading(reading: unknown): unknown {
  if (reading === null || typeof reading !== "object") return null;
  const value = reading as Record<string, unknown>;
  return Object.freeze({
    constituents: value.constituents,
    members: value.members,
    federationOnly: value.federationOnly,
    glued: value.glued,
    coordination: value.coordination,
  });
}

function queryWindow(searchParams: URLSearchParams | undefined): Pick<organizingTheatreActivityPubRoute, "limit" | "eventScanLimit"> {
  if (searchParams === undefined) return {};
  const limit = searchParams.get("limit");
  const eventScanLimit = searchParams.get("eventScanLimit") ?? searchParams.get("scanLimit");
  return {
    ...(limit === null ? {} : { limit }),
    ...(eventScanLimit === null ? {} : { eventScanLimit }),
  };
}

function trimmedBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}
