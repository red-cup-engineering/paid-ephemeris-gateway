/**
 * `scene` — `DelveScene`, flickering's purpose-built world over the FizzOS kernel.
 *
 * This is the "kernel + purpose-built domain" decision in code. It builds directly on the
 * current immutable FizzOS world without inheriting an engine or importing unrelated policies. Every
 * scrap of player state is a functional cell on the player entity (`essence`, `depth`,
 * `gen:*`, `upgrade:*`, `automation:*`, `echoes`, …), read with `numericCell`/`value` exactly
 * as the harbor reads `coin`/`health`. Because the world is an append-only fact trace, the
 * game state *is* an event-sourced audit log — the substrate the micropayment ledger needs,
 * with no second state system.
 *
 * The tick is an ordered agent pipeline: production →
 * automation decisions → unlock/bookkeeping. Crucially, automation reuses the very same
 * command handlers manual play uses — the Lisp strategy only *decides* which verb to run, and
 * the scene runs it through one trusted path. There is exactly one implementation of "attack".
 */
import { createWorld, settleSubject, settledWorld, tell, value } from "@red-cup-engineering/fizzos/world";
import { restoreWorld, snapshotWorld } from "@red-cup-engineering/fizzos/persistence";
import {
  type GameState, COMBAT_UPGRADES, GENERATORS, UPGRADES, avatarStats, combatCost, combatDef,
  echoMultiplier, generatorCost, generatorDef, offlineAccrual, stepEconomy, upgradeDef,
} from "./economy.mts";
import {
  AUTOMATIONS, automationDef, canRekindle, composeStrategy, rekindle, rekindleReward,
  revealedUnlocks,
} from "./progression.mts";
import { type DungeonConfig, DEFAULT_DUNGEON, floorSpec } from "./dungeon.mts";
import { type StrategyAction, decideAction } from "./strategy.mts";

/** Seconds of game-time one tick represents. Idle production is per-second; 1 Hz is plenty. */
export const TICK_SECONDS = 1;
/** How much offline time is honored on return (extendable by a boost). Anti-clock-tampering. */
export const OFFLINE_CAP_SECONDS = 8 * 3600;
/** Default patience cell (ticks the descent may stall before auto-rekindle fires). */
const DEFAULT_PATIENCE = 90;
const START_HP = 20;

/** A line of output addressed to one player (their perception fiber). */
export interface SceneEvent { readonly to: string; readonly text: string; }

/** A portable packet of a player's cells — the unit of guest→account migration (federation). */
export interface DelvePacket {
  readonly actor: string;
  readonly cells: readonly { predicate: string; object: unknown; evidence: unknown }[];
}

export interface DelveSnapshot {
  readonly kind: "flickering.delve.snapshot";
  readonly world: ReturnType<typeof snapshotWorld>;
  readonly players: readonly string[];
}

/** The renderable projection the client draws — everything derived, nothing authoritative. */
export interface StateFrame {
  readonly actor: string;
  readonly essence: number;
  readonly essencePerSec: number;
  readonly echoes: number;
  readonly depth: number;
  readonly maxDepth: number;
  readonly fameDepth: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly atk: number;
  readonly prestigeCount: number;
  readonly onSurface: boolean;
  readonly floor: { depth: number; name: string; biome: string; monster: string; monsterHp: number; monsterMaxHp: number; hazard: string | null; trickster: string | null } | null;
  readonly generators: { id: string; name: string; owned: number; cost: number; rate: number; blurb: string }[];
  readonly combat: { id: string; name: string; owned: number; cost: number; affordable: boolean; atk: number; maxHp: number; blurb: string }[];
  readonly upgrades: { id: string; name: string; cost: number; currency: string; owned: boolean; affordable: boolean; blurb: string }[];
  readonly automations: { id: string; name: string; cost: number; currency: string; owned: boolean; affordable: boolean; replaces: string; blurb: string }[];
  readonly revealed: string[];
  readonly auto: boolean;
  readonly fullyAutonomous: boolean;
  readonly strategy: string;
  readonly customStrategy: boolean;
  readonly patience: number;
  readonly canRekindle: boolean;
  readonly rekindleReward: number;
  readonly boostMult: number;
  readonly boostSecondsLeft: number;
}

const nowMs = (): number => Date.now();

