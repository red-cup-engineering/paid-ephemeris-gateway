/**
 * `payments` — a provider-agnostic micropayment boundary with real Stripe and Hive adapters.
 *
 * The boundary is one small interface (`PaymentProvider`): make an *intent* the client can act
 * on, and *settle* it when the money actually moves. Three adapters implement it:
 *   - `mock` — clears instantly; the default in dev / when no secrets are configured, so the
 *     game is fully playable and testable without a payment processor.
 *   - `stripe` — real REST against api.stripe.com (a PaymentIntent keyed by our order id), with
 *     real webhook **signature verification** (HMAC-SHA256, constant-time) on settle.
 *   - `hive` — real on-chain settle: a player transfers HIVE/HBD to our game account with the
 *     order id as the memo, and we confirm it by reading the account history over RPC. Receiving
 *     needs no private keys, so this adapter is safe to run with only a public account name.
 *
 * Every cleared payment is recorded on the ledger and grants a *bounded*
 * boost (a time-limited rate multiplier or offline-cap extension — `Reward = k·CurrentRate·Time`
 * in shape), never a flat resource grant that could skip tutorial unlocks or prestige.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { type Ledger, type LedgerEntry } from "./ledger.mts";

/** A purchasable boost. Prices are exact decimal strings; effects are bounded and time-limited. */
export interface Sku {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
  readonly priceUsd: string;
  readonly priceHive: string;
  readonly boost: { readonly kind: "rate" | "offline"; readonly value: number; readonly durationSeconds: number };
}

/** The store. Deliberately small and non-coercive: convenience and time, never power spikes. */
export const SKUS: readonly Sku[] = [
  { id: "kindling", name: "Kindling", blurb: "Production ×2 for an hour.", priceUsd: "0.99", priceHive: "0.300",
    boost: { kind: "rate", value: 2, durationSeconds: 3600 } },
  { id: "bonfire", name: "Bonfire", blurb: "Production ×3 for four hours.", priceUsd: "2.99", priceHive: "0.900",
    boost: { kind: "rate", value: 3, durationSeconds: 4 * 3600 } },
  { id: "long-watch", name: "Long Watch", blurb: "Triple your offline window for a week.", priceUsd: "1.99", priceHive: "0.600",
    boost: { kind: "offline", value: 3, durationSeconds: 7 * 24 * 3600 } },
];

export const skuById = (id: string): Sku | undefined => SKUS.find((s) => s.id === id);

export interface Order {
  readonly id: string;
  readonly actor: string;
  readonly sku: string;
  readonly provider: string;
}

export interface IntentResult {
  readonly provider: string;
  readonly orderId: string;
  /** Provider-specific instructions for the client (client_secret, a memo+account, …). */
  readonly instructions: Record<string, unknown>;
}

export interface SettleResult {
  readonly cleared: boolean;
  readonly detail: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly configured: boolean;
  createIntent(order: Order, sku: Sku): Promise<IntentResult>;
  /** Verify the money moved. `evidence` is a webhook body (Stripe) or unused (Hive polls). */
  settle(order: Order, sku: Sku, evidence?: unknown): Promise<SettleResult>;
}

// ── mock (dev / no secrets) ────────────────────────────────────────────────────────

export const mockProvider: PaymentProvider = {
  id: "mock",
  configured: true,
  async createIntent(order) {
    return { provider: "mock", orderId: order.id, instructions: { kind: "mock", note: "Dev provider — settles instantly." } };
  },
  async settle() {
    return { cleared: true, detail: "mock cleared" };
  },
};

// ── stripe (real REST + webhook signature verification) ──────────────────────────────

