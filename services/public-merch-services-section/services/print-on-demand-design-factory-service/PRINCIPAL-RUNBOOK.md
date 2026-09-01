# Principal runbook — Fine Print Mercantile (print-on-demand merch)

Everything engineering can do without a human identity is done: 36 print-ready designs, 12 of them with real generated art on disk (via a free Cloudflare Workers AI Worker this session deployed to your own account), listing copy, shop bio/policies/pricing, all staged in this package. What's left is ~15 minutes of account signup only you can do — it's an identity action, not a design or engineering approval.

## 1. Sign up (≈10 min)

1. Go to printify.com and create a free account (email + password — no business license, no LLC, no tax ID required to start).
2. In the dashboard, add **Pop-Up Store** as a sales channel (Printify → Sales Channels → Pop-Up Store).
3. Name the store **Fine Print Mercantile** and pick a theme (any — the design art carries the brand, not the theme).
4. Paste the shop bio and policies text from `SHOP.md` into the store's About/Policies fields.

## 2. Connect payouts (≈5 min)

1. Printify will prompt a one-time **Stripe** verification to receive payouts — this is identity verification (name, address, bank/routing or existing Stripe account), not a business application. Use your existing PayPal/Stripe if you already have a Stripe account; otherwise Stripe's signup takes the same ~5 minutes.
2. Expected fees: Stripe charges 2.9% + $0.30 per transaction inside the Pop-Up Store checkout. No Printify subscription is required (the free plan covers Pop-Up Store).
3. Payout wiring: Stripe deposits to the bank account (or existing Stripe balance) you connect during verification — same as any other Stripe-powered storefront. No separate PayPal setup needed unless you prefer PayPal as the connected payout method.

## 3. What the automation already did (nothing left to build)

- `apps/print-on-demand-design-factory-cli.mjs all` rendered 36 print-ready SVGs (12in × 15in @ 300 DPI canvas) to `data/state/rendered-designs/`.
- `LISTINGS.md` maps every design to its title, description, tags, and product targets (shirt/mug/sticker/poster) — ready to paste into each Printify product listing.
- `data/records/2026-08-31-pod-channel-decision.json` has the full channel-decision evidence trail if you want to sanity-check the Printify-over-Redbubble/Etsy call before signing up.
- A second, real raster-art generation lane is live and already used: `apps/print-on-demand-design-factory-cli.mjs art-set <ids>` generated the 12 art files above through a private Cloudflare Workers AI Worker (`sites/pod-image-generation-worker`, deployed under your Cloudflare account, unlisted -- no custom domain or public route) at $0 marginal cost, with Gemini direct and OpenRouter wired in as paid fallbacks it doesn't currently need.

### 3a. Why the art lane runs on Cloudflare, not Gemini/OpenRouter

Gemini's free tier carries a confirmed **zero** request/token allowance for every image-output model this key can see (checked 4 model ids, including the lite variant most likely to have one -- all `limit: 0`), and OpenRouter has no free image-output model at all (checked all 50 it currently offers; every one has a nonzero per-image price). That evidence is preserved in `data/records/2026-09-01-image-generation-free-tier-finding.json`. Cloudflare Workers AI, by contrast, gives every account 10,000 free Neurons/day account-wide, and `@cf/black-forest-labs/flux-1-schnell` (the model this pipeline uses) costs about 4.80 Neurons per 512×512 tile -- roughly 2,000 free images/day, verified live against developers.cloudflare.com/workers-ai/platform/pricing and against the deployed Worker itself. No funding decision was needed; nothing here should ever prompt you to enable Gemini billing or buy OpenRouter credits unless Cloudflare's free allocation is later exhausted.

## 4. After the account exists (first listing session, ~1-2 hrs one time)

1. In Printify, create a product (start with the shirt: Bella+Canvas 3001). For a text-only design, upload the corresponding SVG from `data/state/rendered-designs/<id>.svg` as the print file (Printify accepts vector SVG uploads directly for text-based artwork). For one of the 12 designs with generated art, upload `data/state/rendered-designs/<id>-art.png` instead (already a real 2400×2400 PNG, no conversion needed) -- and check `LISTINGS.md`'s "generated art" line for that design to confirm the path.
2. Set the price from `SHOP.md`'s pricing table: text-only tier ($21.99 shirt / $15.99 mug / $4.49 sticker) for SVG designs, illustrated tier ($24.99 shirt / $17.99 mug / $5.49 sticker / $18.99 poster) for the 12 designs with generated art.
3. Paste the title, description, and tags for that design straight from `LISTINGS.md`.
4. Publish to the Pop-Up Store channel.
5. Repeat per design — or, once comfortable with the manual flow, the same data (`LISTINGS.md` + the SVGs + Printify's documented product/publish API at developers.printify.com) is what a future scripted uploader would drive; that scripted step is deliberately not built yet because it would require your API token, i.e. account mutation, which is out of scope until the account exists.

## 5. A realistic first-week listing cadence, once armed

- Day 1: list 6-8 designs from one niche (e.g. programmer-humor) across shirt + one accessory each, to learn the per-listing flow.
- Days 2-5: list the remaining ~28 designs, 6-8 per day, rotating niches so the shop doesn't read as single-topic.
- End of week: all 36 designs live across 3 product types (up to ~90 individual listings if every design gets all three products; realistically start shirt-only for all 36, then layer in mug/sticker for whichever niches get any early traction).

## 6. Honest economics (no hype)

Per-sale margin, at the recommended prices above and typical Printify base costs, after the Stripe processing fee only (no ad spend assumed):
- Shirt: ≈$21.99 − ~$10.00 base − ~$0.94 Stripe ≈ **$11/sale** (~50% margin)
- Mug: ≈$15.99 − ~$7.00 base − ~$0.76 Stripe ≈ **$8/sale** (~50% margin)
- Sticker: ≈$4.49 − ~$2.00 base − ~$0.43 Stripe ≈ **$2/sale** (~46% margin, but stickers are the cheapest to attract an impulse add-on sale)

Realistic early volume for a brand-new, zero-ad-spend Pop-Up Store with 36 organic-search-only listings is **low single-digit sales per week at best in month one** — Pop-Up Store has no built-in marketplace search traffic the way Etsy/Redbubble do, so all traffic has to come from somewhere you drive it (a social post, a link in a bio, word of mouth). If early traction stalls, the cited evidence trail (`data/records/2026-08-31-pod-channel-decision.json`) already shows Etsy as the credible next channel — same designs, same Printify backend, one more identity/signup step for real marketplace search traffic.

`SHOP.md`'s illustrated-tier table gives higher recommended prices (shirt $24.99, mug $17.99, sticker $5.49, plus a new poster product at $18.99) for the 12 designs with generated art, reflecting that full-art POD items generally outsell text-only ones industry-wide — that pattern is not yet measured for this shop specifically, so treat it as a pricing hypothesis to test against your own sales, not a guaranteed uplift. Extending generated art to the remaining 24 designs costs nothing but Cloudflare free-tier headroom: `node apps/print-on-demand-design-factory-cli.mjs art-set <comma-separated-ids>` against any of them.
