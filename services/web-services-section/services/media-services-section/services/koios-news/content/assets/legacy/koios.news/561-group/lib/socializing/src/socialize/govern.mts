/**
 * govern — socializing's GOVERNANCE reading: the Hohfeldian jural relation, the
 * governance-act thesis, and the kyriarchist ↔ swarm ↔ consensus discipline, all read
 * off the inter-observer structure of the Social Field.
 *
 * Governance is SCALE-2-NATIVE. The corpus's governance thesis (content/_archive
 * lakotaean-governance/questions/what-is-the-theory-of-governance.md) anchors a process
 * π as a governance act iff it jointly satisfies ATTRIBUTION (π is done by a collective C,
 * not a lone member), BINDING (π produces/modifies a normative constraint on a member),
 * and BECOMING (π transitions C's state). All three are scale-2: a collective, a member
 * bound within it, the collective's transition. socializing is the home of C — the
 * observer category O over the Social Field — so the governance act lives here, not in
 * communicating (which carries only the within-agent BINDING illocution: its `illocute`
 * `declaration` force is the constitutive "X counts as Y" speech act, the single-agent
 * binding primitive this reading lifts).
 *
 * Operativity is the bilattice INFORMATION MEET ⊗_k of the three FOUR-valued settlements
 * (the thesis: "operativity = ⊗_k of attribution, binding, becoming"), not a Boolean
 * conjunction — so a gap (⊥, unsettled) is distinguished from a contradiction (⊤,
 * contested), exactly the Belnap-Dunn distinction the corpus's FOUR-enrichment isolates.
 *
 * BINDING is carried by the HOHFELDIAN jural relation (content/_archive
 * .../predicated-governance/objects/jural-relation.md): a directed correlative relation
 * between an active holder and a passive party — claim/duty, privilege/no-right,
 * power/liability, immunity/disability. The correlative `correlate` is the swap of
 * active/passive (the predicate-converse, self-adjoint in both bilattice orders so the
 * standing is preserved) composed with the kind-rename (a predicate-specialization); it
 * is not a new generator. A jural relation is genuinely OFF-DIAGONAL — it relates two
 * distinct observers — so it is socializing's structure, never communicating's.
 *
 * DISCIPLINE is the frame-neutral classification the corpus insists on (content/_archive
 * .../non-hohfeldian-governance-traditions.md: "the math discriminates patterns by their
 * cohomology but does not privilege any"). The Hohfeldian eightfold is one structural
 * option among several; kyriarchist (κύριος-ruler) hierarchy, distributed swarm/rotation,
 * and thick consensus are discriminated by the shape of the power-relation graph over O:
 *   - kyriarchist — power CONCENTRATES: a single dominator holds power over a strict
 *     majority of the other observers AND bears no correlative accountability duty (the
 *     No-Invisible-Power charter rule: "every power has a corresponding duty"). The
 *     dominator face of liberal-ontologizing-as-kyriarchist-governance.
 *   - swarm — power is DISTRIBUTED (no dominator) or ROTATIONAL (the power graph cycles,
 *     authority returns): the stigmergic, field-mediated regime socializing's face reads
 *     as O(N+|L|)-cheap (see ./face.mts SwarmCoordination).
 *   - consensus — no position-altering powers at all; authority is the undirected thick
 *     agreement the network-sheaf consensus already reads (see ./consensus.mts).
 *
 * This consumes relating's bilattice charge algebra (∨_k, ⊗_k, FOUR) and socializing's
 * own observer structure; it re-authors none of it.
 */
import {
  action,
  charge,
  chargeValue,
  jsonResource,
  joinKnowledgeValue,
  meetKnowledgeValue,
  type Action,
  type ChargeValue,
  type ChargeValueName,
  type JsonRecord,
  type JsonValue,
  type UtteranceCarrier,
} from "@emsenn/relating";
import { admitSeed, descend } from "@emsenn/animating";

