/**
 * accounting/topology/financial — generic financial-entity meme-topology carrier.
 *
 * WAVE-0 ported topology carrier. This module is the value-free spine reused by
 * every later stage's predications: it models *knowledge about* finances as a
 * meme-topology over relating's descent engine (term → predicate → utterance →
 * induce → section → charge), and nothing more. Quantities (price, amount, qty)
 * ride elsewhere as provenance; they are never kernel evidence here, so no money
 * type (`@emsenn/relating/analysis` Rational / GradedRational) is imported into
 * this layer. The topology is the value-free skeleton over which the §4 descent
 * (commodity=charge → exchange=cut → value-form → conservation → price=consensus
 * → market=CGS → valuation → capital=reseed → institution) is hung — see
 * dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md §7
 * ("topology carriers … already the relating idiom; keep, rewire onto faces").
 *
 * Three layers:
 *   term constructors      — namespaced strings for financial entities
 *   utterance constructors — financial relationships claimed as utterances
 *   FinancialTopologyCarrier — financial utterances with their settlement and
 *                              fixed-point readings, plus the section reads on top
 *
 * Denial-free law (the anti-fetishism rule, content/CLAUDE.md): evidence enters
 * ONLY by articulating utterances; there is no denial and no polarity flip. A
 * contrary fact — a closed position, a reversed transfer — is its OWN predicate
 * cell (`closed-position`, `transfer-reversed-to`), an independent claim, never a
 * negative charge aimed at the original claim. Contradiction therefore surfaces
 * only as the bilattice's settled charge over genuinely conflicting utterances,
 * not as a hand-stamped sign.
 *
 * No codec imports; this library models knowledge about finances, not wire
 * encoding. Hive, stock, crypto, and fiat positions are all specializations of
 * the generic model here.
 *
 * Ported VERBATIM from the pre-rebuild src/financial/{financial-topology,
 * financial-section}.mts (already in relating's idiom); only the cross-file
 * package-internal import paths were collapsed into this single module.
 */
import {
  utterance,
  mark,
  token,
  claim,
  predicateOfClaim,
  sectionOf,
  predicationsFor,
  subjectsFor,
  chargeAtValues,
  type UtteranceCarrier,
  type PredicationPredicate,
  type PredicationTerm,
  type MemeTopologyFixedPointReadings,
  type SettlementFiltration,
  type SectionCarrier,
  type SectionEntry,
  type ChargeCarrier,
} from "@emsenn/relating";
import { fixedPointReadingsOfUtterances, settleUtterances } from "./settle-utterances.mjs";

export type { UtteranceCarrier, PredicationTerm as TermInput };
export type { SectionCarrier, SectionEntry, ChargeCarrier };

const financialTerm = (value: string): PredicationTerm => token(mark(value));
const financialPredicate = (value: string): PredicationPredicate => predicateOfClaim(claim(mark(value)));
const predicateMarkValue = (predicate: PredicationPredicate): unknown => predicate.mark.value;

// ---------- term constructors ----------

/** Namespaced mark for a financial entity (person, org, protocol): "financial.entity.<id>" */
export function financialEntityTerm(id: string): PredicationTerm {
  return financialTerm(`financial.entity.${id}`);
}

/** Namespaced mark for a financial account: "financial.account.<id>" */
export function financialAccountTerm(id: string): PredicationTerm {
  return financialTerm(`financial.account.${id}`);
}

/** Namespaced mark for a commodity/currency/token: "financial.commodity.<symbol>" */
export function financialCommodityTerm(symbol: string): PredicationTerm {
  return financialTerm(`financial.commodity.${symbol}`);
}

/** Namespaced mark for a financial position (an account's holding in a commodity): "financial.position.<accountId>.<symbol>" */
export function financialPositionTerm(accountId: string, symbol: string): PredicationTerm {
  return financialTerm(`financial.position.${accountId}.${symbol}`);
}

/** Namespaced mark for a flow between two accounts: "financial.flow.<fromId>.<toId>" */
export function financialFlowTerm(fromId: string, toId: string): PredicationTerm {
  return financialTerm(`financial.flow.${fromId}.${toId}`);
}

// ---------- standard predicate terms ----------

