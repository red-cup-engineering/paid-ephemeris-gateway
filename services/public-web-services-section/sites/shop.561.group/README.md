# shop.561.group

The one page that lists everything the 561 Group sells: ebooks today,
newsletters, briefings, merch, and links out to the metered APIs
(`market.561.group`) and the games catalog (`play.561.group`) that are
sold elsewhere.

## What this is

A Cloudflare Worker (`src/worker.mjs`) composing two published packages
rather than re-implementing either:

- `@red-cup-engineering/digital-goods-storefront-services-section` --
  catalog validation, buyer-facing view-model shaping, static HTML
  rendering, and signed/expiring download tokens (Web Crypto only).
- `@red-cup-engineering/stripe-services-section` -- the card rail:
  Checkout Session creation and verified-webhook ingestion over an
  ActivityStreams `Offer`/`Accept` envelope.

`catalog.json` in this site is the catalog -- the one source of truth
for what's listed, its price, its status, and its goods (name,
content-type, byte length, sha256).

This site owns only what both packages' own READMEs name as
"not built here": the Worker routing, the `SHOP_ENTITLEMENTS` KV
namespace and `SHOP_GOODS` R2 bucket bindings, and the honest
unarmed/no-entitlement states.

## Routes

| Route | Behavior |
|---|---|
| `GET /` | Renders the catalog from the engine. |
| `GET /goods/:id` | Renders one offering's product page from the engine. |
| `GET /catalog.json` | Serves `catalog.json` verbatim. |
| `GET` or `POST /checkout/:id` | Solicits + invokes a Stripe Checkout Session for a `live`/`test-only` offering; 303s to the Checkout URL. Returns an honest 409 page when no `STRIPE_SECRET_KEY` is bound. `GET` is accepted too so the engine's own rendered "Buy" anchor works as a plain link. |
| `POST /webhooks/stripe` | Verifies the Stripe signature and ingests the event; on a fresh `checkout.session.completed` it writes one KV entitlement keyed by the Checkout Session id. |
| `GET /thanks?session_id=...` | Issues one signed, one-hour download token per good, gated on the KV entitlement (and, when a Stripe key is bound, an independent confirmation against the Stripe API). |
| `GET /download/:token` | Verifies the token and streams the good from R2. |

## Bindings and hands items

Provisioned this deploy:

- KV namespace `SHOP_ENTITLEMENTS` (`9372634aa5ca4c87937c6d3dd457bef6`).
- R2 bucket `shop-561-group-goods`, binding `SHOP_GOODS`, holding the
  four ebook files under `goods/<offering-id>/<filename>`.
- Secret `SHOP_TOKEN_SECRET` (`wrangler secret put`, random, not in
  source).

**Hands items -- the founder's own account actions, not set here:**
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (`wrangler secret put`
from a Stripe dashboard). Until they're set, every buy affordance on
the site honestly reads "checkout not yet armed" / 409 -- this is the
storefront engine's own `checkoutArmed` state, read from
`stripe-services-section`'s `readiness()`, never re-decided locally.

## Deploying

```sh
npm install
npm test
npx wrangler deploy
```

## A stripe-services-section fix this site's deploy required

`@red-cup-engineering/stripe-services-section@0.1.7`'s `src/service.mjs`
computed `createRequire(import.meta.url)` and
`fileURLToPath(import.meta.url)` at module top level. That crashed this
Worker's deploy (`workerd` validation: "must be a file URL object... Received
'undefined'") even though the only code path that needs either --
`loadCatalog`'s on-disk fallback -- is never reached when a caller (this
Worker, always) supplies `options.catalog` and `options.store`, exactly
as the module's own doc comment already promised. Fixed upstream, in
place, as `@red-cup-engineering/stripe-services-section@0.1.8` (deferred
both into a lazy `packageRoot()` helper and a call-time `createRequire()`
inside `loadCatalog`; no exported symbol changed) -- this site pins that
version. Publish receipt:
`web2-platform-services-section/data/logs/` via
`semantic-record-journal-service` (`red-cup-engineering.package-publish-service-record`,
`ni:///sha-256;W9FN0aCkeP-AObLLbz0TixyRxyS8wepIm_08V6-I-FA`).

## Testing

```sh
npm test
```

Plain `node --test`, fake KV/R2/`fetch` doubles -- no live Stripe or
Cloudflare calls.