import { sheafCharges } from "./consensus.mjs";
import { aggregatePreferences, type CollectivePreference, type PreferencePair } from "./preference.mjs";
import { priceConsensus, type PriceConsensus } from "./price.mjs";
import { completeTranslations, ungroundedSection, type Field } from "./field.mjs";

/** The Hohfeldian eightfold — the four ADVANTAGE positions and their four correlatives.
 *  claim/duty, privilege/no-right, power/liability, immunity/disability (jural-relation.md). */
export const JURAL_KINDS = Object.freeze([
  "claim",
  "duty",
  "privilege",
  "no-right",
  "power",
  "liability",
  "immunity",
  "disability",
] as const);
export type JuralKind = typeof JURAL_KINDS[number];

/** Hohfeld's correlative table: the passive kind paired with each active kind. The pairing
 *  is an involution (correlate ∘ correlate = id). */
const CORRELATIVE: Readonly<Record<JuralKind, JuralKind>> = Object.freeze({
  claim: "duty",
  duty: "claim",
  privilege: "no-right",
  "no-right": "privilege",
  power: "liability",
  liability: "power",
  immunity: "disability",
  disability: "immunity",
});

/** The correlative of a Hohfeldian kind (power ↔ liability, duty ↔ claim, …). Involutive. */
export function correlativeKind(kind: JuralKind): JuralKind {
  return CORRELATIVE[kind];
}

/**
 * A single Hohfeldian jural relation between two observers: a directed correlative
 * normative relation, FOUR-valued in its existence (jural-relation.md "Bilattice values on
 * jural-relation cells": t asserted, f denied, ⊥ no information, ⊤ contradictory).
 */
export interface JuralRelation {
  /** the Hohfeldian kind (claim/duty/privilege/no-right/power/liability/immunity/disability). */
  readonly kind: JuralKind;
  /** the agent in the ACTIVE position (the power-wielder, duty-bearer, privilege/immunity-holder). */
  readonly active: string;
  /** the agent in the PASSIVE (correlative) position. */
  readonly passive: string;
  /** the action / substrate operation the relation regards (Hohfeld's scope-action X). */
  readonly scope: string;
  /** the FOUR-valued standing of the relation's EXISTENCE: `potential` asserted (t),
   *  `active` denied (f), `stable` contradicted (⊤ — both asserted and denied), `absurd`
   *  no information (⊥). */
  readonly standing: ChargeValueName;
}

/**
 * The CORRELATIVE of a jural relation: swap active and passive parties (the
 * predicate-converse — self-adjoint in both bilattice orders, so the standing is
 * preserved) and rename the kind to its correlative (a predicate-specialization). Per
 * jural-relation.md this factors through existing predicate-category generators; it is not
 * a new generator. Involutive: `correlate(correlate(r))` is `r`.
 */
export function correlate(relation: JuralRelation): JuralRelation {
  return Object.freeze({
    kind: correlativeKind(relation.kind),
    active: relation.passive,
    passive: relation.active,
    scope: relation.scope,
    standing: relation.standing,
  });
}

/** The governance DISCIPLINE — which structural tooling the polity makes primary, read off
 *  the power-relation graph over O. Frame-neutral: discriminated by graph shape, not privileged. */
export type GovernanceDiscipline = "kyriarchist" | "swarm" | "consensus" | "ungoverned";

/**
 * socializing's GOVERNANCE reading over an inter-agent membrane — the governance act
 * thesis (attribution ⊗_k binding ⊗_k becoming) plus the discipline classification.
 */
