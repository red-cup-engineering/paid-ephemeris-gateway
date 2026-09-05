/**
 * `wagers` — pure, seeded generation of one day's `WagerOfferSpec` sequence, including honest
 * generation of negative-EV traps (labeled internally via `framing`).
 *
 * Nothing in the gambling-services-section library (`kelly.mts`/`odds.mts`, vendored) generates
 * wagers — it only prices and sizes wagers already given `probability`/`cost`. This module is
 * Kelly's Wager's own answer to "where do the day's offers come from": a pure
 * function of `(seed, configId)`, using only `seed.mts`'s `Rng` — no clock, no `Math.random()`.
 *
 * The honesty commitment (DESIGN.md's disclosure section, wilder-conceptions-01.md item 7):
 * `probability` and `cost` are always the true numbers a player could plug straight into
 * `kelly.mts`/`odds.mts` themselves and get the real edge back out. `framing` and `pitch` are the
 * *only* fields a trap is allowed to lie in — see `wagers.test.mts`'s "framing never leaks into
 * math" test, which asserts this structurally by re-deriving `probability`/`cost` never from
 * `framing`, and `engine.test.mts`'s parallel assertion that `gradeStake` is called with the
 * spec's real numbers regardless of framing.
 */
import { makeRng } from './seed.mts';
import { evPerContract } from './odds.mts';
import type { WagerFraming, WagerOfferSpec } from './types.mts';

/** One difficulty/variance track — how many offers a day has, how often a trap appears, and the
 * price range offers are drawn from. Pure data, matching crucible/onestone's "rules as data"
 * discipline; `manifest.mts` derives its `CartridgeConfig` list directly from this record so the
 * two can never drift apart the way a hand-duplicated list could. */
export interface WagerConfigSpec {
  readonly id: string;
  readonly displayName: string;
  readonly offerCount: number;
  /** Probability, per offer, that it is drawn as a `'trap'` rather than `'value'`. */
  readonly trapRate: number;
  /** True cost (price per contract) is drawn uniformly from this range. */
  readonly costRange: readonly [number, number];
  /** A `'value'` offer's edge (probability - cost) is drawn uniformly from `[0, valueEdgeMax]`.
   * A `'trap'` offer's (negative) edge is drawn uniformly from `[-trapEdgeMax, -trapEdgeMin]`. */
  readonly valueEdgeMax: number;
  readonly trapEdgeMin: number;
  readonly trapEdgeMax: number;
}

export const WAGER_CONFIGS: readonly WagerConfigSpec[] = [
  {
    id: 'novice',
    displayName: 'Novice — 6 wagers, gentle traps',
    offerCount: 6,
    trapRate: 0.3,
    costRange: [0.35, 0.65],
    valueEdgeMax: 0.12,
    trapEdgeMin: 0.04,
    trapEdgeMax: 0.15,
  },
  {
    id: 'sharp',
    displayName: 'Sharp — 10 wagers, frequent traps',
    offerCount: 10,
    trapRate: 0.5,
    costRange: [0.3, 0.7],
    valueEdgeMax: 0.1,
    trapEdgeMin: 0.06,
    trapEdgeMax: 0.3,
  },
] as const;

export const DEFAULT_WAGER_CONFIG_ID = 'novice';

export function wagerConfigById(id: string | undefined): WagerConfigSpec {
  const resolved = id ?? DEFAULT_WAGER_CONFIG_ID;
  const spec = WAGER_CONFIGS.find((c) => c.id === resolved);
  if (spec === undefined) throw new RangeError(`wagerConfigById: unknown config id "${resolved}"`);
  return spec;
}

/** Plainly-pitched, factual copy for a `'value'` offer — no urgency, no hype, per the disclosure
 * discipline's "shown as a number, not hidden" standard: exact, published probabilities, no
 * artificial time pressure. */
