// reward-hook — the ZBD payout-policy STUB (design §5.3, build-report item 4). This module ONLY
// ever builds a "would-pay" ledger intent and hands it to the store to append as JSONL — it never
// calls a payout provider, never moves a real satoshi, and has no network code at all. Real payouts
// are explicitly out of v0 scope per the design doc: "the proposed hook (not implemented, pending
// that doc's own open items — fee schedule, withdrawal tiers, webhook signing)".
//
// Shape follows zbd-micropayment-rails.md §4b's exact double-entry accrual posting (sign convention
// from that doc: an income/liability INCREASE is posted negative, so spending down the recognized
// income:ads pool is posted positive while the new liability owed to the winner is posted negative):
//
//   income:ads                       +amountUsd
//   liabilities:rewards:<actor>      -amountUsd
//
// and §5.3's rule that a day with zero eligible scored submissions pays out nothing and does NOT
// roll forward into a bigger next-day prize — reflected here as `wouldPay: false` with an explicit
// reason, not a zero-amount entry pretending to be a real accrual.
//
// The country allow-list / ads-ceiling / rate-cap gates from the rails doc's §5 `reward-policy.mts`
// chain are NOT evaluated here — this stub is upstream of all of that, and says so in `gates.note`,
// so nothing downstream can mistake "we wrote an intent" for "policy cleared this to actually pay."

export interface WouldPayEntry {
  wouldPay: boolean;
  date: string;
  ref: string;
  actor: string | null;
  amountUsd: number;
  postings: { account: string; amount: number; commodity: "USD" }[];
  reason: string;
  gates: { note: string };
}

// ACCRUAL_PER_DAY_USD — placeholder only. The rails doc is explicit (§8/§12) that ZBD's fee
// schedule and withdrawal tiers are unconfirmed; this number is not a balance decision, it's a
// value to tune once a real ZBD account and a real income:ads-funded pool exist.
const ACCRUAL_PER_DAY_USD = 0.01;

const GATE_NOTE =
  "v0 stub: country allow-list, income:ads ceiling, and per-account/per-IP rate caps " +
  "(zbd-micropayment-rails.md §5) are NOT evaluated here. This module only ever writes an " +
  "intent to reward-ledger.jsonl — no zbdProvider call, no ledger.record() against a real " +
  "AuditLedger, no satoshi ever moves from this code path.";

export function buildDailyAccrual(date: string, winnerActor: string | null): WouldPayEntry {
  const ref = `accrue-ruinfold-${date.replaceAll("-", "")}`;

  if (!winnerActor) {
    return {
      wouldPay: false,
      date,
      ref,
      actor: null,
      amountUsd: 0,
      postings: [],
      reason: "no-eligible-scored-submissions", // §5.3: pays out nothing, does not roll forward
      gates: { note: GATE_NOTE },
    };
  }

  return {
    wouldPay: true, // still only ever an INTENT — see module header
    date,
    ref,
    actor: winnerActor,
    amountUsd: ACCRUAL_PER_DAY_USD,
    postings: [
      { account: "income:ads", amount: ACCRUAL_PER_DAY_USD, commodity: "USD" },
      { account: `liabilities:rewards:${winnerActor}`, amount: -ACCRUAL_PER_DAY_USD, commodity: "USD" },
    ],
    reason: `ruinfold daily #1 (actor ${winnerActor})`,
    gates: { note: GATE_NOTE },
  };
}