export interface Governance {
  readonly kind: "socializing.governance";
  /** |O| — the distinct observers named as an active holder or passive party of some relation. */
  readonly observers: number;
  /** the canonical jural relations (one per (kind, active, passive, scope) cell, standing pooled ∨_k). */
  readonly relations: readonly JuralRelation[];
  /** the correlative dual of each relation (the passive-side view of the same jural fact). */
  readonly correlatives: readonly JuralRelation[];
  /** the number of held `power`-kind relations (potential or contradicted) — the position-altering capacity. */
  readonly powers: number;
  /** the DOMINION of the strongest holder: the count of distinct parties one observer holds power over. */
  readonly dominion: number;
  /** dominion / (|O|−1) ∈ [0,1] — the share of the other observers a single holder dominates (0 for |O|≤1). */
  readonly concentration: number;
  /** held power relations whose holder bears NO correlative accountability duty (the
   *  No-Invisible-Power rule: "every power has a corresponding duty"). The unaccountable powers. */
  readonly accountabilityGap: number;
  /** the power graph has a directed CYCLE — authority RETURNS (rotational/recurrent-practice authority). */
  readonly rotational: boolean;
  /** the H¹ obstruction of the binding-disagreement graph over O (network-sheaf consensus on the
   *  observers' pooled jural standing) — a cycle of holders who assert vs deny bindings; 0 ⟺ glues. */
  readonly obstruction: number;
  /** held jural cells that pooled to ⊤ stable — contradictory bindings (both asserted and denied). */
  readonly contested: number;
  /** the discipline the power-relation graph realizes. */
  readonly discipline: GovernanceDiscipline;
  /** ATTRIBUTION settlement ∈ FOUR: is the act done by a COLLECTIVE? `potential` iff ≥2 observers
   *  (a plurality, not the agentive singleton); `absurd` iff none. */
  readonly attribution: ChargeValueName;
  /** BINDING settlement ∈ FOUR: the ∨_k aggregate over the relations' standings — what the
   *  collective binds. `absurd` if nothing is bound, `stable` if a binding is contradicted. */
  readonly binding: ChargeValueName;
  /** BECOMING settlement ∈ FOUR: can the collective TRANSITION? `potential` iff the bindings are
   *  coherent and glue (relations exist, no contested cell, obstruction 0); `absurd` (a ⊥ gap) iff
   *  there is nothing to transition OR a contradiction/obstruction blocks the transition from
   *  settling — so the ⊗_k meet drops operativity to a gap exactly when the becoming has not settled. */
  readonly becoming: ChargeValueName;
  /** OPERATIVITY = attribution ⊗_k binding ⊗_k becoming — the information-meet of the three
   *  settlements (the governance thesis). `potential` operative, `absurd` a gap (some part unsettled),
   *  `stable` contested, `active` refused. */
  readonly operativity: ChargeValueName;
}

/** One pairwise vote normalized to the canonical pair a < b. */
interface PreferenceVote {
  readonly voter: string;
  readonly a: string;
  readonly b: string;
  readonly canonical: boolean;
}

/** The proof receipt attached to each market-settled cell. */
export interface MarketConsensusProof {
  readonly spreadH1Zero: boolean;
  readonly noArbitrageIffH1Zero: boolean;
  readonly coherentConsensusIffH1Zero: boolean;
  readonly noArbitrageIffCoherentConsensus: boolean;
}

/** One preference cell settled as a market: equilibrium price, H1 spread, and decision. */
export interface MarketDecisionCell {
  readonly a: string;
  readonly b: string;
  readonly aggregateStanding: ChargeValueName;
  readonly aggregateWinner: PreferencePair["winner"];
  readonly equilibrium: JsonRecord;
  readonly pooled: JsonRecord;
  readonly decision: PreferencePair["winner"] | "contested";
  readonly spreadH1: number;
  readonly coordinationCost: number;
  readonly noArbitrage: boolean;
  readonly coherentConsensus: boolean;
  readonly contestedCell: boolean;
  readonly proof: MarketConsensusProof;
}

/** A governance decision settled by the price/no-arbitrage/H1 market reading. */
export interface MarketSettledGovernance {
  readonly kind: "socializing.market-governance";
  readonly preference: CollectivePreference;
  readonly cells: readonly MarketDecisionCell[];
  readonly decided: number;
  readonly contested: number;
  readonly coordinationCost: number;
  readonly noArbitrage: boolean;
  readonly coherentConsensus: boolean;
}

