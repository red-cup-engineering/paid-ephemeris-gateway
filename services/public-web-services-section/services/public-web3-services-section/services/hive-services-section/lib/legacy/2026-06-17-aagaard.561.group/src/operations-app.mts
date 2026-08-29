// operations-app — the fleet's control plane and observability surface.
//
// A thin HTTP binding over the orchestrator and state store (the doctrine: keep
// the logic in pure modules, make the transport a thin binding). It is mounted
// at /ops alongside the Propolis per-account read surface. Endpoints:
//
//   GET  /ops                      fleet status (live, running, enabled, accounts)
//   GET  /ops/health               liveness
//   GET  /ops/capabilities         per-lane state (enabled / locked)
//   POST /ops/capabilities/:cap/:action   enable|disable an UNLOCKED lane
//   POST /ops/arm | /ops/disarm    allow / forbid broadcasts fleet-wide
//   POST /ops/pause | /ops/resume  stop / start the loop
//   POST /ops/tick                 run one cycle now, return the readout
//   GET  /ops/last                 the most recent fleet readout
//   GET  /ops/ticks?limit=N        recent fleet ticks
//   GET  /ops/alpha/:account       the live alpha radar for one account
//   GET  /ops/strategies           every wallet's voting character (static)
//   GET  /ops/strategy/:account    one wallet's character + its live ballot
//
// Locked lanes (posting, gaming) report `locked: true` and cannot be enabled
// here — the control plane refuses, by design.

import type { App, Context } from "@emsenn/http-server";
import { jsonRepr } from "@emsenn/http-server";

import { ALL_CAPABILITIES, isLocked, type AagaardConfig, type Capability } from "./config.mts";
import type { Fleet } from "./fleet.mts";
import type { Orchestrator } from "./orchestrator.mts";
import { readLastReadout, readFleetTicks, type StateStore } from "./state.mts";
import { planVotes } from "./voting.mts";
import { feedSourcesFor } from "./strategy.mts";
import type { FeedSource } from "@emsenn/computing-with-hive/scripts";
import { planTrades } from "./trading.mts";
import { listNominations, dispositionNomination, type DispositionChoice } from "./incentive/arbitration.mts";
import { readAnalysisDrafts } from "./analysis-posts.mts";

/** A human-readable label for one assembled feed source. */
function describeFeedSource(src: FeedSource): string {
  switch (src.kind) {
    case "ranked": return src.tag ? (src.tag.startsWith("hive-") ? `community:${src.tag}` : `#${src.tag}`) : `main(${src.sort ?? "trending"})`;
    case "following": return "own-feed";
    case "blog": return `blog:@${src.account}`;
  }
}

function pathParams(prefix: string, names: readonly string[]): (path: string) => Record<string, string> | null {
  return (p) => {
    if (!p.startsWith(`${prefix}/`)) return null;
    const rest = p.slice(prefix.length + 1).split("/");
    if (rest.length !== names.length) return null;
    const out: Record<string, string> = {};
    for (let i = 0; i < names.length; i++) {
      const seg = rest[i];
      if (seg === undefined || seg === "") return null;
      out[names[i] as string] = decodeURIComponent(seg);
    }
    return out;
  };
}

function isCapability(value: string): value is Capability {
  return (ALL_CAPABILITIES as readonly string[]).includes(value);
}

