/**
 * pig/rules.mts — Pig's whole rule set as one frozen data object. Standard published rules
 * (roll a die each turn, add it to a running turn total, roll a 1 and lose the turn total,
 * choose to hold and bank it instead; first to `target` wins). Every number a decision or a
 * bot needs lives here, not scattered through `engine.mts`/`bot.mts` as inline literals.
 */
export const PIG_RULES = Object.freeze({
  id: 'pig',
  displayName: 'Pig',
  /** Score needed to win outright. */
  target: 100,
  /** A standard die. Rolling a 1 busts the turn regardless of `sides` — see
   *  `@red-cup-engineering/parlor-kernel/tally`'s `pigRollOutcome`, which this game does not override. */
  sides: 6,
  /** Default two-player seating when no `configId` is supplied. */
  defaultPlayers: Object.freeze(['you', 'bot']),
});

export type PigRules = typeof PIG_RULES;
