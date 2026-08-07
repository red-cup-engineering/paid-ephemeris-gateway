/**
 * @emsenn/organizing/accounting/topology/ledger — double-entry bookkeeping as a meme-topology carrier.
 *
 * Ported (wave-0) from the current `src/ledger/ledger-topology.mts` +
 * `src/ledger/ledger-section.mts`, folded onto the rebuilt `topology/financial.mts`
 * base. This specializes the financial-topology carrier for the double-entry
 * accounting domain (authority note §4 stage 4 — "conservation = double-entry":
 * every debit a credit, the articulation is conserved), keeping the carrier a
 * settled meme-topology over articulated utterances:
 *
 *   term constructors      — namespaced marks for ledger accounts / transactions /
 *                            commodities / tree roots
 *   utterance constructors — the double-entry conventions claimed as utterances
 *                            (debit-/credit-normal balance, open/closed, sub-account,
 *                            transaction participation, reconciled)
 *   LedgerTopologyCarrier  — a FinancialTopologyCarrier specialized to the ledger
 *                            domain, carrying its settlement filtration and the
 *                            meme-topology fixed-point readings
 *   section readers        — the knowledge-/truth-least sections and per-cell
 *                            charge / per-subject entry queries on them
 *
 * Anti-fetishism law (authority note §1; CLAUDE.md "no free data past Mark"):
 * a ledger fact is never primitive data on the carrier. An account's normal
 * balance, its open/closed standing, a posting's reconciliation — each is the
 * settled image of a predication among agents, read back as a ChargeValue from
 * the section, never stored as a free field. Evidence enters only by articulating
 * utterances; there is no denial. A *closed* account is its own claim of the
 * contrary predicate (`is-closed`), never a polarity against `is-open`; this is
 * what lets `institution/index` read a Desk's H¹ (the unbalanced/unconserved
 * obstruction) directly off the booked accounts via `debitNormalUtterance`.
 *
 * Exact money and the conservation (every-debit-a-credit ⟺ ker ∂) live in
 * `@emsenn/relating/analysis` (Rational + conservation); they are consumed by the
 * postings/desk layer, not here — this module models *knowledge about* a ledger's
 * structure, not the amounts. No codec imports: use `@emsenn/computing-with-ledgers`
 * to parse beancount/hledger text into entries at the observe edge, then build
 * utterances from those entries.
 */
import {
  utterance,
  mark,
  token,
  claim,
  predicateOfClaim,
  sectionOf,
  predicationsFor,
  valueOf,
  bottom,
  type UtteranceCarrier,
  type PredicationPredicate,
  type PredicationTerm,
  type ChargeValue,
  type SectionCarrier,
  type SectionEntry,
} from "@emsenn/relating";
import {
  financialAccountTerm,
  induceFinancialTopology,
  extendFinancialTopology,
  type FinancialTopologyCarrier,
} from "./financial.mjs";

export type { UtteranceCarrier, PredicationTerm as TermInput, FinancialTopologyCarrier };
export type { SectionCarrier, SectionEntry, ChargeValue };

const ledgerTerm = (value: string): PredicationTerm => token(mark(value));
const ledgerPredicate = (value: string): PredicationPredicate => predicateOfClaim(claim(mark(value)));
const predicateMarkValue = (predicate: PredicationPredicate): unknown => predicate.mark.value;

// `financialAccountTerm` is the bridge to the financial base: a ledger account
// path is re-homed onto the financial-account namespace so that booked accounts
// read uniformly across both carriers. Re-exported for the constructor surface
// `institution/index` consumes.
export { financialAccountTerm };

// ---------- ledger-specific term constructors ----------

/** Namespaced mark for a ledger account: "ledger.account.<path>" (e.g. "Assets:Cash"). */
export function ledgerAccountTerm(path: string): PredicationTerm {
  return ledgerTerm(`ledger.account.${path}`);
}

/** Namespaced mark for a ledger transaction: "ledger.transaction.<id>". */
export function ledgerTransactionTerm(id: string): PredicationTerm {
  return ledgerTerm(`ledger.transaction.${id}`);
}

/** Namespaced mark for a ledger commodity: "ledger.commodity.<symbol>". */
export function ledgerCommodityTerm(symbol: string): PredicationTerm {
  return ledgerTerm(`ledger.commodity.${symbol}`);
}

/** Namespaced mark for an account-tree path: "ledger.tree.<root>". */
export function ledgerTreeTerm(root: string): PredicationTerm {
  return ledgerTerm(`ledger.tree.${root}`);
}

// ---------- ledger-specific predicate terms ----------

