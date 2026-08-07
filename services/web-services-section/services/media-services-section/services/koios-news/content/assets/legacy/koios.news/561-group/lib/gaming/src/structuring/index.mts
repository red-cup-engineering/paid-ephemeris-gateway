/**
 * Structuring presents the CGS object generator:
 * polarity -> event structure -> concurrent game with symmetry.
 */
export * from "./polarity.mjs";
export * from "./event/structure.mjs";
export * from "./concurrent-game/index.mjs";
export {
  strategyContainsPlay,
  strategyExtensionsAfter,
  strategyMovePolarity,
} from "./concurrent-game/with-symmetry/strategizing/strategy.mjs";
