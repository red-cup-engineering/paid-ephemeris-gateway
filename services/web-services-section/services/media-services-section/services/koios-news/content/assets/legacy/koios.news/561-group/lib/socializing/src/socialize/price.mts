/**
 * socialize/price — price as social consensus.
 *
 * Authority: `dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md`
 * §4 stage 5 ("price = consensus") and §3 ("Marx ≡ Hayek up to valence"). The note,
 * verbatim:
 *
 *   *"Market price = the consensus limit `lim_O V`; bid-ask spread / adverse selection
 *   (Kyle 1985 λ, Glosten–Milgrom) = the H¹ obstruction to consensus; cross-venue
 *   arbitrage = inconsistency (`⊤`) across observers; no-arbitrage = H¹ = 0 = confluence
 *   = unique price (FTAP read socially; EMH weak/semi-strong/strong = three closure
 *   regimes of the information set)."*
 *
 * And §3, the convergence no economist had the language for:
 *
 *   *"Coordination happens behind their backs, through the exchange of their products…
 *   how a society of separate producers coordinates its labor without anyone planning
 *   it" (Marx's exchange-value note) ≡ Hayek's price system as a distributed
 *   knowledge-aggregation mechanism, a catallaxy. These describe the same object —
 *   `socializing`'s CALM consensus, a multi-observer field converging without central
 *   coordination (H¹ = 0 ⟺ coordination-free merge). Hayek reads it as the miracle;
 *   Marx reads it as the alienation/fetish. Our `socializing` is the neutral structure
 *   both are pointing at."*
 *
 * So this module invents NO theory of price. A market price is literally the
 * `@emsenn/socializing` consensus section over a venue-observer field:
 *
 *   - **The market is a Social Field.** Each VENUE is an observer `o ∈ O`. Each venue
 *     carries its PRICED MEME — a relating `meme` over the predication of its quote,
 *     DERIVED from the order-book best bid/ask via microstructure (stage 6), never a
 *     bare number (anti-fetishism: §1 — a price is the image of a predication among
 *     agents, not free data on a thing). The quote's charge encodes its truth
 *     DIRECTION: a venue showing the asset cheap-relative-to-fair commits a `potential`
 *     (bid-side) charge, a venue showing it dear commits an `active` (ask-side) charge.
 *
 *   - **`price = section.components[0].common = lim_O V`.** `convergeAction` reads the
 *     network-sheaf consensus over the observer category `O`: each component's `common`
 *     is the knowledge-MEET `∧ₖ` — exactly the consensus limit `lim_O V`. That meet IS
 *     the market price: the single charge every venue's quote is consistent with.
 *
 *   - **`spread = section.obstruction = H¹`.** The bid-ask spread / adverse selection
 *     (Kyle λ, Glosten–Milgrom) is the H¹ obstruction to gluing the venue-quotes into
 *     one section — the standing disagreement the consensus cannot drain. `glued ⟺
 *     obstruction === 0`.
 *
 *   - **`no-arbitrage ⟺ H¹ = 0`.** Confluence = a unique price. This is the FTAP
 *     (Harrison–Kreps / Pliska) read SOCIALLY: no-arbitrage ⟺ the local quotes extend
 *     to one glued global section. Cross-venue arbitrage is a nonzero H¹ — a CYCLE of
 *     opposed quotes that does not glue.
 *
 *   - **THE SOCIALIZING GOTCHA (§ converge).** Disagreement registers as H¹ ONLY on a
 *     CYCLE of OPPOSED charges. A held contradiction over a TREE of edges still glues
 *     (the component pools to `stable` — both-witnessed common ground). So venues must
 *     disagree in truth DIRECTION (`potential` vs `active`), not merely in numeric
 *     value, for a spread to register. A purely numeric disagreement with the same
 *     truth direction is common ground, not arbitrage — which is correct: two venues
 *     quoting different prices for the same fundamental view are not an arbitrage, an
 *     arbitrage is a CYCLE of opposed (buy-here-sell-there) quotes.
 *
 *   - **`martingalePrice` = the FTAP substrate (`relating` StochasticSettling).** The
 *     equivalent-martingale-measure half of the FTAP is `markovStationaryIsClosureFixpoint`
 *     over `natStochSemiring`: a price process is a martingale ⟺ its measure is
 *     stationary ⟺ it is a fixed point of the stochastic closure — the SAME equation
 *     `advance π = π`. Martingale = stationary = closure fixed point (note §6 port #3).
 *     This is `V`-independent by `four_regime_v_independent`, the same dynamics as the
 *     social consensus above, read on the stochastic value-category.
 *
 * Every verb is registered once as a relating `action` so `induceBins` projects the
 * whole surface to every transport (the ops-manifold doctrine — no second script map).
 */
