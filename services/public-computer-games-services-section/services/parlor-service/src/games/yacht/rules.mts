/**
 * yacht/rules.mts — Yacht's whole rule set as one frozen data object. Five dice, up to three
 * rolls a turn (the first roll plus up to two rerolls of whichever dice aren't held), one
 * category filled per turn, game ends when every player has filled every category.
 *
 * Standard published Yacht has 12 scoring categories, not 13 — 13 is Yahtzee's count (Yahtzee
 * adds a "three of a kind" category and a Yahtzee-bonus rule Yacht doesn't have).
 * `@red-cup-engineering/parlor-kernel/tally` ships exactly the 12 standard Yacht categories
 * (`YACHT_CATEGORIES`, re-exported below).
 */
import { YACHT_CATEGORIES } from '@red-cup-engineering/parlor-kernel/tally';
import type { YachtCategory } from '@red-cup-engineering/parlor-kernel/tally';

export const YACHT_RULES = Object.freeze({
  id: 'yacht',
  displayName: 'Yacht',
  diceCount: 5,
  sides: 6,
  /** The first roll plus this many rerolls — three rolls total per turn, standard rule. */
  maxRolls: 3,
  categories: YACHT_CATEGORIES,
  defaultPlayers: Object.freeze(['you', 'friend']),
});

export type { YachtCategory };
export type YachtRules = typeof YACHT_RULES;