/** Parse one membrane utterance as a jural relation: token = the active holder; claim =
 *  `kind>passive>scope` (scope optional). A leading negation marker denies the relation
 *  (standing `active`); otherwise it is asserted (`potential`). Returns null if the claim is
 *  not a recognized jural kind. */
function parseJural(token: unknown, claimValue: unknown): JuralRelation | null {
  if (typeof token !== "string" || typeof claimValue !== "string") return null;
  const raw = claimValue.trim();
  const denied = /^(not|no|never)\b\s*/i.test(raw) || /^[¬!-]\s*/.test(raw);
  const body = raw.replace(/^(not|no|never)\b\s*/i, "").replace(/^[¬!-]\s*/, "").trim();
  const parts = body.split(">").map((part) => part.trim());
  const kind = parts[0];
  const passive = parts[1];
  if (kind === undefined || passive === undefined || passive === "") return null;
  if (!(JURAL_KINDS as readonly string[]).includes(kind)) return null;
  const active = token.trim();
  if (active === "") return null;
  return Object.freeze({
    kind: kind as JuralKind,
    active,
    passive,
    scope: parts[2] ?? "",
    standing: (denied ? "active" : "potential") as ChargeValueName,
  });
}

function parsePreferenceVote(tokenValue: unknown, claimValue: unknown): PreferenceVote | null {
  if (typeof tokenValue !== "string" || typeof claimValue !== "string") return null;
  const i = claimValue.indexOf(">");
  if (i < 0) return null;
  const hi = claimValue.slice(0, i).trim();
  const lo = claimValue.slice(i + 1).trim();
  const voter = tokenValue.trim();
  if (hi === "" || lo === "" || voter === "") return null;
  const [a, b] = hi < lo ? [hi, lo] : [lo, hi];
  return Object.freeze({ voter, a, b, canonical: hi === a });
}

const preferenceCellKey = (a: string, b: string): string => `${a}\u0000${b}`;

const cellKey = (relation: JuralRelation): string =>
  `${relation.kind}|${relation.active}|${relation.passive}|${relation.scope}`;

/** Whether a directed edge set has a directed cycle (DFS three-colouring) — the rotational test. */
function hasCycle(nodes: readonly string[], edges: ReadonlyMap<string, readonly string[]>): boolean {
  const colour = new Map<string, 0 | 1 | 2>();
  const visit = (node: string): boolean => {
    colour.set(node, 1);
    for (const next of edges.get(node) ?? []) {
      const c = colour.get(next) ?? 0;
      if (c === 1) return true;
      if (c === 0 && visit(next)) return true;
    }
    colour.set(node, 2);
    return false;
  };
  for (const node of nodes) if ((colour.get(node) ?? 0) === 0 && visit(node)) return true;
  return false;
}

/**
 * governance — read a society's GOVERNANCE off an inter-agent membrane of Hohfeldian jural
 * claims (each `holder|kind>passive>scope`). Pools each (kind, active, passive, scope) cell's
 * standing along ≤_k (a denied + asserted cell settling to ⊤ contested), reads the governance
 * act thesis (attribution ⊗_k binding ⊗_k becoming), and classifies the discipline by the
 * shape of the power-relation graph over the observers.
 */
