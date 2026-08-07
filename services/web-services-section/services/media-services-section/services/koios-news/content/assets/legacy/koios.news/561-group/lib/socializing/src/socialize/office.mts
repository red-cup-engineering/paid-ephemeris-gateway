/**
 * office — socializing's OPERATIONAL governance layer: the office (a bearer-independent
 * role with a deontic profile), incumbency as a DOUBLE SETTLEMENT, and the operational
 * Hohfeldian positions (assignment, waiver, revocation, ratification, relief) that move
 * jural relations over time — the apparatus for organizing real agentic labor.
 *
 * This is the operational extension of the eightfold (content/_archive .../governance/
 * .../hohfeldian.md): "what happens to legal positions as they are exercised, transferred,
 * defended, lost, and recovered over time." Where ./govern.mts READS a society's jural
 * relations (the discipline + the governance-act thesis), this module CONSTRUCTS and
 * TRANSFORMS them — the verbs an agent ecosystem actually runs.
 *
 * OFFICE (content/_archive .../office/_archive/office-as-double-settlement.md). An office O
 * is a bearer-independent role carrying a DEONTIC PROFILE D_O: A_O → {power, duty, privilege,
 * immunity} — a family of jural relations with the OFFICE (not any incumbent) in the active
 * position, scoped over an action-domain A_O of work-items. Incumbency is the joint affirming
 * settlement of TWO required predicates on a candidate ι:
 *   - RECOGNITION (the honor axis, backward, history-sensitive): ι is acknowledged as the
 *     legitimate occupant.
 *   - INDUCTION (the munus axis, forward): ι has taken on the office's forward obligation.
 * Their joint state is the Roman munus/honor/dignitas trinity — vacant (⊥,⊥), munus-only
 * (⊥,t), recognition-only (t,⊥), DIGNITAS (t,t = full incumbency), failed (f), repair (⊤).
 * At dignitas the office's profile DEVOLVES onto the incumbent: the active-holder is rewritten
 * from the office to ι (the capability-propagation rule — the powers transfer). The office
 * persists across incumbents (dignitas non moritur): the profile is structural, not destroyed
 * by a vacancy.
 *
 * WORK. The scope-action of a jural relation is a WORK-ITEM at some level of the work-carrier
 * spine (endeavor > campaign > project > plan > task > work-item — the managing-operations
 * work-vocabulary, referenced not re-authored). ASSIGNMENT binds a work-item to an agent as a
 * DUTY jural relation (the agent now OWES it — the "owned-by" cell the work-item migration
 * lands; content/.../migrating-work-item-instances-to-lawful-positions.md). So organizing
 * agentic labor is: induct an agent into an office (double settlement → dignitas → devolved
 * powers), then assign it work-items (duties); the agent's IMMUNITIES bound what may be imposed
 * on it; ./govern.mts then reads the society's operativity, accountability, and discipline.
 *
 * Built on ./govern.mts's JuralRelation; consumes relating's FOUR charge values; re-authors none.
 */
import type { ChargeValueName } from "@emsenn/relating";

import {
  correlate,
  type JuralKind,
  type JuralRelation,
} from "./govern.mjs";

/** The work-carrier spine — the levels a jural relation's scope-action (a WORK-ITEM) sits at.
 *  endeavor generates campaign generates project generates plan generates task generates the
 *  work-item leaf (the managing-operations work-vocabulary order; here it types the SCOPE of a
 *  duty/assignment, so an agent's obligation is addressed at the right altitude of the work). */
export const WORK_LEVELS = Object.freeze([
  "endeavor",
  "campaign",
  "project",
  "plan",
  "task",
  "work-item",
] as const);
export type WorkLevel = typeof WORK_LEVELS[number];

/** A unit of work an office governs and an agent is assigned — the scope-action of a jural
 *  relation, identified at a level of the work-carrier spine and (optionally) under its parent. */
