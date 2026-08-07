/**
 * writing/mesh-liveness — SWIM + HyParView/Plumtree as socializing's mesh-liveness
 * layer beneath federation.
 *
 * This is a protocol model, not a network stack: no sockets, timers, encryption, or
 * process membership daemon are implemented here. The module admits protocol observations
 * as relating carriers, joins membership views through the existing socializing CRDT
 * surface, and projects epidemic dissemination through socializing.broadcast.
 */
import {
  canonical,
  carrierFrom,
  charge,
  chargeValue,
  mark,
  meme,
  cell,
  claim,
  predicateOfClaim,
  token,
  valueOf,
  type ChargeCarrier,
  type FromSchema,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import type { Field } from "../../socialize/field.mjs";
import { broadcastAction } from "../../socialize/broadcast.mjs";
import {
  crdtState,
  mergeCrdtStates,
  type MultiValueRegisterWrite,
  type StateCrdt,
  type StateCrdtCell,
} from "../crdt/index.mjs";

export const MESH_LIVENESS_PROTOCOLS = Object.freeze(["swim", "hyparview", "plumtree"] as const);
export type MeshLivenessProtocol = typeof MESH_LIVENESS_PROTOCOLS[number];

export const LIVENESS_STATES = Object.freeze(["alive", "suspect", "dead"] as const);
export type LivenessState = typeof LIVENESS_STATES[number];

const observationValueSchema = {
  type: "object",
  required: ["member", "status", "protocol", "observer", "round", "incarnation"],
  properties: {
    member: { type: "string", minLength: 1 },
    status: { enum: LIVENESS_STATES },
    protocol: { enum: MESH_LIVENESS_PROTOCOLS },
    observer: { type: "string", minLength: 1 },
    round: { type: "integer", minimum: 0 },
    incarnation: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
} as const;

export const MeshLivenessObservationSchema = {
  $id: "socializing/writing/mesh-liveness/observation",
  title: "MeshLivenessObservation",
  description:
    "One SWIM-family membership observation: alive/suspect/dead as a charged witness over a member at a round and incarnation.",
  type: "object",
  required: ["kind", "member", "status", "protocol", "observer", "round", "incarnation", "charge", "witness"],
  properties: {
    kind: { const: "socializing.mesh-liveness.observation" },
    ...observationValueSchema.properties,
    charge: { description: "a relating ChargeCarrier; the <=_k liveness witness" },
    witness: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;
export type MeshLivenessObservation = Omit<FromSchema<typeof MeshLivenessObservationSchema>, "charge"> & {
  readonly charge: ChargeCarrier;
};
export const meshLivenessObservationCarrier = carrierFrom(MeshLivenessObservationSchema);

export const MembershipViewSchema = {
  $id: "socializing/writing/mesh-liveness/membership-view",
  title: "MembershipView",
  description:
    "A peer's membership view as a state-CRDT: each member key accumulates SWIM observations by socializing.merge's <=_k join.",
  type: "object",
  required: ["kind", "observer", "round", "state"],
  properties: {
    kind: { const: "socializing.mesh-liveness.membership-view" },
    observer: { type: "string", minLength: 1 },
    round: { type: "integer", minimum: 0 },
    state: { description: "a socializing StateCrdt carrier; membership cells are joined with mergeCrdtStates" },
  },
  additionalProperties: false,
} as const;
export type MembershipView = Omit<FromSchema<typeof MembershipViewSchema>, "state"> & {
  readonly state: StateCrdt;
};
export const membershipViewCarrier = carrierFrom(MembershipViewSchema);

export const HyParViewOverlaySchema = {
  $id: "socializing/writing/mesh-liveness/hyparview-overlay",
  title: "HyParViewOverlay",
  description: "A deterministic HyParView reading: active peers form eager gossip links; passive peers are lazy repair candidates.",
  type: "object",
  required: ["kind", "self", "active", "passive"],
  properties: {
    kind: { const: "socializing.mesh-liveness.hyparview-overlay" },
    self: { type: "string", minLength: 1 },
    active: { type: "array", items: { type: "string", minLength: 1 } },
    passive: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;
export type HyParViewOverlay = FromSchema<typeof HyParViewOverlaySchema>;
export const hyParViewOverlayCarrier = carrierFrom(HyParViewOverlaySchema);

export const PlumtreeGossipPlanSchema = {
  $id: "socializing/writing/mesh-liveness/plumtree-plan",
  title: "PlumtreeGossipPlan",
  description: "A Plumtree reading over a HyParView overlay: eager push on active links, lazy repair adverts on passive links.",
  type: "object",
  required: ["kind", "messageId", "root", "eager", "lazy"],
  properties: {
    kind: { const: "socializing.mesh-liveness.plumtree-plan" },
    messageId: { type: "string", minLength: 1 },
    root: { type: "string", minLength: 1 },
    eager: { type: "array", items: { type: "string", minLength: 1 } },
    lazy: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;
export type PlumtreeGossipPlan = FromSchema<typeof PlumtreeGossipPlanSchema>;
export const plumtreeGossipPlanCarrier = carrierFrom(PlumtreeGossipPlanSchema);

export type LivenessReading = {
  readonly member: string;
  readonly status: LivenessState;
  readonly incarnation: number;
  readonly round: number;
  readonly charge: ChargeCarrier;
  readonly accumulatedCharge: ChargeCarrier;
  readonly witnesses: readonly string[];
};

export function livenessCharge(status: LivenessState, witness: string): ChargeCarrier {
  const w = mark(witness);
  switch (status) {
    case "alive":
      return charge(chargeValue("potential"), [[w], []]);
    case "suspect":
      return charge(chargeValue("active"), [[], [w]]);
    case "dead":
      return charge(chargeValue("stable"), [[w], [w]]);
  }
}

function statusStanding(status: LivenessState): "potential" | "active" | "stable" {
  if (status === "alive") return "potential";
  if (status === "dead") return "stable";
  return "active";
}

function memberKey(member: string): string {
  return `mesh/member/${member}`;
}

function observationDot(observation: MeshLivenessObservation): string {
  return [
    observation.observer,
    observation.member,
    observation.incarnation,
    observation.round,
    observation.status,
    observation.witness,
  ].join(":");
}

function observationWrite(observation: MeshLivenessObservation): MultiValueRegisterWrite {
  const value = Object.freeze({
    member: observation.member,
    status: observation.status,
    protocol: observation.protocol,
    observer: observation.observer,
    round: observation.round,
    incarnation: observation.incarnation,
  });
  return Object.freeze({
    dot: observationDot(observation),
    replica: observation.observer,
    value,
    standing: statusStanding(observation.status),
    witness: observation.witness,
  });
}

function cellForObservation(observation: MeshLivenessObservation): StateCrdtCell {
  return Object.freeze({
    key: memberKey(observation.member),
    charge: observation.charge,
    writes: Object.freeze([observationWrite(observation)]),
  });
}

export function meshLivenessObservation(input: {
  readonly member: string;
  readonly status: LivenessState;
  readonly observer: string;
  readonly round: number;
  readonly incarnation?: number;
  readonly protocol?: MeshLivenessProtocol;
  readonly witness?: string;
}): MeshLivenessObservation {
  const incarnation = input.incarnation ?? 0;
  const protocol = input.protocol ?? "swim";
  const witness = input.witness ?? `${protocol}:${input.observer}:${input.member}:${input.round}:${input.status}:${incarnation}`;
  return meshLivenessObservationCarrier.assert(Object.freeze({
    kind: "socializing.mesh-liveness.observation" as const,
    member: input.member,
    status: input.status,
    protocol,
    observer: input.observer,
    round: input.round,
    incarnation,
    charge: livenessCharge(input.status, witness),
    witness,
  })) as MeshLivenessObservation;
}

export function membershipView(
  observer: string,
  observations: readonly MeshLivenessObservation[] = [],
  round = 0,
): MembershipView {
  const cells = observations.map(cellForObservation);
  return membershipViewCarrier.assert(Object.freeze({
    kind: "socializing.mesh-liveness.membership-view" as const,
    observer,
    round,
    state: crdtState(cells),
  })) as MembershipView;
}

export function mergeMembershipViews(left: MembershipView, right: MembershipView): MembershipView {
  const observer = left.observer === right.observer ? left.observer : `${left.observer}|${right.observer}`;
  return membershipViewCarrier.assert(Object.freeze({
    kind: "socializing.mesh-liveness.membership-view" as const,
    observer,
    round: Math.max(left.round, right.round),
    state: mergeCrdtStates(left.state, right.state),
  })) as MembershipView;
}

function valueOfWrite(write: MultiValueRegisterWrite): FromSchema<typeof observationValueSchema> | null {
  const value = write.value;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as JsonRecord;
  const status = record["status"];
  const protocol = record["protocol"];
  if (status !== "alive" && status !== "suspect" && status !== "dead") return null;
  if (protocol !== "swim" && protocol !== "hyparview" && protocol !== "plumtree") return null;
  if (typeof record["member"] !== "string" || typeof record["observer"] !== "string") return null;
  if (typeof record["round"] !== "number" || typeof record["incarnation"] !== "number") return null;
  return record as unknown as FromSchema<typeof observationValueSchema>;
}

function statusRank(status: LivenessState): number {
  if (status === "alive") return 3;
  if (status === "dead") return 2;
  return 1;
}

function writesForMember(view: MembershipView, member: string): {
  readonly cell: StateCrdtCell;
  readonly writes: readonly MultiValueRegisterWrite[];
} | null {
  const found = view.state.cells.find((candidate) => candidate.key === memberKey(member));
  if (found === undefined) return null;
  return { cell: found, writes: found.writes ?? Object.freeze([]) };
}

function membersOf(view: MembershipView): readonly string[] {
  const members = new Set<string>();
  for (const stateCell of view.state.cells) {
    if (stateCell.key.startsWith("mesh/member/")) members.add(stateCell.key.slice("mesh/member/".length));
    for (const write of stateCell.writes ?? []) {
      const value = valueOfWrite(write);
      if (value) members.add(value.member);
    }
  }
  return Object.freeze([...members].sort());
}

export function livenessOf(view: MembershipView, member: string): LivenessReading | null {
  const found = writesForMember(view, member);
  if (found === null) return null;
  const candidates = found.writes
    .map((write) => ({ write, value: valueOfWrite(write) }))
    .filter((entry): entry is { readonly write: MultiValueRegisterWrite; readonly value: FromSchema<typeof observationValueSchema> } =>
      entry.value !== null,
    )
    .sort((left, right) =>
      right.value.incarnation - left.value.incarnation ||
      right.value.round - left.value.round ||
      statusRank(right.value.status as LivenessState) - statusRank(left.value.status as LivenessState) ||
      left.write.witness.localeCompare(right.write.witness),
    );
  const chosen = candidates[0];
  if (chosen === undefined) return null;
  return Object.freeze({
    member,
    status: chosen.value.status as LivenessState,
    incarnation: chosen.value.incarnation,
    round: chosen.value.round,
    charge: livenessCharge(chosen.value.status as LivenessState, chosen.write.witness),
    accumulatedCharge: found.cell.charge,
    witnesses: Object.freeze(candidates.map((entry) => entry.write.witness).sort()),
  });
}

export function membershipTable(view: MembershipView): readonly LivenessReading[] {
  return Object.freeze(membersOf(view).map((member) => livenessOf(view, member)).filter((reading): reading is LivenessReading => reading !== null));
}

export function swimRound(
  view: MembershipView,
  options: {
    readonly observer: string;
    readonly round: number;
    readonly members?: readonly string[];
    readonly responsive?: readonly string[];
    readonly suspicionRounds?: number;
  },
): MembershipView {
  const expected = options.members ?? membersOf(view);
  const responsive = new Set(options.responsive ?? []);
  const suspicionRounds = options.suspicionRounds ?? 2;
  const observations: MeshLivenessObservation[] = [];

  for (const member of expected) {
    if (member === options.observer) continue;
    const current = livenessOf(view, member);
    if (responsive.has(member)) {
      const incarnation = (current?.incarnation ?? 0) + (current?.status === "suspect" || current?.status === "dead" ? 1 : 0);
      observations.push(meshLivenessObservation({
        member,
        status: "alive",
        observer: options.observer,
        round: options.round,
        incarnation,
        witness: `swim:${options.observer}:${member}:${options.round}:ack:${incarnation}`,
      }));
      continue;
    }
    if (current?.status === "dead") continue;
    const timedOut = current?.status === "suspect" && options.round - current.round >= suspicionRounds;
    const status: LivenessState = timedOut ? "dead" : "suspect";
    const incarnation = (current?.incarnation ?? 0) + (timedOut ? 1 : 0);
    observations.push(meshLivenessObservation({
      member,
      status,
      observer: options.observer,
      round: options.round,
      incarnation,
      witness: `swim:${options.observer}:${member}:${options.round}:${status}:${incarnation}`,
    }));
  }

  return mergeMembershipViews(view, membershipView(options.observer, observations, options.round));
}

export function failureComplete(view: MembershipView, member: string): boolean {
  const reading = livenessOf(view, member);
  return reading?.status === "dead";
}

export function hyParViewOverlay(
  self: string,
  members: readonly string[],
  options: { readonly activeFanout?: number; readonly passiveFanout?: number } = {},
): HyParViewOverlay {
  const peers = [...new Set(members.filter((member) => member !== self))].sort();
  const activeFanout = options.activeFanout ?? Math.min(4, peers.length);
  const passiveFanout = options.passiveFanout ?? peers.length;
  return hyParViewOverlayCarrier.assert(Object.freeze({
    kind: "socializing.mesh-liveness.hyparview-overlay" as const,
    self,
    active: Object.freeze(peers.slice(0, activeFanout)),
    passive: Object.freeze(peers.slice(activeFanout, activeFanout + passiveFanout)),
  })) as HyParViewOverlay;
}

export function plumtreeGossipPlan(overlay: HyParViewOverlay, messageId: string): PlumtreeGossipPlan {
  return plumtreeGossipPlanCarrier.assert(Object.freeze({
    kind: "socializing.mesh-liveness.plumtree-plan" as const,
    messageId,
    root: overlay.self,
    eager: Object.freeze([...overlay.active]),
    lazy: Object.freeze([...overlay.passive]),
  })) as PlumtreeGossipPlan;
}

export function membershipViewMeme(view: MembershipView, witness = `mesh-liveness:${view.observer}:${view.round}`): JsonRecord {
  const payloadCell = cell(
    token(mark("socializing.mesh-liveness")),
    predicateOfClaim(claim(mark("membership-view"))),
    token(mark(view as unknown as JsonValue)),
  );
  return meme(payloadCell, charge(chargeValue("potential"), [[mark(witness)], []])) as unknown as JsonRecord;
}

export function broadcastMembershipView(
  field: Field,
  options: { readonly from: number; readonly to?: number; readonly view: MembershipView; readonly witness?: string },
): Field {
  return broadcastAction.run(field as unknown as JsonValue, {
    from: options.from,
    ...(options.to === undefined ? {} : { to: options.to }),
    meme: membershipViewMeme(options.view, options.witness),
  }) as unknown as Field;
}

export function sameMembershipView(left: MembershipView, right: MembershipView): boolean {
  return canonical(left.state as unknown as JsonValue) === canonical(right.state as unknown as JsonValue);
}

export function livenessStatusName(reading: LivenessReading): string {
  return `${reading.status}:${valueOf(reading.accumulatedCharge).name}`;
}
