import {
  ACTIVITYSTREAMS_CONTEXT,
  grant,
  type Capability,
} from "@emsenn/animating";

export interface OrganizingTheatreServiceConfig {
  readonly baseUrl: string;
}

export interface OrganizingTheatreWorkLocusOptions {
  readonly claimKind?: string;
  readonly activeKind?: string;
  readonly conflictKind?: string;
  readonly capabilityBasePath?: string;
}

export interface OrganizingTheatreWorkLocusClaim {
  readonly kind: string;
  readonly action: "claim" | "release";
  readonly claimId: string;
  readonly session: string;
  readonly harness: string;
  readonly paths: readonly string[];
  readonly reason?: string | null;
  readonly at?: string | null;
  readonly expiresAt?: string | null;
  readonly capability?: Capability;
}

export interface OrganizingTheatreWorkLocusEvent {
  readonly id?: string | null;
  readonly at?: string | null;
  readonly session?: string | null;
  readonly harness?: string | null;
  readonly locusClaim?: unknown;
}

export interface OrganizingTheatreActiveWorkLocusClaim {
  readonly kind: string;
  readonly claimId: string;
  readonly capability: Capability;
  readonly session: string;
  readonly harness: string;
  readonly paths: readonly string[];
  readonly reason: string | null;
  readonly at: string | null;
  readonly expiresAt: string | null;
  readonly event: string | null;
}

export interface OrganizingTheatreWorkLocusClaimConflict {
  readonly kind: string;
  readonly relation: "claimed-locus-overlap";
  readonly path: string;
  readonly left: OrganizingTheatreWorkLocusConflictSide;
  readonly right: OrganizingTheatreWorkLocusConflictSide;
  readonly reason: string;
  readonly severity: "notice" | "watch";
}

export interface OrganizingTheatreWorkLocusConflictSide {
  readonly claimId: string;
  readonly capability: string;
  readonly session: string;
  readonly harness: string;
  readonly path: string;
  readonly reason: string | null;
  readonly at: string | null;
  readonly expiresAt: string | null;
}

export function organizingTheatreWorkLocusCapability(
  claim: OrganizingTheatreWorkLocusClaim,
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreWorkLocusOptions = {},
): Capability {
  if (claim.capability?.type === "Capability" && typeof claim.capability.id === "string") return claim.capability;
  const holder = organizingTheatreAgentActorId(config, claim.harness, claim.session);
  const grants = organizingTheatreWorkLocusCapabilityGrant(claim);
  const base = trimmedBase(config.baseUrl);
  const capabilityBasePath = options.capabilityBasePath ?? "/capabilities/work-locus";
  const id = `${base}${capabilityBasePath.startsWith("/") ? capabilityBasePath : `/${capabilityBasePath}`}/${encodeURIComponent(String(claim.claimId))}`;
  return grant(holder, grants, id);
}

export function organizingTheatreWorkLocusCapabilityGrant(claim: Pick<OrganizingTheatreWorkLocusClaim, "claimId" | "paths">): string {
  const paths = Array.isArray(claim.paths) ? claim.paths.filter((item) => typeof item === "string" && item !== "") : [];
  return `workspace:${paths.length === 0 ? String(claim.claimId ?? "unknown-locus") : paths.join("|")}`;
}

export function organizingTheatreWorkLocusCapabilitySignal(
  claim: OrganizingTheatreWorkLocusClaim | OrganizingTheatreActiveWorkLocusClaim,
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreWorkLocusOptions = {},
): Readonly<{
  kind: string;
  id: string;
  grants: string;
  holder: string;
  claimId: string;
  session: string;
  harness: string;
  paths: readonly string[];
  reason: string | null;
  expiresAt: string | null;
}> {
  const capability = "capability" in claim && claim.capability?.type === "Capability"
    ? claim.capability
    : organizingTheatreWorkLocusCapability(claim as OrganizingTheatreWorkLocusClaim, config, options);
  return Object.freeze({
    kind: "organizing.theatre.active-work-locus-capability",
    id: capability.id,
    grants: capability.grants,
    holder: capability.holder,
    claimId: String(claim.claimId),
    session: String(claim.session),
    harness: String(claim.harness),
    paths: Array.isArray(claim.paths) ? claim.paths : [],
    reason: typeof claim.reason === "string" ? claim.reason : null,
    expiresAt: typeof claim.expiresAt === "string" ? claim.expiresAt : null,
  });
}

