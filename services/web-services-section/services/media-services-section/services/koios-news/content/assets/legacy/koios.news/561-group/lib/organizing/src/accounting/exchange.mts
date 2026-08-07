/**
 * organizing/accounting/exchange — the accounting trade as the linear-logic cut,
 * `⊗ ⊣ ⊸`.
 *
 * Authority: `dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md`
 * §4 stage 2 ("exchange = the cut"): *"A trade is `⊗ ⊣ ⊸` — give X to get Y,
 * resources non-copyable — already present as `predicationFiberLinearFusion` /
 * `predicationFiberLinearResiduum`. As interaction: buyer `Design ⊗` seller
 * `Design^⊥ → Interaction`; bid/ask = P/O polarity; a fill = cut-elimination."*
 * §6 closes the loop: *"Not a gap: exchange-as-`⊗⊣⊸` is already in relating's
 * positing fibers."* So this module builds NO new connective — it composes the
 * commodity fibers (stage 1) with relating's linear logic and gaming's ludics cut.
 *
 * Two readings of the same trade, dual to each other:
 *
 *  1. **The static cut (relating).** A commodity is a charge over a society
 *     (stage 1). "Give X to get Y" is the linear tensor of the two charged
 *     fibers — `predicationFiberLinearFusion(give, get)` — and the residuated
 *     obligation "having given X, I am owed Y" is the linear residuum
 *     `predicationFiberLinearResiduum(give, get)` (`⊸`). Linearity is the
 *     anti-fetishism law made operational: the resources are non-copyable, the
 *     value is the image of a relation, never free data on a thing.
 *  2. **The dynamic cut (gaming).** The buyer's standing is a positive (Proponent)
 *     `Design`, the seller's the dual negative (Opponent) `Design^⊥`; the polarity
 *     ↔ charge bridge is `polarityCharge` (positive ↦ `potential` = bid; negative
 *     ↦ `active` = ask). A FILL is cut-elimination: `interact(bid, ask)` computes
 *     the interaction normal form (the pointwise knowledge-join of the dual
 *     designs), and the SETTLEMENT points — the loci where bid and ask collide
 *     into `⊤` (`stable`) and the play gives up into a deal — are exactly
 *     `interactionReport(bid, ask).daimonLoci`.
 *
 * This is the categorical substrate the market layer (stage 6) reuses: a matched
 * order event is a fill, a resting order is an un-cut design. The module ports no
 * current-`trading` code — exchange-as-cut is the new structure stage 2 calls for.
 *
 * Carriers are bare-`$id` (`organizing/accounting/exchange`,
 * `organizing/accounting/exchange/fill`); each verb
 * is registered once as a relating `action` so `induceBins` projects the whole
 * surface to every transport.
 */
import {
  action,
  claim,
  entitySet,
  jsonResource,
  mark,
  predicateFiber,
  predicateOfClaim,
  predicationFiberLinearFusion,
  predicationFiberLinearResiduum,
  termCoincides,
  token,
  type Action,
  type ChargeValue,
  type EntitySet,
  type JsonRecord,
  type JsonValue,
  type PredicateFiber,
  type PredicationTerm,
} from "@emsenn/relating";
import {
  designFromActs,
  interact,
  interactionReport,
  locusKey,
  polarityCharge,
  positive,
  negative,
  type Design,
  type DesignAct,
} from "@emsenn/gaming/structuring";

import { type Commodity } from "./commodity.mjs";

/** The carrier `$id` of an exchange — the static `⊗ ⊣ ⊸` cut over two commodities. */
export const EXCHANGE_ID = "organizing/accounting/exchange";

/** The `{ $ref }` slot the exchange morphisms reference. */
export const exchangeRef = Object.freeze({ $ref: EXCHANGE_ID });

/** The carrier `$id` of a fill — the cut-elimination normal form of a bid/ask cut. */
export const EXCHANGE_FILL_ID = "organizing/accounting/exchange/fill";

/** The `{ $ref }` slot the fill morphism references. */
export const fillRef = Object.freeze({ $ref: EXCHANGE_FILL_ID });

/**
 * An exchange: "give X to get Y" read as the linear cut over two commodity fibers.
 *
 * `fusion = give ⊗ get` is the resources-consumed tensor; `residuum = give ⊸ get`
 * is the residuated obligation the trade leaves standing. Both are `PredicateFiber`s
 * over relating's positing linear logic — no new connective is introduced.
 */
export interface Exchange {
  readonly kind: "organizing.accounting.exchange";
  readonly give: Commodity;
  readonly get: Commodity;
  readonly fusion: PredicateFiber;
  readonly residuum: PredicateFiber;
}

/**
 * A fill: the cut-elimination of a bid against an ask.
 *
 * `normalForm` is `interact(bid, ask)` — the interaction normal form (a `Design`,
 * the pointwise knowledge-join of the dual designs). `daimonLoci` are the
 * settlement / give-up points: the loci where the two designs collide into `⊤`
 * (`stable`) — where the deal closes — keyed by their locus address.
 */
