import {
  ACTIVITYSTREAMS_CONTEXT,
  revoke,
  type Activity,
} from "@emsenn/animating";
import * as activitypub from "./activitypub.mjs";
import {
  organizingTheatreWorkLocusCapability,
  organizingTheatreWorkLocusClaimFrom,
  type OrganizingTheatreWorkLocusOptions,
} from "./work-locus.mjs";

interface OrganizingTheatreServiceConfig {
  readonly baseUrl: string;
}

export interface OrganizingTheatreActionProjectionOptions {
  readonly actorId?: string;
  readonly outboxId?: string;
  readonly subjectId?: string;
  readonly packageName: string;
  readonly admission: string;
  readonly sourceAdmission?: string;
  readonly audience?: readonly string[];
}

export interface OrganizingTheatreActionDescriptor {
  readonly name: string;
  readonly href: string;
  readonly summary?: string;
  readonly description?: string;
  readonly input?: string;
  readonly output?: string;
  readonly term?: string;
  readonly strategyTerm?: string;
  readonly sessionTerm?: string;
}

export interface OrganizingTheatreEventActivityOptions extends OrganizingTheatreWorkLocusOptions {
  readonly handoffKind?: string;
  readonly publicAudience?: readonly string[];
}

export interface OrganizingTheatreEventActivityInput {
  readonly id: string;
  readonly at: string;
  readonly source: string;
  readonly session: string;
  readonly harness: string;
  readonly hookEventName: string;
  readonly payload?: Record<string, unknown>;
  readonly extra?: Record<string, unknown>;
  readonly objectExtra?: Record<string, unknown>;
}

export function organizingTheatreActivityForEvent(
  input: OrganizingTheatreEventActivityInput,
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreEventActivityOptions = {},
): Activity {
  const actor = activitypub.organizingTheatreAgentActorId(config, input.harness, input.session);
  const base = trimmedBase(config.baseUrl);
  const extra = input.extra ?? {};
  const locusClaim = organizingTheatreWorkLocusClaimFrom(extra.locusClaim, options);
  const locusCapability = locusClaim === null ? null : organizingTheatreWorkLocusCapability(locusClaim, config, options);
  const revoked = locusCapability !== null && locusClaim?.action === "release"
    ? revoke(locusCapability, actor)
    : null;
  const object: Record<string, unknown> = {
    type: revoked !== null ? "Capability" : OrganizingTheatreActivityObjectTypeForEvent(extra, options),
    id: locusCapability?.id ?? `${base}/objects/${encodeURIComponent(input.id)}`,
    content: locusCapability?.grants ?? OrganizingTheatreActivityClaimForEvent(input, options),
    source: input.source,
    hookEventName: input.hookEventName,
    session: input.session,
    harness: input.harness,
    ...(locusCapability === null ? {} : { capability: locusCapability }),
    ...(input.objectExtra ?? {}),
    ...OrganizingTheatreActivityObjectExtra(extra, options),
  };
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: `${base}/activities/${encodeURIComponent(input.id)}`,
    type: revoked?.type ?? (locusClaim?.action === "release" ? "Undo" : "Create"),
    actor,
    object: object as Activity["object"],
    published: input.at,
    to: [activitypub.organizingTheatreServiceProjection(config).actor.id],
    cc: [...(options.publicAudience ?? [`${base}/agents`])],
  };
}

export function admittedOrganizingTheatreActionActivities(
  actions: readonly OrganizingTheatreActionDescriptor[],
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreActionProjectionOptions,
): readonly Activity[] {
  const projection = activitypub.organizingTheatreServiceProjection(config);
  const actorId = options.actorId ?? projection.actor.id;
  const outboxId = options.outboxId ?? projection.outboxId;
  const subjectId = options.subjectId ?? projection.actionSubjectId;
  const audience = options.audience ?? [`${trimmedBase(config.baseUrl)}/agents`];
  const summaryObject: Record<string, unknown> = {
    type: "Collection",
    id: subjectId,
    name: `${new URL(projection.actor.id).hostname} admitted OrganizingTheatre actions`,
    content: `${options.packageName} admits ${actions.length} OrganizingTheatre actions through ${options.admission}.`,
    url: outboxId,
    totalItems: actions.length,
    admission: options.admission,
    ...(options.sourceAdmission === undefined ? {} : { sourceAdmission: options.sourceAdmission }),
  };
  const summary: Activity = {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: `${trimmedBase(config.baseUrl)}/activities/OrganizingTheatre-admitted-actions`,
    type: "Create",
    actor: actorId,
    object: summaryObject as Activity["object"],
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [...audience],
  };
  return Object.freeze([
    summary,
    ...actions.map((action) => admittedOrganizingTheatreActionActivity(action, config, {
      actorId,
      admission: options.admission,
      ...(options.sourceAdmission === undefined ? {} : { sourceAdmission: options.sourceAdmission }),
      audience,
    })),
  ]);
}