export interface WorkItem {
  /** the level of the work-carrier spine this unit sits at. */
  readonly level: WorkLevel;
  /** the work-item's identifier — the jural relation's scope-action X. */
  readonly id: string;
  /** the enclosing carrier (a task's project, a project's campaign, …), if any. */
  readonly parent?: string;
}

/** The scope-action string a jural relation carries for a work-item: `level:id` (parent dropped —
 *  the enclosing carrier is the work hierarchy's concern, not the binding's). */
export function workScope(item: WorkItem): string {
  return `${item.level}:${item.id}`;
}

/**
 * An OFFICE — a bearer-independent role with a deontic profile. The profile is a family of
 * jural relations with the office itself in the active position (so they devolve onto whichever
 * agent reaches dignitas), each scoped over a work-item the office governs.
 */
export interface Office {
  readonly kind: "socializing.office";
  /** the office's name — the bearer-independent active-holder of its profile relations. */
  readonly name: string;
  /** the deontic profile D_O: a jural relation per governed work-item (power/duty/privilege/immunity). */
  readonly profile: readonly JuralRelation[];
}

/** One entry of a deontic profile: the kind the office holds over a work-item. */
export interface DeonticEntry {
  readonly kind: Extract<JuralKind, "power" | "duty" | "privilege" | "immunity">;
  readonly over: WorkItem;
  /** the passive party the office's relation regards (the governed parties / the polity); default
   *  the office's body politic, named by the office. */
  readonly party?: string;
}

/**
 * Constitute an office from its name and deontic profile. Each profile entry becomes a jural
 * relation with the office as the active holder, asserted (potential) — the office's structural,
 * persistent normative content.
 */
export function office(name: string, profile: readonly DeonticEntry[]): Office {
  const relations = profile.map((entry) => Object.freeze({
    kind: entry.kind,
    active: name,
    passive: entry.party ?? `${name}:body-politic`,
    scope: workScope(entry.over),
    standing: "potential" as ChargeValueName,
  } satisfies JuralRelation));
  return Object.freeze({
    kind: "socializing.office" as const,
    name,
    profile: Object.freeze(relations),
  });
}

/** The munus/honor/dignitas incumbency trinity — the joint state of the two required predicates. */
export type IncumbencyState = "vacant" | "munus" | "recognition" | "dignitas" | "failed" | "repair";

/** The incumbency state from the two FOUR-valued required predicates (office-as-double-settlement.md):
 *  recognition (honor) × induction (munus). A ⊤ on either is a repair condition; an explicit f
 *  on either fails the settlement; (t,t) is full dignitas. */
export function incumbencyState(recognition: ChargeValueName, induction: ChargeValueName): IncumbencyState {
  if (recognition === "stable" || induction === "stable") return "repair";
  if (recognition === "active" || induction === "active") return "failed";
  const recognized = recognition === "potential";
  const inducted = induction === "potential";
  if (recognized && inducted) return "dignitas";
  if (inducted) return "munus";
  if (recognized) return "recognition";
  return "vacant";
}

/** The result of investing a candidate into an office: the incumbency state and — only at
 *  dignitas — the office's profile DEVOLVED onto the incumbent (active-holder rewritten from the
 *  office to the agent; the capability-propagation rule). Below dignitas nothing devolves. */
export interface Investiture {
  readonly office: string;
  readonly incumbent: string;
  readonly state: IncumbencyState;
  /** the jural relations now borne by the incumbent — the office's profile with active = incumbent
   *  (empty unless the candidate reached dignitas). */
  readonly devolved: readonly JuralRelation[];
}

/**
 * invest — settle a candidate's incumbency of an office by the double settlement, devolving the
 * office's deontic profile onto the incumbent at dignitas (powers transfer; dignitas non moritur
 * leaves the office's own profile untouched). The two required predicates are passed as their
 * settled FOUR values (recognition = honor, induction = munus).
 */