export function isDebitNormalPredicate(): PredicationPredicate { return ledgerPredicate("ledger.is-debit-normal"); }
export function isCreditNormalPredicate(): PredicationPredicate { return ledgerPredicate("ledger.is-credit-normal"); }
export function participatesInPredicate(): PredicationPredicate { return ledgerPredicate("ledger.participates-in"); }
export function isOpenPredicate(): PredicationPredicate { return ledgerPredicate("ledger.is-open"); }
/** Contrary of is-open: the account is closed. Its own claim, not a denial. */
export function isClosedPredicate(): PredicationPredicate { return ledgerPredicate("ledger.is-closed"); }
export function isSubAccountOfPredicate(): PredicationPredicate { return ledgerPredicate("ledger.is-sub-account-of"); }
export function isReconciledPredicate(): PredicationPredicate { return ledgerPredicate("ledger.is-reconciled"); }

// ---------- utterance constructors ----------

/**
 * Claim that an account uses the debit-normal balance convention (Assets, Expenses).
 *
 * This is the constructor `institution/index` uses to read a Desk's H¹ off the
 * booked accounts: the normal-balance convention is what orients each posting in
 * the conservation reading (debit-normal accounts increase on the debit side), so
 * the unconserved residue (H¹ ≠ 0 ⟺ books that do not balance) is read against
 * these claims. SIGNATURE FIXED — `debitNormalUtterance(account: string)`.
 */
export function debitNormalUtterance(account: string): UtteranceCarrier {
  return utterance(mark(ledgerAccountTerm(account)), mark(predicateMarkValue(isDebitNormalPredicate())));
}

/** Claim that an account uses the credit-normal balance convention (Liabilities, Equity, Income). */
export function creditNormalUtterance(account: string): UtteranceCarrier {
  return utterance(mark(ledgerAccountTerm(account)), mark(predicateMarkValue(isCreditNormalPredicate())));
}

/** Claim that an account is open (can receive postings). */
export function accountOpenedUtterance(account: string): UtteranceCarrier {
  return utterance(mark(ledgerAccountTerm(account)), mark(predicateMarkValue(isOpenPredicate())));
}

/** Claim that an account is closed. The contrary claim to is-open, in its own right. */
export function accountClosedUtterance(account: string): UtteranceCarrier {
  return utterance(mark(ledgerAccountTerm(account)), mark(predicateMarkValue(isClosedPredicate())));
}

/** Claim that account `child` is a sub-account of account `parent` (e.g. Assets:Cash is sub of Assets). */
export function subAccountUtterance(parent: string, child: string): UtteranceCarrier {
  return utterance(
    mark({ subject: ledgerAccountTerm(child), object: ledgerAccountTerm(parent) }),
    mark(predicateMarkValue(isSubAccountOfPredicate())),
  );
}

/** Claim that an account participates in a transaction (a posting edge of the transaction). */
export function transactionParticipantUtterance(transactionId: string, account: string): UtteranceCarrier {
  return utterance(
    mark({ subject: ledgerAccountTerm(account), object: ledgerTransactionTerm(transactionId) }),
    mark(predicateMarkValue(participatesInPredicate())),
  );
}

/** Claim that an account's posting in a transaction is reconciled. */
export function reconciledUtterance(account: string, transactionId: string): UtteranceCarrier {
  return utterance(
    mark({ subject: ledgerAccountTerm(account), object: ledgerTransactionTerm(transactionId) }),
    mark(predicateMarkValue(isReconciledPredicate())),
  );
}

// ---------- carrier settlement ----------

/**
 * A double-entry ledger carrier: a FinancialTopologyCarrier specialized to the
 * ledger domain. It is settled by the same meme-topology engine as its financial
 * base (`induceFinancialTopology`), so its `settlement` filtration and `readings`
 * fixed points are read with the identical section machinery; only the `kind`
 * discriminator and the booked vocabulary differ.
 */
export interface LedgerTopologyCarrier extends FinancialTopologyCarrier {
  readonly kind: string;
}

/** Settle a log of ledger utterances into a LedgerTopologyCarrier. */
export function induceLedgerTopology(utterances: readonly UtteranceCarrier[]): LedgerTopologyCarrier {
  const base = induceFinancialTopology(utterances);
  return Object.freeze({
    ...base,
    kind: "ledger.topology.carrier",
  }) as LedgerTopologyCarrier;
}

/** Apply a delta of new utterances to an existing carrier, returning a new settled carrier. */
export function extendLedgerTopology(
  carrier: LedgerTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): LedgerTopologyCarrier {
  const base = extendFinancialTopology(carrier, delta);
  return Object.freeze({
    ...base,
    kind: "ledger.topology.carrier",
  }) as LedgerTopologyCarrier;
}

