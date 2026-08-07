import {
  ACTIVITYSTREAMS_CONTEXT,
  type Activity,
  type OrderedCollection,
} from "@emsenn/animating";
import * as activitypub from "./activitypub.mjs";
import {
  organizingTheatreStrongestPathOverlap,
  organizingTheatreWorkLocusClaimConflictsAcross,
  type OrganizingTheatreActiveWorkLocusClaim,
  type OrganizingTheatreWorkLocusClaimConflict,
  type OrganizingTheatreWorkLocusOptions,
} from "./work-locus.mjs";

interface OrganizingTheatreServiceConfig {
  readonly baseUrl: string;
}

export interface OrganizingTheatreLaneFocus {
  readonly focusPaths?: readonly string[];
}

export interface OrganizingTheatrePeerFocusSession {
  readonly session: string;
  readonly updatedAt?: string | null;
  readonly lane?: OrganizingTheatreLaneFocus | null;
}

export interface OrganizingTheatreCollisionAwareness {
  readonly peerSession: string;
  readonly path: string;
  readonly peerPath: string;
  readonly reason: string;
  readonly updatedAt?: string | null;
}

export interface organizingTheatreAgentLocus {
  readonly kind?: string;
  readonly session: string;
  readonly role?: string;
  readonly harnesses?: readonly string[];
  readonly hooks?: number;
  readonly updatedAt?: string | null;
  readonly currentCwd?: string | null;
  readonly focusPaths?: readonly string[];
  readonly lastTool?: string | null;
  readonly lastEventAt?: string | null;
  readonly hookCounts?: unknown;
  readonly toolCounts?: unknown;
}

export interface OrganizingTheatreAgentLocusInput {
  readonly role?: string;
  readonly session: string;
  readonly updatedAt?: string | null;
  readonly hooks?: number;
  readonly harnesses?: readonly string[];
  readonly lane?: unknown;
}

export interface OrganizingTheatreAgentLocusOptions {
  readonly kind?: string;
  readonly focusPathsMax?: number;
}

export interface OrganizingTheatreAgentRelation {
  readonly kind: string;
  readonly relation: "focus-overlap" | "co-present-session" | "self-locus-claim" | "claimed-locus-overlap";
  readonly source: string;
  readonly target: string;
  readonly path: string;
  readonly peerPath?: string;
  readonly reason: string;
  readonly updatedAt?: string | null;
  readonly claimId?: string;
  readonly expiresAt?: string | null;
}

export interface OrganizingTheatreModeledAgentSemioticHubInput {
  readonly kind?: string;
  readonly shortName?: string;
  readonly title?: string;
  readonly claim?: string;
  readonly generatedAt: string;
  readonly observer: Readonly<{
    readonly session: string;
    readonly harness: string;
    readonly hookEventName: string;
    readonly locus: organizingTheatreAgentLocus | undefined;
  }>;
  readonly events: readonly unknown[];
  readonly activities: readonly Activity[];
  readonly sessionCount: number;
  readonly loci: readonly organizingTheatreAgentLocus[];
  readonly collisionAwareness?: readonly OrganizingTheatreCollisionAwareness[];
  readonly relations?: readonly OrganizingTheatreAgentRelation[];
  readonly activeClaims?: readonly OrganizingTheatreActiveWorkLocusClaim[];
  readonly claimConflicts?: readonly OrganizingTheatreWorkLocusClaimConflict[];
  readonly workLocusOptions?: OrganizingTheatreWorkLocusOptions;
  readonly activityPub?: Readonly<{
    readonly kind?: string;
    readonly claim?: string;
    readonly federation?: unknown;
  }>;
  readonly channels?: unknown;
  readonly workField?: Readonly<Record<string, unknown>>;
  readonly recentEvents?: readonly unknown[];
  readonly nextInterfaces?: readonly unknown[];
  readonly harnesses?: readonly string[];
  readonly oldestEventAt?: string | null;
  readonly newestEventAt?: string | null;
  readonly outboxLimit?: number;
}

