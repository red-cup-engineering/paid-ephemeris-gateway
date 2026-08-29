// orchestrator — the autonomous tick loop that composes the four lanes.
//
// One cycle, per account, sequentially (gentle on the RPC nodes): plan and
// (gated) execute voting, plan and (gated) execute trading, prepare the locked
// posting and gaming lanes for observability without ever executing them, then
// record the cycle. The composed broadcast gate is `control.live AND
// control.isEnabled(lane)`; trading additionally requires the account's own
// live envelope (only the sandbox). Locked lanes are planned but the orchestrator
// never calls their executors — those throw by construction anyway.
//
// The loop schedules the next tick only after the current one finishes (no
// overlap) and unwinds cleanly on the abort signal the HTTP server's graceful
// shutdown raises.

import { planVotes, executeVotes } from "./voting.mts";
import { planTrades, executeTrading, type TradingPlan } from "./trading.mts";
import { composeDraft } from "./posting.mts";
import { planGames } from "./gaming.mts";
import { witnessFleetTick, compactSettled, type WitnessStore } from "./witnessing.mts";
import {
  composeLiquidityPost,
  composeSpectralPost,
  isDraftDue,
  recordAnalysisDraft,
} from "./analysis-posts.mts";
import { ingestOffers } from "./incentive/offers.mts";
import { rankOffers } from "./incentive/valuation.mts";
import { authorizeOffers } from "./incentive/authorization.mts";
import { recordNominationsForAccount } from "./incentive/arbitration.mts";
import { executeAutoOffer } from "./incentive/execute.mts";
import type { LiquidityReading } from "./analysis/liquidity.mts";
import type { Fleet, FleetMember } from "./fleet.mts";
import type { AagaardConfig } from "./config.mts";
import {
  ControlPlane,
  ensureDirs,
  recordAccountTick,
  recordFleetTick,
  type StateStore,
  type FleetTickReadout,
  type AccountTickReadout,
} from "./state.mts";

/** Used to value incentive rewards when the trading lane did not run this tick
 *  (no liquidity read) — every token then prices to 0 and offers still nominate. */
const EMPTY_LIQUIDITY: LiquidityReading = Object.freeze({
  kind: "aagaard.liquidity" as const,
  venues: Object.freeze([]),
  pools: Object.freeze([]),
  corridors: Object.freeze([]),
  totalDepthProxy: 0,
});

/** One account's tick: the readout the fleet reports, plus the plans the
 *  witnessing ledger draws its substrate from (held so runTick can witness the
 *  chain-global feeds ONCE without re-fetching). */
interface TickSubstrate {
  readonly readout: AccountTickReadout;
  readonly votingPlan?: Awaited<ReturnType<typeof planVotes>> | undefined;
  readonly tradingPlan?: TradingPlan | undefined;
}

export class Orchestrator {
  readonly control: ControlPlane;
  private readonly config: AagaardConfig;
  private readonly fleet: Fleet;
  private readonly store: StateStore;
  private readonly witnessStore: WitnessStore;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ticking = false;
  private lastCompactDay = "";

  constructor(config: AagaardConfig, fleet: Fleet, store: StateStore) {
    this.config = config;
    this.fleet = fleet;
    this.store = store;
    this.witnessStore = { logDir: store.logDir, stateDir: store.stateDir, recordDir: store.recordDir };
    this.control = new ControlPlane(config);
    ensureDirs(store);
  }

  /** Run one full fleet cycle, witness its substrate, record it, return the readout. */
  async runTick(): Promise<FleetTickReadout> {
    this.ticking = true;
    try {
      const ts = new Date().toISOString();
      const accounts: AccountTickReadout[] = [];
      const substrate: TickSubstrate[] = [];
      for (const member of this.fleet.values()) {
        const ticked = await this.tickAccount(member);
        accounts.push(ticked.readout);
        substrate.push(ticked);
      }

      // Witness the substrate. There is one chain: the trending field and the
      // market are witnessed ONCE (any account's read is representative — trending
      // is global, the book and pools are global); only stake/mana and a wallet's
      // own Hive-Engine balances are per-account. Best-effort, never breaks the tick.
      try {
        const globalPosts = substrate.find((s) => s.votingPlan && s.votingPlan.postSnapshots.length > 0)?.votingPlan?.postSnapshots;
        const globalMarket = substrate.find((s) => s.tradingPlan)?.tradingPlan?.market;
        witnessFleetTick(this.witnessStore, ts, globalPosts, globalMarket, substrate.map((s) => ({
          account: s.readout.account,
          raw: s.tradingPlan?.rawAccount,
          heBalances: s.tradingPlan?.market.heBalances,
        })));
      } catch { /* the witnessing ledger is best-effort substrate, never the operational path */ }

      // Determinacy compaction: once a UTC day, settle paid-out posts into the
      // record and compact them out of the log — offline from the hot tick.
      this.maybeCompact(ts);

      const readout: FleetTickReadout = Object.freeze({
        kind: "aagaard.fleet-tick" as const,
        ts,
        running: this.control.running,
        live: this.control.live,
        enabled: this.control.enabledList(),
        accounts: Object.freeze(accounts),
      });
      recordFleetTick(this.store, readout);
      return readout;
    } finally {
      this.ticking = false;
    }
  }