export function organizingTheatreActiveWorkLocusClaims(
  events: readonly OrganizingTheatreWorkLocusEvent[],
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreWorkLocusOptions & Readonly<{ now?: Date; max?: number }> = {},
): readonly OrganizingTheatreActiveWorkLocusClaim[] {
  const active = new Map<string, OrganizingTheatreActiveWorkLocusClaim>();
  const releases = new Set<string>();
  const now = options.now ?? new Date();
  for (const event of events) {
    const claim = organizingTheatreWorkLocusClaimFrom(event.locusClaim, options);
    if (claim === null) continue;
    const paths = claim.paths.filter((item) => item !== "");
    const releaseKeys = OrganizingTheatreWorkLocusClaimKeys(claim, config, options, paths);
    if (claim.action === "release") {
      for (const key of releaseKeys) {
        releases.add(key);
        active.delete(key);
      }
      if (claim.claimId !== "") {
        for (const [key, value] of active) {
          if (value.session === String(claim.session ?? event.session ?? "unknown-session") && value.claimId === claim.claimId) active.delete(key);
        }
      }
      const releaseReason = typeof claim.reason === "string" ? claim.reason : null;
      const releasePaths = new Set(paths);
      if (releaseReason !== null && releasePaths.size > 0) {
        const releaseSession = String(claim.session ?? event.session ?? "unknown-session");
        for (const [key, value] of active) {
          if (value.session !== releaseSession || value.reason !== releaseReason) continue;
          const overlaps = value.paths.some((activePath) => organizingTheatreStrongestPathOverlap(releasePaths, activePath) !== null);
          if (overlaps) active.delete(key);
        }
      }
      continue;
    }
    const expiresAt = typeof claim.expiresAt === "string" ? Date.parse(claim.expiresAt) : Number.NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) continue;
    for (const key of releaseKeys) {
      if (releases.has(key)) continue;
      active.set(key, Object.freeze({
        kind: options.activeKind ?? "organizing.theatre.active-work-locus-claim",
        claimId: String(claim.claimId ?? key),
        capability: organizingTheatreWorkLocusCapability(claim, config, options),
        session: String(claim.session ?? event.session ?? "unknown-session"),
        harness: String(claim.harness ?? event.harness ?? "agent"),
        paths,
        reason: typeof claim.reason === "string" ? claim.reason : null,
        at: typeof claim.at === "string" ? claim.at : event.at ?? null,
        expiresAt: claim.expiresAt ?? null,
        event: event.id ?? null,
      }));
    }
  }
  return Object.freeze(dedupeOrganizingTheatreWorkLocusClaims([...active.values()])
    .sort((left, right) => String(right.at ?? "").localeCompare(String(left.at ?? "")) || left.claimId.localeCompare(right.claimId))
    .slice(0, options.max ?? 64));
}

export function organizingTheatreWorkLocusClaimConflictsFor(
  claim: OrganizingTheatreWorkLocusClaim,
  activeClaims: readonly OrganizingTheatreActiveWorkLocusClaim[],
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreWorkLocusOptions = {},
): readonly OrganizingTheatreWorkLocusClaimConflict[] {
  if (claim.action !== "claim") return [];
  const claimPathsSet = new Set(claim.paths);
  const conflicts: OrganizingTheatreWorkLocusClaimConflict[] = [];
  for (const active of activeClaims) {
    if (active.session === claim.session && active.claimId === claim.claimId) continue;
    for (const activePath of active.paths) {
      const overlap = organizingTheatreStrongestPathOverlap(claimPathsSet, activePath);
      if (overlap === null) continue;
      conflicts.push(OrganizingTheatreWorkLocusClaimConflict({ left: claim, right: active, path: overlap, leftPath: overlap, rightPath: activePath }, config, options));
    }
  }
  return Object.freeze(dedupeOrganizingTheatreWorkLocusClaimConflicts(conflicts));
}

