/**
 * writing/activitypub — organizing's ACROSS-face standards codec: ActivityPub
 * Server-to-Server (federation). The scale-2 half: moving data between agent-CAMPS.
 *
 * animating owns scale-1: the single agent as an Actor, its Activity↔membrane
 * bridge, its inbox/outbox (Client-to-Server). organizing owns scale-2: delivering
 * those SAME Activities between many Actors across constituent camps — S2S. This is
 * exactly the C2S/S2S split of ActivityPub landing on our scale-1/scale-2 seam.
 *
 * No second ontology: this consumes animating's `Activity` and `Actor` verbatim and
 * adds only DELIVERY — it never redefines the Activity. A camp is a constituent
 * society of Actors (a polity); a federation is the parallel composition `‖` of
 * camps (organizing/federation.schema). Delivering an Activity across the federation
 * is the cross-arena fan-out: route one Actor's outbound Activity to the inboxes of
 * member Actors across camps, preferring a camp's shared inbox when present.
 *
 * Layering: organizing → animating → relating. This is downstream of animating's
 * across face; it imports the scale-1 vocabulary and adds the inter-camp transport.
 * The federation-cohomology reading of WHAT propagates (shared lifts coordination-
 * free / contested tolerated as ⊤ / federationOnly) is organizing's federation math;
 * this brick is the delivery primitive it rides on.
 * See dev/docs/notes/2026-06-25-codecs-on-faces-activitypub-across-scales.md.
 */
import type { JsonValue, ChargeValueName } from "@emsenn/relating";
import { utteranceFromActivity, orderedCollection, grant, delegate, ACTIVITY_JSON, type Activity, type Actor, type OrderedCollection, type Capability } from "@emsenn/animating";
import { consensusClose, majorityClose } from "@emsenn/socializing";
import { federate, type Federation, type SocialBoundary } from "../../organizing.mjs";
import { officeEligibility, type OfficeEligibilityRequest, type EligibilityGap } from "../../authority.mjs";

/** The ActivityStreams 2.0 JSON-LD context (re-stated so this codec needs no JSON-LD
 *  processor — the federation surface emits only the AS2 vocabulary it uses). */
export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams" as const;

/** A camp: a constituent society of member Actors — one polity in the federation.
 *  `sharedInbox`, when present, is the camp's batch delivery endpoint (S2S optimization). */
export interface Camp {
  readonly id: string;
  readonly members: readonly Actor[];
  readonly sharedInbox?: string;
}

/** A Delivery: one Activity routed to a deduplicated set of target inbox IRIs — the
 *  S2S delivery envelope. A plain typed envelope over the carried `Activity` (it nests
 *  an already-carried value, so it is not a re-registered carrier). */
export interface Delivery {
  readonly "@context": typeof ACTIVITYSTREAMS_CONTEXT;
  readonly activity: Activity;
  /** the resolved target inbox IRIs the activity is delivered to (deduplicated). */
  readonly targets: readonly string[];
}

/** Deduplicate while preserving first-seen order. */
function distinct(iris: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const iri of iris) {
    if (iri === "" || seen.has(iri)) continue;
    seen.add(iri);
    kept.push(iri);
  }
  return kept;
}

/**
 * deliver — the S2S delivery to a flat set of recipient Actors: route one Activity to
 * each recipient's inbox. The atomic inter-Actor transport.
 */
export function deliver(activity: Activity, recipients: readonly Actor[]): Delivery {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    activity,
    targets: distinct(recipients.map((actor) => actor.inbox)),
  };
}

/**
 * deliverToCamps — the federation fan-out: route one Activity to member Actors across
 * many camps (the parallel composition `‖` of constituent inboxes). When a camp has a
 * `sharedInbox`, that single endpoint stands in for its members (the S2S shared-inbox
 * optimization); otherwise each member's inbox is targeted. Cross-camp duplicate
 * inboxes (a member belonging to two camps — name-passing) are delivered once.
 */
export function deliverToCamps(activity: Activity, camps: readonly Camp[]): Delivery {
  const targets: string[] = [];
  for (const camp of camps) {
    if (camp.sharedInbox !== undefined && camp.sharedInbox !== "") targets.push(camp.sharedInbox);
    else for (const member of camp.members) targets.push(member.inbox);
  }
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    activity,
    targets: distinct(targets),
  };
}

/** The count of distinct camps an Activity reaches — its federation spread. */
export function reach(delivery: Delivery): number {
  return delivery.targets.length;
}

/** One S2S HTTP request: POST the activity to a remote inbox. */
export interface DeliveryRequest {
  readonly method: "POST";
  readonly url: string;
  readonly contentType: typeof ACTIVITY_JSON;
  readonly body: string;
}