/**
 * Declare flickering's scalar cells single-valued, so the world's append-only trace compacts
 * by latest-stamp (like the engine's own `coin`/`health`). Without this, a cell written many
 * times (`essence` rises every tick) keeps its whole history, `settledWorld` returns every
 * value, and a snapshot/restore round-trip re-settles to the wrong one. Registration is
 * additive and process-global; doing it at import time means every tell takes the compacting
 * path. The auditable trace stays a trace — we just keep the *settled* value single-valued.
 */
const FUNCTIONAL_CELLS: readonly string[] = [
  "essence", "echoes", "depth", "max-depth", "fame-depth", "lifetime-essence",
  "hp", "max-hp", "prestige-count", "auto", "floor-hp", "stuck", "patience",
  "strategy", "last-active", "boost-mult", "boost-until", "offline-cap-until", "secret-hash",
  ...GENERATORS.map((g) => `gen:${g.id}`),
  ...COMBAT_UPGRADES.map((c) => `combat:${c.id}`),
  ...UPGRADES.map((u) => `upgrade:${u.id}`),
  ...AUTOMATIONS.map((a) => `automation:${a.id}`),
];
type World = ReturnType<typeof createWorld>;

function numericCell(world: World, subject: string, predicate: string, fallback: number): number {
  const result = Number(value(world, subject, predicate));
  return Number.isFinite(result) ? result : fallback;
}

export class DelveScene {
  private world: World;
  private readonly players = new Set<string>();
  private readonly config: DungeonConfig;

  constructor(config: DungeonConfig = DEFAULT_DUNGEON, snapshot?: DelveSnapshot) {
    this.config = config;
    this.world = createWorld({ functionalPredicates: FUNCTIONAL_CELLS });
    if (snapshot !== undefined) this.restore(snapshot);
  }

  // ── identity / lifecycle ──────────────────────────────────────────────────────

  /** Whether an actor has any persisted state (has ever played). */
  has(actor: string): boolean {
    return this.players.has(actor) || value(this.world, actor, "essence") !== null;
  }

  /** Admit a player: seed a fresh delver if new, then grant offline accrual since last seen. */
  join(actor: string): SceneEvent[] {
    const events: SceneEvent[] = [];
    const fresh = value(this.world, actor, "essence") === null;
    this.players.add(actor);
    if (fresh) {
      this.world = tell(this.world, [
        { subject: actor, predicate: "essence", object: 0 }, { subject: actor, predicate: "echoes", object: 0 },
        { subject: actor, predicate: "depth", object: 0 }, { subject: actor, predicate: "max-depth", object: 0 },
        { subject: actor, predicate: "fame-depth", object: 0 }, { subject: actor, predicate: "lifetime-essence", object: 0 },
        { subject: actor, predicate: "hp", object: START_HP }, { subject: actor, predicate: "max-hp", object: START_HP },
        { subject: actor, predicate: "prestige-count", object: 0 }, { subject: actor, predicate: "auto", object: false },
        { subject: actor, predicate: "floor-hp", object: 0 }, { subject: actor, predicate: "stuck", object: 0 },
        { subject: actor, predicate: "patience", object: DEFAULT_PATIENCE }, { subject: actor, predicate: "strategy", object: "" },
        { subject: actor, predicate: "last-active", object: nowMs() },
      ]);
      events.push({ to: actor, text: "You reach the mouth of the Gnaw. The wind off the wild country smells of stone and old smoke. Press Delve to descend." });
      return events;
    }
    // Returning: offline catch-up.
    const last = numericCell(this.world, actor, "last-active", nowMs());
    const elapsed = Math.max(0, (nowMs() - last) / 1000);
    if (elapsed > 5) {
      const state = this.project(actor);
      const cap = this.offlineCap(actor);
      const { delta, simulated, capped } = offlineAccrual(state, elapsed, cap);
      if (delta.essence > 0) {
        this.applyDeltaToWorld(actor, delta);
        const mins = Math.round(simulated / 60);
        events.push({ to: actor, text: `While you were away (${mins}m${capped ? ", capped" : ""}), the expedition gathered ${Math.floor(delta.essence)} essence.` });
      }
    }
    this.set(actor, "last-active", String(nowMs()));
    return events;
  }

  leave(actor: string): void {
    this.set(actor, "last-active", String(nowMs()));
    this.players.delete(actor);
  }

