/**
 * accounting/topology/market — venue-generic market record-state topology.
 *
 * The market topology is economic record-state: venues list books, orders bid
 * or ask, fills execute, quotes observe, and known owners glue back to generic
 * financial accounts. The market *game* lives in `@emsenn/gaming/market`; this
 * module owns the organizing-scale topology those game/social/computing faces
 * can read.
 *
 * Venue-generic exchange structure: a venue lists books (trading pairs), orders
 * bid or ask on books, fills execute on books, quotes observe books. Venue
 * specializations bind these terms to real chains and exchanges. Accounts, when
 * an order's owner is known, are `./financial.mts` accounts — so a market carrier
 * is a specialization of `FinancialTopologyCarrier` and merges with financial,
 * chain, and ledger carriers.
 *
 * Anti-fetishism law (CLAUDE.md "no free data"; note §1). Evidence enters ONLY by
 * articulating utterances, and a charge is the section of a settling over a
 * society, never a property of a thing. There is no denial: a contrary market
 * fact is its own claim of a contrary predicate — delisted, bid-ended, ask-ended
 * — never a polarity against the original claim.
 *
 * The value-free topology law. Quantities do NOT live in the topology. Prices and
 * sizes ride as exact decimal strings in `MarketProvenance`, carried in this
 * package's `ProvenancedUtterance` structure BESIDE the utterance — provenance is
 * never kernel evidence. Quantities are exact decimals (rendered/parsed at the
 * edge), never floats and never charge on the carrier; the quantitative laws over
 * book data are exact-rational arithmetic in the microstructure/computing readings.
 */
import {
  utterance,
  mark,
  token,
  claim,
  predicateOfClaim,
  sectionOf,
  predicationsFor,
  chargeAtValues,
  type UtteranceCarrier,
  type PredicationPredicate,
  type PredicationTerm,
  type SectionCarrier,
  type SectionEntry,
  type ChargeCarrier,
} from "@emsenn/relating";
import {
  type MemeTopologyFixedPointReadings,
  type SettlementFiltration,
} from "@emsenn/relating";
import { fixedPointReadingsOfUtterances, settleUtterances } from "./settle-utterances.mjs";
import {
  financialAccountTerm,
  type FinancialTopologyCarrier,
} from "./financial.mjs";

export { financialAccountTerm };

export type {
  UtteranceCarrier,
  PredicationTerm as TermInput,
  FinancialTopologyCarrier,
  SectionCarrier,
  SectionEntry,
  ChargeCarrier,
};

const marketTerm = (value: string): PredicationTerm => token(mark(value));
const marketPredicate = (value: string): PredicationPredicate => predicateOfClaim(claim(mark(value)));
const predicateMarkValue = (predicate: PredicationPredicate): unknown => predicate.mark.value;

// ---------- provenance (value-free topology law) ----------

/**
 * The provenance shape market utterances are expected to ride with. All
 * quantities are exact decimal strings, never floats. Prices are stated in the
 * book's quote commodity per one unit of its base commodity. This rides BESIDE
 * the utterance and is never kernel evidence on the carrier.
 */
export interface MarketProvenance {
  readonly source: string;
  readonly timestamp?: string;
  readonly price?: string;
  readonly quantity?: string;
  readonly bid?: string;
  readonly ask?: string;
  readonly last?: string;
}

/** An utterance with its market provenance carried beside it — package
 *  structure, never kernel evidence. */
export interface ProvenancedUtterance {
  readonly kind: "market-topology.provenancedUtterance";
  readonly utterance: UtteranceCarrier;
  readonly provenance: MarketProvenance;
}

/** Pair an utterance with its market provenance. */
export function provenancedUtterance(
  utteranceCarrier: UtteranceCarrier,
  provenance: MarketProvenance,
): ProvenancedUtterance {
  return Object.freeze({
    kind: "market-topology.provenancedUtterance",
    utterance: utteranceCarrier,
    provenance,
  });
}

// ---------- term constructors ----------

/** Namespaced mark for a market venue: "market.venue.<id>" */
export function marketVenueTerm(venueId: string): PredicationTerm {
  return marketTerm(`market.venue.${venueId}`);
}

/** Namespaced mark for a book (trading pair at a venue): "market.book.<venue>.<BASE>/<QUOTE>" */
export function marketBookTerm(venueId: string, baseSymbol: string, quoteSymbol: string): PredicationTerm {
  return marketTerm(`market.book.${venueId}.${baseSymbol}/${quoteSymbol}`);
}

/** Namespaced mark for an order at a venue: "market.order.<venue>.<id>" */
export function marketOrderTerm(venueId: string, orderId: string): PredicationTerm {
  return marketTerm(`market.order.${venueId}.${orderId}`);
}