export function invest(
  office: Office,
  incumbent: string,
  recognition: ChargeValueName,
  induction: ChargeValueName,
): Investiture {
  const state = incumbencyState(recognition, induction);
  const devolved = state === "dignitas"
    ? office.profile.map((relation) => Object.freeze({ ...relation, active: incumbent } satisfies JuralRelation))
    : [];
  return Object.freeze({
    office: office.name,
    incumbent,
    state,
    devolved: Object.freeze(devolved),
  });
}

/** relieve — dissolve an incumbent's hold on an office (the inverse of investiture): the
 *  incumbency returns to vacant and nothing is devolved. The office itself persists. */
export function relieve(office: Office, incumbent: string): Investiture {
  return Object.freeze({
    office: office.name,
    incumbent,
    state: "vacant" as const,
    devolved: Object.freeze([]),
  });
}

/**
 * assign — bind a work-item to an agent as a DUTY (the agent now OWES it: the "owned-by"
 * relation). The correlative is the office's/assigner's CLAIM that the work be done. This is
 * the operational position that turns a work-item into agentic labor an agent is answerable for.
 */
export function assign(to: string, item: WorkItem, by = "assigner"): JuralRelation {
  return Object.freeze({
    kind: "duty",
    active: to,
    passive: by,
    scope: workScope(item),
    standing: "potential" as ChargeValueName,
  } satisfies JuralRelation);
}

/** grant — bind a POWER over a work-item to an agent (the capacity to alter positions regarding
 *  it); the correlative is the governed party's liability. */
export function grant(to: string, item: WorkItem, over = "body-politic"): JuralRelation {
  return Object.freeze({
    kind: "power",
    active: to,
    passive: over,
    scope: workScope(item),
    standing: "potential" as ChargeValueName,
  } satisfies JuralRelation);
}

/** immunize — bind an IMMUNITY to an agent regarding a work-item (a position another agent
 *  CANNOT alter on it); the correlative is the other party's disability. */
export function immunize(holder: string, item: WorkItem, against = "body-politic"): JuralRelation {
  return Object.freeze({
    kind: "immunity",
    active: holder,
    passive: against,
    scope: workScope(item),
    standing: "potential" as ChargeValueName,
  } satisfies JuralRelation);
}

/** The correlative (passive-side) view of a borne relation — the party the relation binds and
 *  how (a duty's claim-holder, a power's liable party, an immunity's disabled party). */
export function borneBy(relation: JuralRelation): JuralRelation {
  return correlate(relation);
}

/** waive — the holder VOLUNTARILY relinquishes a position: its standing moves to `active` (denied,
 *  f). A waiver is by the position's own holder. */
export function waive(relation: JuralRelation): JuralRelation {
  return Object.freeze({ ...relation, standing: "active" as ChargeValueName });
}

/** revoke — a granted authority is UNILATERALLY retracted by the grantor: the standing moves to
 *  `active` (denied, f). Distinct from waiver in provenance (grantor, not holder); same standing move. */
export function revoke(relation: JuralRelation): JuralRelation {
  return Object.freeze({ ...relation, standing: "active" as ChargeValueName });
}

/** ratify — retroactively VALIDATE a position that was unauthorized (⊥) or contested (⊤): its
 *  standing moves to `potential` (asserted, t). The retroactive-validation operational position. */
export function ratify(relation: JuralRelation): JuralRelation {
  return Object.freeze({ ...relation, standing: "potential" as ChargeValueName });
}

// ── Rotational authority (content/_archive .../rotational-authority.md — the Andean ayllu) ──

/** A ROTATION of an office's authority through an eligible roster: authority CYCLES rather than
 *  accumulating in any one agent (the ayllu/minka pattern; Aboriginal age-grade; clan-mother
 *  chief-rotation). The roster is the eligible population; `current` indexes the incumbent. */
export interface Rotation {
  readonly office: string;
  readonly roster: readonly string[];
  readonly current: number;
}

/** rotate — advance a rotation to the NEXT eligible incumbent (the Markov discipline: next in the
 *  roster, cycling). The current incumbent is relieved and the next installed in one step; NO agent
 *  accumulates the office's authority across periods — authority-experience distributes across the
 *  roster. Returns the advanced rotation and the relieved/installed incumbents. */