  private offlineCap(actor: string): number {
    // A speed/offline boost extends the honored window.
    const until = numericCell(this.world, actor, "offline-cap-until", 0);
    return until > nowMs() ? OFFLINE_CAP_SECONDS * 3 : OFFLINE_CAP_SECONDS;
  }

  // ── world cell helpers ──────────────────────────────────────────────────────────

  private set(actor: string, predicate: string, object: string | number | boolean): void {
    this.world = tell(this.world, { subject: actor, predicate, object }, { source: "flickering.delve" });
  }

  private project(actor: string): GameState {
    const gens: Record<string, number> = {};
    for (const g of GENERATORS) {
      const n = numericCell(this.world, actor, `gen:${g.id}`, 0);
      if (n > 0) gens[g.id] = n;
    }
    const combat: Record<string, number> = {};
    for (const c of COMBAT_UPGRADES) {
      const n = numericCell(this.world, actor, `combat:${c.id}`, 0);
      if (n > 0) combat[c.id] = n;
    }
    const upgrades = new Set(UPGRADES.filter((u) => value(this.world, actor, `upgrade:${u.id}`) === true).map((u) => u.id));
    const automations = new Set(AUTOMATIONS.filter((a) => value(this.world, actor, `automation:${a.id}`) === true).map((a) => a.id));
    const boostUntil = numericCell(this.world, actor, "boost-until", 0);
    const boostRateMult = boostUntil > nowMs() ? numericCell(this.world, actor, "boost-mult", 1) : 1;
    const partial: GameState = {
      essence: numericCell(this.world, actor, "essence", 0),
      echoes: numericCell(this.world, actor, "echoes", 0),
      depth: numericCell(this.world, actor, "depth", 0),
      maxDepth: numericCell(this.world, actor, "max-depth", 0),
      fameDepth: numericCell(this.world, actor, "fame-depth", 0),
      lifetimeEssence: numericCell(this.world, actor, "lifetime-essence", 0),
      hp: numericCell(this.world, actor, "hp", START_HP),
      maxHp: START_HP,
      atk: 4,
      prestigeCount: numericCell(this.world, actor, "prestige-count", 0),
      gens, combat, upgrades, automations, boostRateMult,
    };
    const stats = avatarStats(partial);
    return { ...partial, atk: stats.atk, maxHp: stats.maxHp };
  }

  private applyDeltaToWorld(actor: string, delta: { essence: number; gens: Record<string, number> }): void {
    if (delta.essence !== 0) {
      const cur = numericCell(this.world, actor, "essence", 0);
      const life = numericCell(this.world, actor, "lifetime-essence", 0);
      this.set(actor, "essence", String(cur + delta.essence));
      this.set(actor, "lifetime-essence", String(life + Math.max(0, delta.essence)));
    }
    for (const [id, amt] of Object.entries(delta.gens)) {
      const cur = numericCell(this.world, actor, `gen:${id}`, 0);
      this.set(actor, `gen:${id}`, String(cur + amt));
    }
  }

  // ── the tick ────────────────────────────────────────────────────────────────────

  /** One tick: production, automation, bookkeeping — for every active player. */
  runTick(commands: readonly { actor: string; line: string }[]): SceneEvent[] {
    const events: SceneEvent[] = [];
    // 1. manual commands first (the player's own intent this frame).
    for (const c of commands) {
      if (!this.players.has(c.actor)) this.join(c.actor).forEach((e) => events.push(e));
      const text = this.command(c.actor, c.line);
      if (text !== null) events.push({ to: c.actor, text });
    }
    // 2. agents advance every active player.
    for (const actor of this.players) {
      this.productionAgent(actor);
      this.automationAgent(actor, events);
      this.bookkeepingAgent(actor);
    }
    return events;
  }

  private productionAgent(actor: string): void {
    const state = this.project(actor);
    const delta = stepEconomy(state, TICK_SECONDS);
    if (delta.essence !== 0 || Object.keys(delta.gens).length > 0) this.applyDeltaToWorld(actor, delta);
  }

  /** Run the player's strategy (if auto is on) and apply its decided action through the verbs. */
  private automationAgent(actor: string, events: SceneEvent[]): void {
    if (value(this.world, actor, "auto") !== true) return;
    const automations = new Set(AUTOMATIONS.filter((a) => value(this.world, actor, `automation:${a.id}`) === true).map((a) => a.id));
    // The autobuyer is a standing behavior, not a per-tick action symbol.
    if (automations.has("auto-buy")) this.autobuy(actor);
    const custom = value(this.world, actor, "strategy") ?? "";
    const program = composeStrategy(automations, custom);
    const { action } = decideAction(program, this.world, actor);
    this.runAction(actor, action, events);
  }