/** Namespaced mark for a fill (executed trade) at a venue: "market.fill.<venue>.<id>" */
export function marketFillTerm(venueId: string, fillId: string): PredicationTerm {
  return marketTerm(`market.fill.${venueId}.${fillId}`);
}

/** Namespaced mark for a quote observation at a venue: "market.quote.<venue>.<id>" */
export function marketQuoteTerm(venueId: string, quoteId: string): PredicationTerm {
  return marketTerm(`market.quote.${venueId}.${quoteId}`);
}

// ---------- predicate terms ----------

export function marketListsPredicate(): PredicationPredicate { return marketPredicate("market.lists"); }
export function marketDelistedPredicate(): PredicationPredicate { return marketPredicate("market.delisted"); }
export function marketBidsPredicate(): PredicationPredicate { return marketPredicate("market.bids"); }
export function marketBidEndedPredicate(): PredicationPredicate { return marketPredicate("market.bid-ended"); }
export function marketAsksPredicate(): PredicationPredicate { return marketPredicate("market.asks"); }
export function marketAskEndedPredicate(): PredicationPredicate { return marketPredicate("market.ask-ended"); }
export function marketPlacedPredicate(): PredicationPredicate { return marketPredicate("market.placed"); }
export function marketFilledOnPredicate(): PredicationPredicate { return marketPredicate("market.filled-on"); }
export function marketQuotesPredicate(): PredicationPredicate { return marketPredicate("market.quotes"); }

// ---------- utterance constructors ----------
//
// bid/ask = the P/O polarity of the exchange (note §4.2): an order bidding is a
// proponent move, an order asking is an opponent move; a fill is cut-elimination.
// Here those are venue-generic predications; the gaming face lifts them to a CGS.

/** Claim that a venue lists a book. */
export function marketListedUtterance(
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: marketVenueTerm(venueId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }),
    mark(predicateMarkValue(marketListsPredicate())),
  );
}

/** Claim that a venue delisted a book — its own claim, not a denial of the listing. */
export function marketDelistedUtterance(
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: marketVenueTerm(venueId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }),
    mark(predicateMarkValue(marketDelistedPredicate())),
  );
}

/** Claim that an order bids on a book (buy side / proponent polarity). */
export function marketBidUtterance(
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  orderId: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }),
    mark(predicateMarkValue(marketBidsPredicate())),
  );
}

/** Claim that an order's bid on a book ended (filled, cancelled, or expired)
 *  — its own claim, not a denial of the bid. */
export function marketBidEndedUtterance(
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  orderId: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }),
    mark(predicateMarkValue(marketBidEndedPredicate())),
  );
}

/** Claim that an order asks on a book (sell side / opponent polarity). */
export function marketAskUtterance(
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  orderId: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }),
    mark(predicateMarkValue(marketAsksPredicate())),
  );
}

/** Claim that an order's ask on a book ended (filled, cancelled, or expired)
 *  — its own claim, not a denial of the ask. */
export function marketAskEndedUtterance(
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  orderId: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }),
    mark(predicateMarkValue(marketAskEndedPredicate())),
  );
}

/** Claim that an account placed an order (when the owner is known). The subject
 *  is a `./financial.mts` account, gluing market and financial carriers. */
export function marketOrderPlacedUtterance(
  account: string,
  venueId: string,
  orderId: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: financialAccountTerm(account), object: marketOrderTerm(venueId, orderId) }),
    mark(predicateMarkValue(marketPlacedPredicate())),
  );
}

/** Claim that a fill executed on a book. Fills are events; no contrary fact exists. */
export function marketFillUtterance(
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  fillId: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: marketFillTerm(venueId, fillId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }),
    mark(predicateMarkValue(marketFilledOnPredicate())),
  );
}