export function organizingTheatreWorkLocusClaimConflictsAcross(
  activeClaims: readonly OrganizingTheatreActiveWorkLocusClaim[],
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreWorkLocusOptions & Readonly<{ max?: number }> = {},
): readonly OrganizingTheatreWorkLocusClaimConflict[] {
  const conflicts: OrganizingTheatreWorkLocusClaimConflict[] = [];
  for (let leftIndex = 0; leftIndex < activeClaims.length; leftIndex += 1) {
    const left = activeClaims[leftIndex];
    if (left === undefined) continue;
    const leftPaths = new Set(left.paths);
    for (let rightIndex = leftIndex + 1; rightIndex < activeClaims.length; rightIndex += 1) {
      const right = activeClaims[rightIndex];
      if (right === undefined) continue;
      if (left.session === right.session && left.claimId === right.claimId) continue;
      for (const rightPath of right.paths) {
        const overlap = organizingTheatreStrongestPathOverlap(leftPaths, rightPath);
        if (overlap === null) continue;
        conflicts.push(OrganizingTheatreWorkLocusClaimConflict({ left, right, path: overlap, leftPath: overlap, rightPath }, config, options));
      }
    }
  }
  return Object.freeze(dedupeOrganizingTheatreWorkLocusClaimConflicts(conflicts).slice(0, options.max ?? 32));
}

export function organizingTheatreStrongestPathOverlap(yourPaths: Iterable<string>, peerPath: string): string | null {
  for (const yourPath of yourPaths) {
    if (yourPath === "." || peerPath === ".") continue;
    if (yourPath === peerPath) return yourPath;
    if (yourPath.length >= 6 && peerPath.startsWith(`${yourPath}/`)) return yourPath;
    if (peerPath.length >= 6 && yourPath.startsWith(`${peerPath}/`)) return peerPath;
  }
  return null;
}

export function organizingTheatreWorkLocusClaimFrom(value: unknown, options: OrganizingTheatreWorkLocusOptions = {}): OrganizingTheatreWorkLocusClaim | null {
  if (value === null || typeof value !== "object") return null;
  const claim = value as Record<string, unknown>;
  if (claim.kind !== (options.claimKind ?? "organizing.theatre.work-locus-claim")) return null;
  const action = claim.action === "release" ? "release" : claim.action === "claim" ? "claim" : null;
  if (action === null) return null;
  const paths = Array.isArray(claim.paths) ? claim.paths.filter((item): item is string => typeof item === "string" && item !== "") : [];
  return Object.freeze({
    kind: String(claim.kind),
    action,
    claimId: String(claim.claimId ?? ""),
    session: String(claim.session ?? "unknown-session"),
    harness: String(claim.harness ?? "agent"),
    paths,
    ...(typeof claim.reason === "string" ? { reason: claim.reason } : { reason: null }),
    ...(typeof claim.at === "string" ? { at: claim.at } : { at: null }),
    ...(typeof claim.expiresAt === "string" ? { expiresAt: claim.expiresAt } : { expiresAt: null }),
    ...(isCapability(claim.capability) ? { capability: claim.capability } : {}),
  });
}

function OrganizingTheatreWorkLocusClaimKeys(
  claim: OrganizingTheatreWorkLocusClaim,
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreWorkLocusOptions,
  paths = claim.paths,
): readonly string[] {
  const session = String(claim.session ?? "unknown-session");
  const claimId = String(claim.claimId ?? "");
  const capabilityId = claim.capability?.id ?? organizingTheatreWorkLocusCapability(claim, config, options).id;
  return Object.freeze([
    ...(claimId === "" ? [] : [`${session}:${claimId}`]),
    `${session}:${capabilityId}`,
    ...paths.map((item) => `${session}:${item}`),
  ]);
}