const VALUE_TEMPLATES: readonly { readonly label: string; readonly pitch: string }[] = [
  { label: 'Fair coin, mild premium', pitch: 'A coin-flip-shaped contract with the odds shown right here — check the math before you size it.' },
  { label: 'Slightly favorable side bet', pitch: 'The house is not hiding anything: this price and this probability are the whole story.' },
  { label: 'Modest edge, plainly priced', pitch: "It's a small edge, not a miracle. Small edges, sized correctly and repeated, are the whole lesson." },
  { label: 'Straightforward long odds', pitch: 'Priced to be exactly what it looks like — no better, no worse than the numbers shown.' },
  { label: 'Even-money contract', pitch: 'Close to a coin flip. The number to look at is the edge, not the story.' },
  { label: 'Steady-favorite offer', pitch: 'A modest, honestly-priced favorite. Kelly will tell you how much of your bankroll it deserves.' },
];

/** Hyped, urgency-borrowing copy for a `'trap'` offer — deliberately imitating predatory gacha
 * language (hidden/obfuscated framing, disappearing-window pressure) while `probability`/`cost`
 * sit right next to it, exact and published, in the spirit of what the EU Digital Fairness Act
 * and FTC settlements now require disclosing. The pitch lies; the numbers never do. */
const TRAP_TEMPLATES: readonly { readonly label: string; readonly pitch: string }[] = [
  { label: 'Hot streak special!', pitch: "Everyone's on this one tonight — don't be the one who missed it. (Check the probability shown below before you believe that.)" },
  { label: "Lucky player's pick", pitch: 'Feels right, doesn’t it? Feelings are not the edge — the number below is the edge.' },
  { label: 'Limited-time juicy line', pitch: "This offer won't look this exciting again. (It also won't get any more true — read the numbers.)" },
  { label: 'Can’t-miss longshot', pitch: 'Big number, big story. The true probability and true cost are printed right here regardless of the story.' },
  { label: "Insider's favorite", pitch: 'Word is this one is due. Nothing is ever "due" — the probability shown is the whole truth of it.' },
  { label: 'One-night-only odds', pitch: 'Scarcity is not an edge. The edge is probability minus cost, shown plainly below.' },
];

/** Fold a per-day, per-config RNG stream into a full `WagerOfferSpec[]`. Pure function of
 * `(seed, configId)` — two calls with identical arguments produce byte-identical output. */
export function dailyOffers(seed: string, configId?: string): WagerOfferSpec[] {
  const config = wagerConfigById(configId);
  const rng = makeRng(`${seed}:offers:${config.id}`);
  const offers: WagerOfferSpec[] = [];
  for (let i = 0; i < config.offerCount; i++) {
    const framing: WagerFraming = rng.chance(config.trapRate) ? 'trap' : 'value';
    const cost = round4(rng.range(config.costRange[0], config.costRange[1]));
    const edge = framing === 'value'
      ? rng.range(0, config.valueEdgeMax)
      : -rng.range(config.trapEdgeMin, config.trapEdgeMax);
    const probability = clamp(round4(cost + edge), 0.02, 0.97);
    const templates = framing === 'value' ? VALUE_TEMPLATES : TRAP_TEMPLATES;
    const template = templates[rng.int(0, templates.length - 1)] ?? templates[0]!;
    offers.push({
      id: `w${i + 1}`,
      index: i,
      probability,
      cost,
      framing,
      label: template.label,
      pitch: template.pitch,
    });
  }
  return offers;
}

/** The true edge (probability - cost) for an offer — always computed from the offer's own
 * `probability`/`cost` via the vendored `odds.mts`, never from `framing`. Exists so every caller
 * (grading, disclosure, UI) shares one derivation rather than re-computing `p - cost` inline. */
export function trueEdge(offer: Pick<WagerOfferSpec, 'probability' | 'cost'>): number {
  return evPerContract({ probability: offer.probability, cost: offer.cost });
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