  /** Apply a strategy-decided action through the same trusted handlers manual play uses. */
  private runAction(actor: string, action: StrategyAction, events: SceneEvent[]): void {
    switch (action) {
      case "attack": this.command(actor, "attack"); break;
      case "descend": this.command(actor, "descend"); break;
      case "retreat": this.command(actor, "retreat"); break;
      case "rekindle": { const t = this.command(actor, "ascend"); if (t) events.push({ to: actor, text: `[orders] ${t}` }); break; }
      case "buy": this.autobuy(actor); break;
      case "wait": break;
    }
  }

  /**
   * Greedy autobuyer: buy the single cheapest affordable thing — generator OR combat upgrade —
   * keeping a reserve so it never spends the player to zero. Considering combat too is what lets
   * a fully-automated delver keep getting deeper on its own (essence → depth), not just richer.
   */
  private autobuy(actor: string): void {
    const essence = numericCell(this.world, actor, "essence", 0);
    const candidates: { id: string; cost: number }[] = [];
    for (const g of GENERATORS) candidates.push({ id: g.id, cost: generatorCost(g, numericCell(this.world, actor, `gen:${g.id}`, 0), 1) });
    for (const c of COMBAT_UPGRADES) candidates.push({ id: c.id, cost: combatCost(c, numericCell(this.world, actor, `combat:${c.id}`, 0), 1) });
    const best = candidates.filter((x) => x.cost <= essence * 0.9).sort((a, b) => a.cost - b.cost)[0];
    if (best !== undefined) this.command(actor, `buy ${best.id}`);
  }

  /** Stuck-tracking and boost expiry; cheap per-tick bookkeeping. */
  private bookkeepingAgent(actor: string): void {
    const depth = numericCell(this.world, actor, "depth", 0);
    const maxDepth = numericCell(this.world, actor, "max-depth", 0);
    if (value(this.world, actor, "auto") === true && depth <= maxDepth) {
      this.set(actor, "stuck", String(numericCell(this.world, actor, "stuck", 0) + 1));
    }
    // Keep the max-hp cell synced to combat+echoes so the Lisp's retreat threshold is correct.
    const maxHp = avatarStats(this.project(actor)).maxHp;
    if (numericCell(this.world, actor, "max-hp", 0) !== maxHp) this.set(actor, "max-hp", String(maxHp));
  }

  // ── manual commands (also the automation handlers) ────────────────────────────────

  /** Apply one command line; return the actor's own response line, or null for silence. */
  command(actor: string, line: string): string | null {
    const trimmed = line.trim();
    if (trimmed === "") return null;
    if (!this.players.has(actor)) this.join(actor);
    this.set(actor, "last-active", String(nowMs()));
    const sp = trimmed.indexOf(" ");
    const verb = (sp === -1 ? trimmed : trimmed.slice(0, sp)).toLowerCase();
    const arg = sp === -1 ? "" : trimmed.slice(sp + 1).trim();
    switch (verb) {
      case "delve": return this.delve(actor);
      case "attack": case "fight": return this.attack(actor);
      case "descend": case "down": return this.descend(actor);
      case "retreat": case "surface": return this.retreat(actor);
      case "ascend": case "rekindle": return this.doRekindle(actor);
      case "buy": return this.buy(actor, arg);
      case "automate": return this.automate(actor, arg);
      case "strategy": return this.setStrategy(actor, arg);
      case "auto": return this.setAuto(actor, arg);
      case "patience": return this.setPatience(actor, arg);
      case "status": case "look": return this.status(actor);
      default: return `The cave does not answer to "${verb}".`;
    }
  }

  private currentFloor(actor: string) {
    const depth = numericCell(this.world, actor, "depth", 0);
    return depth <= 0 ? null : floorSpec(this.config, depth);
  }

  private delve(actor: string): string {
    const depth = numericCell(this.world, actor, "depth", 0);
    if (depth > 0) return this.status(actor);
    return this.enterDepth(actor, 1, "You step into the dark.");
  }