export interface Fill {
  readonly kind: "organizing.accounting.exchange.fill";
  readonly normalForm: Design;
  readonly daimonLoci: readonly string[];
}

/**
 * Lift one commodity to a single-cell predicate fiber carrying its exchange-value
 * charge on the diagonal. A commodity is a charge over a society (stage 1); the
 * cut connectives act cellwise on these charge fibers, so the commodity's
 * exchange-value charge is what the tensor / residuum read at its own cell.
 */
function commodityFiber(c: Commodity): PredicateFiber {
  const subject: PredicationTerm = token(mark(c.symbol));
  const label = predicateOfClaim(claim(mark("exchanges")));
  const entities: EntitySet<PredicationTerm> = entitySet([subject], termCoincides);
  const read = (s: PredicationTerm, o: PredicationTerm): ChargeValue =>
    termCoincides(s, subject) && termCoincides(o, subject) ? c.exchangeValueCharge : c.useValueCharge;
  return predicateFiber(label, entities, read);
}

/**
 * The static cut `give ⊗ get`: the linear fusion of the two commodity fibers.
 * "Give X to get Y" — the resources are consumed; the tensor is relating's
 * `predicationFiberLinearFusion`, the package's own linear-logic conjunction.
 */
export function exchangeFusion(give: PredicateFiber, get: PredicateFiber): PredicateFiber {
  return predicationFiberLinearFusion(give, get);
}

/**
 * The residuated obligation `give ⊸ get`: the linear residuum of the two fibers.
 * "Having given X, I am owed Y" — the `⊸` of the cut, relating's
 * `predicationFiberLinearResiduum`, the right adjoint of the tensor.
 */
export function exchangeResiduum(give: PredicateFiber, get: PredicateFiber): PredicateFiber {
  return predicationFiberLinearResiduum(give, get);
}

/**
 * Build the exchange `give ⊗ ⊣ ⊸ get` over two commodities: lift each commodity
 * to its charge fiber, then form both the tensor (`fusion`) and the residuum.
 */
export function exchange(give: Commodity, get: Commodity): Exchange {
  const giveFiber = commodityFiber(give);
  const getFiber = commodityFiber(get);
  return Object.freeze({
    kind: "organizing.accounting.exchange" as const,
    give,
    get,
    fusion: exchangeFusion(giveFiber, getFiber),
    residuum: exchangeResiduum(giveFiber, getFiber),
  });
}

/**
 * Fuse a bid (positive / Proponent) and an ask (negative / Opponent) into a single
 * `Design` cut, ready for elimination — `interact(bid, ask)`, the interaction
 * normal form. Polarity ↔ charge is gaming's `polarityCharge`: the positive
 * (`potential`) bid and the negative (`active`) ask are the P/O polarities of the
 * trade, and `interact` joins them at every shared locus. Exposed as the raw
 * combinator the fill verb cites.
 */
export function fuse(bid: Design, ask: Design): Design {
  // Touch the polarity↔charge bridge so the cut is named by the doctrine it formalizes:
  // a bid commits `potential` (positive), an ask `active` (negative); `interact` joins them.
  void polarityCharge(positive());
  void polarityCharge(negative());
  return interact(bid, ask);
}

/**
 * Eliminate the cut: a fill is the interaction normal form of bid against ask,
 * tagged with its settlement loci.
 *
 * `interact(bid, ask)` is the cut-eliminated `Design`; `interactionReport(bid, ask)
 * .daimonLoci` are the `⊤`-collision loci — the give-up points where the deal
 * settles — projected to their locus-address keys for the bare-`$id` carrier.
 */
export function fill(bid: Design, ask: Design): Fill {
  const normalForm = interact(bid, ask);
  const daimonLoci = interactionReport(bid, ask).daimonLoci.map((xi) => locusKey(xi));
  return Object.freeze({
    kind: "organizing.accounting.exchange.fill" as const,
    normalForm,
    daimonLoci: Object.freeze([...daimonLoci]),
  });
}

// — boundary admission helpers (carriers reconstructed from JSON at the action edge) —

const isRecord = (value: JsonValue): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Admit a commodity carrier from args, refusing anything that is not one. */
function admitCommodity(value: JsonValue, slot: string): Commodity {
  if (isRecord(value) && value.kind === "organizing.accounting.commodity") {
    return value as unknown as Commodity;
  }
  throw new TypeError(`exchange: ${slot} must be a commodity carrier (organizing.accounting.commodity)`);
}

/** Admit a design carrier from args, refusing anything that is not one. */
function admitDesign(value: JsonValue, slot: string): Design {
  if (isRecord(value) && value.kind === "game.design") {
    return value as unknown as Design;
  }
  throw new TypeError(`exchange: ${slot} must be a design carrier (game.design)`);
}

/**
 * Admit a bid/ask design from args: either an already-built `game.design` carrier,
 * or an act labelling `{ "<locusKey>": "proponent" | "opponent" | "daimon" | "none" }`
 * that `designFromActs` lifts to charges. The bid defaults to proponent acts, the
 * ask to opponent acts when the act is unspecified, matching their P/O polarity.
 */