// ---------- section boundary matching ----------

const boundaryValue = (value: unknown): unknown => {
  if (typeof value === "object" && value !== null && "kind" in value) {
    if (value.kind === "utterance.token" && "mark" in value) {
      return boundaryValue(value.mark instanceof Object && "value" in value.mark ? value.mark.value : undefined);
    }
    if (value.kind === "predication.predicate" && "mark" in value) {
      return boundaryValue(value.mark instanceof Object && "value" in value.mark ? value.mark.value : undefined);
    }
  }
  if (typeof value === "object" && value !== null && "subject" in value && "object" in value) {
    return { subject: boundaryValue(value.subject), object: boundaryValue(value.object) };
  }
  return value;
};

const sameBoundary = (left: unknown, right: unknown): boolean =>
  JSON.stringify(boundaryValue(left)) === JSON.stringify(boundaryValue(right));

const chargeByBoundary = (section: SectionCarrier, subject: unknown, predicate: unknown): ChargeValue => {
  const entry = section.entries.find((e: SectionEntry) =>
    sameBoundary(e.cell.subject, subject) && sameBoundary(e.cell.predicate, predicate));
  return entry === undefined ? valueOf(bottom) : valueOf(entry.charge);
};

// ---------- section constructors ----------

/** Build the knowledge-least section of a LedgerTopologyCarrier. */
export function ledgerKnowledgeSection(carrier: LedgerTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.readings.knowledgeLeast);
}

/** Build the truth-least section of a LedgerTopologyCarrier. */
export function ledgerTruthSection(carrier: LedgerTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.readings.truthLeast);
}

// ---------- single-cell charge reads ----------

/** Charge at "account is-debit-normal". */
export function debitNormalCharge(section: SectionCarrier, account: string): ChargeValue {
  return chargeByBoundary(section, ledgerAccountTerm(account), isDebitNormalPredicate());
}

/** Charge at "account is-credit-normal". */
export function creditNormalCharge(section: SectionCarrier, account: string): ChargeValue {
  return chargeByBoundary(section, ledgerAccountTerm(account), isCreditNormalPredicate());
}

/** Charge at "account is-open". */
export function accountOpenCharge(section: SectionCarrier, account: string): ChargeValue {
  return chargeByBoundary(section, ledgerAccountTerm(account), isOpenPredicate());
}

/** Charge at "account is-closed" — the contrary claim to is-open, read in its own cell. */
export function accountClosedCharge(section: SectionCarrier, account: string): ChargeValue {
  return chargeByBoundary(section, ledgerAccountTerm(account), isClosedPredicate());
}

/** Charge at "account participates-in transaction". */
export function participantCharge(section: SectionCarrier, account: string, transactionId: string): ChargeValue {
  return chargeByBoundary(
    section,
    { subject: ledgerAccountTerm(account), object: ledgerTransactionTerm(transactionId) },
    participatesInPredicate(),
  );
}

/** Charge at "child is-sub-account-of parent". */
export function subAccountCharge(section: SectionCarrier, child: string, parent: string): ChargeValue {
  return chargeByBoundary(
    section,
    { subject: ledgerAccountTerm(child), object: ledgerAccountTerm(parent) },
    isSubAccountOfPredicate(),
  );
}

/** Charge at "account is-reconciled for transaction". */
export function reconciledCharge(section: SectionCarrier, account: string, transactionId: string): ChargeValue {
  return chargeByBoundary(
    section,
    { subject: ledgerAccountTerm(account), object: ledgerTransactionTerm(transactionId) },
    isReconciledPredicate(),
  );
}

// ---------- multi-entry section reads ----------

/** All predicates claimed about an account. */
export function ledgerAccountEntries(section: SectionCarrier, account: string): readonly SectionEntry[] {
  return predicationsFor(section, ledgerAccountTerm(account));
}

/** All accounts that have the debit-normal convention. */
export function allDebitNormal(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, isDebitNormalPredicate())));
}

/** All accounts that have the credit-normal convention. */
export function allCreditNormal(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, isCreditNormalPredicate())));
}

/** All accounts claimed open. */
export function allOpen(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, isOpenPredicate())));
}

/** All accounts claimed closed — the contrary predicate's cells, not a denied bucket. */
export function allClosed(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, isClosedPredicate())));
}

/** All account postings that participate in any transaction. */
export function allTransactionParticipantAccountEntries(section: SectionCarrier): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry: SectionEntry) => sameBoundary(entry.cell.predicate, participatesInPredicate())));
}