/**
 * deliveryRequests — the LIVE S2S transport (in lib, not a site): project a `Delivery`
 * into the HTTP POST requests that carry the Activity to each target inbox. Pure — like
 * relating's `routeRequest`, it produces the requests; an effectful client (or a site
 * binding) sends them. This is how data actually moves between agent-camps over HTTP.
 */
export function deliveryRequests(delivery: Delivery): readonly DeliveryRequest[] {
  const body = `${JSON.stringify(delivery.activity, null, 2)}\n`;
  return delivery.targets.map((url) => ({ method: "POST" as const, url, contentType: ACTIVITY_JSON, body }));
}

/** Each Activity as a `[actor, claim]` seed pair — the polarity-aware across membrane
 *  reading (Undo crosses as a denial), via animating's scale-1 bridge. */
function membraneSeed(activities: readonly Activity[]): readonly [string, string][] {
  return activities.map((activity) => {
    const u = utteranceFromActivity(activity);
    return [String(u.token.mark.value), String(u.claim.mark.value)] as [string, string];
  });
}

/** One camp's delivered Activities as a SocialBoundary (its socializing/across membrane). */
function campBoundary(activities: readonly Activity[]): SocialBoundary {
  return { socializing: membraneSeed(activities) as unknown as JsonValue };
}

/**
 * federateActivities — read WHAT propagates when camps exchange Activities, via
 * organizing's PROVEN federation math (`federate`, the cross-arena Mayer–Vietoris
 * parallel composition). Each camp's delivered Activities become its across membrane;
 * the existing `federate` then classifies the union: `shared` concerns lift
 * coordination-free, `contested` overlap-disagreement is tolerated as ⊤, and
 * `federationOnly` is the genuine federation-level obligation.
 * `glued`/`coordination` say whether the camps cohere without consensus apparatus.
 *
 * No second ontology: this REUSES `federate` over the Activities-as-membrane — it does
 * not re-author the federation cohomology. It is the bridge that makes S2S delivery
 * federation-AWARE rather than blind fan-out.
 */
export function federateActivities(campActivities: readonly (readonly Activity[])[]): Federation {
  return federate(campActivities.map(campBoundary));
}

// ── membership: how an agent JOINS an agent-camp (the Follow/Accept handshake) ──

/**
 * follow — an agent requests to join a camp: a `Follow` Activity addressed to the
 * camp. The actor is the agent's IRI, the object is the camp's id. The agent sends
 * this to the camp's (shared) inbox.
 */
export function follow(actor: Actor, camp: Camp): Activity {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    type: "Follow",
    actor: actor.id,
    object: camp.id,
    to: [camp.id],
  };
}

/**
 * accept — the camp admits a follower: an `Accept` Activity wrapping the `Follow`.
 * The actor is the camp; the object references the Follow (its follower carried in
 * `content`). Sent back to the follower's inbox completes the handshake.
 */
export function accept(followActivity: Activity, camp: Camp): Activity {
  const follower = followActivity.actor;
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    type: "Accept",
    actor: camp.id,
    object: { type: "Follow", content: follower },
    to: [follower],
  };
}

/**
 * admit — realize the membership the Accept grants: the camp with the follower added
 * as a member (idempotent, deduplicated by Actor id). This is "joining a camp" as
 * state — after this, `deliverToCamps` fans Activities to the new member, and the
 * member's concerns participate in `federateActivities`.
 */
export function admit(camp: Camp, member: Actor): Camp {
  if (camp.members.some((m) => m.id === member.id)) return camp;
  return { ...camp, members: [...camp.members, member] };
}

/** Whether an Actor is already a member of a camp. */
export function isMember(camp: Camp, actorId: string): boolean {
  return camp.members.some((m) => m.id === actorId);
}

// ── socializing-earned features: broadcast and the CRDT merge (∨_k) ──

/** The bare claim an activity carries (object string, else its content/id). */
function activityClaim(object: Activity["object"]): string {
  return typeof object === "string" ? object : object.content ?? object.id ?? "";
}

/**
 * announce — broadcast (socializing's `broadcast`): an Actor re-publishes an existing
 * Activity to an audience — the AS2 `Announce` (boost). The object references the
 * announced Activity; `to` is the audience the broadcast reaches.
 */
export function announce(activity: Activity, by: Actor, audience: readonly string[]): Activity {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    type: "Announce",
    actor: by.id,
    object: { type: activity.type, content: activityClaim(activity.object) },
    to: [...audience],
  };
}

