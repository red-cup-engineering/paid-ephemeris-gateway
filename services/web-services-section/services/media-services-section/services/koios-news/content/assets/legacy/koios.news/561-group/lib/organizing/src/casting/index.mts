import {
  carrierFrom,
  cell,
  claim,
  jsonResource,
  mark,
  predicateOfClaim,
  token,
  type FromSchema,
  type JsonValue,
} from "@emsenn/relating";
import {
  arenaForPlayers,
  createPool,
  encodePool,
  formMatches,
  matchmakeAction,
  queueTicket,
  type LobbyMatch,
  type MatchPool,
  type MatchmakingResult,
} from "@emsenn/gaming";

import { officeEligibility, type OfficeEligibilityDecision } from "../authority.mjs";
import {
  assignWork,
  officeTerm,
  termKey,
  workAgent,
  workItem,
  workTask,
  workTerm,
  type OfficeName,
  type WorkAgent,
  type WorkAssignment,
} from "../work.mjs";
import type { Camp } from "../writing/activitypub/index.mjs";
import {
  coordinateByCalmOrRaft,
  emptyRaftLog,
  type CalmRaftFrontier,
  type RaftAppendResult,
  type RaftLeadership,
  type RaftLog,
} from "../writing/raft/index.mjs";
import { readCalmFederation, type CalmReading } from "../writing/calm/index.mjs";
import type { Federation } from "../organizing.mjs";
import type { Situation } from "../situation/index.mjs";

const jsonSlotSchema = {
  description: "Caller-owned JSON carrier slot.",
} as const;

export const TroupeSchema = {
  $id: "organizing/casting/troupe",
  title: "OrganizingTroupe",
  description:
    "The cast selected from a standing camp for one situation, with the gaming matchmaking pool and formed match as witness.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "camp", "situation", "memberIds", "members", "pool", "match", "matchmaking", "matchmakingAction"],
  properties: {
    kind: { const: "organizing.casting.troupe" },
    camp: { type: "string", minLength: 1 },
    situation: { type: "string", minLength: 1 },
    memberIds: { type: "array", items: { type: "string", minLength: 1 } },
    members: { type: "array", items: { type: "object" } },
    pool: { type: "object" },
    match: { type: "object" },
    matchmaking: { type: "object" },
    matchmakingAction: jsonSlotSchema,
  },
} as const;

export const WorkLocusClaimSchema = {
  $id: "organizing/casting/work-locus-claim",
  title: "OrganizingWorkLocusClaim",
  description:
    "A jural claim over governed substrate: a WorkAssignment over a WorkItem whose subject is the claimed substrate region.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "situation", "region", "assignment", "eligibility"],
  properties: {
    kind: { const: "organizing.casting.work-locus-claim" },
    situation: { type: "string", minLength: 1 },
    region: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    assignment: { type: "object" },
    eligibility: { type: "object" },
  },
} as const;

export const WorkLocusGovernanceSchema = {
  $id: "organizing/casting/work-locus-governance",
  title: "OrganizingWorkLocusGovernance",
  description:
    "CALM/Raft governance over work-locus claims: monotone claims lift coordination-free; non-monotone overlaps are leader ordered.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "monotone", "calm", "frontier", "assignmentsByIndex", "log"],
  properties: {
    kind: { const: "organizing.casting.work-locus-governance" },
    monotone: { type: "boolean" },
    calm: { type: "object" },
    frontier: { type: "object" },
    assignmentsByIndex: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["substrateIndex", "assignment"],
        properties: {
          substrateIndex: { type: "string", minLength: 1 },
          assignment: { type: "object" },
        },
      },
    },
    log: { type: "object" },
    append: { type: "object" },
  },
} as const;

export type Troupe = Omit<
  FromSchema<typeof TroupeSchema>,
  "members" | "pool" | "match" | "matchmaking" | "matchmakingAction"