export interface organizingTheatreModeledAgentSemioticHub {
  readonly kind: string;
  readonly shortName: string;
  readonly title: string;
  readonly claim: string;
  readonly generatedAt: string;
  readonly observer: OrganizingTheatreModeledAgentSemioticHubInput["observer"];
  readonly spacetime: Readonly<{
    readonly eventWindow: number;
    readonly activityWindow: number;
    readonly sessionCount: number;
    readonly harnesses: readonly string[];
    readonly oldestEventAt: string | null;
    readonly newestEventAt: string | null;
    readonly clock: "activitypub-published-order";
  }>;
  readonly activityPub: Readonly<{
    readonly kind: string;
    readonly claim: string;
    readonly context: typeof ACTIVITYSTREAMS_CONTEXT;
    readonly outbox: OrderedCollection;
    readonly federation: unknown;
  }>;
  readonly channels: unknown;
  readonly loci: readonly organizingTheatreAgentLocus[];
  readonly relations: readonly OrganizingTheatreAgentRelation[];
  readonly workField: Readonly<Record<string, unknown>>;
  readonly recentEvents: readonly unknown[];
  readonly nextInterfaces: readonly unknown[];
}

export function organizingTheatreAgentLocus(
  input: OrganizingTheatreAgentLocusInput,
  options: OrganizingTheatreAgentLocusOptions = {},
): organizingTheatreAgentLocus {
  const lane = OrganizingTheatreRecord(input.lane);
  const locus: organizingTheatreAgentLocus = {
    kind: options.kind ?? "organizing.theatre.agent-locus",
    session: input.session,
    harnesses: Object.freeze([...new Set(input.harnesses ?? [])].filter(Boolean).sort()),
    updatedAt: input.updatedAt ?? null,
    hooks: input.hooks ?? 0,
    currentCwd: typeof lane?.currentCwd === "string" ? lane.currentCwd : null,
    focusPaths: Object.freeze(OrganizingTheatreStringArray(lane?.focusPaths).slice(0, options.focusPathsMax ?? 12)),
    lastTool: typeof lane?.lastTool === "string" ? lane.lastTool : null,
    lastEventAt: typeof lane?.lastEventAt === "string" ? lane.lastEventAt : null,
    hookCounts: lane?.hookCounts ?? [],
    toolCounts: lane?.toolCounts ?? [],
  };
  if (input.role !== undefined) {
    Object.assign(locus, { role: input.role });
  }
  return Object.freeze(locus);
}

export function organizingTheatreCollisionAwarenessFor(
  yourLane: OrganizingTheatreLaneFocus,
  peerSessions: readonly OrganizingTheatrePeerFocusSession[],
  options: Readonly<{ max?: number }> = {},
): readonly OrganizingTheatreCollisionAwareness[] {
  const yours = new Set(yourLane.focusPaths ?? []);
  const warnings: OrganizingTheatreCollisionAwareness[] = [];
  for (const peer of peerSessions) {
    for (const peerPath of peer.lane?.focusPaths ?? []) {
      if (peerPath === ".") continue;
      const match = organizingTheatreStrongestPathOverlap(yours, peerPath);
      if (match !== null) {
        warnings.push(Object.freeze({
          peerSession: peer.session,
          path: match,
          peerPath,
          reason: match === peerPath ? "same focus path" : "overlapping path prefix",
          ...(peer.updatedAt === undefined ? {} : { updatedAt: peer.updatedAt }),
        }));
      }
    }
  }
  return Object.freeze(warnings
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")) || left.path.localeCompare(right.path))
    .slice(0, options.max ?? 16));
}