  private enterDepth(actor: string, depth: number, prefix: string): string {
    const floor = floorSpec(this.config, depth);
    this.set(actor, "depth", String(depth));
    this.set(actor, "floor-hp", String(floor.monster.hp));
    const prevMax = numericCell(this.world, actor, "max-depth", 0);
    if (depth > prevMax) { this.set(actor, "max-depth", String(depth)); this.set(actor, "stuck", "0"); }
    const fame = numericCell(this.world, actor, "fame-depth", 0);
    if (depth > fame) this.set(actor, "fame-depth", String(depth));
    const marks = [floor.hazard ? floor.hazard.blurb : "", floor.trickster ? floor.trickster.blurb : ""].filter(Boolean).join(" ");
    return `${prefix} ${floor.name}: ${floor.monster.name} bars the way.${marks ? " " + marks : ""}`;
  }

  private attack(actor: string): string {
    const depth = numericCell(this.world, actor, "depth", 0);
    if (depth <= 0) return this.delve(actor);
    const floorHp = numericCell(this.world, actor, "floor-hp", 0);
    if (floorHp <= 0) return this.descend(actor); // already cleared — press on
    const floor = floorSpec(this.config, depth);
    const state = this.project(actor);
    const hp = numericCell(this.world, actor, "hp", state.maxHp);
    const nextFloorHp = floorHp - state.atk;
    if (nextFloorHp <= 0) {
      this.set(actor, "floor-hp", "0");
      return this.clearFloor(actor, floor);
    }
    const nextHp = hp - floor.monster.atk;
    this.set(actor, "floor-hp", String(nextFloorHp));
    if (nextHp <= 0) return this.die(actor, floor);
    this.set(actor, "hp", String(nextHp));
    return `You strike ${floor.monster.name} (${nextFloorHp} left); it wounds you (${nextHp} hp).`;
  }

  private clearFloor(actor: string, floor: ReturnType<typeof floorSpec>): string {
    const state = this.project(actor);
    const reward = Math.round(floor.essenceReward * (1 + (state.echoes * 0)) * Math.max(1, state.boostRateMult));
    const essence = numericCell(this.world, actor, "essence", 0);
    const life = numericCell(this.world, actor, "lifetime-essence", 0);
    this.set(actor, "essence", String(essence + reward));
    this.set(actor, "lifetime-essence", String(life + reward));
    let extra = "";
    if (floor.trickster?.echoes) {
      const ge = Math.max(1, Math.round(floor.trickster.echoes * echoMultiplier(state)));
      this.set(actor, "echoes", String(numericCell(this.world, actor, "echoes", 0) + ge));
      extra = ` Crow's question lingers — +${ge} echo${ge === 1 ? "" : "es"}.`;
    }
    return `You clear ${floor.monster.name}. +${reward} essence.${extra} (Descend to go deeper.)`;
  }

  private descend(actor: string): string {
    const depth = numericCell(this.world, actor, "depth", 0);
    if (depth <= 0) return this.delve(actor);
    const floorHp = numericCell(this.world, actor, "floor-hp", 0);
    if (floorHp > 0) return `Something still bars the way — attack it first.`;
    return this.enterDepth(actor, depth + 1, "You descend.");
  }

  private retreat(actor: string): string {
    const depth = numericCell(this.world, actor, "depth", 0);
    const state = this.project(actor);
    this.set(actor, "depth", "0");
    this.set(actor, "floor-hp", "0");
    this.set(actor, "hp", String(state.maxHp));
    if (depth <= 0) return "You are already in the open air.";
    return `You climb back to the surface and bind your wounds (${state.maxHp} hp).`;
  }

  private die(actor: string, floor: ReturnType<typeof floorSpec>): string {
    const state = this.project(actor);
    this.set(actor, "depth", "0");
    this.set(actor, "floor-hp", "0");
    this.set(actor, "hp", String(state.maxHp));
    return `${floor.monster.name} drops you in the dark. You wake at the cave mouth, breath ragged but alive. (Reached ${floor.depth}.)`;
  }

