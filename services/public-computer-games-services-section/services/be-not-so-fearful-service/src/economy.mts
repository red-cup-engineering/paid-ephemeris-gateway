// economy — the extraction economy's ledgered honesty: loot is picked up (appended, never
// retracted — THE LAW, same discipline as abrash's own trace), but only counts toward score once it
// is BANKED, and banking requires an explicit, player-confirmed extraction event at a beacon — never
// mere proximity. Death is a real terminal state: whatever is still only "carrying" (not "banked") at
// that point is simply never counted. Nothing is erased; unbanked loot is just never promoted.
//
// PERSISTENCE SHAPE, decided honestly per the design's own Carrier Audit (§4/§8): v1 is TERMINAL-ONLY
// — there is no cross-run persistent stash/vault (no MUD-style server-backed bank carrying loot
// between runs, no Energy Bank integration). A "run" is fully self-contained: its score is the summed
// value of whatever got banked before the run ended, and THAT score (plus the run's own intent log) is
// what a leaderboard would read — matching the design's own "seeded dailies via cartridge for
// leaderboard COMPATIBILITY LATER" phrasing, which defers standing up an actual leaderboard backend,
// not the replay-verifiable shape itself. What you carry is what you can lose: this must be stated
// plainly before a run starts (see web/js/main.mjs's own pre-run notice), never softened.

export type LootRarity = "common" | "rare" | "valuable";

export interface LootItem {
  id: string;
  rarity: LootRarity;
  tier: 1 | 2 | 3;
  wardedBy?: "toll";
}

export type EndReason =
  | { kind: "extracted"; tier: 1 | 2 | 3; tick: number }
  | { kind: "died"; cause: string; tier: 1 | 2 | 3; tick: number }
  | { kind: "voided"; tick: number }
  | { kind: "tick-cap"; tick: number };

export interface EconomyState {
  carrying: LootItem[];
  banked: LootItem[];
  ended: boolean;
  endReason: EndReason | null;
}

export function initialEconomy(): EconomyState {
  return { carrying: [], banked: [], ended: false, endReason: null };
}

/** The pricing table — named plainly, not buried, per the design's own "the price is named before
 *  the pickup, never hidden" rule for Toll-warded loot in particular but honored for every rarity. */
export const LOOT_VALUE: Record<LootRarity, number> = { common: 10, rare: 40, valuable: 150 };

export function valueOf(item: LootItem): number {
  return LOOT_VALUE[item.rarity];
}

export function scoreOf(state: EconomyState): number {
  return state.banked.reduce((sum, item) => sum + valueOf(item), 0);
}

/** pickUp(state, item) — append-only: a run that has already ended cannot pick up more loot (the
 *  caller should never route a pickup intent to a finished run, but this stays defensive rather than
 *  trusting the caller). */
export function pickUp(state: EconomyState, item: LootItem): EconomyState {
  if (state.ended) return state;
  if (state.carrying.some((i) => i.id === item.id) || state.banked.some((i) => i.id === item.id)) return state; // no double-pickup
  return { ...state, carrying: [...state.carrying, item] };
}

/** extract(state, tier, tick) — THE explicit, player-confirmed banking event: every currently-carried
 *  item is promoted to `banked` and the run ends with `{kind:"extracted"}`. Never triggered by
 *  proximity alone — the CALLER (cartridge.mts's applyIntent) is responsible for checking the player
 *  is actually standing on a beacon voxel before routing an `extract` intent here at all; this
 *  function trusts that gate and only enforces "a run can only end once". */
export function extract(state: EconomyState, tier: 1 | 2 | 3, tick: number): EconomyState {
  if (state.ended) return state;
  return {
    carrying: [],
    banked: [...state.banked, ...state.carrying],
    ended: true,
    endReason: { kind: "extracted", tier, tick },
  };
}

/** die(state, cause, tier, tick) — a real terminal state (unlike durante's own deliberate
 *  no-death-ever design — extraction structure requires one). Whatever was only `carrying` is left
 *  exactly where it is: not moved to `banked`, not deleted either — THE LAW satisfied without a
 *  special case, since `scoreOf` only ever sums `banked`. */
export function die(state: EconomyState, cause: string, tier: 1 | 2 | 3, tick: number): EconomyState {
  if (state.ended) return state;
  return { ...state, ended: true, endReason: { kind: "died", cause, tier, tick } };
}

/** voidRun(state, tick) / tickCap(state, tick) — the remaining `EndReason` kinds, matching the
 *  house's own `EndReason` shape (ruinfold's `cleared/mortal-death/voided/tick-cap` precedent):
 *  `voided` for an externally invalidated run (e.g. a replay-verification failure), `tick-cap` for a
 *  run that hit an engine-enforced maximum tick count without extracting or dying. Both are terminal,
 *  neither banks anything further. */
export function voidRun(state: EconomyState, tick: number): EconomyState {
  if (state.ended) return state;
  return { ...state, ended: true, endReason: { kind: "voided", tick } };
}

export function tickCap(state: EconomyState, tick: number): EconomyState {
  if (state.ended) return state;
  return { ...state, ended: true, endReason: { kind: "tick-cap", tick } };
}
