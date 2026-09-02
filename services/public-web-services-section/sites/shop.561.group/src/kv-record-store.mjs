/**
 * A minimal `{record, query}` evidence-store adapter over one Workers KV
 * binding, satisfying the shape `@red-cup-engineering/stripe-services-section`
 * expects in place of its on-disk WitnessJournal fallback.
 *
 * `query` is a stub that always returns `[]`: stripe-services-section's own
 * `eventSeen()` calls `provider.query(...)` synchronously (no `await`), and
 * Workers KV has no synchronous read, so this store cannot honor a real
 * synchronous dedup lookup. That is not a gap in this Worker's own
 * idempotency: the webhook handler enforces the actual invariant --
 * an entitlement is written once per Stripe Checkout Session id -- directly
 * against `SHOP_ENTITLEMENTS`, independent of this store. `record` still
 * writes a genuine, deterministically-keyed audit row (keyed by the
 * record's own `id`, e.g. `urn:stripe-event-receipt:evt_...`), so a retried
 * webhook or checkout overwrites its own row rather than accumulating
 * duplicates.
 * @param {{put: Function}} kv a Workers KV namespace binding
 * @returns {{record: (entry: object) => Promise<object>, query: () => []}}
 */
export function createKvRecordStore(kv) {
  return {
    query: () => [],
    async record(entry) {
      const key = `record:${entry?.record?.id ?? crypto.randomUUID()}`;
      await kv.put(key, JSON.stringify(entry));
      return entry;
    },
  };
}
