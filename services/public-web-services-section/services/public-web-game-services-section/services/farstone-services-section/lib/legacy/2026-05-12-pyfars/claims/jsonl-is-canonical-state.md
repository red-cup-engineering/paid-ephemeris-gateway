---
type: claim
status: draft
depends-on: [substrate, witness, jsonl-event-log, settling]
---

# JSONL event log is canonical state

**Claim.** The JSONL event log is the canonical state of a PyFARS instance.
All other representations of substrate state — the markdown corpus, the predication graph, JSON-API caches, in-memory indices, harness manifests — are *derived* from the log via closure plus projection.
A PyFARS instance is fully specified by its log, its closure-rule-system, and its time-of-evaluation.

## Statement

For any PyFARS instance and any time $\tau$:

$$\mathrm{Substrate}(\tau) \;=\; \mathrm{Cl}_{R(\tau)}\big(\bigsqcup_{i: \mathrm{ts}(e_i) \leq \tau} \mathrm{cells}(e_i)\big)$$

— where $L = (e_1, e_2, \ldots)$ is the JSONL event log, $\mathrm{cells}(e_i)$ is the cell-set asserted by event $e_i$, and $\mathrm{Cl}_{R(\tau)}$ is the closure operator under the closure-rule-system active at $\tau$.

Furthermore: any pair (log $L$, closure-rule-system $R$) determines a unique substrate state at any $\tau$; no further information is required.
Conversely, two instances with the same log and closure-rule-system have the same substrate at every $\tau$.

## Sketch

The proof factors:

### (1) Cell composition is determined by the log

Every cell in substrate either: - *was witnessed* (it appears in some $e_i$'s `cells:` field), or - *is a closure consequence* (it's derived from witnessed cells by the closure rules in $R$).

Per [`substrate-purity`](substrate-purity.md), there is no third source.
Therefore the union of witnessed cells and their closure consequences is the entire substrate.

### (2) Closure consequences are determined by the closure-rule-system

Closure operators are functions: $\mathrm{Cl}_R(S)$ is determined by $S$ and $R$.
So given the witnessed cells and $R$, the consequence cells are deterministic.
This is what the [closure 2-monad](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/) machinery commits to.

### (3) Time-of-evaluation determines which witnesses count

At time $\tau$, only events with timestamp $\leq \tau$ are part of the substrate.
Events arrived later don't retroactively change substrate at $\tau$ (per the no-retroactive-insertion log discipline).
So the substrate at $\tau$ depends on the prefix of the log up to $\tau$, not on the future of the log.

### Combining

Substrate at $\tau$ = closure (under $R(\tau)$) of (cells of $L_{\leq \tau}$).
The right side is a function of $L$ and $R$.
Therefore substrate is a function of $(L, R, \tau)$. $\square$ [modulo the gap that closure-rule-system $R$ may itself evolve over time; the argument extends to track $R$'s own substrate-mediated evolution if needed.]

## Discussion

### What this claim makes possible

- **Replay.** Reconstruct substrate end-to-end by replaying $L$ from the start.
- **Time-travel.** Compute substrate at any past $\tau' < \tau$ by replaying $L_{\leq \tau'}$.
- **Audit.** Trace any cell to the witnesses that contributed to it.
- **Recovery.** Lose the markdown corpus, the indices, the caches — the substrate is intact in the log; everything else can be regenerated.
- **Federation.** Compose two PyFARS instances by merging their logs; the merged substrate is the closure of the merged log under a (possibly new) closure-rule-system.

### What this claim does not say

- It does not say the log is *small*.
  A long-running polity accumulates millions of events.
  Compaction, archival, summarization are real concerns; the claim says nothing about them.
- It does not say the log is *cheap to replay*.
  Replaying a million events to read substrate at "now" would be impractical; the realization caches the current state and replays only deltas.
  The claim is about *correctness*, not *performance*.
- It does not say the markdown corpus is *unimportant*.
  The corpus is the primary human-readable projection; its centrality to PyFARS-as-realization is unchanged.
  The claim says only that the corpus is *derived*, not canonical.
- It does not say the log is the *only* source of truth in any global sense.
  Upstream (predication-categories, predicated-computing, FARS theory) is also load-bearing; the captain's constituent power is also load-bearing.
  The claim is local to *substrate-state-at-a-time*.

### What would have to change for this claim to fail

- If an out-of-log mutation happened (some process modified substrate without writing to the log), the claim is refuted for that mutation.
  Per [`substrate-purity`](substrate-purity.md), this is a violation; the fix is to either witness the mutation or remove it.
- If the closure-rule-system were not deterministic (e.g., randomized rules), the claim would weaken — substrate would be a *distribution* over closures rather than a single state.
  PyFARS does not currently commit to randomized rules.
- If event timestamps were ambiguous (e.g., logical-clock partial order without total tie-breaking), the claim would weaken to "up to a partial order on time."
  PyFARS commits to total ordering within a single instance.

### Connection to projection-as-recovery

The [`markdown-as-projection`](markdown-as-projection.md) claim and this claim are complementary:

- *This* claim: substrate is determined by the log.
- *Markdown-as-projection*: the markdown corpus is determined by substrate (via render).

Composing: the markdown corpus is determined by the log.
So if the log survives, the markdown can be regenerated — even if every other artifact is lost.
This is the recovery story PyFARS commits to.

## Connection to upstream

Per [predication-categories settling theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/), substrate is a closure-fixed-point of a witnessed cell-set under a closure-rule-system.
The PyFARS-side claim is that the witnessed cell-set is exactly the JSONL log's cell content, and that the substrate is reconstructible from the log.
The upstream theory provides the closure-fixed-point machinery; PyFARS supplies the realization (events as JSONL lines, log as append-only file, closure as runtime computation).