  private buy(actor: string, arg: string): string {
    const parts = arg.split(/\s+/);
    const id = parts[0] ?? "";
    const count = Math.max(1, Math.min(1000, Number.parseInt(parts[1] ?? "1", 10) || 1));
    if (id === "") return "Buy what? Name a delver or piece of gear.";
    const gen = generatorDef(id);
    if (gen !== undefined) {
      const owned = numericCell(this.world, actor, `gen:${id}`, 0);
      const cost = generatorCost(gen, owned, count);
      const essence = numericCell(this.world, actor, "essence", 0);
      if (essence < cost) return `Not enough essence (need ${cost}).`;
      this.set(actor, "essence", String(essence - cost));
      this.set(actor, `gen:${id}`, String(owned + count));
      return `You hire ${count}× ${gen.name} for ${cost} essence.`;
    }
    const comb = combatDef(id);
    if (comb !== undefined) {
      const owned = numericCell(this.world, actor, `combat:${id}`, 0);
      const cost = combatCost(comb, owned, count);
      const essence = numericCell(this.world, actor, "essence", 0);
      if (essence < cost) return `Not enough essence (need ${cost}).`;
      this.set(actor, "essence", String(essence - cost));
      this.set(actor, `combat:${id}`, String(owned + count));
      const stats = avatarStats(this.project(actor));
      this.set(actor, "max-hp", String(stats.maxHp));
      if (comb.maxHp !== undefined) this.set(actor, "hp", String(stats.maxHp)); // a ward heals you
      return `You bear ${count}× ${comb.name} for ${cost} essence. (atk ${stats.atk}, hp ${stats.maxHp})`;
    }
    const upg = upgradeDef(id);
    if (upg !== undefined) {
      if (value(this.world, actor, `upgrade:${id}`) === true) return `You already have ${upg.name}.`;
      const bal = numericCell(this.world, actor, upg.currency, 0);
      if (bal < upg.cost) return `Not enough ${upg.currency} (need ${upg.cost}).`;
      this.set(actor, upg.currency, String(bal - upg.cost));
      this.set(actor, `upgrade:${id}`, true);
      // Recompute max-hp cell so the Lisp/UI sees the new ceiling; heal to it on purchase.
      const stats = avatarStats(this.project(actor));
      this.set(actor, "max-hp", String(stats.maxHp));
      return `You gain ${upg.name}. ${upg.blurb}`;
    }
    return `There is no "${id}" to buy.`;
  }

  private automate(actor: string, arg: string): string {
    const def = automationDef(arg.trim());
    if (def === undefined) return `Unknown standing order "${arg}". Options: ${AUTOMATIONS.map((a) => a.id).join(", ")}.`;
    if (value(this.world, actor, `automation:${def.id}`) === true) return `You already learned ${def.name}.`;
    const bal = numericCell(this.world, actor, def.currency, 0);
    if (bal < def.cost) return `Not enough ${def.currency} (need ${def.cost}).`;
    this.set(actor, def.currency, String(bal - def.cost));
    this.set(actor, `automation:${def.id}`, true);
    this.set(actor, "auto", true);
    return `You teach the expedition: ${def.name}. ${def.blurb} (Standing orders are running.)`;
  }

  private setStrategy(actor: string, arg: string): string {
    if (arg === "" || arg.toLowerCase() === "clear" || arg.toLowerCase() === "reset") {
      this.set(actor, "strategy", "");
      return "Strategy reset to your standing orders.";
    }
    // We don't validate-then-store strictly: an invalid program safely decides `wait`,
    // and the editor validates before sending. Store verbatim.
    this.set(actor, "strategy", arg);
    return "Your orders are set, in the cave's own tongue.";
  }

  private setAuto(actor: string, arg: string): string {
    const on = arg.trim().toLowerCase();
    if (on === "on" || on === true || on === "") { this.set(actor, "auto", true); return "Standing orders engaged."; }
    this.set(actor, "auto", false);
    return "Standing orders stood down — you have the watch.";
  }

  private setPatience(actor: string, arg: string): string {
    const n = Number.parseInt(arg.trim(), 10);
    if (!Number.isFinite(n) || n < 1) return "Patience must be a positive number of ticks.";
    this.set(actor, "patience", String(Math.min(100000, n)));
    return `Patience set to ${Math.min(100000, n)} ticks.`;
  }

  private doRekindle(actor: string): string {
    const state = this.project(actor);
    if (!canRekindle(state)) return `The flame is not ready — reach depth ${10} to rekindle (you reached ${state.maxDepth}).`;
    const reward = rekindleReward(state);
    const next = rekindle(state);
    this.writeState(actor, next);
    this.set(actor, "depth", "0"); this.set(actor, "floor-hp", "0");
    this.set(actor, "hp", String(next.maxHp)); this.set(actor, "stuck", "0");
    return `The flame gutters out — and you light it again from the dark. +${reward} echo${reward === 1 ? "" : "es"}. (×${(1 + 0.02 * next.echoes).toFixed(2)} production.)`;
  }