/** A stable merge key for an Activity: its `id` if minted, else `actor|type|claim` —
 *  so an assertion and its `Undo` are DISTINCT keys (both survive the merge). */
function mergeKey(activity: Activity): string {
  if (activity.id !== undefined && activity.id !== "") return activity.id;
  return `${activity.actor}|${activity.type}|${activityClaim(activity.object)}`;
}

/**
 * mergeActivities — the CRDT merge (socializing's `merge` = the ≤_k join ∨_k): combine
 * several camps' Activity collections into one, conflict-free. It is a grow-only-set
 * join — idempotent, commutative, associative — keyed so that an assertion and its
 * `Undo` are BOTH retained (paraconsistent: no witness is dropped). The conflict is
 * not resolved here; it surfaces as ⊤ when the merged collection is read by the across
 * face (`federateActivities`/`communicatingFace`). Returns an AS2 OrderedCollection
 * (reusing animating's builder — no second ontology).
 */
export function mergeActivities(...collections: readonly (readonly Activity[])[]): OrderedCollection {
  const seen = new Set<string>();
  const merged: Activity[] = [];
  for (const collection of collections) {
    for (const activity of collection) {
      const key = mergeKey(activity);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(activity);
    }
  }
  return orderedCollection(merged);
}

// ── authority: who MAY issue capabilities (OCap issuance bound to office eligibility) ──

/** The outcome of an office-bound grant: either the issued capability, or the
 *  eligibility gap that denied it. */
export type GrantOutcome =
  | { readonly granted: Capability }
  | { readonly denied: EligibilityGap };

/**
 * grantByOffice — issue a capability ONLY if the issuer is eligible for the office that
 * authorizes it (organizing's `officeEligibility`). This binds OCap issuance to the
 * authority math: holding the office's required capabilities/authorities is the
 * precondition for minting a new capability. An ineligible issuer is denied with the
 * eligibility `gap` — authority is earned, not asserted.
 */
export function grantByOffice(request: OfficeEligibilityRequest, holder: string, grants: string, id?: string): GrantOutcome {
  const decision = officeEligibility(request);
  if (!decision.eligible) return { denied: decision.gap };
  return { granted: grant(holder, grants, id) };
}

// ── gaming's concurrent strategy (FSym 𝔸 name-passing): concurrent capability exchange ──

/** One capability transfer: a held capability passed to a recipient. */
export interface CapabilityTransfer {
  readonly capability: Capability;
  readonly to: string;
}

/**
 * exchange — concurrent capability exchange across agents (gaming's FSym(𝔸) symmetry):
 * apply many capability delegations SIMULTANEOUSLY — each is name-passing, and because
 * the actions commute under the symmetry the batch is order-independent. Returns each
 * re-held capability and the `Offer` Activity conveying it, ready for `deliver`. The
 * concurrent (not sequential) realization of `delegate`.
 */
export function exchange(transfers: readonly CapabilityTransfer[]): readonly { readonly capability: Capability; readonly activity: Activity }[] {
  return transfers.map((transfer) => delegate(transfer.capability, transfer.to));
}

// ── socializing's office lifecycle → AS2 office holding (invest/relieve/rotate) ──

/** investiture — install an incumbent in an office (socializing's `invest`): an AS2
 *  `Add` of the incumbent to the office collection. The office's authority is what
 *  `grantByOffice` later checks — this is how an Actor comes to hold issuing power. */