export function governance(membrane: readonly UtteranceCarrier[]): Governance {
  const pooled = new Map<string, { relation: JuralRelation; standing: ChargeValue }>();
  const observers = new Set<string>();
  for (const carrier of membrane) {
    const relation = parseJural(carrier.token.mark.value, carrier.claim.mark.value);
    if (relation === null) continue;
    observers.add(relation.active);
    observers.add(relation.passive);
    const key = cellKey(relation);
    const side = chargeValue(relation.standing);
    const prior = pooled.get(key);
    pooled.set(key, {
      relation,
      standing: prior === undefined ? side : joinKnowledgeValue(prior.standing, side),
    });
  }

  const relations: JuralRelation[] = [];
  let contested = 0;
  for (const { relation, standing } of pooled.values()) {
    const settled = Object.freeze({ ...relation, standing: standing.name });
    relations.push(settled);
    if (standing.name === "stable") contested += 1;
  }
  relations.sort((left, right) => cellKey(left).localeCompare(cellKey(right)));
  const correlatives = Object.freeze(relations.map(correlate));

  // The power-relation graph over O — held (asserted-or-contested, not denied) power edges active → passive.
  const heldPowers = relations.filter((relation) => relation.kind === "power" && relation.standing !== "active" && relation.standing !== "absurd");
  const powerEdges = new Map<string, string[]>();
  const dominionOf = new Map<string, Set<string>>();
  for (const power of heldPowers) {
    powerEdges.set(power.active, [...(powerEdges.get(power.active) ?? []), power.passive]);
    const reach = dominionOf.get(power.active) ?? new Set<string>();
    reach.add(power.passive);
    dominionOf.set(power.active, reach);
  }
  // Holders bearing at least one duty — the accountable holders (No-Invisible-Power rule).
  const dutyHolders = new Set<string>(relations.filter((relation) => relation.kind === "duty" && relation.standing !== "active").map((relation) => relation.active));
  const accountabilityGap = heldPowers.filter((power) => !dutyHolders.has(power.active)).length;

  let dominator = "";
  let dominion = 0;
  for (const [holder, reach] of dominionOf) {
    if (reach.size > dominion) {
      dominion = reach.size;
      dominator = holder;
    }
  }
  const observerCount = observers.size;
  const concentration = observerCount > 1 ? dominion / (observerCount - 1) : 0;
  const rotational = hasCycle([...observers], powerEdges);
  const dominatorAccountable = dominator !== "" && dutyHolders.has(dominator);

  // The discipline: discriminated by the power-graph shape, not privileged.
  let discipline: GovernanceDiscipline;
  if (relations.length === 0) {
    discipline = "ungoverned";
  } else if (heldPowers.length === 0) {
    // no position-altering powers — authority is undirected thick agreement.
    discipline = "consensus";
  } else if (observerCount >= 2 && dominion > (observerCount - 1) / 2 && !dominatorAccountable) {
    // one dominator over a strict majority of the others, bearing no accountability duty (κύριος).
    discipline = "kyriarchist";
  } else {
    // powers exist but no unaccountable dominator — distributed or rotational authority.
    discipline = "swarm";
  }

  // The binding-disagreement obstruction: pool each observer's active-side standing and read the
  // network-sheaf H¹ over O (consuming socializing's own consensus law, not re-authoring it).
  const observerOrder = [...observers];
  const observerStanding = observerOrder.map((name) => {
    const own = relations.filter((relation) => relation.active === name);
    return own.reduce<ChargeValue>((accumulated, relation) => joinKnowledgeValue(accumulated, chargeValue(relation.standing)), chargeValue("absurd"));
  });
  const obstruction = observerOrder.length === 0
    ? 0
    : sheafCharges(observerStanding.map((value) => charge(value))).obstruction;

  // The governance act thesis — three FOUR-valued settlements, operativity = their ⊗_k meet.
  const attribution: ChargeValueName = observerCount >= 2 ? "potential" : "absurd";
  const binding: ChargeValueName = relations.reduce<ChargeValue>(
    (accumulated, relation) => joinKnowledgeValue(accumulated, chargeValue(relation.standing)),
    chargeValue("absurd"),
  ).name;
  const becoming: ChargeValueName = relations.length > 0 && contested === 0 && obstruction === 0
    ? "potential"
    : "absurd";
  const operativity = meetKnowledgeValue(
    meetKnowledgeValue(chargeValue(attribution), chargeValue(binding)),
    chargeValue(becoming),
  ).name;

  return Object.freeze({
    kind: "socializing.governance" as const,
    observers: observerCount,
    relations: Object.freeze(relations),
    correlatives,
    powers: heldPowers.length,
    dominion,
    concentration,
    accountabilityGap,
    rotational,
    obstruction,
    contested,
    discipline,
    attribution,
    binding,
    becoming,
    operativity,
  });
}