export function stripeProvider(secretKey: string | undefined, webhookSecret: string | undefined): PaymentProvider {
  const configured = typeof secretKey === "string" && secretKey.length > 0;
  return {
    id: "stripe",
    configured,
    async createIntent(order, sku) {
      if (!configured) throw new Error("stripe not configured");
      const cents = Math.round(Number(sku.priceUsd) * 100);
      const body = new URLSearchParams({
        amount: String(cents), currency: "usd",
        "metadata[orderId]": order.id, "metadata[actor]": order.actor, "metadata[sku]": sku.id,
        "automatic_payment_methods[enabled]": "true",
      });
      const res = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const json = (await res.json()) as { client_secret?: string; id?: string; error?: { message?: string } };
      if (!res.ok) throw new Error(`stripe: ${json.error?.message ?? res.status}`);
      return { provider: "stripe", orderId: order.id, instructions: { kind: "stripe", clientSecret: json.client_secret, paymentIntent: json.id } };
    },
    async settle(order, _sku, evidence) {
      // `evidence` is { payload, signature } from the webhook route.
      const ev = evidence as { payload?: string; signature?: string } | undefined;
      if (ev?.payload === undefined || ev.signature === undefined) return { cleared: false, detail: "no webhook evidence" };
      if (!verifyStripeSignature(ev.payload, ev.signature, webhookSecret)) return { cleared: false, detail: "bad signature" };
      const event = JSON.parse(ev.payload) as { type?: string; data?: { object?: { metadata?: { orderId?: string } } } };
      if (event.type !== "payment_intent.succeeded") return { cleared: false, detail: `ignored ${event.type}` };
      if (event.data?.object?.metadata?.orderId !== order.id) return { cleared: false, detail: "order mismatch" };
      return { cleared: true, detail: "stripe webhook verified" };
    },
  };
}

/** Verify a Stripe webhook signature header (`t=…,v1=…`) with constant-time comparison. */
export function verifyStripeSignature(payload: string, header: string, secret: string | undefined): boolean {
  if (secret === undefined || secret === "") return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts["t"]; const v1 = parts["v1"];
  if (t === undefined || v1 === undefined) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected); const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── hive (real on-chain receive verification, no keys) ───────────────────────────────