export function organizingTheatreModeledRelations(
  loci: readonly organizingTheatreAgentLocus[],
  collisionAwareness: readonly OrganizingTheatreCollisionAwareness[],
  activeClaims: readonly OrganizingTheatreActiveWorkLocusClaim[] = [],
  options: Readonly<{
    observerSession?: string | null;
    relationKind?: string;
    source?: string;
    coPresentReason?: string;
    max?: number;
  }> = {},
): readonly OrganizingTheatreAgentRelation[] {
  const relationKind = options.relationKind ?? "organizing.theatre.agent-relation";
  const source = options.source ?? "observer";
  const coPresentReason = options.coPresentReason ?? "recent hook state present in the shared OrganizingTheatre event field";
  const relations: OrganizingTheatreAgentRelation[] = [];
  for (const item of collisionAwareness) {
    relations.push(Object.freeze({
      kind: relationKind,
      relation: "focus-overlap",
      source,
      target: item.peerSession,
      path: item.path,
      peerPath: item.peerPath,
      reason: item.reason,
      ...(item.updatedAt === undefined ? {} : { updatedAt: item.updatedAt }),
    }));
  }
  for (const locus of loci.slice(1)) {
    relations.push(Object.freeze({
      kind: relationKind,
      relation: "co-present-session",
      source,
      target: locus.session,
      path: locus.currentCwd ?? ".",
      reason: coPresentReason,
      ...(locus.updatedAt === undefined ? {} : { updatedAt: locus.updatedAt }),
    }));
  }
  const observerSession = options.observerSession ?? null;
  const observerLocus = loci.find((locus) => locus.session === observerSession) ?? loci[0] ?? null;
  const observerPaths = new Set(observerLocus?.focusPaths ?? []);
  for (const claim of activeClaims) {
    for (const claimPath of claim.paths) {
      const overlap = organizingTheatreStrongestPathOverlap(observerPaths, claimPath);
      if (overlap === null) continue;
      relations.push(Object.freeze({
        kind: relationKind,
        relation: claim.session === observerSession ? "self-locus-claim" : "claimed-locus-overlap",
        source,
        target: claim.session,
        path: overlap,
        peerPath: claimPath,
        reason: claim.reason ?? "active work-locus claim",
        claimId: claim.claimId,
        updatedAt: claim.at,
        expiresAt: claim.expiresAt,
      }));
    }
  }
  return Object.freeze(relations
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")) || left.target.localeCompare(right.target))
    .slice(0, options.max ?? 32));
}

export function organizingTheatreModeledAgentSemioticHub(
  input: OrganizingTheatreModeledAgentSemioticHubInput,
  config: OrganizingTheatreServiceConfig,
): organizingTheatreModeledAgentSemioticHub {
  const events = input.events;
  const activities = input.activities;
  const activeClaims = input.activeClaims ?? [];
  const claimConflicts = input.claimConflicts ?? organizingTheatreWorkLocusClaimConflictsAcross(activeClaims, config, input.workLocusOptions);
  const relations = input.relations ?? organizingTheatreModeledRelations(input.loci, input.collisionAwareness ?? [], activeClaims, {
    observerSession: input.observer.session,
  });
  const harnesses = new Set(input.harnesses ?? [input.observer.harness]);
  for (const locus of input.loci) for (const item of locus.harnesses ?? []) harnesses.add(item);
  const oldestEventAt = input.oldestEventAt ?? eventAt(events[0]);
  const newestEventAt = input.newestEventAt ?? eventAt(events.at(-1));
  return Object.freeze({
    kind: input.kind ?? "organizing.theatre.modeled-agent-semiotic-hub",
    shortName: input.shortName ?? "OrganizingTheatre",
    title: input.title ?? "Modeled Agent Semiotic Hub",
    claim: input.claim ?? "A OrganizingTheatre surface where agent sessions, activities, loci, relations, and work projections become a readable multi-agent manifold.",
    generatedAt: input.generatedAt,
    observer: input.observer,
    spacetime: Object.freeze({
      eventWindow: events.length,
      activityWindow: activities.length,
      sessionCount: input.sessionCount,
      harnesses: Object.freeze([...harnesses].filter(Boolean).sort()),
      oldestEventAt,
      newestEventAt,
      clock: "activitypub-published-order" as const,
    }),
    activityPub: Object.freeze({
      kind: input.activityPub?.kind ?? "organizing.theatre.activitypub",
      claim: input.activityPub?.claim ?? "The OrganizingTheatre trace is read as ActivityStreams activities and projected as an OrderedCollection outbox.",
      context: ACTIVITYSTREAMS_CONTEXT,
      outbox: activitypub.organizingTheatreOutbox(activities.slice(-(input.outboxLimit ?? 32)), config),
      federation: input.activityPub?.federation ?? activitypub.organizingTheatreActivityPubFederation(activities, config),
    }),
    channels: input.channels ?? {},
    loci: Object.freeze([...input.loci]),
    relations,
    workField: Object.freeze({
      ...(input.workField ?? {}),
      activeClaims,
      claimConflicts,
    }),
    recentEvents: Object.freeze([...(input.recentEvents ?? [])]),
    nextInterfaces: Object.freeze([...(input.nextInterfaces ?? [])]),
  });
}

function eventAt(event: unknown): string | null {
  if (event === null || typeof event !== "object") return null;
  const value = (event as Record<string, unknown>).at;
  return typeof value === "string" ? value : null;
}

function OrganizingTheatreRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function OrganizingTheatreStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}