export function rotate(rotation: Rotation): { readonly rotation: Rotation; readonly relieved: string; readonly installed: string } {
  const size = rotation.roster.length;
  if (size === 0) throw new RangeError("rotate: empty roster");
  const next = (rotation.current + 1) % size;
  return Object.freeze({
    rotation: Object.freeze({ ...rotation, current: next }),
    relieved: rotation.roster[((rotation.current % size) + size) % size]!,
    installed: rotation.roster[next]!,
  });
}

// ── Accountability + delegation (content/_archive .../accountability.md) ──

/** ACCOUNTABILITY — a triple (bearer, scope, A): a TOTAL, delegation-INVARIANT assignment of every
 *  outcome within a scope to a single answerable bearer. Backward-looking and non-dischargeable: the
 *  bearer answers for scope-outcomes regardless of who caused them or who authority was delegated to. */
export interface Accountability {
  readonly kind: "socializing.accountability";
  readonly bearer: string;
  readonly scope: string;
}

/** Constitute the accountability of a bearer over a scope (a work-item or a bare scope string). */
export function accountability(bearer: string, scope: WorkItem | string): Accountability {
  return Object.freeze({
    kind: "socializing.accountability" as const,
    bearer,
    scope: typeof scope === "string" ? scope : workScope(scope),
  });
}

/** answerableParty — the party accountable for any outcome in scope: ALWAYS the bearer (totality),
 *  NEVER a delegate (non-transferability by delegation). Invariant under `delegate`. */
export function answerableParty(account: Accountability): string {
  return account.bearer;
}

/** delegate — distribute AUTHORITY (a power) to a sub-agent: a new power relation with active = the
 *  delegate. Delegation distributes authority; it does NOT move accountability — an `Accountability`
 *  is unchanged by this op (the U.S. Navy Regs 0802 invariant: delegation never relieves the bearer). */
export function delegate(power: JuralRelation, to: string): JuralRelation {
  return Object.freeze({ ...power, active: to } satisfies JuralRelation);
}

// ── Reciprocity (ayni) + restoration (Ubuntu) ──

/** reciprocate — ayni reciprocal exchange: labor PROVIDED creates a correlative reciprocal-DEBT — the
 *  receiver now owes reciprocal labor to the provider. A duty relation active = receiver (the debtor),
 *  passive = provider (the creditor). Accumulates as the populace's reciprocal-debt graph. */
export function reciprocate(provider: string, receiver: string, labor: WorkItem | string): JuralRelation {
  return Object.freeze({
    kind: "duty",
    active: receiver,
    passive: provider,
    scope: typeof labor === "string" ? labor : workScope(labor),
    standing: "potential" as ChargeValueName,
  } satisfies JuralRelation);
}

/** A RESTORATIVE response to harm (Ubuntu): reintegration + reparation, NOT punishment. The
 *  substrate's response to a violation is a reparation duty and a reopened relation, not a punitive
 *  cell — punishment-cells, if any, are downstream and conditional. */
export interface Restoration {
  readonly kind: "socializing.restoration";
  /** the reparation the offender now owes the harmed party (a duty, scoped `repair:<harm>`). */
  readonly reparation: JuralRelation;
  /** the response aims at reintegration of the offender and healing of the relation (true by
   *  construction — restorative accountability favors relation-restoration over individual-punishment). */
  readonly reintegrative: true;
}

/** restore — the restorative-accountability response: a reparation duty (offender owes the harmed
 *  party) aimed at reintegration, not a punitive position. */
export function restore(offender: string, harmed: string, harm: WorkItem | string): Restoration {
  return Object.freeze({
    kind: "socializing.restoration" as const,
    reparation: Object.freeze({
      kind: "duty",
      active: offender,
      passive: harmed,
      scope: `repair:${typeof harm === "string" ? harm : workScope(harm)}`,
      standing: "potential" as ChargeValueName,
    } satisfies JuralRelation),
    reintegrative: true,
  });
}