import {
  action,
  jsonResource,
  markovStationaryIsClosureFixpoint,
  natStochSemiring,
  type Action,
  type JsonRecord,
  type JsonValue,
  type MarkovKernel,
} from "@emsenn/relating";
import { type Natural } from "@emsenn/relating/analysis";
import { admitAction } from "./admit.mjs";
import { convergeAction } from "./converge.mjs";
import { replicaCoverConsensus } from "./glue.mjs";
import { emptyField, type Field as SocialField, type FieldSection as CommonGround } from "./field.mjs";

/** The carrier `$id` of a price consensus — the consensus section read financially. */
export const PRICE_ID = "socializing/price/consensus";

/** The carrier `$id` of the martingale (FTAP / equivalent-martingale-measure) reading. */
export const PRICE_MARTINGALE_ID = "socializing/price/martingale";

/** The `{ $ref }` slot the price morphisms reference. */
const ref = (id: string): JsonRecord => Object.freeze({ $ref: id });

/**
 * A price consensus — the `socializing` consensus section over a venue-observer field,
 * read as the market's price.
 *
 *  - `price` is `section.components[0].common` — the knowledge-meet `∧ₖ` = the consensus
 *    limit `lim_O V`: the single charge every venue's quote is consistent with (the
 *    market price as a derived predication, never bare data).
 *  - `spread` is `section.obstruction` — the H¹ obstruction to gluing the venue-quotes
 *    (the bid-ask spread / adverse selection; Kyle λ, Glosten–Milgrom).
 *  - `glued` is `spread === 0` — confluence: a unique price; no-arbitrage (FTAP socially).
 *  - `pooled` is `section.components[0].pooled` — the merge-fixpoint join `∨ₖ` (the
 *    CRDT-settled accumulation of every venue's witnessed quote).
 *
 * `price` / `pooled` are the reused relating charge carriers (refined as `JsonRecord`,
 * referenced never redefined) the consensus section carries.
 */
export interface PriceConsensus {
  readonly kind: "socializing.price.consensus";
  readonly price: JsonRecord;
  readonly spread: number;
  readonly glued: boolean;
  readonly pooled: JsonRecord;
}

/** The knowledge-bottom charge (⊥ = absurd), the limit/pool of an empty venue field —
 *  no venue has spoken, so there is no priced predication to settle on. */
const BOTTOM_CHARGE: JsonRecord = Object.freeze({
  kind: "bilattice-charge.carrier",
  value: Object.freeze({ kind: "bilattice-charge.value", name: "absurd" }),
  evidence: Object.freeze([Object.freeze([]), Object.freeze([])]),
});

function socialize(member: JsonRecord, field?: SocialField): SocialField {
  const base: JsonValue = (field ?? emptyField()) as unknown as JsonValue;
  return admitAction.run(base, member) as unknown as SocialField;
}

/**
 * Socialize each venue-observer into one Social Field. A venue is an observer `o ∈ O`
 * carrying its PRICED MEME(s) — relating memes over the predication of its quote,
 * DERIVED upstream from the order-book best bid/ask via microstructure (stage 6), each
 * already a `predication.fiber.meme` charge carrier (anti-fetishism: never a bare
 * number; the quote is the image of a predication, and `socialize`'s admit boundary
 * refuses anything that is not a meme).
 *
 * Folds `socialize({ memes }, field)` from the empty field; `admit` grows the observer
 * category `O` to the maximally-connected category over the venues, so every ordered
 * pair of venues is comparable and a CYCLE of opposed quotes (cross-venue arbitrage)
 * can register as H¹. The section is left ungrounded; `priceConsensus` (re)computes it.
 */
export function venueField(
  quotes: readonly { readonly venue: string; readonly memes: readonly JsonRecord[] }[],
): SocialField {
  return quotes.reduce<SocialField>(
    (field, quote) =>
      socialize(
        Object.freeze({ identity: quote.venue, memes: quote.memes as readonly JsonValue[] }) as unknown as JsonRecord,
        field,
      ),
    emptyField() as unknown as SocialField,
  );
}