function OrganizingTheatreActivityClaimForEvent(input: OrganizingTheatreEventActivityInput, options: OrganizingTheatreEventActivityOptions): string {
  const extra = input.extra ?? {};
  const locusClaim = organizingTheatreWorkLocusClaimFrom(extra.locusClaim, options);
  if (locusClaim !== null) {
    const action = locusClaim.action === "release" ? "releases" : "claims";
    const paths = locusClaim.paths.length === 0 ? "workspace locus" : locusClaim.paths.join(", ");
    return `${locusClaim.harness}:${locusClaim.session} ${action} ${paths}`;
  }
  const handoff = extra.handoffCarrier;
  if (handoff !== null && typeof handoff === "object" && (handoff as Record<string, unknown>).kind === (options.handoffKind ?? "organizing.theatre.agent-session-handoff")) {
    const payload = input.payload ?? {};
    return `${String(payload.harness ?? input.harness)}:${String(payload.session_id ?? payload.session ?? input.session)} publishes a OrganizingTheatre session handoff`;
  }
  const tool = typeof input.payload?.tool_name === "string" ? ` tool:${input.payload.tool_name}` : "";
  return `${input.source} ${input.hookEventName}${tool}`.trim();
}

function OrganizingTheatreActivityObjectTypeForEvent(extra: Record<string, unknown>, options: OrganizingTheatreEventActivityOptions): string {
  if (organizingTheatreWorkLocusClaimFrom(extra.locusClaim, options) !== null) return "Capability";
  const handoff = extra.handoffCarrier;
  if (handoff !== null && typeof handoff === "object" && (handoff as Record<string, unknown>).kind === (options.handoffKind ?? "organizing.theatre.agent-session-handoff")) return "Article";
  if (typeof extra.gate === "string") return "Question";
  return "Note";
}

function OrganizingTheatreActivityObjectExtra(extra: Record<string, unknown>, options: OrganizingTheatreEventActivityOptions): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (organizingTheatreWorkLocusClaimFrom(extra.locusClaim, options) !== null) out.locusClaim = extra.locusClaim;
  const handoff = extra.handoffCarrier;
  if (handoff !== null && typeof handoff === "object" && (handoff as Record<string, unknown>).kind === (options.handoffKind ?? "organizing.theatre.agent-session-handoff")) out.handoffCarrier = handoff;
  if (typeof extra.gate === "string") out.gate = extra.gate;
  if (typeof extra.reason === "string") out.reason = extra.reason;
  if (Array.isArray(extra.activeClaims)) out.activeClaims = extra.activeClaims;
  if (Array.isArray(extra.claimConflicts)) out.claimConflicts = extra.claimConflicts;
  return out;
}

function admittedOrganizingTheatreActionActivity(
  action: OrganizingTheatreActionDescriptor,
  config: OrganizingTheatreServiceConfig,
  options: Readonly<{
    actorId: string;
    admission: string;
    sourceAdmission?: string;
    audience: readonly string[];
  }>,
): Activity {
  const base = trimmedBase(config.baseUrl);
  const object: Record<string, unknown> = {
    type: "Service",
    id: `${base}/actions/${encodeURIComponent(action.name)}`,
    name: action.name,
    content: action.summary ?? action.description ?? `Admitted OrganizingTheatre action ${action.name}.`,
    url: new URL(action.href, `${base}/`).href,
    ...(action.input === undefined ? {} : { mediaType: action.input }),
    ...(action.output === undefined ? {} : { output: action.output }),
    ...(action.term === undefined ? {} : { term: action.term }),
    ...(action.strategyTerm === undefined ? {} : { strategyTerm: action.strategyTerm }),
    ...(action.sessionTerm === undefined ? {} : { sessionTerm: action.sessionTerm }),
    admission: options.admission,
    ...(options.sourceAdmission === undefined ? {} : { sourceAdmission: options.sourceAdmission }),
  };
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: `${base}/activities/OrganizingTheatre-action/${encodeURIComponent(action.name)}`,
    type: "Create",
    actor: options.actorId,
    object: object as Activity["object"],
    to: [options.actorId],
    cc: [...options.audience],
  };
}

function trimmedBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}