export function holdsPositionPredicate(): PredicationPredicate { return financialPredicate("financial.holds-position"); }
/** Contrary of holds-position: the position is closed. Its own claim, not a denial. */
export function closedPositionPredicate(): PredicationPredicate { return financialPredicate("financial.closed-position"); }
export function denominatedInPredicate(): PredicationPredicate { return financialPredicate("financial.denominated-in"); }
export function ownedByPredicate(): PredicationPredicate { return financialPredicate("financial.owned-by"); }
export function transferredToPredicate(): PredicationPredicate { return financialPredicate("financial.transferred-to"); }
/** Contrary of transferred-to: the transfer was reversed. Its own claim, not a denial. */
export function transferReversedToPredicate(): PredicationPredicate { return financialPredicate("financial.transfer-reversed-to"); }
export function hasExposureToPredicate(): PredicationPredicate { return financialPredicate("financial.has-exposure-to"); }
export function isLiquidPredicate(): PredicationPredicate { return financialPredicate("financial.is-liquid"); }
export function isStakedPredicate(): PredicationPredicate { return financialPredicate("financial.is-staked"); }

// ---------- utterance constructors ----------

/** Claim that an account holds a position in a commodity. */
export function holdingUtterance(accountId: string, symbol: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }),
    mark(predicateMarkValue(holdsPositionPredicate())),
  );
}

/** Claim that an account's position in a commodity is closed. */
export function holdingClosedUtterance(accountId: string, symbol: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }),
    mark(predicateMarkValue(closedPositionPredicate())),
  );
}

/** Claim that an account is denominated in a commodity (its base currency). */
export function denominationUtterance(accountId: string, symbol: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }),
    mark(predicateMarkValue(denominatedInPredicate())),
  );
}

/** Claim that an entity owns an account. */
export function ownershipUtterance(entityId: string, accountId: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialEntityTerm(entityId), object: financialAccountTerm(accountId) }),
    mark(predicateMarkValue(ownedByPredicate())),
  );
}

/** Claim that value flowed from one account to another. */
export function transferUtterance(fromAccountId: string, toAccountId: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialAccountTerm(fromAccountId), object: financialAccountTerm(toAccountId) }),
    mark(predicateMarkValue(transferredToPredicate())),
  );
}

/** Claim that a previously recorded transfer was reversed. */
export function transferReversalUtterance(fromAccountId: string, toAccountId: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialAccountTerm(fromAccountId), object: financialAccountTerm(toAccountId) }),
    mark(predicateMarkValue(transferReversedToPredicate())),
  );
}

/** Claim that an entity has exposure to a commodity (risk, not necessarily holding). */
export function exposureUtterance(entityId: string, symbol: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialEntityTerm(entityId), object: financialCommodityTerm(symbol) }),
    mark(predicateMarkValue(hasExposureToPredicate())),
  );
}

/** Claim that a position is liquid (can be transferred immediately). */
export function liquidPositionUtterance(accountId: string, symbol: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialPositionTerm(accountId, symbol), object: financialCommodityTerm(symbol) }),
    mark(predicateMarkValue(isLiquidPredicate())),
  );
}

/** Claim that a position is staked/locked. */
export function stakedPositionUtterance(accountId: string, symbol: string): UtteranceCarrier {
  return utterance(
    mark({ subject: financialPositionTerm(accountId, symbol), object: financialCommodityTerm(symbol) }),
    mark(predicateMarkValue(isStakedPredicate())),
  );
}

// ---------- carrier settlement ----------

export interface FinancialTopologyCarrier {
  readonly kind: string;
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  /** Contract alias for {@link fixedPointReadings} (the meme-topology fixed-point readings). */
  readonly readings: MemeTopologyFixedPointReadings;
  readonly _financialTopologyBrand: never;
}

/** Settle a log of financial utterances into a FinancialTopologyCarrier. */
export function induceFinancialTopology(utterances: readonly UtteranceCarrier[]): FinancialTopologyCarrier {
  const log = Object.freeze([...utterances]);
  const readings = fixedPointReadingsOfUtterances(log);
  return Object.freeze({
    kind: "financial.topology.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: readings,
    readings,
  }) as FinancialTopologyCarrier;
}

/** Apply a delta of new utterances to an existing carrier, returning a new settled carrier. */
export function extendFinancialTopology(
  carrier: FinancialTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): FinancialTopologyCarrier {
  return induceFinancialTopology([...carrier.utterances, ...delta]);
}