/** Run `convergeAction` over a venue field and return the grounded consensus section
 *  (the `lim_O V` consensus + its opposition-H¹). Casts the field as `JsonValue` over
 *  the action boundary and back to the typed section. */
function groundedSection(field: SocialField): CommonGround {
  const converged = convergeAction.run(field as unknown as JsonValue, {}) as unknown as SocialField;
  return converged.section as unknown as CommonGround;
}

/**
 * The market price as the `socializing` consensus over the venue field. `convergeAction`
 * computes the network-sheaf consensus; `section.components[0].common` is the
 * knowledge-meet `∧ₖ` = the consensus limit `lim_O V` (the price), `section.obstruction`
 * is the H¹ spread, and `glued ⟺ obstruction === 0` is no-arbitrage / a unique price
 * (FTAP read socially). An empty field has no venue and so no price — the limit and pool
 * are ⊥ (absurd) and the spread is 0 (vacuously glued; nothing to disagree).
 */
export function priceConsensus(field: SocialField): PriceConsensus {
  const section = groundedSection(field);
  const component = section.components[0];
  const spread = section.obstruction;
  return Object.freeze({
    kind: "socializing.price.consensus" as const,
    price: component ? (component.common as unknown as JsonRecord) : BOTTOM_CHARGE,
    spread,
    glued: spread === 0,
    pooled: component ? (component.pooled as unknown as JsonRecord) : BOTTOM_CHARGE,
  });
}

/**
 * The bid-ask spread = the H¹ obstruction = `section.obstruction`. The standing
 * disagreement the consensus cannot drain (Kyle λ, Glosten–Milgrom adverse selection):
 * the opposition-cycle Betti number over the observer comparison graph. Zero ⟺ the
 * venue-quotes glue into one section.
 */
export function spreadObstruction(field: SocialField): number {
  return groundedSection(field).obstruction;
}

/**
 * No-arbitrage ⟺ `spreadObstruction === 0` ⟺ confluence ⟺ a unique price. The FTAP
 * (Harrison–Kreps / Pliska) read socially: the local venue-quotes extend to one glued
 * global section iff there is no cross-venue arbitrage (no CYCLE of opposed quotes). A
 * purely numeric disagreement in the SAME truth direction still glues — that is common
 * ground, not an arbitrage (the socializing gotcha).
 */
export function noArbitrage(field: SocialField): boolean {
  return spreadObstruction(field) === 0;
}

/**
 * The replica-cover reading of one venue's neighbourhood: the Mayer–Vietoris H⁰ glued
 * section and the H¹ obstruction over THAT venue's covering family (the venues it is
 * directly comparable to). Ties the no-arbitrage condition to a local cover rather than
 * the whole graph — the EMH information-set reading: a venue is locally arbitrage-free
 * ⟺ its cover glues (`obstruction === 0`). Exposed as the cover-scoped companion to
 * `priceConsensus`.
 */
export function venueCoverConsensus(
  field: SocialField,
  venue: number,
): ReturnType<typeof replicaCoverConsensus> {
  return replicaCoverConsensus(field as unknown as Parameters<typeof replicaCoverConsensus>[0], venue);
}

/**
 * The equivalent-martingale-measure half of the FTAP, as the `relating` StochasticSettling
 * headline `markovStationaryIsClosureFixpoint` over `natStochSemiring` (exact `Natural`
 * weights — no float). A risk-neutral price process is a MARTINGALE ⟺ its measure `π`
 * is STATIONARY (`advance π = π`) ⟺ `π` is a FIXED POINT of the stochastic closure —
 * the SAME equation. Returns the witness's three readings (`stationary` / `fixpoint` /
 * `equivalent`); `equivalent` is invariantly true (they are one defining equation), the
 * structural identity martingale = stationary = closure fixed point.
 *
 * `V`-independent by `four_regime_v_independent`: this is the same settling dynamics as
 * the social consensus above, read on the stochastic value-category instead of the
 * charge bilattice.
 */
export function martingalePrice(
  K: MarkovKernel<number, Natural>,
  pi: (s: number) => Natural,
): { readonly stationary: boolean; readonly fixpoint: boolean; readonly equivalent: boolean } {
  const witness = markovStationaryIsClosureFixpoint(K, natStochSemiring, pi);
  return Object.freeze({
    stationary: witness.stationary,
    fixpoint: witness.fixpoint,
    equivalent: witness.equivalent,
  });
}

// — boundary admission helpers (carriers reconstructed from JSON at the action edge) —

