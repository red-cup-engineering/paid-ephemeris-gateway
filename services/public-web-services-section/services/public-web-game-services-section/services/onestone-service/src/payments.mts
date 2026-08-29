/**
 * `payments` — a provider-agnostic micropayment boundary with real Stripe and Hive adapters.
 *
 * Near-verbatim port of flickering-delve-service's payments boundary (see
 * ../flickering-delve-service/src/payments.mts), renamed onto onestone's own contract: SKUs
 * are `./economy.mts`'s `SKUS` (typed `Sku` from `./types.mts` — `cents` + a bounded `grant`,
 * never a flat resource), and orders are the shared `Order` shape from `./types.mts` rather
 * than a bespoke local type, so the scene, the server, and the audit ledger all agree on what
 * an order looks like without translation at the boundary.
 *
 * One small interface (`PaymentProvider`): make an *intent* the client can act on, and
 * *settle* it when the money actually moves. Three adapters implement it:
 *   - `mock` — clears instantly; the default in dev / when no secrets are configured, so the
 *     game is fully playable and testable without a payment processor.
 *   - `stripe` — real REST against api.stripe.com (a PaymentIntent keyed by our order id), with
 *     real webhook **signature verification** (HMAC-SHA256, constant-time) on settle.
 *   - `hive` — real on-chain settle: a player transfers HIVE to our game account with the order
 *     id as the memo, and we confirm it by reading the account history over RPC. Receiving
 *     needs no private keys, so this adapter is safe to run with only a public account name.
 *
 * Every cleared payment is recorded on the append-only audit ledger (`./ledger.mts`) as a
 * balanced double-entry transaction, idempotently keyed on the order id so a retried webhook
 * can never double-post. Settling returns the order's `Sku` alongside the cleared order so the
 * caller (scene.mts) can apply `economy.mts`'s `grantSku` — payments never grants resources
 * itself, it only proves the money moved.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Order, Sku } from "./types.mts";
import { skuById } from "./economy.mts";
import type { AuditLedger, LedgerEntry } from "./ledger.mts";

export { skuById };

/** What a provider hands back to the client after `createIntent`. */
export interface IntentResult {
  readonly provider: string;
  readonly orderId: string;
  /** Provider-specific instructions for the client (client_secret, a memo+account, …). */
  readonly instructions: Record<string, unknown>;
}

