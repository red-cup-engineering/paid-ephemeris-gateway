/**
 * `disclosure` — the three-way spend-typing classifier: `freely reversible` / `priced` /
 * `terminal`, per `wilder-conceptions-01.md` item 7 ("Terminal Bets") and the ringleader's
 * response ("Adopted as a design directive for the gambling series... the shelf's positioning IS
 * trust... the honesty friction is the product, not a tax on it").
 *
 * This is the single place every UI spend-label reads from (`web/js/render-disclosure.mjs`
 * imports only from here, never re-derives a type or a cost inline) — the "one source of truth"
 * discipline crucible-service already uses for movelogs and onestone for rules-as-data. Every
 * function here is pure and reads only `engine.mts`'s already-exported constants/helpers, so the
 * copy this module produces can never say something `engine.mts#applyIntent` doesn't actually do.
 *
 * The chart of accounts, realized as code:
 *
 * | Intent kind      | Type              | Named cost                              |
 * |-------------------|-------------------|------------------------------------------|
 * | `adjust-stake`     | freely reversible | none — bankroll untouched                |
 * | `reroll-offer`      | priced             | `REROLL_FEE_FRACTION` of current balance |
 * | `commit-stake`      | terminal           | the full stake, at the wager's true odds |
 * | `new-run`           | freely reversible | none — fresh seed-derived bankroll       |
 *
 * (The "show me the math" panel and the four-path chart are pure queries/display, never logged
 * intents at all — `engine.mts#gradeStake` and `paths.mts`'s output — so they carry no
 * `WagerIntent.kind` to classify; `web/js/render-disclosure.mjs` labels them `reversible` too,
 * by the same "free to look at, changes nothing" logic, without going through `classify`.)
 */
import { rerollCost, computeRuinProbability, RUIN_THRESHOLD } from './engine.mts';
import type { BankrollState, NamedCost, SpendType, WagerIntent, WagerOfferSpec } from './types.mts';

/** Exhaustive over `WagerIntent['kind']` — `disclosure.test.mts`'s coverage test walks
 * `ALL_INTENT_KINDS` (the single list `types.mts` and this module both anchor to) and asserts
 * every one of them classifies to exactly one of the three types. A new intent kind added to the
 * `WagerIntent` union without a matching `case` here throws at the `default`, failing that test —
 * the same "new kind, no typing, CI fails" guarantee solitaire's keyboard-coverage test gives. */
export function classify(kind: WagerIntent['kind']): SpendType {
  switch (kind) {
    case 'adjust-stake':
      return 'reversible';
    case 'new-run':
      return 'reversible';
    case 'reroll-offer':
      return 'priced';
    case 'commit-stake':
      return 'terminal';
    default: {
      const never: string = kind;
      throw new TypeError(`classify: unclassified intent kind "${never}" — every WagerIntent kind must be typed`);
    }
  }
}

/** The named, quantified cost for a `priced` intent, or `null` for anything else — a `priced`
 * intent whose cost this function cannot compute is a defect, never silently shown as free. */
export function namedCost(intent: WagerIntent, state: BankrollState): NamedCost | null {
  if (intent.kind !== 'reroll-offer') return null;
  const amount = rerollCost(state.balance);
  return {
    amount,
    resource: 'bankroll',
    description: `Rerolling costs ${(100 * amountFraction(amount, state.balance)).toFixed(0)}% of your practice bankroll (${amount} coins). You keep the rest and see a new offer.`,
  };
}

export interface RuinDisclosure {
  readonly probability: number;
  readonly text: string;
}

/** The ruin disclosure for a proposed `commit-stake` at `stakeFraction` — computable purely from
 * pre-commit values (`state.balance`, `offer`, `stakeFraction`), which is exactly what lets the
 * UI show this *before* the commit button does anything irreversible — see
 * `disclosure.test.mts`'s "ruin disclosure precedes ruin" test, which asserts this function is
 * always computable ahead of any `commit-stake` application, never only after one. */
export function ruinDisclosure(state: BankrollState, offer: WagerOfferSpec, stakeFraction: number): RuinDisclosure {
  const probability = computeRuinProbability(state.balance, offer, stakeFraction);
  const text = probability > 0
    ? `This wager is terminal. If you lose, this run ends here — your bankroll would fall below ${RUIN_THRESHOLD} coin. P(lose this stake): ${(100 * (1 - offer.probability)).toFixed(1)}%. P(this stake causes ruin): ${(100 * probability).toFixed(1)}%.`
    : `This wager is terminal. If you lose, coins are gone for this run, but your remaining balance stays stakeable. P(lose this stake): ${(100 * (1 - offer.probability)).toFixed(1)}%. P(this stake causes ruin): 0%.`;
  return { probability, text };
}

/** Plain, structural on-screen copy for the three reversible/priced/terminal states — the exact
 * chart-of-accounts language, kept here so `app.mjs` never invents its own wording for a type it
 * did not itself classify. */
export function disclosureText(intent: WagerIntent, state: BankrollState): string {
  const type = classify(intent.kind);
  if (type === 'reversible') {
    return intent.kind === 'new-run'
      ? 'New run, new seed, zero cost.'
      : 'Sizing your stake — nothing is spent yet.';
  }
  if (type === 'priced') {
    return namedCost(intent, state)?.description ?? 'Priced — cost unavailable.';
  }
  // terminal: commit-stake — the caller is expected to prefer `ruinDisclosure` for the full text
  // (it needs the specific offer + stake fraction); this is the generic fallback line.
  return 'This wager is terminal: committing cannot be undone.';
}

function amountFraction(amount: number, balance: number): number {
  return balance > 0 ? amount / balance : 0;
}