function voteMeme(pair: PreferencePair, vote: PreferenceVote): JsonRecord {
  const standing: ChargeValueName = vote.canonical ? "potential" : "active";
  return Object.freeze({
    kind: "predication.fiber.meme" as const,
    subject: Object.freeze({ kind: "socializing.market.preference-cell" as const, a: pair.a, b: pair.b }),
    predicate: Object.freeze({ kind: "socializing.market.prefers" as const, direction: vote.canonical ? "a>b" : "b>a" }),
    charge: charge(chargeValue(standing)) as unknown as JsonRecord,
  });
}

function marketField(pair: PreferencePair, votes: readonly PreferenceVote[]): Field {
  const members = votes.map((vote) => Object.freeze({
    kind: "socializing.member" as const,
    agent: Object.freeze({
      kind: "animating.agent" as const,
      identity: vote.voter,
    }),
    memes: Object.freeze([voteMeme(pair, vote)]),
  }));
  return Object.freeze({
    kind: "socializing.social-field" as const,
    members: Object.freeze(members),
    base: Object.freeze({
      kind: "socializing.social-base" as const,
      translations: completeTranslations(members.length),
    }),
    section: ungroundedSection(),
  });
}

function decisionFromMarket(pair: PreferencePair, market: PriceConsensus): MarketDecisionCell["decision"] {
  if (!market.glued) return "contested";
  const value = (market.price.value as { readonly name?: unknown } | undefined)?.name;
  if (value === "potential") return "a";
  if (value === "active") return "b";
  return pair.winner;
}

/**
 * decideByMarket - futarchic governance over pairwise preferences.
 *
 * The ordinary aggregate-preferences reading supplies the preference cells. Each cell is
 * then re-read as a market: voters are venues, their pairwise stance is a priced meme,
 * priceConsensus computes the martingale fixed point, and the residual spread-H1 is the
 * explicit coordination cost of that cell. The local proof receipt is the built law:
 * no-arbitrage iff H1 = 0 iff coherent consensus.
 */
export function decideByMarket(membrane: readonly UtteranceCarrier[]): MarketSettledGovernance {
  const preference = aggregatePreferences(membrane);
  const votesByPair = new Map<string, PreferenceVote[]>();
  for (const carrier of membrane) {
    const vote = parsePreferenceVote(carrier.token.mark.value, carrier.claim.mark.value);
    if (vote === null) continue;
    const key = preferenceCellKey(vote.a, vote.b);
    votesByPair.set(key, [...(votesByPair.get(key) ?? []), vote]);
  }

  const cells = preference.pairs.map((pair): MarketDecisionCell => {
    const market = priceConsensus(marketField(pair, votesByPair.get(preferenceCellKey(pair.a, pair.b)) ?? []));
    const spreadH1Zero = market.spread === 0;
    const coherentConsensus = market.glued && spreadH1Zero;
    const noArbitrage = market.glued;
    const proof: MarketConsensusProof = Object.freeze({
      spreadH1Zero,
      noArbitrageIffH1Zero: noArbitrage === spreadH1Zero,
      coherentConsensusIffH1Zero: coherentConsensus === spreadH1Zero,
      noArbitrageIffCoherentConsensus: noArbitrage === coherentConsensus,
    });
    return Object.freeze({
      a: pair.a,
      b: pair.b,
      aggregateStanding: pair.standing,
      aggregateWinner: pair.winner,
      equilibrium: market.price,
      pooled: market.pooled,
      decision: decisionFromMarket(pair, market),
      spreadH1: market.spread,
      coordinationCost: market.spread,
      noArbitrage,
      coherentConsensus,
      contestedCell: pair.winner === "incomparable" || market.spread > 0,
      proof,
    });
  });
  const coordinationCost = cells.reduce((sum, cell) => sum + cell.coordinationCost, 0);
  return Object.freeze({
    kind: "socializing.market-governance" as const,
    preference,
    cells: Object.freeze(cells),
    decided: cells.filter((cell) => cell.decision === "a" || cell.decision === "b").length,
    contested: cells.filter((cell) => cell.contestedCell).length,
    coordinationCost,
    noArbitrage: cells.every((cell) => cell.noArbitrage),
    coherentConsensus: cells.every((cell) => cell.coherentConsensus),
  });
}