// ---------- section reads (financial queries on a settled carrier) ----------
// Thin wrappers over the generic meme-topology section layer with financial term naming.

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
  const subject = token(mark("trading.absent"));
  const predicate = predicateOfClaim(claim(mark("trading.absent")));
  return chargeAtValues({ ...section, entries: [] }, subject, predicate);
};

const chargeByBoundary = (section: SectionCarrier, subject: unknown, predicate: unknown): ChargeCarrier =>
  section.entries.find((entry: SectionEntry) =>
    sameBoundary(entry.cell.subject, subject) && sameBoundary(entry.cell.predicate, predicate))?.charge
  ?? emptyCharge(section);

/** Build the knowledge-least section of a FinancialTopologyCarrier. */
export function financialKnowledgeSection(carrier: FinancialTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.knowledgeLeast);
}

/** Build the truth-least section of a FinancialTopologyCarrier. */
export function financialTruthSection(carrier: FinancialTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.truthLeast);
}

// ---------- single-cell charge reads ----------

/** Charge at "account holds-position commodity". */
export function holdingCharge(
  section: SectionCarrier,
  accountId: string,
  symbol: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }, holdsPositionPredicate());
}

/** Charge at "account closed-position commodity" — the contrary predicate of holds-position. */
export function closedPositionCharge(
  section: SectionCarrier,
  accountId: string,
  symbol: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }, closedPositionPredicate());
}

/** Charge at "account denominated-in commodity". */
export function denominationCharge(
  section: SectionCarrier,
  accountId: string,
  symbol: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialAccountTerm(accountId), object: financialCommodityTerm(symbol) }, denominatedInPredicate());
}

/** Charge at "entity owned-by account". */
export function ownershipCharge(
  section: SectionCarrier,
  entityId: string,
  accountId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialEntityTerm(entityId), object: financialAccountTerm(accountId) }, ownedByPredicate());
}

/** Charge at "fromAccount transferred-to toAccount". */
export function transferCharge(
  section: SectionCarrier,
  fromAccountId: string,
  toAccountId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialAccountTerm(fromAccountId), object: financialAccountTerm(toAccountId) }, transferredToPredicate());
}

/** Charge at "fromAccount transfer-reversed-to toAccount" — the contrary predicate of transferred-to. */
export function transferReversedCharge(
  section: SectionCarrier,
  fromAccountId: string,
  toAccountId: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialAccountTerm(fromAccountId), object: financialAccountTerm(toAccountId) }, transferReversedToPredicate());
}

/** Charge at "entity has-exposure-to commodity". */
export function exposureCharge(
  section: SectionCarrier,
  entityId: string,
  symbol: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialEntityTerm(entityId), object: financialCommodityTerm(symbol) }, hasExposureToPredicate());
}

/** Charge at "position is-liquid commodity". */
export function liquidCharge(
  section: SectionCarrier,
  accountId: string,
  symbol: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialPositionTerm(accountId, symbol), object: financialCommodityTerm(symbol) }, isLiquidPredicate());
}

/** Charge at "position is-staked commodity". */
export function stakedCharge(
  section: SectionCarrier,
  accountId: string,
  symbol: string,
): ChargeCarrier {
  return chargeByBoundary(section, { subject: financialPositionTerm(accountId, symbol), object: financialCommodityTerm(symbol) }, isStakedPredicate());
}

// ---------- multi-entry section reads ----------

/** All predicates claimed about an account. */
export function financialAccountEntries(section: SectionCarrier, accountId: string): readonly SectionEntry[] {
  const account = financialAccountTerm(accountId);
  return Object.freeze([
    ...predicationsFor(section, account),
    ...section.entries.filter((entry: SectionEntry) => {
      const value = entry.cell.subject.mark.value;
      return typeof value === "object"
        && value !== null
        && "subject" in value
        && sameBoundary(value.subject, account);
    }),
  ]);
}

/** All predicates claimed about an entity. */
export function financialEntityEntries(section: SectionCarrier, entityId: string): readonly SectionEntry[] {
  return predicationsFor(section, financialEntityTerm(entityId));
}

/** All accounts that hold any position (subjects of holds-position). */
export function allHoldingAccountEntries(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, holdsPositionPredicate())));
}

/** All subjects that have transfer flows. */
export function allTransferEntries(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, transferredToPredicate())));
}

/** All accounts with exposure claims. */
export function allExposureEntries(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, hasExposureToPredicate())));
}
