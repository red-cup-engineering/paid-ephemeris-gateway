# print-on-demand-design-factory-service

`@red-cup-engineering/print-on-demand-design-factory` generates print-ready
designs and their listing copy (title, description, tags, product targets)
as code for the Fine Print Mercantile print-on-demand shop. Two lanes:
zero-cost typographic SVG rendering (`src/design-factory.mjs`), and a real
LLM raster-art lane wired through the shared
`@red-cup-engineering/image-generation-inference-team` package. See
`LISTINGS.md` for the design manifest, `SHOP.md` for the shop identity and
pricing, and `PRINCIPAL-RUNBOOK.md` for what's left for a human to do.

## Deployment target: `sites/pod-image-generation-worker`

`sites/pod-image-generation-worker` is a private, unlisted Cloudflare
Worker exposing a Workers AI binding as a small JSON fetch endpoint. It is
not a separate capability — it is this section's own art-generation lane
deployed to free-tier Workers AI, reached only by
`scripts/generate-image-art.mjs` (through the shared inference-team
package's Cloudflare provider caller). It does not get its own Thread
pointer; it lives inside this section's engineering/operations thread as
a deployment target, tracked under the 561-group Cloudflare custody below.

## Thread

Five-custody thread (org-layering.md, 2026-09-01):
- science: [marketing-science-services-section](../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/business-science-services-section/services/marketing-science-services-section) — `pricing-strategy.md` and `target-market.md` ground the niche selection and retail-vs-base pricing table in `SHOP.md`.
- engineering: [image-generation-inference-team](../../../../../../../engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-inference-system-services-section/services/image-generation-inference-team) — the shared house primitive this section imports (`@red-cup-engineering/image-generation-inference-team@0.1.1`, `scripts/generate-image-art.mjs`) for the real raster-art lane; verified already entangled (commit `0f2e7ef97fa`), not re-wired here.
- operations: [enterprise-systems-services-section](../../../../../../../operations-services-section/services/enterprise-services-section/services/enterprise-systems-services-section) — Rendanheyi/Huidu Guanli doctrine for how a node micro-enterprise like Fine Print Mercantile governs itself as a self-governing, user-paid unit.
- 561-group: [bare-cedar-fog-cloudflare-services-section](../../../../../../../561-group-services-section/services/561-group-computer-services-section/services/computer-machine-services-section/services/persistent-computer-machine-services-section/services/bare-cedar-fog-services-section/services/bare-cedar-fog-web-services-section/bare-cedar-fog-cloudflare-services-section) — the Cloudflare account custody under which `sites/pod-image-generation-worker` is actually deployed and running.
- public: **this section itself** — Fine Print Mercantile is the consumer-facing print-on-demand shop; see `SHOP.md` and `LISTINGS.md`.

## Entanglement debts

- `scripts/generate-set-of-image-art.mjs` hand-writes dated run receipts
  (`writeImageGenerationReceipt`) straight to `data/records/` instead of
  going through `@red-cup-engineering/semantic-record-journal-service@0.1.9`.
  Not a cheap rewire: the journal's `record()` requires a SEAVT
  `charge: {support, refutation}` axis this receipt shape has no natural
  mapping for yet (a run's per-attempt outcomes are provenance, not
  evidenced claims) — filed as a debt rather than forced.
