# Fine Print Mercantile — shop package

Pseudonymous shop identity for the print-on-demand gimmick lane. Not the founder's name, not a house engineering brand (Red Cup/Causeway/Lenticule are builder- and player-facing marks for a different product line; this is a standalone commerce identity so a merch storefront never borrows the games shelf's trust promise of "we never take your money" — see `data/records/2026-08-31-pod-channel-decision.json`).

## Shop name

**Fine Print Mercantile**

## Shop bio (paste into Printify Pop-Up Store "About")

> Fine Print Mercantile makes text-first shirts, mugs, and stickers for people whose humor lives in the caption, not the punchline character. Original one-liners for coders, cat owners, lifters, teachers, plant parents, and gamers — no borrowed jokes, no borrowed IP, just the phrase you'd actually say out loud. Printed to order, one at a time, shipped by our print partner.

## Policies text (paste into Printify Pop-Up Store "Policies" / shipping & returns)

> **Made to order.** Every item is printed after you order it — nothing sits in a warehouse, which keeps prices honest and waste low. Production typically takes 2-5 business days before it ships; shipping time is additional and varies by destination.
>
> **Returns & misprints.** If your item arrives damaged, misprinted, or is the wrong size/color, contact us within 30 days of delivery for a free reprint or refund. Because every piece is made specifically for you, we can't accept returns for a simple change of mind — please check the size chart before ordering.
>
> **Shipping.** Shipping cost and estimated delivery are shown at checkout before you pay. We ship worldwide everywhere our print partner's network reaches.
>
> **Contact.** Questions about an order go to the shop's contact email shown at checkout; we answer within 2 business days.

## Pricing — typographic (text-only) tier (researched against cited comparables — see channel-decision record)

| Product | Printify base cost (typical) | Recommended retail | Notes |
|---|---|---|---|
| Unisex shirt (Bella+Canvas 3001, S-XL) | $8.77 – $10.98 | **$21.99** | 2XL+ add $2-8 base cost; price those sizes at $23.99/$25.99 if offered |
| 11oz mug | $5.75 – $8.25 | **$15.99** | single-provider consistency preferred over cheapest-per-order |
| Die-cut sticker | $1.20 – $2.80 | **$4.49** | best margin product; good upsell paired with a shirt |

## Pricing — generated-art (illustrated) tier — live

Full-front illustrated art commands a premium over a plain text print across POD marketplaces (general market pattern, not independently measured for this shop yet). Poster base costs run higher than shirts (a 24x36in giclée print bases around $11 at Printify's cheapest provider; source: PodVector's 2026 Printify cost guide); a smaller 12x18/18x24 poster typical of a single-illustration print is priced here conservatively against that data point.

| Product | Printify base cost (typical) | Recommended retail | Notes |
|---|---|---|---|
| Unisex shirt, full-front illustrated art | $8.77 – $10.98 (same blank) | **$24.99** | +$3 over the text-only tier for the extra art asset/compositing work |
| 11oz mug, illustrated art | $5.75 – $8.25 | **$17.99** | |
| Die-cut sticker, illustrated art | $1.20 – $2.80 | **$5.49** | |
| Poster (12x18/18x24), illustrated art | ~$8 – $12 (estimated against the 24x36 data point above; not yet verified at these exact sizes) | **$18.99** | new product type this tier unlocks — text-only designs are not sold as posters |

This tier is **funded and live at $0 marginal cost**: image generation runs on Cloudflare Workers AI's free daily allocation (10,000 Neurons/day account-wide; `@cf/black-forest-labs/flux-1-schnell` costs ~4.80 Neurons per 512x512 tile — developers.cloudflare.com/workers-ai/platform/pricing, verified live 2026-08-31), served through a private, unlisted Worker this package deploys (`sites/pod-image-generation-worker`). Gemini direct and OpenRouter remain wired as paid fallbacks only (both currently carry a genuine $0 free allowance for image generation — see `data/records/2026-09-01-image-generation-free-tier-finding.json` for that evidence) and are not needed while the Cloudflare door stays open. Twelve designs (two per niche) already have real generated art on disk at `data/state/rendered-designs/<id>-art.png`, each with a `<id>-art.provenance.json` sidecar naming the exact provider/model.

Payout runs through Stripe inside the Pop-Up Store checkout: 2.9% + $0.30 per transaction. No separate marketplace listing fee in this channel (see channel-decision record for why Printify's own storefront beats Etsy/Redbubble/TeePublic here).

## Design corpus → listing copy

Every design's title, description, tags, and product targets are generated from `src/corpus.mjs` into `LISTINGS.md` by `node apps/print-on-demand-design-factory-cli.mjs all`. Re-run that command after editing the corpus; do not hand-edit `LISTINGS.md`. Twelve designs (two per niche) carry a `poster` product target, an auto-derived `artPrompt` (see `src/design-factory.mjs`'s `buildArtPrompt`), and already-rendered generated art (regenerate any of them with `node apps/print-on-demand-design-factory-cli.mjs art-set <ids>`, or extend to the rest of the corpus the same way).