> & {
  readonly members: Camp["members"];
  readonly pool: MatchPool;
  readonly match: LobbyMatch;
  readonly matchmaking: MatchmakingResult;
  readonly matchmakingAction: JsonValue;
};
export type WorkLocusClaim = Omit<
  FromSchema<typeof WorkLocusClaimSchema>,
  "assignment" | "eligibility"
> & {
  readonly assignment: WorkAssignment;
  readonly eligibility: OfficeEligibilityDecision;
};
export type WorkLocusGovernance = Omit<
  FromSchema<typeof WorkLocusGovernanceSchema>,
  "calm" | "frontier" | "assignmentsByIndex" | "log" | "append"
> & {
  readonly calm: CalmReading;
  readonly frontier: CalmRaftFrontier;
  readonly assignmentsByIndex: readonly {
    readonly substrateIndex: string;
    readonly assignment: WorkAssignment;
  }[];
  readonly log: RaftLog;
  readonly append?: RaftAppendResult;
};

export const troupeCarrier = carrierFrom(TroupeSchema);
export const workLocusClaimCarrier = carrierFrom(WorkLocusClaimSchema);
export const workLocusGovernanceCarrier = carrierFrom(WorkLocusGovernanceSchema);

export function cast(camp: Camp, scene: Situation): Troupe {
  if (camp.members.length < scene.matchSize) {
    throw new TypeError("cast: camp does not have enough members for the situation match size");
  }
  const playerIds = camp.members.map((member) => member.id);
  let pool = createPool({
    id: `${camp.id}:${scene.id}`,
    arena: arenaForPlayers(playerIds),
    matchSize: scene.matchSize,
  });
  for (const member of [...camp.members].sort((left, right) => left.id.localeCompare(right.id))) {
    pool = queueTicket(pool, member.id).pool;
  }
  const matchmakingAction = matchmakeAction.run({ pool: encodePool(pool) as JsonValue }, {}) as JsonValue;
  const matchmaking = formMatches(pool);
  const match = matchmaking.matches[0];
  if (match === undefined) throw new TypeError("cast: matchmaking did not form a troupe");
  const selected = new Set(match.playerIds);
  const members = Object.freeze(camp.members.filter((member) => selected.has(member.id)));
  const troupe: Troupe = Object.freeze({
    kind: "organizing.casting.troupe" as const,
    camp: camp.id,
    situation: scene.id,
    memberIds: Object.freeze([...match.playerIds]),
    members,
    pool: matchmaking.pool,
    match,
    matchmaking,
    matchmakingAction,
  });
  return troupeCarrier.assert(jsonResource(troupe as unknown as JsonValue), "troupe") as unknown as Troupe;
}

export interface TroupeStageInput {
  readonly troupe: Troupe;
  readonly memberId: string;
  readonly designs: Readonly<Record<string, unknown>>;
  readonly universe: readonly unknown[];
  readonly stage: (actor: unknown, troupe: readonly unknown[], universe: readonly unknown[]) => unknown;
}

export function stageTroupeMember(input: TroupeStageInput): unknown {
  const actor = input.designs[input.memberId];
  if (actor === undefined) throw new TypeError(`stageTroupeMember: no design for member ${input.memberId}`);
  const troupe = input.troupe.memberIds
    .filter((memberId) => memberId !== input.memberId)
    .map((memberId) => input.designs[memberId])
    .filter((design) => design !== undefined);
  return input.stage(actor, troupe, input.universe);
}

export interface WorkLocusClaimInput {
  readonly situation: Situation;
  readonly region?: readonly string[];
  readonly office: string | OfficeName;
  readonly assignee: string | WorkAgent;
  readonly capabilities?: readonly string[];
  readonly officeAuthorities?: readonly string[];
  readonly requiresCapabilities?: readonly string[];
  readonly requiresAuthorities?: readonly string[];
  readonly duties?: readonly string[];
  readonly title?: string;
}