/** What a provider hands back after checking whether the money actually moved. */
export interface ProviderSettleResult {
  readonly cleared: boolean;
  readonly detail: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly configured: boolean;
  createIntent(order: Order, sku: Sku): Promise<IntentResult>;
  /** Verify the money moved. `evidence` is a webhook body (Stripe) or unused (mock/Hive polls). */
  settle(order: Order, sku: Sku, evidence?: unknown): Promise<ProviderSettleResult>;
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
      const body = new URLSearchParams({
        amount: String(sku.cents), currency: "usd",
        "metadata[orderId]": order.id, "metadata[account]": order.account, "metadata[sku]": sku.id,
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

/**
 * v1 has no live USD/HIVE price feed (roadmap: "real Stripe product setup ... BEFORE /pay
 * goes live in production" — the same doctrine applies to Hive pricing). This fixed peg is a
 * placeholder in the sibling's own charm-priced ratio (~0.30 HIVE per dollar) purely so the
 * hive adapter has *something* deterministic to quote and confirm against in dev/tests.
 */
const HIVE_PER_USD_CENT = 0.00301;

/** Convert a SKU's USD cents to a HIVE-denominated amount string (3dp, HIVE's minor unit). */
function centsToHive(cents: number): string {
  return (cents * HIVE_PER_USD_CENT).toFixed(3);
}

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
        instructions: { kind: "hive", to: account, amount: `${centsToHive(sku.cents)} HIVE`, memo: order.id,
          note: "Transfer the amount to this account with this memo, then press Confirm." },
      };
    },
    async settle(order, sku) {
      if (!configured) return { cleared: false, detail: "hive not configured" };
      try {
        const node = rpcNodes[0];
        if (node === undefined) return { cleared: false, detail: "no hive rpc node configured" };
        const response = await fetch(node, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "condenser_api.get_account_history", params: [account, -1, 200] }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { result?: unknown[]; error?: { message?: string } };
        if (payload.error !== undefined) throw new Error(payload.error.message ?? "Hive RPC error");
        const history = payload.result ?? [];
        const required = Number(centsToHive(sku.cents));
        for (const row of history) {
          const op = (row as [number, { op?: [string, Record<string, unknown>] }])[1]?.op;
          if (op === undefined || op[0] !== "transfer") continue;
          const t = op[1] as { to?: string; memo?: string; amount?: string };
          if (t.to !== account || t.memo !== order.id) continue;
          const paid = Number((t.amount ?? "0").split(" ")[0]);
          if (paid + 1e-9 >= required) return { cleared: true, detail: `hive transfer ${t.amount} confirmed` };
        }
        return { cleared: false, detail: "no matching transfer yet" };
      } catch (err) {
        return { cleared: false, detail: `hive rpc error: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}

// ── the manager: providers + ledger + order lifecycle ────────────────────────────────

export interface PaymentsConfig {
  readonly stripeSecretKey?: string | undefined;
  readonly stripeWebhookSecret?: string | undefined;
  readonly hiveAccount?: string | undefined;
  readonly hiveNodes?: readonly string[] | undefined;
}

/** A cleared order plus the SKU it paid for, so the caller can apply the SKU's bounded grant. */
export interface ClearedPurchase {
  readonly order: Order;
  readonly sku: Sku;
}

export class Payments {
  private readonly ledger: AuditLedger;
  private readonly now: () => number;
  private readonly providers: Map<string, PaymentProvider>;
  private readonly orders = new Map<string, Order>();
  private counter = 0;

  constructor(ledger: AuditLedger, config: PaymentsConfig = {}, now: () => number = () => Date.now()) {
    this.ledger = ledger;
    this.now = now;
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

  /** Look up a previously-minted order (for server route bookkeeping / tests). */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * The best default provider: a configured real one if present, else mock. A client-supplied
   * `requested` provider is honored only when it's actually configured — EXCEPT `mock` can
   * never be explicitly selected once a real provider (stripe/hive) is configured. Without
   * that carve-out, `mockProvider.configured` being unconditionally `true` (by design, so dev/
   * test never needs secrets) would let any caller send `provider:"mock"` in production and
   * clear any order for free — `resolve` is the one place that distinction has to be made,
   * since every real provider's own `configured` flag correctly reflects deployment state but
   * mock's deliberately doesn't.
   */
  private resolve(requested: string | undefined): PaymentProvider {
    const stripe = this.providers.get("stripe")!;
    const hive = this.providers.get("hive")!;
    const realConfigured = stripe.configured || hive.configured;
    if (requested !== undefined && !(requested === "mock" && realConfigured)) {
      const p = this.providers.get(requested);
      if (p !== undefined && p.configured) return p;
    }
    return stripe.configured ? stripe : hive.configured ? hive : this.providers.get("mock")!;
  }

  /** Begin a purchase: mint an `Order` and ask the provider for client instructions. */
  async intent(account: string, skuId: string, providerId?: string): Promise<IntentResult> {
    const sku = skuById(skuId);
    if (sku === undefined) throw new Error(`unknown sku ${skuId}`);
    const provider = this.resolve(providerId);
    const order: Order = {
      id: `ord-${++this.counter}-${account}`,
      account, skuId: sku.id, provider: provider.id,
      status: "pending", createdAt: this.now(), clearedAt: null, ref: "",
    };
    const res = await provider.createIntent(order, sku);
    // Adopt whatever provider-specific handle the intent minted (Stripe PaymentIntent id,
    // Hive memo, mock token) as the order's `ref`, falling back to the order id itself.
    const handle = res.instructions["paymentIntent"] ?? res.instructions["memo"];
    this.orders.set(order.id, { ...order, ref: typeof handle === "string" ? handle : order.id });
    return res;
  }

  /**
   * Settle an order. On a verified clear we (idempotently) post a balanced double-entry
   * transaction to the audit ledger and return the cleared order + its SKU so the caller can
   * grant it. Returns null if not cleared (or the order is unknown) — INCLUDING when the order
   * was already cleared by a prior `settle()` call. That last case is deliberate, not merely a
   * shortcut: every caller (server.mts's `/pay` and `/webhook/stripe` routes) grants the SKU
   * exactly when `settle()` returns non-null, with no memory of whether it already granted this
   * order before. If an already-cleared order re-verified `evidence` and returned a fresh
   * `ClearedPurchase` on every call, a caller replaying a known order id (a resent webhook, or
   * an attacker who simply read an old order id back from a prior `/pay` response) could re-
   * trigger the grant indefinitely — the ledger's `has(order.id)` dedup stops the AUDIT TRAIL
   * from double-posting, but does nothing to stop the wallet from being credited again, so the
   * grant itself has to be gated here, at the one place that knows an order has already
   * finished clearing.
   */
  async settle(orderId: string, evidence?: unknown): Promise<ClearedPurchase | null> {
    const order = this.orders.get(orderId);
    if (order === undefined) return null;
    if (order.status === "cleared") return null;
    const sku = skuById(order.skuId);
    if (sku === undefined) return null;
    const provider = this.providers.get(order.provider) ?? mockProvider;
    const result = await provider.settle(order, sku, evidence);
    if (!result.cleared) return null;
    if (!this.ledger.has(order.id)) {
      const isHive = provider.id === "hive";
      const amount = isHive ? centsToHive(sku.cents) : (sku.cents / 100).toFixed(2);
      const commodity = isHive ? "HIVE" : "USD";
      const entry: LedgerEntry = {
        date: new Date(this.now()).toISOString().slice(0, 10),
        narration: `${provider.id} purchase: ${sku.title} (${order.account})`,
        ref: order.id,
        postings: [
          { account: `assets:cash:${provider.id}`, amount, commodity },
          { account: "income:premium", amount: `-${amount}`, commodity },
        ],
      };
      this.ledger.record(entry);
    }
    const cleared: Order = { ...order, status: "cleared", clearedAt: this.now() };
    this.orders.set(order.id, cleared);
    return { order: cleared, sku };
  }

  /** Settle by webhook payload (Stripe) — find the order from the event metadata. */
  async settleStripeWebhook(payload: string, signature: string): Promise<ClearedPurchase | null> {
    let orderId: string | undefined;
    try { orderId = (JSON.parse(payload) as { data?: { object?: { metadata?: { orderId?: string } } } }).data?.object?.metadata?.orderId; } catch { return null; }
    if (orderId === undefined) return null;
    return this.settle(orderId, { payload, signature });
  }
}