const GOVERNANCE_SCHEMA: JsonRecord = Object.freeze({
  title: "Governance",
  type: "object",
  description:
    "the society's governance read off Hohfeldian jural relations over the observer category O: the canonical relations and their correlatives, the power-concentration (dominion/concentration/accountabilityGap/rotational), the discipline (kyriarchist/swarm/consensus/ungoverned, discriminated by power-graph shape), and the governance-act thesis — attribution ⊗_k binding ⊗_k becoming = operativity, the bilattice information-meet of the three FOUR-valued settlements.",
});

/** govern — the governance reading: read a society's Hohfeldian jural relations, the governance
 *  act thesis, and the discipline (kyriarchist/swarm/consensus) off an inter-agent membrane. */
export const governAction: Action = action({
  verb: "govern",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a society's governance — Hohfeldian jural relations, the attribution⊗binding⊗becoming act thesis, and the kyriarchist/swarm/consensus discipline — off an inter-agent membrane.",
  description:
    "Domain: an inter-agent membrane — newline `holder|kind>passive>scope` lines (each a Hohfeldian jural claim; a leading negation denies the relation), or a JSON array of such items. Codomain: socializing/governance. BINDING is the Hohfeldian jural relation (claim/duty, privilege/no-right, power/liability, immunity/disability), correlative by the active/passive predicate-converse + kind-rename. DISCIPLINE is discriminated frame-neutrally by the power-relation graph: kyriarchist (a dominator over a strict majority, bearing no accountability duty), swarm (distributed/rotational authority), consensus (no position-altering powers). OPERATIVITY = attribution ⊗_k binding ⊗_k becoming, the bilattice information-meet of the three FOUR-valued governance-thesis settlements (a gap ⊥ distinguished from a contradiction ⊤). Grounded in lakotaean-governance/what-is-the-theory-of-governance.md, jural-relation.md, and non-hohfeldian-governance-traditions.md.",
  domainSchema: Object.freeze({ type: ["string", "array"] }),
  codomainSchema: GOVERNANCE_SCHEMA,
  run: (input: unknown): JsonValue =>
    jsonResource(governance(descend(admitSeed(input as JsonValue)).utterances) as unknown as JsonValue, "governance"),
});

const MARKET_GOVERNANCE_SCHEMA: JsonRecord = Object.freeze({
  title: "MarketSettledGovernance",
  type: "object",
  description:
    "futarchic governance over aggregate-preferences: each preference cell is settled by the price/no-arbitrage market reading; equilibrium is the decision, spreadH1 is the residual coordination cost, and the proof receipt states no-arbitrage iff H1=0 iff coherent consensus.",
});

/** decide-by-market - aggregate preferences, then settle each cell by no-arbitrage price consensus. */
export const decideByMarketAction: Action = action({
  verb: "decide-by-market",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Settle collective preferences by market consensus: equilibrium is the decision, residual spread-H1 is the priced coordination premium.",
  description:
    "Domain: an inter-agent preference membrane — newline `voter|X>Y` lines, or the same JSON forms accepted by aggregate-preferences. Codomain: socializing/market-governance. The reading first runs aggregate-preferences, then treats each pairwise cell as a market whose voters are venues carrying priced preference memes. priceConsensus supplies the martingale fixed point, no-arbitrage is spread-H1 = 0, and every residual H1 is reported as the coordination cost of the contested cell.",
  domainSchema: Object.freeze({ type: ["string", "array"] }),
  codomainSchema: MARKET_GOVERNANCE_SCHEMA,
  run: (input: unknown): JsonValue =>
    jsonResource(decideByMarket(descend(admitSeed(input as JsonValue)).utterances) as unknown as JsonValue, "market-governance"),
});