export function hiveProvider(account: string | undefined, nodes?: readonly string[]): PaymentProvider {
  const configured = typeof account === "string" && account.length > 0;
  const rpcNodes = nodes?.length ? nodes : ["https://api.hive.blog"];
  return {
    id: "hive",
    configured,
    async createIntent(order, sku) {
      if (!configured) throw new Error("hive not configured");
      // The player pays by transferring to us with the order id as the memo — we then read it.
      return {
        provider: "hive", orderId: order.id,
        instructions: { kind: "hive", to: account, amount: `${sku.priceHive} HIVE`, memo: order.id,
          note: "Transfer the amount to this account with this memo, then press Confirm." },
      };
    },
    async settle(order, sku) {
      if (!configured) return { cleared: false, detail: "hive not configured" };
      try {
        const response = await fetch(rpcNodes[0]!, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "condenser_api.get_account_history", params: [account, -1, 200] }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { result?: unknown[]; error?: { message?: string } };
        if (payload.error !== undefined) throw new Error(payload.error.message ?? "Hive RPC error");
        const history = payload.result ?? [];
        for (const row of history) {
          const op = (row as [number, { op?: [string, Record<string, unknown>] }])[1]?.op;
          if (op === undefined || op[0] !== "transfer") continue;
          const t = op[1] as { to?: string; memo?: string; amount?: string };
          if (t.to !== account || t.memo !== order.id) continue;
          const paid = Number((t.amount ?? "0").split(" ")[0]);
          if (paid + 1e-9 >= Number(sku.priceHive)) return { cleared: true, detail: `hive transfer ${t.amount} confirmed` };
        }
        return { cleared: false, detail: "no matching transfer yet" };
      } catch (err) {
        return { cleared: false, detail: `hive rpc error: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}

// ── the manager: providers + ledger + boost grant ───────────────────────────────────

/** A boost grant the scene applies — kept provider-agnostic. */
export interface BoostGrant { readonly actor: string; readonly kind: "rate" | "offline"; readonly value: number; readonly durationSeconds: number; }

export interface PaymentsConfig {
  readonly stripeSecretKey?: string | undefined;
  readonly stripeWebhookSecret?: string | undefined;
  readonly hiveAccount?: string | undefined;
  readonly hiveNodes?: readonly string[] | undefined;
}

export class Payments {
  private readonly ledger: Ledger;
  private readonly date: () => string;
  private readonly providers: Map<string, PaymentProvider>;
  private readonly orders = new Map<string, Order>();
  private counter = 0;

  constructor(ledger: Ledger, config: PaymentsConfig = {}, date: () => string = () => new Date().toISOString().slice(0, 10)) {
    this.ledger = ledger;
    this.date = date;
    this.providers = new Map<string, PaymentProvider>([
      ["mock", mockProvider],
      ["stripe", stripeProvider(config.stripeSecretKey, config.stripeWebhookSecret)],
      ["hive", hiveProvider(config.hiveAccount, config.hiveNodes)],
    ]);
  }

  /** Which providers are live (have credentials). `mock` is always available. */
  available(): { id: string; configured: boolean }[] {
    return [...this.providers.values()].map((p) => ({ id: p.id, configured: p.configured }));
  }

  /** The best default provider: a configured real one if present, else mock. */
  private resolve(requested: string | undefined): PaymentProvider {
    if (requested !== undefined) {
      const p = this.providers.get(requested);
      if (p !== undefined && p.configured) return p;
    }
    return this.providers.get("stripe")!.configured ? this.providers.get("stripe")!
      : this.providers.get("hive")!.configured ? this.providers.get("hive")!
      : this.providers.get("mock")!;
  }

  /** Begin a purchase: mint an order and ask the provider for client instructions. */
  async intent(actor: string, skuId: string, providerId?: string): Promise<IntentResult & { sku: string }> {
    const sku = skuById(skuId);
    if (sku === undefined) throw new Error(`unknown sku ${skuId}`);
    const provider = this.resolve(providerId);
    const order: Order = { id: `ord-${++this.counter}-${actor}`, actor, sku: sku.id, provider: provider.id };
    this.orders.set(order.id, order);
    const res = await provider.createIntent(order, sku);
    return { ...res, sku: sku.id };
  }

  /**
   * Settle an order. On a verified clear we (idempotently) post a balanced double-entry
   * transaction to the ledger and return the boost to apply. Returns null if not cleared.
   */
  async settle(orderId: string, evidence?: unknown): Promise<BoostGrant | null> {
    const order = this.orders.get(orderId);
    if (order === undefined) return null;
    const sku = skuById(order.sku)!;
    const provider = this.providers.get(order.provider) ?? mockProvider;
    const result = await provider.settle(order, sku, evidence);
    if (!result.cleared) return null;
    if (!this.ledger.has(order.id)) {
      const isHive = provider.id === "hive";
      const amount = isHive ? sku.priceHive : sku.priceUsd;
      const commodity = isHive ? "HIVE" : "USD";
      const entry: LedgerEntry = {
        date: this.date(),
        narration: `${provider.id} purchase: ${sku.name} (${order.actor})`,
        ref: order.id,
        postings: [
          { account: `assets:cash:${provider.id}`, amount, commodity },
          { account: "income:premium", amount: `-${amount}`, commodity },
        ],
      };
      this.ledger.record(entry);
    }
    return { actor: order.actor, kind: sku.boost.kind, value: sku.boost.value, durationSeconds: sku.boost.durationSeconds };
  }

  /** Settle by webhook payload (Stripe) — find the order from the event metadata. */
  async settleStripeWebhook(payload: string, signature: string): Promise<BoostGrant | null> {
    let orderId: string | undefined;
    try { orderId = (JSON.parse(payload) as { data?: { object?: { metadata?: { orderId?: string } } } }).data?.object?.metadata?.orderId; } catch { return null; }
    if (orderId === undefined) return null;
    return this.settle(orderId, { payload, signature });
  }
}