export function claimWorkLocus(input: WorkLocusClaimInput): WorkLocusClaim {
  const region = Object.freeze([...(input.region ?? input.situation.substrate)]);
  if (region.length === 0) throw new TypeError("claimWorkLocus: region is required");
  const requiresCapabilities = Object.freeze([...(input.requiresCapabilities ?? input.situation.requiresCapabilities)]);
  const requiresAuthorities = Object.freeze([...(input.requiresAuthorities ?? input.situation.requiresAuthorities)]);
  const capabilities = Object.freeze([...(input.capabilities ?? [])]);
  const officeAuthorities = Object.freeze([...(input.officeAuthorities ?? [])]);
  const eligibility = officeEligibility({
    kind: "organizing.office-eligibility-request" as const,
    capabilities,
    officeAuthorities,
    requiresCapabilities,
    requiresAuthorities,
  });
  if (!eligibility.eligible) {
    throw new TypeError(`claimWorkLocus: office eligibility failed with ${eligibility.gap} gap`);
  }
  const office = typeof input.office === "string" ? officeTerm(input.office) : input.office;
  const assignee = typeof input.assignee === "string"
    ? workAgent({
        term: workTerm(["agent", input.assignee]),
        capabilities: capabilities.map((capability) => workTerm(["capability", capability])),
      })
    : input.assignee;
  const title = input.title ?? `${input.situation.id} work locus`;
  const workSubject = workTerm(["substrate-region", ...region]);
  const goal = cell(
    workSubject,
    predicateOfClaim(claim(mark("claimed-work-locus"))),
    token(mark({ situation: input.situation.id, region: [...region] })),
  );
  const task = workTask({
    term: workTerm(["task", "situation", input.situation.id, ...region]),
    goals: [goal],
    evidence: [workTerm(["title", title]), workTerm(["situation", input.situation.id])],
  });
  const item = workItem({
    term: workSubject,
    task,
    office,
    evidence: [workTerm(["title", title]), workTerm(["substrate-region", ...region])],
  });
  const assignment = assignWork({
    term: workTerm(["assignment", input.situation.id, termKey(office), termKey(assignee.term), ...region]),
    work: item,
    office,
    assignee,
    duties: (input.duties ?? []).map((duty) => workTerm(["duty", duty])),
    evidence: [workTerm(["situation", input.situation.id]), workTerm(["jural-face", "office"])],
  });
  const locusClaim: WorkLocusClaim = Object.freeze({
    kind: "organizing.casting.work-locus-claim" as const,
    situation: input.situation.id,
    region,
    assignment,
    eligibility,
  });
  return workLocusClaimCarrier.assert(jsonResource(locusClaim as unknown as JsonValue), "work locus claim") as unknown as WorkLocusClaim;
}

export interface GovernWorkLocusClaimsOptions {
  readonly cluster?: string;
  readonly leadership?: RaftLeadership;
  readonly log?: RaftLog;
}

export function governWorkLocusClaims(
  claims: readonly WorkLocusClaim[],
  options: GovernWorkLocusClaimsOptions = {},
): WorkLocusGovernance {
  if (claims.length === 0) throw new TypeError("governWorkLocusClaims: claims are required");
  const byIndex = claimsBySubstrateIndex(claims);
  const contendedIndexes = [...byIndex.entries()].filter(([, entries]) => distinctAssignments(entries).length > 1);
  const calm = readCalmFederation(calmFederation(claims.length, contendedIndexes.length));
  const cluster = options.cluster ?? options.leadership?.cluster ?? "organizing-work-locus";
  const log = options.log ?? emptyRaftLog(cluster);
  const proposals = contendedIndexes.length === 0 ? [] : raftProposals(byIndex, options.leadership);
  const coordinated = coordinateByCalmOrRaft(calm, {
    log,
    ...(options.leadership === undefined ? {} : { leadership: options.leadership }),
    operation: "work-locus-claim",
    proposals,
  });
  const assignmentsByIndex = contendedIndexes.length === 0
    ? monotoneAssignments(byIndex)
    : raftAssignments(coordinated.log, claims);
  const governance: WorkLocusGovernance = Object.freeze({
    kind: "organizing.casting.work-locus-governance" as const,
    monotone: calm.monotone,
    calm,
    frontier: coordinated.frontier,
    assignmentsByIndex,
    log: coordinated.log,
    ...(coordinated.append === undefined ? {} : { append: coordinated.append }),
  });
  return workLocusGovernanceCarrier.assert(jsonResource(governance as unknown as JsonValue), "work locus governance") as unknown as WorkLocusGovernance;
}

