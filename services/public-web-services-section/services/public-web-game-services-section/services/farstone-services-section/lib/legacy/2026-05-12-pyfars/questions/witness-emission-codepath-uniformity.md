---
type: question
status: open
explores: [witness, substrate-purity, log-and-record-are-distinct-resource-types, jsonl-is-canonical-state, mcp-tool-surface, hook-dispatch, event-log, closure-2-monad]
---

# In what sense is PyFARS's witness-emission codepath uniform across the surfaces that emit witnesses (hook dispatcher, MCP tools, in-process Python), and what theory grounds the uniformity?

A `Witness` is appended to `.fars/event-log/<date>.jsonl` from at least three categorically-distinct callers in the running substrate: the Claude harness's hook dispatcher (a subprocess invoked by Claude Code's hook system, executing `pyfars hook-dispatch <slug>`), MCP tool calls from a session agent (in-process to a `pyfars-substrate` MCP server, served over stdio or HTTP), and direct in-process Python (e.g., the `dispatch_graph.py` engine emitting `agent_invoked` and `RuleFiring` witnesses).
[`claude-as-pyfars-runtime`](../work/goals/claude-as-pyfars-runtime.md) Phase 1 commits the substrate to "every read returns `(truth, evidence)`; every write accepts them as parameters and validates against the calling office's authority."
That commitment is silent on whether the *write codepath itself* is one codepath or several, and whether the choice carries substrate-algebraic content.

The question is whether the substrate's cell-write operation is invariant under the surface that invokes it — i.e., whether every emitter, regardless of how it reached the substrate, traverses the same library-level append routine and produces a witness whose semantics, schema, and downstream closure-rule firings are surface-independent.
The intuition behind the question is that surface-dependence (a hook-emitted witness behaving differently from an MCP-emitted witness) would be a form of substrate impurity — the surface would leak into the substrate's transition semantics — and that the strict-regime substrate cannot afford that without breaking auditability.

The question is *program-shaping* (per [`questions/_index.md`](_index.md)): the answer determines the codepath topology of [`ship-mcp-write-tool-surface`](../work/plans/ship-mcp-write-tool-surface.md) and, by extension, every later surface (FastAPI, federation envelope receivers, autonomous-engine spawn paths) that needs to author cells.
It is *also* a realization question: it asks how a load-bearing PyFARS commitment (witness-as-substrate-cell-write) instantiates concretely.

## What surface-invariance would mean concretely

A surface-invariant witness emission codepath is one where:

1. **One library function authors event-log records.** All callers — hook dispatcher, MCP tool, direct Python — terminate at a single function, e.g. `pyfars.runtime.event_log.append_witness(witness, *, root)`.
  There is exactly one call site that opens `.fars/event-log/<date>.jsonl` for append.
2. **Surface-identity is carried by witness payload, not by codepath.** The `origin` and `channel` fields on the `Witness` (per [`pyfars/entities/witness.py`](../src/pyfars/entities/witness.py)) record which surface emitted: `channel="hook"`, `channel="session"`, `channel="dispatch"`, etc. The substrate reads surface-identity from the witness's frontmatter, not from inferring which codepath ran.
3. **Closure-rule firings after the write are surface-independent.** Whatever rules fire on the new cell — eligibility recomputation, capability propagation, $\top$-cell repair — they fire on the cell, not on whichever surface authored it.
  A hook-authored witness and an MCP-authored witness with byte-equivalent payloads (modulo timestamp and hash) trigger byte-equivalent rule firings.
4. **The audit query treats them uniformly.** `pyfars ledger tally` over a day's event-log produces the same answer whether the writes came from hooks, MCP, or direct Python.
  The audit doesn't need a surface-specific reader.

If any of (1)–(4) fails, the codepath is *not* uniform; surfaces matter at the substrate level; and the substrate has a hidden parameter (the emitting surface) that closure rules and audits must read.