/** Claim that a quote was observed on a book. Staleness is the reader's judgment, not the carrier's. */
export function marketQuoteUtterance(
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  quoteId: string,
): UtteranceCarrier {
  return utterance(
    mark({ subject: marketQuoteTerm(venueId, quoteId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }),
    mark(predicateMarkValue(marketQuotesPredicate())),
  );
}

// ---------- carrier settlement ----------

/**
 * A settled market topology. Specializes `FinancialTopologyCarrier` (so market
 * carriers compose with financial/chain/ledger carriers) and re-tags `kind` to
 * the market discriminator.
 */
export interface MarketTopologyCarrier extends FinancialTopologyCarrier {
  readonly kind: "market.topology.carrier";
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly _marketTopologyBrand: never;
}

/** Induce a settled MarketTopologyCarrier from an utterance log. */
export function induceMarketTopology(utterances: readonly UtteranceCarrier[]): MarketTopologyCarrier {
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "market.topology.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  }) as MarketTopologyCarrier;
}

/** Extend an existing MarketTopologyCarrier with new utterances. */
export function extendMarketTopology(
  carrier: MarketTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): MarketTopologyCarrier {
  return induceMarketTopology([...carrier.utterances, ...delta]);
}

// ---------- section layer ----------
//
// Market queries on a settled MarketTopologyCarrier. Thin wrappers over the
// generic meme-topology section layer with market term naming. The charge at a
// cell is the section of the settling — read it, never assign it.

const boundaryValue = (value: unknown): unknown => {
  if (typeof value === "object" && value !== null && "kind" in value) {
    if (value.kind === "utterance.token" && "mark" in value) return boundaryValue(value.mark instanceof Object && "value" in value.mark ? value.mark.value : undefined);
    if (value.kind === "predication.predicate" && "mark" in value) return boundaryValue(value.mark instanceof Object && "value" in value.mark ? value.mark.value : undefined);
  }
  if (typeof value === "object" && value !== null && "subject" in value && "object" in value) {
    return { subject: boundaryValue(value.subject), object: boundaryValue(value.object) };
  }
  return value;
};

const sameBoundary = (left: unknown, right: unknown): boolean =>
  JSON.stringify(boundaryValue(left)) === JSON.stringify(boundaryValue(right));

const emptyCharge = (section: SectionCarrier): ChargeCarrier => {
  const subject = token(mark("organizing.accounting.market.absent"));
  const predicate = predicateOfClaim(claim(mark("organizing.accounting.market.absent")));
  return chargeAtValues({ ...section, entries: [] }, subject, predicate);
};

const chargeByBoundary = (section: SectionCarrier, subject: unknown, predicate: unknown): ChargeCarrier =>
  section.entries.find((entry: SectionEntry) =>
    sameBoundary(entry.cell.subject, subject) && sameBoundary(entry.cell.predicate, predicate))?.charge
  ?? emptyCharge(section);

/** Build the knowledge-least section of a MarketTopologyCarrier. */
export function marketKnowledgeSection(carrier: MarketTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.knowledgeLeast);
}

/** Build the truth-least section of a MarketTopologyCarrier. */
export function marketTruthSection(carrier: MarketTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.truthLeast);
}

// ---------- single-cell charge reads ----------

/** Charge at "venue lists book". */
export function marketListedCharge(
  section: SectionCarrier,
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: marketVenueTerm(venueId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketListsPredicate());
}

/** Charge at "venue delisted book" — the contrary claim, its own cell. */
export function marketDelistedCharge(
  section: SectionCarrier,
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: marketVenueTerm(venueId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketDelistedPredicate());
}

/** Charge at "order bids book". */
export function marketBidCharge(
  section: SectionCarrier,
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  orderId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketBidsPredicate());
}

/** Charge at "order's bid on book ended" — the contrary claim, its own cell. */
export function marketBidEndedCharge(
  section: SectionCarrier,
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  orderId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketBidEndedPredicate());
}

/** Charge at "order asks book". */
export function marketAskCharge(
  section: SectionCarrier,
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  orderId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketAsksPredicate());
}

/** Charge at "order's ask on book ended" — the contrary claim, its own cell. */
export function marketAskEndedCharge(
  section: SectionCarrier,
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  orderId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: marketOrderTerm(venueId, orderId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketAskEndedPredicate());
}

/** Charge at "account placed order". */
export function marketPlacedCharge(
  section: SectionCarrier,
  account: string,
  venueId: string,
  orderId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialAccountTerm(account), object: marketOrderTerm(venueId, orderId) }, marketPlacedPredicate());
}

/** Charge at "fill executed on book". */
export function marketFillCharge(
  section: SectionCarrier,
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  fillId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: marketFillTerm(venueId, fillId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketFilledOnPredicate());
}

/** Charge at "quote observed on book". */
export function marketQuoteCharge(
  section: SectionCarrier,
  venueId: string,
  baseSymbol: string,
  quoteSymbol: string,
  quoteId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: marketQuoteTerm(venueId, quoteId), object: marketBookTerm(venueId, baseSymbol, quoteSymbol) }, marketQuotesPredicate());
}

// ---------- multi-entry section reads ----------

/** All predicates claimed of a venue. */
export function marketVenueEntries(section: SectionCarrier, venueId: string): readonly SectionEntry[] {
  return predicationsFor(section, marketVenueTerm(venueId));
}

/** All predicates claimed of an order. */
export function marketOrderEntries(section: SectionCarrier, venueId: string, orderId: string): readonly SectionEntry[] {
  return predicationsFor(section, marketOrderTerm(venueId, orderId));
}

/** All bid entries. */
export function marketAllBidEntries(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, marketBidsPredicate())));
}

/** All ask entries. */
export function marketAllAskEntries(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, marketAsksPredicate())));
}

/** All fill entries. */
export function marketAllFillEntries(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, marketFilledOnPredicate())));
}

/** All quote entries. */
export function marketAllQuoteEntries(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, marketQuotesPredicate())));
}