function admitSide(value: JsonValue, slot: string, defaultAct: DesignAct): Design {
  if (isRecord(value) && value.kind === "game.design") return value as unknown as Design;
  if (isRecord(value)) {
    const acts = new Map<string, DesignAct>();
    for (const [key, act] of Object.entries(value)) {
      acts.set(key, typeof act === "string" ? (act as DesignAct) : defaultAct);
    }
    return designFromActs(acts);
  }
  throw new TypeError(`exchange: ${slot} must be a design carrier or an act labelling`);
}

/** exchange — build the static `⊗ ⊣ ⊸` cut over a give/get commodity pair. */
export const exchangeAction: Action = action({
  verb: "exchange",
  inputFormat: "json",
  outputFormat: "json",
  options: ["give", "get"],
  summary: "Build the trade as the linear cut give ⊗ ⊣ ⊸ get over two commodity charge fibers.",
  description:
    "Domain: a give commodity carrier x a get commodity carrier. Codomain: an exchange carrier. " +
    "Forms both the linear-fusion tensor (give ⊗ get, resources consumed) and the linear residuum " +
    "(give ⊸ get, the residuated obligation) over relating's positing linear logic. No new connective " +
    "is introduced — exchange-as-cut is already present in the predication fibers (note §6).",
  domainSchema: { give: { $ref: "organizing/accounting/commodity" }, get: { $ref: "organizing/accounting/commodity" } },
  codomainSchema: exchangeRef,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const give = admitCommodity((args.give ?? input) as JsonValue, "give");
    const get = admitCommodity(args.get as JsonValue, "get");
    return jsonResource(exchange(give, get), "exchange");
  },
});

/** fuse — combine a bid (positive) and ask (negative) design into the cut, un-eliminated. */
export const fuseAction: Action = action({
  verb: "fuse",
  inputFormat: "json",
  outputFormat: "json",
  options: ["bid", "ask"],
  summary: "Fuse a bid (positive/Proponent) and ask (negative/Opponent) design into the interaction cut.",
  description:
    "Domain: a bid design carrier x an ask design carrier. Codomain: a design carrier (the interaction " +
    "normal form). The bid commits the positive (potential) polarity, the ask the negative (active); " +
    "interact joins them at every shared locus via the polarityCharge bridge. Cut-elimination proper is fill.",
  domainSchema: { bid: { $ref: "game/design" }, ask: { $ref: "game/design" } },
  codomainSchema: { $ref: "game/design" },
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const bid = admitSide((args.bid ?? input) as JsonValue, "bid", "proponent");
    const ask = admitSide(args.ask as JsonValue, "ask", "opponent");
    return jsonResource(fuse(bid, ask), "design");
  },
});

/** residuate — read the residuated obligation give ⊸ get of an exchange. */
export const residuateAction: Action = action({
  verb: "residuate",
  inputFormat: "json",
  outputFormat: "json",
  options: ["give", "get"],
  summary: "Read the residuated obligation give ⊸ get (the ⊸ of the cut) over a commodity pair.",
  description:
    "Domain: a give commodity carrier x a get commodity carrier. Codomain: a predicate-fiber carrier " +
    "(the residuum). Forms relating's predicationFiberLinearResiduum over the two commodity charge fibers " +
    "— 'having given X, I am owed Y', the right adjoint of the tensor.",
  domainSchema: { give: { $ref: "organizing/accounting/commodity" }, get: { $ref: "organizing/accounting/commodity" } },
  codomainSchema: { $ref: "predication/fiber/predicate" },
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const give = admitCommodity((args.give ?? input) as JsonValue, "give");
    const get = admitCommodity(args.get as JsonValue, "get");
    return jsonResource(exchange(give, get).residuum, "exchange-residuum");
  },
});

/** cut — eliminate the bid/ask cut into a fill (the settlement of the trade). */
export const cutAction: Action = action({
  verb: "cut",
  inputFormat: "json",
  outputFormat: "json",
  options: ["bid", "ask"],
  summary: "Eliminate the bid/ask cut: a fill is interact(bid, ask) tagged with its settlement loci.",
  description:
    "Domain: a bid design carrier x an ask design carrier. Codomain: a fill carrier. The fill's normalForm " +
    "is the cut-eliminated interaction normal form; its daimonLoci are the ⊤-collision (stable) loci where " +
    "bid and ask give up into a deal — the settlement points — from interactionReport(bid, ask).daimonLoci.",
  domainSchema: { bid: { $ref: "game/design" }, ask: { $ref: "game/design" } },
  codomainSchema: fillRef,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const bid = admitSide((args.bid ?? input) as JsonValue, "bid", "proponent");
    const ask = admitSide(args.ask as JsonValue, "ask", "opponent");
    return jsonResource(fill(bid, ask), "exchange-fill");
  },
});

/** The exchange module's verbs: the static cut, its fusion/residuum, and cut-elimination. */
export const exchangeActions: readonly Action[] = Object.freeze([
  exchangeAction,
  fuseAction,
  residuateAction,
  cutAction,
]);