## What theory might ground the uniformity

Three candidate theoretical anchors, each of which would discharge the proof obligation differently:

1. **[Substrate-purity claim](../claims/substrate-purity.md)** (if it exists; the `_index.md` listing suggests it does as part of the claims set).
  Substrate-purity probably already says "PyFARS does not modify substrate state outside of explicit substrate-transitioning verbs."
  Surface-invariance is a *strengthening*: not only do all transitions happen through verbs, but the *codepath* implementing those verbs is single-surface-invariant.

2. **[Closure-2-monad](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md) iteration to fixed point.** The substrate's closure operation $\mathrm{Cl}$ is defined fiberwise on the predication algebra; it does not consume a "surface" coordinate.
  Iterating $\mathrm{Cl}$ from a state that includes a newly-authored witness produces the same fixed point regardless of which surface authored the witness, because the iteration's algebra has no surface fiber.
  Surface-invariance of the *write* is therefore necessary for the closure-monad's surface-invariance — a write that varied by surface would feed surface-tagged starting states into the iteration.

3. **[`log-and-record-are-distinct-resource-types`](../claims/log-and-record-are-distinct-resource-types.md).** The event-log is a distinct resource type from substrate records; appends to it are an append-only operation on a single jsonl file per date.
  The "log resource" has one writer (one append codepath) by its nature; multiple-writers would need either coordinator (degrades CALM-friendliness, conflicts with [`settling-CALM-corollary`](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md)) or coordinated logical-clock (a heavier substrate commitment).
  The single-codepath shape is the lightest-weight solution that keeps the log CALM-friendly.

These three are *not exclusive*.
A claim grounding witness-codepath-uniformity probably routes through some combination, with one as primary and the others as secondary support.

## What would need to be answered

For the cycle to produce a stage-3 claim from this question, stages 2–3 would need to:

1. **Inventory the existing append codepaths.** How many places in `pyfars/` currently open `.fars/event-log/` for write?
  (A grep of the source code answers this.
  The answer is part of the empirical input to the claim — the claim is more interesting if there are *multiple* current codepaths than if there is already one.)

2. **Identify whether the substrate-purity claim already entails surface-invariance.** If so, the new claim is a corollary and routes through it.
  If substrate-purity is silent on codepath topology, the new claim is independent and routes through closure-2-monad-iteration or log-resource-type instead.

3. **Identify the substrate-algebraic content of "surface-invariance."** Is it (a) a property of the codepath topology (one function, many callers), (b) a property of the witness payload schema (channel/origin/operator carry surface-identity), (c) a property of the closure rule system (rules fire on cells, not on surfaces), or (d) all three jointly?
  The claim's precision depends on which.

4. **Name what would refute the claim.** A refutation looks like: a hook-authored witness and an MCP-authored witness with byte-equivalent payloads trigger different closure-rule firings, observably.
  Or: a per-surface schema divergence in the event-log records.
  Or: an audit query whose answer depends on the surface-mix of the writes.
  Per [`authoring-realization-claim`](../governance/skills/authoring-realization-claim.md) §6, an unfalsifiable uniformity claim is too vague.

5. **Identify the stage-4 substrate objects/morphisms the claim implies.** Candidates include: an `event-log-write` morphism (the single library function as a substrate object), a `witness-codepath-invariant` concept (the property the claim names), and a closure-rule that audits the invariant by comparing surface-mix to write-payload-schema.
  The exact list belongs to stage 4, but the question can name candidate nouns and verbs to seed it.

When this resolves, the resolving claim and the substrate objects/morphisms it implies are authored per the cycle stages 3–6, the existing [`ship-mcp-write-tool-surface`](../work/plans/ship-mcp-write-tool-surface.md) plan and its two task records are reconciled to cite the new claim, and a specification at `governance/specifications/event-log-append.md` (or similar) is authored as stage 6's output.
This question note is then deleted; the resolving claim is the live record.