  /** Run the determinacy compaction at most once per UTC day. Best-effort
   *  maintenance — a failure never touches the operational path. */
  private maybeCompact(ts: string): void {
    const day = ts.slice(0, 10);
    if (day === this.lastCompactDay) return;
    this.lastCompactDay = day;
    try { compactSettled(this.witnessStore, ts); } catch { /* maintenance only */ }
  }

  private async tickAccount(member: FleetMember): Promise<TickSubstrate> {
    const { account } = member;
    let voting: AccountTickReadout["voting"];
    let trading: AccountTickReadout["trading"];
    let posting: AccountTickReadout["posting"];
    let gaming: AccountTickReadout["gaming"];
    let incentive: AccountTickReadout["incentive"];

    // Plans are held so the historic ledger can snapshot their raw data after
    // both lanes have run, without re-fetching.
    let votingPlan: Awaited<ReturnType<typeof planVotes>> | undefined;
    let tradingPlan: TradingPlan | undefined;

    // tick-snapshot metrics (upstream canonical recorder)
    let currentMana = "0";
    let maxMana = "0";
    let hive = member.account;
    let hbd = "0.000 HBD";
    let vests = "0.000000 VESTS";
    let votesAct = 0;
    let votesAbst = 0;
    let tradesInferred = 0;
    let tradesExec = 0;
    let lpAct = 0;
    let lpCount = 0;

    try {
      if (this.control.isEnabled("voting")) {
        const plan = await planVotes(member);
        votingPlan = plan;
        const armed = this.control.live && this.control.isEnabled("voting");
        const exec = await executeVotes(member, plan, armed);
        currentMana = plan.currentMana;
        maxMana = plan.maxMana;
        votesAct = exec.broadcast;
        votesAbst = exec.dryRun;
        voting = {
          currentMana: plan.currentMana,
          maxMana: plan.maxMana,
          votesPlanned: plan.votes.length,
          votesBroadcast: exec.broadcast,
          votesDryRun: exec.dryRun,
          errors: exec.errors,
          strategy: {
            archetype: plan.strategy.archetype,
            disposition: plan.strategy.disposition,
            feeds: plan.strategy.feeds,
            fieldSize: plan.strategy.fieldSize,
            emphasisHits: plan.strategy.emphasisHits,
            votingPowerBps: plan.strategy.votingPowerBps,
            eligibleCount: plan.strategy.eligibleCount,
            acted: plan.strategy.acted,
            decision: plan.strategy.decision,
          },
          radar: {
            posts: plan.radar.posts,
            mispricingEnergy: plan.radar.mispricingEnergy,
            components: plan.radar.components,
            durable: plan.radar.durable,
            topSinks: Object.freeze(plan.radar.sinks.slice(0, 5).map((s) => `${s.author}/${s.permlink}`)),
          },
          intelligence: {
            fiedler: plan.intelligence.spectral.fiedler,
            decayHalfLife: plan.intelligence.spectral.decayHalfLife,
            cartelCycles: plan.intelligence.cartels.cycle.b1,
            bridges: plan.intelligence.curvature.bridges.length,
            topByExpectedAlpha: Object.freeze(plan.intelligence.posts.slice(0, 5).map((pi) => `${pi.key} E[α]=${pi.expectedAlpha.toFixed(2)}`)),
            cartelTrailsFlagged: plan.intelligence.posts.filter((pi) => pi.likelyCartelTrail).length,
          },
        };
      }

      let heBalancesForGaming: readonly { symbol: string; balance: string }[] = [];
      if (this.control.isEnabled("trading")) {
        const plan = await planTrades(member);
        tradingPlan = plan;
        const armed = this.control.live && this.control.isEnabled("trading");
        const exec = await executeTrading(member, plan, armed);
        heBalancesForGaming = plan.market.heBalances;
        hive = plan.hive;
        hbd = plan.hbd;
        tradesInferred = plan.trades.length;
        tradesExec = exec.tradesExecuted;
        lpAct = exec.lpExecuted;
        lpCount = plan.lp.length;
        trading = {
          mode: exec.mode,
          hive: plan.hive,
          hbd: plan.hbd,
          tradesPlanned: plan.trades.length,
          tradesExecuted: exec.tradesExecuted,
          lpPlanned: plan.lp.length,
          lpExecuted: exec.lpExecuted,
          savingsPlanned: plan.savings !== null,
          savingsExecuted: exec.savingsExecuted,
        };
      }

      // Locked lanes: prepared for review, never executed.
      const draft = composeDraft(member, `Autonomous operations summary for ${account} (prepared draft, not posted).`);
      let draftsPrepared = draft.approvedForBroadcast ? 0 : 1;

      // Daily analysis posts (LOCKED drafts, once per UTC day per account/topic):
      //   @help-fund     → Hive-Engine liquidity report
      //   @sigmund-vexler → the spectral state of Hive
      // Composed only; posting stays locked, nothing broadcasts.
      try {
        const ts = new Date().toISOString();
        if (account === "help-fund" && tradingPlan && isDraftDue(this.store, account, "he-liquidity", ts)) {
          recordAnalysisDraft(this.store, composeLiquidityPost(account, tradingPlan.liquidity, ts));
          draftsPrepared++;
        }
        if (account === "sigmund-vexler" && votingPlan && isDraftDue(this.store, account, "hive-spectral", ts)) {
          recordAnalysisDraft(this.store, composeSpectralPost(account, votingPlan.intelligence, votingPlan.radar, ts));
          draftsPrepared++;
        }
      } catch { /* draft composition is best-effort; never the operational path */ }

      posting = { draftsPrepared, locked: true };

      const gamePlan = planGames(member, heBalancesForGaming);
      gaming = { gamesDetected: gamePlan.games.length, games: Object.freeze(gamePlan.games.map((g) => g.game)), locked: true };

      // Incentive subsystem: scan the same feed for "do X, get Y" offers, value
      // and scam-filter them, authorize, and route. Auto offers (opt-in, gated)
      // execute; the rest become human-gated nominations. Best-effort.
      try {
        const offers = ingestOffers(votingPlan?.rawPosts ?? []);
        if (offers.length > 0) {
          const liquidity: LiquidityReading = tradingPlan?.liquidity ?? EMPTY_LIQUIDITY;
          const scored = rankOffers(offers, liquidity);
          const authorized = authorizeOffers(scored, {
            policy: member.policy,
            live: this.control.live,
            isEnabled: (cap) => this.control.isEnabled(cap),
          });
          const ts = new Date().toISOString();
          recordNominationsForAccount(this.store, account, ts, authorized);
          let autoExecuted = 0;
          for (const a of authorized) {
            if (a.disposition !== "auto") continue;
            const res = await executeAutoOffer(member, a, this.control.live && this.control.isEnabled("voting"));
            if (res.actions.some((x) => x.status === "broadcast")) autoExecuted++;
          }
          incentive = {
            offersFound: offers.length,
            nominated: authorized.filter((a) => a.disposition === "nominate").length,
            autoExecuted,
            topOffers: Object.freeze(scored.slice(0, 5).map((s) => `${s.offer.source.author}/${s.offer.source.permlink} EV=${s.ev.toFixed(3)} [${s.offer.requiredActions.map((x) => x.kind).join(",")}]`)),
          };
        } else {
          incentive = { offersFound: 0, nominated: 0, autoExecuted: 0, topOffers: Object.freeze([]) };
        }
      } catch { /* incentive scan is best-effort, never the operational path */ }

      // The witnessing ledger is recorded once per fleet tick by runTick (the
      // chain-global feeds are witnessed once, not once per account). The small
      // derived per-account metrics still log here.
      recordAccountTick(this.store, account, {
        ts: new Date().toISOString(),
        currentMana,
        maxMana,
        hive,
        hbd,
        vests,
        votesAct,
        votesAbst,
        tradesInferred,
        tradesExec,
        lpAct,
        lpCount,
      });

      const readout = Object.freeze({
        account,
        ...(voting ? { voting } : {}),
        ...(trading ? { trading } : {}),
        ...(posting ? { posting } : {}),
        ...(gaming ? { gaming } : {}),
        ...(incentive ? { incentive } : {}),
      });
      return { readout, votingPlan, tradingPlan };
    } catch (err) {
      return { readout: Object.freeze({ account, error: err instanceof Error ? err.message : String(err) }) };
    }
  }

  /** Start the autonomous loop: run a tick now, then reschedule after each
   *  completes until the signal aborts or the control plane is paused. */
  start(signal: AbortSignal): void {
    const cadenceMs = this.config.cadenceSeconds * 1000;
    const loop = async (): Promise<void> => {
      if (signal.aborted) return;
      if (this.control.running) {
        try { await this.runTick(); } catch { /* a failed tick never kills the loop */ }
      }
      if (signal.aborted) return;
      this.timer = setTimeout(() => { void loop(); }, cadenceMs);
    };
    signal.addEventListener("abort", () => { if (this.timer) clearTimeout(this.timer); }, { once: true });
    void loop();
  }

  get isTicking(): boolean {
    return this.ticking;
  }
}
