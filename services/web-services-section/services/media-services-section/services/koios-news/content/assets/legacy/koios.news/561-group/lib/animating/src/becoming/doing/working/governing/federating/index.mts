import {
  readClosureEquivalenceOfSettlementFiltration,
  type SettlingClosureEquivalenceJudgment,
} from "@emsenn/relating/articulating/predicating/positing/settling";
import type { GovernanceDecision } from "../algebra/governance.mjs";
import type { AgentFiltration } from "../algebra/governing.mjs";

export * as assertionWorlds from "./assertion-worlds/index.mjs";

/**
 * A federation of governed agents: a monotone set of AgentFiltration members,
 * quotiented by relating's settlement-closure equivalence.
 */
export interface AgentFederation {
  readonly kind: "animating.agent.federation";
  readonly members: readonly AgentFiltration[];
}

/**
 * Witness that two federations were merged by monotone member-union.
 */
export interface AgentFederationMerge {
  readonly kind: "animating.agent.federation.merge";
  readonly left: AgentFederation;
  readonly right: AgentFederation;
  readonly result: AgentFederation;
}

/**
 * Witness that a governed member is present in a federation.
 */
export interface AgentFederationMembershipWitness {
  readonly kind: "animating.agent.federation.membership:witness";
  readonly federation: AgentFederation;
  readonly member: AgentFiltration;
  readonly representative: AgentFiltration;
  readonly equivalence: SettlingClosureEquivalenceJudgment;
}

/**
 * Obstruction recording that no equivalent member is present.
 */
export interface AgentFederationMembershipObstruction {
  readonly kind: "animating.agent.federation.membership-obstruction";
  readonly federation: AgentFederation;
  readonly member: AgentFiltration;
}

export type AgentFederationMembership =
  | AgentFederationMembershipWitness
  | AgentFederationMembershipObstruction;

/**
 * Witness that a governed member was admitted into a federation.
 */
export interface AgentFederationAdmissionWitness {
  readonly kind: "animating.agent.federation.admission:witness";
  readonly federation: AgentFederation;
  readonly member: AgentFiltration;
  readonly decision: GovernanceDecision;
  readonly result: AgentFederation;
}

/**
 * Obstruction recording that governance did not admit the member.
 */
export interface AgentFederationAdmissionObstruction {
  readonly kind: "animating.agent.federation.admission-obstruction";
  readonly federation: AgentFederation;
  readonly member: AgentFiltration;
  readonly decision: GovernanceDecision;
  readonly result: AgentFederation;
}

export type AgentFederationAdmission =
  | AgentFederationAdmissionWitness
  | AgentFederationAdmissionObstruction;

/**
 * Witness that a member present in one federation was admitted into another.
 */
export interface AgentFederationMigrationWitness {
  readonly kind: "animating.agent.federation.migration:witness";
  readonly source: AgentFederation;
  readonly target: AgentFederation;
  readonly member: AgentFiltration;
  readonly membership: AgentFederationMembershipWitness;
  readonly admission: AgentFederationAdmissionWitness;
  readonly result: AgentFederation;
}

/**
 * Obstruction recording either absent source membership or failed admission.
 */
export interface AgentFederationMigrationObstruction {
  readonly kind: "animating.agent.federation.migration-obstruction";
  readonly source: AgentFederation;
  readonly target: AgentFederation;
  readonly member: AgentFiltration;
  readonly membership: AgentFederationMembership;
  readonly admission?: AgentFederationAdmissionObstruction;
  readonly result: AgentFederation;
}

export type AgentFederationMigration =
  | AgentFederationMigrationWitness
  | AgentFederationMigrationObstruction;

export function filtrationEquivalence(left: AgentFiltration, right: AgentFiltration): SettlingClosureEquivalenceJudgment {
  return readClosureEquivalenceOfSettlementFiltration(left.presheaf.site.point.settlement, right.presheaf.site.point.settlement);
}

export function sameFiltration(left: AgentFiltration, right: AgentFiltration): boolean {
  return filtrationEquivalence(left, right).kind === "predication.settling.closureEquivalence:witness";
}

export function federationMembership(federation: AgentFederation, member: AgentFiltration): AgentFederationMembership {
  for (const representative of federation.members) {
    const equivalence = filtrationEquivalence(representative, member);
    if (equivalence.kind === "predication.settling.closureEquivalence:witness") {
      return Object.freeze({
        kind: "animating.agent.federation.membership:witness" as const,
        federation,
        member,
        representative,
        equivalence,
      });
    }
  }
  return Object.freeze({
    kind: "animating.agent.federation.membership-obstruction" as const,
    federation,
    member,
  });
}

export function federating(members: readonly AgentFiltration[] = []): AgentFederation {
  return Object.freeze({
    kind: "animating.agent.federation" as const,
    members: Object.freeze(members.reduce<AgentFiltration[]>((acc, member) => {
      if (acc.some((known) => sameFiltration(known, member))) return acc;
      acc.push(member);
      return acc;
    }, [])),
  });
}

export function mergeFederations(left: AgentFederation, right: AgentFederation): AgentFederation {
  return federating([...left.members, ...right.members]);
}

export function federationMerge(left: AgentFederation, right: AgentFederation): AgentFederationMerge {
  return Object.freeze({
    kind: "animating.agent.federation.merge" as const,
    left,
    right,
    result: mergeFederations(left, right),
  });
}

export function admitFederationMember(
  federation: AgentFederation,
  member: AgentFiltration,
  decision: GovernanceDecision,
): AgentFederationAdmission {
  if (decision.eligible) {
    return Object.freeze({
      kind: "animating.agent.federation.admission:witness" as const,
      federation,
      member,
      decision,
      result: mergeFederations(federation, federating([member])),
    });
  }
  return Object.freeze({
    kind: "animating.agent.federation.admission-obstruction" as const,
    federation,
    member,
    decision,
    result: federation,
  });
}

export function migrateFederationMember(
  source: AgentFederation,
  target: AgentFederation,
  member: AgentFiltration,
  decision: GovernanceDecision,
): AgentFederationMigration {
  const membership = federationMembership(source, member);
  if (membership.kind === "animating.agent.federation.membership-obstruction") {
    return Object.freeze({
      kind: "animating.agent.federation.migration-obstruction" as const,
      source,
      target,
      member,
      membership,
      result: target,
    });
  }
  const admission = admitFederationMember(target, membership.representative, decision);
  if (admission.kind === "animating.agent.federation.admission-obstruction") {
    return Object.freeze({
      kind: "animating.agent.federation.migration-obstruction" as const,
      source,
      target,
      member,
      membership,
      admission,
      result: target,
    });
  }
  return Object.freeze({
    kind: "animating.agent.federation.migration:witness" as const,
    source,
    target,
    member,
    membership,
    admission,
    result: admission.result,
  });
}