function OrganizingTheatreWorkLocusClaimConflict(
  input: Readonly<{
    left: OrganizingTheatreWorkLocusClaim | OrganizingTheatreActiveWorkLocusClaim;
    right: OrganizingTheatreWorkLocusClaim | OrganizingTheatreActiveWorkLocusClaim;
    path: string;
    leftPath: string;
    rightPath: string;
  }>,
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreWorkLocusOptions,
): OrganizingTheatreWorkLocusClaimConflict {
  return Object.freeze({
    kind: options.conflictKind ?? "organizing.theatre.work-locus-claim-conflict",
    relation: "claimed-locus-overlap",
    path: input.path,
    left: OrganizingTheatreClaimConflictSide(input.left, input.leftPath, config, options),
    right: OrganizingTheatreClaimConflictSide(input.right, input.rightPath, config, options),
    reason: input.left.session === input.right.session ? "same session has overlapping active claims" : "different sessions have overlapping active claims",
    severity: input.left.session === input.right.session ? "notice" : "watch",
  });
}

function OrganizingTheatreClaimConflictSide(
  claim: OrganizingTheatreWorkLocusClaim | OrganizingTheatreActiveWorkLocusClaim,
  path: string,
  config: OrganizingTheatreServiceConfig,
  options: OrganizingTheatreWorkLocusOptions,
): OrganizingTheatreWorkLocusConflictSide {
  const capability = "capability" in claim && claim.capability?.type === "Capability"
    ? claim.capability
    : organizingTheatreWorkLocusCapability(claim as OrganizingTheatreWorkLocusClaim, config, options);
  return Object.freeze({
    claimId: claim.claimId,
    capability: capability.id,
    session: claim.session,
    harness: claim.harness,
    path,
    reason: claim.reason ?? null,
    at: claim.at ?? null,
    expiresAt: claim.expiresAt ?? null,
  });
}

function dedupeOrganizingTheatreWorkLocusClaimConflicts(conflicts: readonly OrganizingTheatreWorkLocusClaimConflict[]): OrganizingTheatreWorkLocusClaimConflict[] {
  const seen = new Set<string>();
  const out: OrganizingTheatreWorkLocusClaimConflict[] = [];
  for (const conflict of conflicts) {
    const key = [
      conflict.path,
      conflict.left.session,
      conflict.left.claimId,
      conflict.right.session,
      conflict.right.claimId,
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(conflict);
  }
  return out.sort((left, right) => left.path.localeCompare(right.path) || left.left.session.localeCompare(right.left.session) || left.right.session.localeCompare(right.right.session));
}

function dedupeOrganizingTheatreWorkLocusClaims(claims: readonly OrganizingTheatreActiveWorkLocusClaim[]): OrganizingTheatreActiveWorkLocusClaim[] {
  const seen = new Set<string>();
  const out: OrganizingTheatreActiveWorkLocusClaim[] = [];
  for (const claim of claims) {
    const key = claim.claimId;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(claim);
  }
  return out;
}

function isCapability(value: unknown): value is Capability {
  return value !== null
    && typeof value === "object"
    && (value as Record<string, unknown>)["@context"] === ACTIVITYSTREAMS_CONTEXT
    && (value as Record<string, unknown>).type === "Capability"
    && typeof (value as Record<string, unknown>).id === "string"
    && typeof (value as Record<string, unknown>).grants === "string"
    && typeof (value as Record<string, unknown>).holder === "string";
}

function organizingTheatreAgentActorId(
  config: OrganizingTheatreServiceConfig,
  harness: string,
  session: string,
): string {
  return `${trimmedBase(config.baseUrl)}/agents/${encodeURIComponent(String(harness || "agent"))}/${encodeURIComponent(String(session || "unknown-session"))}`;
}

function trimmedBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}