// ── Separation of duty (RBAC static SoD) ──

/** An assignment of an agent to a role, for separation-of-duty checking. */
export interface RoleAssignment {
  readonly agent: string;
  readonly role: string;
}

/** A separation-of-duty conflict: an agent co-assigned a forbidden role pair. */
export interface SoDConflict {
  readonly agent: string;
  readonly roles: readonly [string, string];
}

/** separationOfDuty — static separation of duty (RBAC): certain role pairs MUST NOT be co-assigned to
 *  one agent (conflict of interest). Returns the violating (agent, forbidden-pair) conflicts — empty
 *  iff the assignment respects every constraint. The forbidden combinations are a structural axiom on
 *  the role-assignment relation. */
export function separationOfDuty(
  assignments: readonly RoleAssignment[],
  forbidden: readonly (readonly [string, string])[],
): readonly SoDConflict[] {
  const byAgent = new Map<string, Set<string>>();
  for (const { agent, role } of assignments) {
    const roles = byAgent.get(agent) ?? new Set<string>();
    roles.add(role);
    byAgent.set(agent, roles);
  }
  const conflicts: SoDConflict[] = [];
  for (const [agent, roles] of byAgent) {
    for (const [a, b] of forbidden) {
      if (roles.has(a) && roles.has(b)) conflicts.push(Object.freeze({ agent, roles: Object.freeze([a, b] as const) }));
    }
  }
  return Object.freeze(conflicts);
}

// ── Status-function declaration + refusal (Searle; Black-radical abolition) ──

/** A STATUS-FUNCTION DECLARATION — the constitutive "X counts as Y in context C" performed by a party
 *  A (content/_archive .../status-function-declaration.md, Searle): the generative mechanism of
 *  institutional fact. Constitutive (creates, not reports), standing-required, context-relative. */
export interface Declaration {
  readonly kind: "socializing.declaration";
  /** X — the target acquiring the status. */
  readonly target: string;
  /** Y — the institutional status assigned. */
  readonly status: string;
  /** C — the institutional context within which the status holds (status is never absolute). */
  readonly context: string;
  /** A — the authorizing party performing the declaration. */
  readonly by: string;
  /** FELICITOUS iff `by` had STANDING (authority to constitute Y-in-C); an infelicitous declaration
   *  MISFIRES — the target does not acquire the status. */
  readonly felicitous: boolean;
  /** the institutional position constituted (a held privilege of the status, scoped to the context),
   *  or null on misfire. */
  readonly constituted: JuralRelation | null;
}

/** declare — perform a status-function declaration. With standing it CONSTITUTES the institutional
 *  fact (the target holds, as a privilege in the context, the status `counts-as:<Y>`); without
 *  standing it misfires (constituted = null). */
export function declare(target: string, status: string, context: string, by: string, hasStanding: boolean): Declaration {
  return Object.freeze({
    kind: "socializing.declaration" as const,
    target,
    status,
    context,
    by,
    felicitous: hasStanding,
    constituted: hasStanding
      ? Object.freeze({
          kind: "privilege",
          active: target,
          passive: context,
          scope: `counts-as:${status}`,
          standing: "potential" as ChargeValueName,
        } satisfies JuralRelation)
      : null,
  });
}

/** refuse — the Black-radical REFUSAL / abolition capability: a community blocks an inherited
 *  declaration from BINDING its members — a structural claim of NON-APPLICABILITY ("this institution's
 *  rules do not fire on our cells"). The refused status's standing is denied (active, f) for the
 *  refuser: the declaration does not bind them. Not a negation of governance — an alternative one. */
export function refuse(declaration: Declaration, by: string): JuralRelation {
  return Object.freeze({
    kind: "privilege",
    active: by,
    passive: declaration.context,
    scope: `refuses:${declaration.status}`,
    standing: "active" as ChargeValueName,
  } satisfies JuralRelation);
}