export function investiture(office: string, incumbent: string, by: string): Activity {
  return { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Add", actor: by, object: incumbent, target: office };
}

/** vacate — relieve an incumbent of an office (socializing's `relieve`): an AS2 `Remove`. */
export function vacate(office: string, incumbent: string, by: string): Activity {
  return { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Remove", actor: by, object: incumbent, target: office };
}

/**
 * rotateOffice — rotational authority (socializing's `rotate`, the Andean ayllu): the
 * office passes round-robin to the next member of the roster. Returns the next index,
 * who is installed/relieved, and the AS2 `Remove`+`Add` activities that transfer it —
 * authority that circulates rather than concentrates.
 */
export function rotateOffice(office: string, roster: readonly string[], current: number, by: string): {
  readonly next: number; readonly installed: string; readonly relieved: string; readonly activities: readonly Activity[];
} {
  if (roster.length === 0) throw new RangeError("rotateOffice: empty roster");
  const next = (current + 1) % roster.length;
  const relieved = roster[current] ?? roster[0]!;
  const installed = roster[next]!;
  return {
    next, installed, relieved,
    activities: [vacate(office, relieved, by), investiture(office, installed, by)],
  };
}

// ── socializing's consensus mechanisms: converge a plurality of camps on each claim ──

/** A claim's converged decision across the camps that spoke to it. */
export interface ClaimConsensus {
  readonly claim: string;
  /** the consensus value: `potential` = the camps converge to accept; lowered by any dissent. */
  readonly value: ChargeValueName;
  /** whether a simple majority of speaking camps assert the claim. */
  readonly majority: boolean;
}

const isChallenge = (a: Activity): boolean => CHALLENGE_TYPES.has(a.type) || /^\s*(?:not|no|never)\s+/i.test(typeof a.object === "string" ? a.object : a.object.content ?? "");

/**
 * converge — settle a plurality of camps toward consensus on each claim (socializing's
 * `consensusClose` = the truth-MEET ∧_t, strict: any dissent lowers it; and
 * `majorityClose` = simple majority). For each claim, the camps that SPOKE contribute
 * an alignment (`potential` if the camp asserts it, `active` if it challenges/denies);
 * silent camps abstain. The strict consensus and the majority reading are both
 * reported — the H¹/coordination cost is whether they agree. Reuses socializing's
 * proven deciding functions; no second consensus ontology.
 */
export function converge(campActivities: readonly (readonly Activity[])[]): readonly ClaimConsensus[] {
  const alignmentsByClaim = new Map<string, ChargeValueName[]>();
  const order: string[] = [];
  for (const camp of campActivities) {
    // one alignment per camp per claim (the camp's settled stance on it)
    const campStance = new Map<string, ChargeValueName>();
    for (const activity of camp) {
      const claim = activityClaim(activity.object).replace(/^\s*(?:not|no|never)\s+/i, "").trim();
      if (claim === "") continue;
      campStance.set(claim, isChallenge(activity) ? "active" : "potential");
    }
    for (const [claim, stance] of campStance) {
      if (!alignmentsByClaim.has(claim)) { alignmentsByClaim.set(claim, []); order.push(claim); }
      alignmentsByClaim.get(claim)!.push(stance);
    }
  }
  return order.map((claim) => {
    const alignments = alignmentsByClaim.get(claim)!;
    return {
      claim,
      value: consensusClose(alignments).value,
      majority: majorityClose(alignments).value === "potential",
    };
  });
}

// ── communicating's common ground (Stalnaker): the thread's mutually-accepted claims ──

/** AS2 types that CHALLENGE a prior assertion (withdraw it from common ground). */
const CHALLENGE_TYPES: ReadonlySet<string> = new Set(["Undo", "Delete", "Reject"]);

/**
 * commonGround — the conversational common ground of a thread (communicating's
 * grounding: `assertIntoCommonGround`/`challengeCommonGround`): the claims that were
 * asserted and NOT challenged — the propositions the participants mutually accept as
 * the shared context. A challenged claim (an `Undo`/`Delete`/`Reject`, or a denial)
 * drops out: acceptance is defeasible. This is the accumulating shared ground of an
 * AS2 conversation, not a per-actor reading.
 */
export function commonGround(activities: readonly Activity[]): readonly string[] {
  const asserted: string[] = [];
  const assertedSet = new Set<string>();
  const challenged = new Set<string>();
  for (const activity of activities) {
    const claim = activityClaim(activity.object).replace(/^\s*(?:not|no|never)\s+/i, "").trim();
    if (claim === "") continue;
    if (CHALLENGE_TYPES.has(activity.type)) { challenged.add(claim); continue; }
    if (!assertedSet.has(claim)) { assertedSet.add(claim); asserted.push(claim); }
  }
  return asserted.filter((claim) => !challenged.has(claim));
}

/** A name translation between observer frames — V(α) in the discrete (stalkwise) case:
 *  a map from one camp's IRIs/handles to another's. */
export type NameTranslation = Readonly<Record<string, string>>;

/** Apply the translation to one IRI (identity outside the map's domain). */
const xlate = (translation: NameTranslation, iri: string): string => translation[iri] ?? iri;

/**
 * translate — re-frame an Activity from one camp's namespace into another's
 * (socializing's `translate` = the inter-observer functor V(α), discrete case): apply
 * the name translation to the actor and the audience (`to`/`cc`). This is how an
 * Activity authored in one observer frame is carried into another across the
 * federation — name-passing under translation, not a re-authoring of the content.
 */
export function translate(activity: Activity, translation: NameTranslation): Activity {
  return {
    ...activity,
    actor: xlate(translation, activity.actor),
    ...(activity.to === undefined ? {} : { to: activity.to.map((iri) => xlate(translation, iri)) }),
    ...(activity.cc === undefined ? {} : { cc: activity.cc.map((iri) => xlate(translation, iri)) }),
  };
}