  /** Overwrite a player's run+meta cells from a GameState (used by rekindle). */
  private writeState(actor: string, s: GameState): void {
    const maxHp = avatarStats(s).maxHp; // recompute: echoes rose and combat reset on rekindle
    const facts: { subject: string; predicate: string; object: string | number | boolean }[] = [
      { subject: actor, predicate: "essence", object: s.essence },
      { subject: actor, predicate: "echoes", object: s.echoes },
      { subject: actor, predicate: "depth", object: s.depth },
      { subject: actor, predicate: "max-depth", object: s.maxDepth },
      { subject: actor, predicate: "fame-depth", object: s.fameDepth },
      { subject: actor, predicate: "prestige-count", object: s.prestigeCount },
      { subject: actor, predicate: "max-hp", object: maxHp },
    ];
    for (const g of GENERATORS) facts.push({ subject: actor, predicate: `gen:${g.id}`, object: s.gens[g.id] ?? 0 });
    for (const c of COMBAT_UPGRADES) facts.push({ subject: actor, predicate: `combat:${c.id}`, object: s.combat[c.id] ?? 0 });
    for (const u of UPGRADES) facts.push({ subject: actor, predicate: `upgrade:${u.id}`, object: s.upgrades.has(u.id) });
    this.world = tell(this.world, facts);
  }

  private status(actor: string): string {
    const f = this.currentFloor(actor);
    const s = this.project(actor);
    if (f === null) return `Surface. Essence ${Math.floor(s.essence)}, echoes ${s.echoes}, deepest ${s.fameDepth}. Press Delve.`;
    const floorHp = numericCell(this.world, actor, "floor-hp", 0);
    return `Depth ${f.depth} — ${f.monster.name} (${floorHp} hp). You: ${numericCell(this.world, actor, "hp", s.maxHp)}/${s.maxHp} hp, ${Math.floor(s.essence)} essence.`;
  }

  // ── projection for the client ─────────────────────────────────────────────────────

  stateFrame(actor: string): StateFrame {
    const s = this.project(actor);
    const automations = s.automations;
    const custom = value(this.world, actor, "strategy") ?? "";
    const revealed = revealedUnlocks(s);
    const f = this.currentFloor(actor);
    const floorHp = numericCell(this.world, actor, "floor-hp", 0);
    const boostUntil = numericCell(this.world, actor, "boost-until", 0);
    const fully = AUTOMATIONS.every((a) => automations.has(a.id));
    return {
      actor,
      essence: s.essence, echoes: s.echoes,
      essencePerSec: (s.gens["torchbearer"] ?? 0) * GENERATORS[0]!.baseRate * (s.boostRateMult) * this.prodMultNoBoost(s),
      depth: s.depth, maxDepth: s.maxDepth, fameDepth: s.fameDepth,
      hp: numericCell(this.world, actor, "hp", s.maxHp), maxHp: s.maxHp, atk: s.atk,
      prestigeCount: s.prestigeCount,
      onSurface: s.depth <= 0,
      floor: f === null ? null : {
        depth: f.depth, name: f.name, biome: f.biome, monster: f.monster.name,
        monsterHp: floorHp, monsterMaxHp: f.monster.hp,
        hazard: f.hazard?.name ?? null, trickster: f.trickster?.name ?? null,
      },
      generators: GENERATORS.map((g) => ({
        id: g.id, name: g.name, owned: Math.floor(s.gens[g.id] ?? 0),
        cost: generatorCost(g, s.gens[g.id] ?? 0, 1), rate: g.baseRate, blurb: g.blurb,
      })),
      combat: COMBAT_UPGRADES.map((c) => ({
        id: c.id, name: c.name, owned: Math.floor(s.combat[c.id] ?? 0),
        cost: combatCost(c, s.combat[c.id] ?? 0, 1),
        affordable: s.essence >= combatCost(c, s.combat[c.id] ?? 0, 1),
        atk: c.atk ?? 0, maxHp: c.maxHp ?? 0, blurb: c.blurb,
      })),
      upgrades: UPGRADES.filter((u) => u.requires === undefined || revealed.has(u.requires)).map((u) => ({
        id: u.id, name: u.name, cost: u.cost, currency: u.currency,
        owned: s.upgrades.has(u.id),
        affordable: (u.currency === "essence" ? s.essence : s.echoes) >= u.cost,
        blurb: u.blurb,
      })),
      automations: AUTOMATIONS.filter((a) => a.requires === undefined || revealed.has(a.requires)).map((a) => ({
        id: a.id, name: a.name, cost: a.cost, currency: a.currency,
        owned: automations.has(a.id),
        affordable: (a.currency === "essence" ? s.essence : s.echoes) >= a.cost,
        replaces: a.replaces, blurb: a.blurb,
      })),
      revealed: [...revealed],
      auto: value(this.world, actor, "auto") === true,
      fullyAutonomous: fully,
      strategy: composeStrategy(automations, custom),
      customStrategy: custom.trim() !== "",
      patience: numericCell(this.world, actor, "patience", DEFAULT_PATIENCE),
      canRekindle: canRekindle(s),
      rekindleReward: rekindleReward(s),
      boostMult: s.boostRateMult,
      boostSecondsLeft: boostUntil > nowMs() ? Math.round((boostUntil - nowMs()) / 1000) : 0,
    };
  }