const isRecord = (value: JsonValue | undefined): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Admit a venue field from the wire: either an already-built `socializing.social-field`
 * carrier, or a `{ quotes: [{ venue, memes }...] }` request that `venueField` socializes.
 * Refuses anything that is neither.
 */
function admitField(input: JsonValue, verb: string): SocialField {
  if (isRecord(input) && input.kind === "socializing.social-field") {
    return input as unknown as SocialField;
  }
  const quotesRaw = isRecord(input) ? input.quotes : input;
  if (!Array.isArray(quotesRaw)) {
    throw new TypeError(`${verb}: expected a social-field carrier or { quotes: [{ venue, memes }...] }`);
  }
  const quotes = quotesRaw.map((item, index) => {
    if (!isRecord(item) || !Array.isArray(item.memes)) {
      throw new TypeError(`${verb}: quotes[${index}] must be a { venue, memes } object (memes = priced meme carriers)`);
    }
    return {
      venue: typeof item.venue === "string" ? item.venue : `venue-${index}`,
      memes: item.memes as readonly JsonRecord[],
    };
  });
  return venueField(quotes);
}

const QUOTES_SCHEMA: JsonRecord = Object.freeze({
  title: "VenueField",
  description:
    "either a social-field carrier, or { quotes: [{ venue, memes }...] } — each venue an observer carrying its priced memes (relating meme carriers derived from the order-book best bid/ask, never bare numbers).",
  type: ["object"],
  properties: Object.freeze({
    quotes: Object.freeze({
      type: "array",
      items: Object.freeze({
        type: "object",
        required: Object.freeze(["memes"]),
        properties: Object.freeze({
          venue: Object.freeze({ type: "string" }),
          memes: Object.freeze({ type: "array", items: ref("predication/fiber/meme") }),
        }),
      }),
    }),
  }),
});

const KERNEL_SCHEMA: JsonRecord = Object.freeze({
  title: "MartingaleRequest",
  description:
    "{ K, pi } — a Markov kernel over the price states and a candidate measure; the FTAP equivalent-martingale-measure substrate (martingale = stationary = stochastic-closure fixed point).",
  type: "object",
  required: Object.freeze(["K", "pi"]),
  properties: Object.freeze({
    K: Object.freeze({ $ref: "settling/markovKernel" }),
    pi: Object.freeze({ type: "object" }),
  }),
});

// ── the price face actions (the four socializing / FTAP verbs) ──────────────────────

/** price — the apex: a venue field → the consensus price (lim_O V), its H¹ spread, glued. */
export const priceAction: Action = action({
  verb: "price",
  inputFormat: "json",
  outputFormat: "json",
  summary:
    "Read the market price as the socializing consensus over a venue-observer field: price = lim_O V (∧ₖ meet), spread = H¹, glued ⟺ no-arbitrage.",
  description:
    "Domain: a venue field — a social-field carrier, or { quotes: [{ venue, memes }...] } (each venue an observer carrying its priced memes, derived from the order-book best bid/ask — never bare numbers). Codomain: a price-consensus carrier. convergeAction computes the network-sheaf consensus: price = section.components[0].common (the knowledge-meet ∧ₖ = the consensus limit lim_O V), spread = section.obstruction (the H¹ bid-ask spread / adverse selection), glued ⟺ spread === 0 (confluence / unique price / FTAP read socially). Disagreement registers as H¹ only on a CYCLE of opposed quotes (venues must disagree in truth DIRECTION, not just numeric value).",
  domainSchema: QUOTES_SCHEMA,
  codomainSchema: ref(PRICE_ID),
  run: (input: unknown): JsonValue =>
    jsonResource(priceConsensus(admitField(jsonResource(input, "price input"), "price")) as unknown as JsonValue, "price-consensus"),
});

/** spread-h1 — the bid-ask spread = the H¹ obstruction to consensus (Kyle λ). */
export const spreadH1Action: Action = action({
  verb: "spread-h1",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the bid-ask spread = the H¹ obstruction to gluing the venue-quotes (adverse selection; Kyle λ, Glosten–Milgrom).",
  description:
    "Domain: a venue field (social-field carrier or { quotes }). Codomain: { spread } — section.obstruction, the opposition-cycle H¹ over the observer comparison graph: the standing disagreement the consensus cannot drain. Zero ⟺ the venue-quotes glue into one section (no-arbitrage).",
  domainSchema: QUOTES_SCHEMA,
  codomainSchema: Object.freeze({ title: "Spread", type: "object", properties: Object.freeze({ spread: Object.freeze({ type: "integer" }) }) }),
  run: (input: unknown): JsonValue =>
    jsonResource(Object.freeze({ spread: spreadObstruction(admitField(jsonResource(input, "spread-h1 input"), "spread-h1")) }) as unknown as JsonValue),
});