function claimsBySubstrateIndex(claims: readonly WorkLocusClaim[]): Map<string, WorkLocusClaim[]> {
  const byIndex = new Map<string, WorkLocusClaim[]>();
  for (const entry of claims) {
    for (const substrateIndex of entry.region) {
      const existing = byIndex.get(substrateIndex) ?? [];
      existing.push(entry);
      byIndex.set(substrateIndex, existing);
    }
  }
  return byIndex;
}

function distinctAssignments(claims: readonly WorkLocusClaim[]): readonly string[] {
  return Object.freeze([...new Set(claims.map((entry) => termKey(entry.assignment.term)))]);
}

function calmFederation(claimCount: number, contested: number): Federation {
  return Object.freeze({
    kind: "organizing.federation" as const,
    monoidal: "parallel-composition" as const,
    constituents: claimCount,
    members: claimCount,
    nameMobility: 0,
    shared: contested === 0 ? claimCount : Math.max(0, claimCount - contested),
    contested,
    federationOnly: 0,
    glued: contested === 0,
    coordination: contested === 0 ? "coordination-free" as const : "consensus-required" as const,
  });
}

function monotoneAssignments(byIndex: ReadonlyMap<string, readonly WorkLocusClaim[]>): WorkLocusGovernance["assignmentsByIndex"] {
  return Object.freeze([...byIndex.entries()].map(([substrateIndex, claims]) => Object.freeze({
    substrateIndex,
    assignment: claims[0]!.assignment,
  })));
}

function raftProposals(
  byIndex: ReadonlyMap<string, readonly WorkLocusClaim[]>,
  leadership: RaftLeadership | undefined,
) {
  if (leadership === undefined) return [];
  const ordinals = substrateOrdinals([...byIndex.keys()]);
  return Object.freeze([...byIndex.entries()].flatMap(([substrateIndex, claims]) => {
    if (distinctAssignments(claims).length <= 1) return [];
    return claims.map((entry) => Object.freeze({
      cluster: leadership.cluster,
      index: ordinals.get(substrateIndex)!,
      term: leadership.term,
      leader: leadership.leader,
      command: assignmentCommand(substrateIndex, entry.assignment),
      witness: termKey(entry.assignment.term),
    }));
  }));
}

function raftAssignments(log: RaftLog, claims: readonly WorkLocusClaim[]): WorkLocusGovernance["assignmentsByIndex"] {
  const byTerm = new Map(claims.map((entry) => [termKey(entry.assignment.term), entry.assignment] as const));
  return Object.freeze(log.entries.map((entry) => {
    const command = entry.command as { readonly substrateIndex?: unknown; readonly assignmentTerm?: unknown };
    const substrateIndex = typeof command.substrateIndex === "string" ? command.substrateIndex : String(entry.index);
    const assignmentTerm = typeof command.assignmentTerm === "string" ? command.assignmentTerm : "";
    const assignment = byTerm.get(assignmentTerm);
    if (assignment === undefined) throw new TypeError(`governWorkLocusClaims: raft log references unknown assignment ${assignmentTerm}`);
    return Object.freeze({ substrateIndex, assignment });
  }));
}

function substrateOrdinals(indexes: readonly string[]): ReadonlyMap<string, number> {
  return new Map([...indexes].sort().map((index, ordinal) => [index, ordinal + 1] as const));
}

function assignmentCommand(substrateIndex: string, assignment: WorkAssignment): JsonValue {
  return {
    kind: "organizing.casting.assignment-command",
    substrateIndex,
    assignmentTerm: termKey(assignment.term),
    workTerm: termKey(assignment.work.term),
    office: termKey(assignment.office),
  };
}
