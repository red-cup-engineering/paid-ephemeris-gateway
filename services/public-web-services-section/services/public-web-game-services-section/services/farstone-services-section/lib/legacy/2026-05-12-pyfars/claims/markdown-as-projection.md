---
type: claim
status: draft
depends-on: [substrate, projection, corpus, corpus-as-flatfile, render]
---

# Markdown is a projection, not the canonical state

**Claim.** PyFARS's [corpus-as-flatfile](../objects/corpus-as-flatfile.md) — the tree of YAML-frontmatter Markdown notes — is a [projection](../concepts/projection.md) of [substrate](../concepts/substrate.md) state.
It is not the canonical state.
The canonical state is the [JSONL event log](../objects/jsonl-event-log.md).
The markdown corpus is what humans read; the JSONL log is what PyFARS computes from.

## Statement

For any quiescent PyFARS substrate state $S$ at time $\tau$, derived from the closure of the JSONL event log $L$ up to $\tau$:

$$\mathrm{corpus}(\tau) \;=\; \mathrm{render}_{\mathrm{md}}(S(\tau))$$

where $\mathrm{render}_{\mathrm{md}}$ is the markdown render (the [render morphism](../morphisms/render.md) specialized to markdown).
Furthermore, when the on-disk corpus differs from $\mathrm{render}_{\mathrm{md}}(S(\tau))$, the on-disk corpus is *stale*; the substrate-true reading is what render produces, not what's currently in the files.

In particular: an in-place markdown edit by a human (or external process) without a corresponding witness event in $L$ does *not* modify substrate state.
Such edits are *unauthorized* with respect to the substrate-purity discipline; they will be either (a) re-witnessed if the captain or an authorized actor adopts them as a substrate transition, or (b) reverted to render's output the next time the corpus is regenerated.

## Sketch

The proof routes through three sub-claims:

1. **Substrate state is determined by the JSONL log.** Per [`jsonl-is-canonical-state`](jsonl-is-canonical-state.md): substrate at time $\tau$ is the closure of all events with timestamp $\leq \tau$ against the active closure-rule-system.
  The corpus is not consulted in this construction.
2. **Render is a function of substrate state.** Per the [render morphism](../morphisms/render.md): $\mathrm{render}_{\mathrm{md}}$ is pure — it depends only on $S$ and on render arguments.
  It does not consult the on-disk corpus.
  (Aside from the on-disk corpus being where the render's *output* is written; that's a target, not an input.)
3. **The agreement condition.** Each cell in $S$ that is markdown-projection-expressible (frontmatter relations, body content stored as cell-content, etc.) appears in the rendered markdown's corresponding location.
  Cells not markdown-expressible do not appear (information loss, characteristic of projection).

The full proof requires formalizing the markdown projection target (which subsets of $S$ are markdown-expressible) and verifying that render's output is equal to the markdown-projection on those subsets.
This is partly settled in the predication-categories upstream theory (projections in general) and partly specific to PyFARS (the markdown target's expressibility).

[Gap: a precise spec of markdown-projection-expressibility is not yet authored.
Each subset of substrate cells that *can* appear in markdown should be enumerated; cells outside that subset must live elsewhere (event log, separate transports).
Currently the realization treats markdown as expressing roughly: frontmatter scalars, frontmatter list-relations to other slugs, free-text body.
Cells beyond this are partially expressed.]

## Discussion

### What this claim does

This is the load-bearing commitment that *makes the corpus regeneratable*.
If markdown were canonical, then:

- Every markdown edit would have to be witnessed for substrate to track it.
  Manual edits (which the realization tolerates as a developer convenience) would be a substrate-purity violation.
- Cells that aren't markdown-expressible would have nowhere to live.
  PyFARS would be limited to the markdown-projection's expressivity.
- Recovery from corpus corruption would require human intervention; there'd be no "rebuild the markdown from the canonical state" path.

By committing markdown-as-projection, PyFARS gets:

- **Manual editing as ergonomics, not authority.** Manual markdown edits are tolerated and useful (they're the captain's primary way of authoring content), but their authority is conditional on subsequent witnessing — typically through the engine's commit-witness endpoint, which observes the file change and produces the corresponding event in the JSONL log.
- **Richer-than-markdown substrate.** Cells about agent sessions, runtime metrics, paraconsistent values, etc. live elsewhere and don't try to fit into markdown's expressivity.
- **Regeneration as recovery.** A corrupted corpus can be regenerated from the JSONL log; the markdown is replaceable.

### What this claim does not say

- It does not say the markdown is *unimportant*.
  The markdown is the primary human-readable surface; the captain reads, edits, and reasons about the corpus through the markdown.
  Its centrality to PyFARS-as-realization is unchanged.
- It does not say manual edits are forbidden.
  They're tolerated and ergonomically primary; the realization just commits that the substrate-tracking happens through witnesses, not through file scraping.
- It does not say markdown is the *only* projection.
  PyFARS produces JSON-API responses, monograph documents, BibTeX exports, harness templates — all projections.
  Markdown is one among several.

### What would have to change for this claim to fail

- If PyFARS abandoned the JSONL event log as canonical state.
  Then markdown might become canonical by default; this claim would become circular ("markdown projects from markdown").
- If markdown gained expressive power so that it could carry every substrate cell.
  Then projection vs. canonical distinction would collapse; this claim would become trivial.
- If PyFARS's render were not pure (e.g., if render consulted the on-disk corpus and incorporated content from it that wasn't substrate-tracked).
  Then the agreement condition would fail; this claim would be refuted.

The first two are not on the roadmap.
The third is a discipline check — the realization commits to render purity, and the substrate-purity claim depends on it.

## Connection to upstream

Per [predication-categories projection theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/), projections are partial functors from a fiber to a transport-typed sub-fiber.
The markdown-projection is one such functor; its source is PyFARS's substrate fiber, its target is the markdown-expressible sub-fiber.
The agreement condition is the functoriality of the projection.
PyFARS-side, the claim is that PyFARS's render realizes this projection faithfully.