export function createOperationsApp(deps: {
  readonly config: AagaardConfig;
  readonly fleet: Fleet;
  readonly orchestrator: Orchestrator;
  readonly store: StateStore;
}): App {
  const { config, fleet, orchestrator, store } = deps;
  const control = orchestrator.control;

  const status = () => ({
    kind: "aagaard.ops.status",
    name: config.name,
    running: control.running,
    live: control.live,
    ticking: orchestrator.isTicking,
    cadenceSeconds: config.cadenceSeconds,
    enabled: control.enabledList(),
    accounts: [...fleet.values()].map((m) => ({
      account: m.account,
      capabilities: m.policy.capabilities,
      tradingLive: m.policy.risk.tradingLive,
      hasPosting: m.hasPosting,
      hasActive: m.hasActive,
    })),
  });

  const capabilities = () => ({
    kind: "aagaard.ops.capabilities",
    capabilities: ALL_CAPABILITIES.map((c) => ({
      capability: c,
      locked: isLocked(c),
      enabled: control.isEnabled(c),
    })),
  });

  return {
    resources: [
      {
        match: "/",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(status()),
      },
      {
        match: "/health",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr({ status: "ok", running: control.running, live: control.live }),
      },
      {
        match: "/capabilities",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(capabilities()),
      },
      {
        match: pathParams("/capabilities", ["cap", "action"]),
        methods: ["POST"],
        produces: ["application/json"],
        handler: (ctx: Context) => {
          const cap = ctx.params["cap"] ?? "";
          const action = ctx.params["action"] ?? "";
          if (!isCapability(cap)) return jsonRepr({ error: `unknown capability ${cap}` }, 400);
          if (isLocked(cap)) return jsonRepr({ error: `${cap} is locked: prepared but disabled pending human review (unlock in source)`, capability: cap, locked: true }, 403);
          if (action === "enable") { control.enable(cap); return jsonRepr({ capability: cap, enabled: true }); }
          if (action === "disable") { control.disable(cap); return jsonRepr({ capability: cap, enabled: false }); }
          return jsonRepr({ error: `unknown action ${action} (expected enable|disable)` }, 400);
        },
      },
      {
        match: "/arm",
        methods: ["POST"],
        produces: ["application/json"],
        handler: () => { control.live = true; return jsonRepr({ live: true, note: "broadcasts permitted on enabled, account-eligible lanes" }); },
      },
      {
        match: "/disarm",
        methods: ["POST"],
        produces: ["application/json"],
        handler: () => { control.live = false; return jsonRepr({ live: false, note: "all broadcasts suppressed; plans still computed" }); },
      },
      {
        match: "/pause",
        methods: ["POST"],
        produces: ["application/json"],
        handler: () => { control.running = false; return jsonRepr({ running: false }); },
      },
      {
        match: "/resume",
        methods: ["POST"],
        produces: ["application/json"],
        handler: () => { control.running = true; return jsonRepr({ running: true }); },
      },
      {
        match: "/tick",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async () => {
          try { return jsonRepr(await orchestrator.runTick()); }
          catch (err) { return jsonRepr({ error: err instanceof Error ? err.message : String(err) }, 500); }
        },
      },
      {
        match: "/last",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => { const last = readLastReadout(store); return last ? jsonRepr(last) : jsonRepr({ note: "no tick recorded yet" }, 404); },
      },
      {
        match: "/ticks",
        methods: ["GET"],
        produces: ["application/json"],
        handler: (ctx: Context) => {
          const raw = Number.parseInt(ctx.url.searchParams.get("limit") ?? "20", 10);
          const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 200) : 20;
          return jsonRepr({ ticks: readFleetTicks(store, limit) });
        },
      },
      {
        match: pathParams("/alpha", ["account"]),
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          const account = ctx.params["account"] ?? "";
          const member = fleet.get(account);
          if (!member) return jsonRepr({ error: `unknown account ${account}` }, 404);
          try {
            const plan = await planVotes(member);
            return jsonRepr({ account, radar: plan.radar, votesPlanned: plan.votes.length });
          } catch (err) {
            return jsonRepr({ error: err instanceof Error ? err.message : String(err) }, 500);
          }
        },
      },
      {
        // Every wallet's voting character — archetype, disposition, and the
        // feed assemblage it watches. Static (no chain reads), so it is the
        // cheap way to see how the fleet's votes are directed.
        match: "/strategies",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr({
          strategies: [...fleet.values()].map((m) => ({
            account: m.account,
            archetype: m.policy.strategy.archetype,
            disposition: m.policy.strategy.disposition,
            feeds: feedSourcesFor(m.policy.strategy).map(describeFeedSource),
            objective: m.policy.strategy.objective,
            pacing: m.policy.strategy.pacing,
          })),
        }),
      },
      {
        // One wallet's character plus the live ballot it would cast right now:
        // the assembled field, where it found community-fit, and the funded
        // votes in objective order with their reasons.
        match: pathParams("/strategy", ["account"]),
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          const account = ctx.params["account"] ?? "";
          const member = fleet.get(account);
          if (!member) return jsonRepr({ error: `unknown account ${account}` }, 404);
          try {
            const plan = await planVotes(member);
            return jsonRepr({
              account,
              strategy: plan.strategy,
              objective: member.policy.strategy.objective,
              votesPlanned: plan.votes.length,
              votes: plan.votes.slice(0, 12).map((v) => ({
                author: v.author, permlink: v.permlink, weightBps: v.weightBps,
                strategyAlpha: v.strategyAlpha, emphasis: v.emphasis, reason: v.reason,
              })),
            });
          } catch (err) {
            return jsonRepr({ error: err instanceof Error ? err.message : String(err) }, 500);
          }
        },
      },
      {
        // The full Voting v2 composite: spectral gap, cartel cohomology,
        // curvature bridges, and the per-post expected captured alpha.
        match: pathParams("/intelligence", ["account"]),
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          const account = ctx.params["account"] ?? "";
          const member = fleet.get(account);
          if (!member) return jsonRepr({ error: `unknown account ${account}` }, 404);
          try {
            const plan = await planVotes(member);
            const intel = plan.intelligence;
            return jsonRepr({
              account,
              spectral: { fiedler: intel.spectral.fiedler, lambdaMax: intel.spectral.lambdaMax, components: intel.spectral.components, decayHalfLife: intel.spectral.decayHalfLife, durable: intel.spectral.durable },
              cartels: { b1: intel.cartels.cycle.b1, cycleDensity: intel.cartels.cycle.cycleDensity, tightPairs: intel.cartels.tightPairs },
              bridges: intel.curvature.bridges,
              posts: intel.posts.slice(0, 12),
            });
          } catch (err) {
            return jsonRepr({ error: err instanceof Error ? err.message : String(err) }, 500);
          }
        },
      },
      {
        // The incentive arbitration queue: pending nominations + dispositioned.
        match: "/incentives",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(listNominations(store)),
      },
      {
        // Disposition a nomination: ignore | llm-draft | manual.
        match: pathParams("/incentives", ["offerId", "choice"]),
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          const offerId = ctx.params["offerId"] ?? "";
          const choice = ctx.params["choice"] ?? "";
          if (choice !== "ignore" && choice !== "llm-draft" && choice !== "manual") {
            return jsonRepr({ error: `unknown choice ${choice} (expected ignore|llm-draft|manual)` }, 400);
          }
          const updated = await dispositionNomination(store, new Date().toISOString(), offerId, choice as DispositionChoice);
          if (!updated) return jsonRepr({ error: `unknown nomination ${offerId}` }, 404);
          return jsonRepr({ offerId, status: updated.status, ...(updated.draft ? { draft: updated.draft } : {}) });
        },
      },
      {
        // Liquidity map within/between the three venues (task #20).
        match: pathParams("/liquidity", ["account"]),
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          const account = ctx.params["account"] ?? "";
          const member = fleet.get(account);
          if (!member) return jsonRepr({ error: `unknown account ${account}` }, 404);
          try {
            const plan = await planTrades(member);
            return jsonRepr({ account, liquidity: plan.liquidity });
          } catch (err) {
            return jsonRepr({ error: err instanceof Error ? err.message : String(err) }, 500);
          }
        },
      },
      {
        // The LOCKED analysis-post drafts for an account, pending human review.
        match: pathParams("/drafts", ["account"]),
        methods: ["GET"],
        produces: ["application/json"],
        handler: (ctx: Context) => {
          const account = ctx.params["account"] ?? "";
          const raw = Number.parseInt(ctx.url.searchParams.get("limit") ?? "10", 10);
          const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 50) : 10;
          return jsonRepr({ account, locked: true, drafts: readAnalysisDrafts(store, account, limit) });
        },
      },
    ],
  };
}