/** no-arbitrage — confluence ⟺ H¹ = 0 ⟺ a unique price (FTAP read socially). */
export const noArbitrageAction: Action = action({
  verb: "no-arbitrage",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Decide no-arbitrage ⟺ spread H¹ = 0 ⟺ confluence ⟺ a unique price (the FTAP, read socially).",
  description:
    "Domain: a venue field (social-field carrier or { quotes }). Codomain: { noArbitrage, spread } — noArbitrage ⟺ spreadObstruction === 0: the local venue-quotes extend to one glued global section iff there is no cross-venue arbitrage (no CYCLE of opposed quotes). A purely numeric disagreement in the SAME truth direction still glues — common ground, not an arbitrage.",
  domainSchema: QUOTES_SCHEMA,
  codomainSchema: Object.freeze({
    title: "NoArbitrage",
    type: "object",
    properties: Object.freeze({ noArbitrage: Object.freeze({ type: "boolean" }), spread: Object.freeze({ type: "integer" }) }),
  }),
  run: (input: unknown): JsonValue => {
    const field = admitField(jsonResource(input, "no-arbitrage input"), "no-arbitrage");
    const spread = spreadObstruction(field);
    return jsonResource(Object.freeze({ noArbitrage: spread === 0, spread }) as unknown as JsonValue);
  },
});

/** martingale — the FTAP equivalent-martingale-measure: stationary = closure fixed point. */
export const martingaleAction: Action = action({
  verb: "martingale",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Decide the FTAP equivalent-martingale-measure: a price measure is a martingale ⟺ stationary ⟺ a stochastic-closure fixed point (the same equation).",
  description:
    "Domain: { K, pi } — a Markov kernel over the price states (markovKernel carrier) and a candidate measure π (a map state → Natural weight; exact, no float). Codomain: { stationary, fixpoint, equivalent } — markovStationaryIsClosureFixpoint over natStochSemiring: martingale = stationary (advance π = π) = stochastic-closure fixed point. `equivalent` is invariantly true (one defining equation); V-independent by four_regime_v_independent. NOTE: the kernel/measure are admitted as already-built relating carriers — bare numeric weights are refused upstream by natStochSemiring's Natural.",
  domainSchema: KERNEL_SCHEMA,
  codomainSchema: ref(PRICE_MARTINGALE_ID),
  run: (input: unknown): JsonValue => {
    const record = jsonResource(input, "martingale input");
    if (!isRecord(record) || !isRecord(record.K) || record.K.kind !== "settling.markovKernel") {
      throw new TypeError("martingale: expected { K: <markovKernel carrier>, pi: <measure> }");
    }
    const K = record.K as unknown as MarkovKernel<number, Natural>;
    const piRaw = record.pi;
    if (!isRecord(piRaw)) {
      throw new TypeError("martingale: pi must be a measure record { <state>: <Natural weight> }");
    }
    const states = K.states;
    const pi = (s: number): Natural => {
      const weight = (piRaw as JsonRecord)[String(s)];
      if (!isRecord(weight) || weight.kind !== "exactNumber.natural") {
        throw new TypeError(`martingale: pi[${s}] must be an exactNumber.natural weight (no float)`);
      }
      return weight as unknown as Natural;
    };
    void states;
    return jsonResource(martingalePrice(K, pi) as unknown as JsonValue);
  },
});

/**
 * priceActions — the price face's registered operations, each a cocone leg over the
 * relating boundary. `induceBins` over this list assembles the discovery apex from which
 * CLI / OpenAPI / MCP / web are projected by the one relating dispatcher; this package
 * invents no second transport. The market price (`price`) and its H¹ spread (`spread-h1`)
 * / no-arbitrage (`no-arbitrage`) are the socializing-consensus reading; `martingale` is
 * the FTAP equivalent-martingale-measure substrate (the same settling, on the stochastic
 * value-category).
 */
export const priceActions: readonly Action[] = Object.freeze([
  priceAction,
  spreadH1Action,
  noArbitrageAction,
  martingaleAction,
]);

export type { SocialField, CommonGround };
export type { MarkovKernel } from "@emsenn/relating";
export type { Natural } from "@emsenn/relating/analysis";