  /** The production multiplier excluding the boost factor (boost applied separately for display). */
  private prodMultNoBoost(s: GameState): number {
    let m = 1;
    for (const id of s.upgrades) { const u = upgradeDef(id); if (u?.prodMult !== undefined) m *= u.prodMult; }
    m *= 1 + 0.02 * s.echoes;
    return m;
  }

  // ── monetization boost application (called by the payments boundary) ───────────────

  /**
   * Apply a verified boost from a cleared payment. Boosts are time-bounded rate multipliers or
   * offline-cap extensions — `Reward = k·CurrentRate·Time` in shape, never a flat resource grant
   * that could skip tutorial unlocks or prestige thresholds.
   */
  grantBoost(actor: string, kind: "rate" | "offline", value: number, durationSeconds: number): void {
    if (!this.has(actor)) this.join(actor);
    const until = nowMs() + durationSeconds * 1000;
    if (kind === "rate") {
      this.set(actor, "boost-mult", String(Math.max(1, value)));
      this.set(actor, "boost-until", String(until));
    } else {
      this.set(actor, "offline-cap-until", String(until));
    }
  }

  // ── persistence (event-sourced; the world IS the log) ──────────────────────────────

  snapshot(): DelveSnapshot {
    return {
      kind: "flickering.delve.snapshot",
      world: snapshotWorld(this.world),
      players: [...this.players],
    };
  }

  restore(snapshot: DelveSnapshot): void {
    if (snapshot.kind !== "flickering.delve.snapshot") throw new TypeError("invalid delve snapshot");
    this.world = restoreWorld(snapshot.world);
    for (const p of snapshot.players) this.players.add(p);
  }

  // ── federation: guest → account migration (the "entity packet") ────────────────────

  /** Export a player's whole fiber as a portable packet — the message a migration sends. */
  exportActor(actor: string): DelvePacket {
    const cells = settleSubject(this.world, actor).map(({ predicate, object, evidence }) => ({ predicate, object, evidence }));
    return { actor, cells };
  }

  /** Import a packet under a (possibly different) actor id — guest progress claimed by an account. */
  importActor(packet: DelvePacket, asActor: string): void {
    const claims = packet.cells.map(({ predicate, object, evidence }) => ({ subject: asActor, predicate, object, evidence }));
    this.world = tell(this.world, claims, { source: `flickering.migration:${packet.actor}` });
    this.players.add(asActor);
  }

  /** The currently-joined players — the set the tick emits frames to. */
  activePlayers(): readonly string[] {
    return [...this.players];
  }

  metrics(): { players: number; facts: number } {
    return { players: this.players.size, facts: settledWorld(this.world).length };
  }

  // ── account auth (a stored secret hash; guests need none) ──────────────────────────

  /** The stored secret hash on an account, or null (never been set). */
  secretHashOf(actor: string): string | null {
    const hash = value(this.world, actor, "secret-hash");
    return typeof hash === "string" ? hash : null;
  }

  setSecretHash(actor: string, hash: string): void {
    this.set(actor, "secret-hash", hash);
  }

  /** Whether an actor already holds run progress (used to guard guest→account merges). */
  hasProgress(actor: string): boolean {
    return numericCell(this.world, actor, "lifetime-essence", 0) > 0 || numericCell(this.world, actor, "fame-depth", 0) > 0;
  }
}
