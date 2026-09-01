---
title: "M19 — Self-Developing PyFARS (Agents Inside PyFARS Write PyFARS)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m18-publishing-and-learning, m17-561-productivity-stack]
goals:
  - source-as-substrate-cells
  - self-development-workflow
  - bootstrapping-discipline
  - conformance-vectors-self-test
  - captain-review-via-governance-app
  - thirty-days-self-development
  - v1-image-from-substrate-events-only
theory-basis: [agential-self-generation, four-layer-rule-architecture, charter-c3, charter-c5]
prior-art: [pypredcomp/docs/dev/milestones/v1.0-self-hosting.md]
cites-objects:
  - pyfars/objects/skill-record.md
  - pyfars/objects/runbook-record.md
  - pyfars/objects/office-record.md
  - pyfars/objects/jsonl-event-log.md
  - pyfars/objects/corpus-as-flatfile.md
cites-morphisms:
  - pyfars/morphisms/dispatching.md
  - pyfars/morphisms/validating.md
  - pyfars/morphisms/witnessing-completion.md
cites-claims:
  - pyfars/claims/replay-determinism.md
  - pyfars/claims/jsonl-is-canonical-state.md
  - pyfars/claims/governance-frontmatter-is-substrate.md
  - pyfars/claims/dispatch-derives-from-governance.md
backing-gaps:
  - pyfars/objects/source-cell.md (NOT YET AUTHORED — pyfars source code projected as substrate cells; for source-as-substrate-cells goal)
  - pyfars/objects/conformance-vector-record.md (NOT YET AUTHORED — self-test vector with replay-determinism witness)
  - pyfars/objects/modification-proposal-record.md (NOT YET AUTHORED — agent-authored substrate diff for captain review)
  - pyfars/morphisms/proposing-modification.md (NOT YET AUTHORED — agent-writes-proposal-to-substrate)
  - pyfars/morphisms/applying-ratified-modification.md (NOT YET AUTHORED — captain-ratified-proposal → source change)
  - pyfars/claims/image-from-events-byte-identical.md (NOT YET AUTHORED — SHA-256-identical image-replay-rebuild conformance)
acceptance: "30 consecutive days of self-development without external dev tools. A real captain-priority feature has been implemented entirely by agents inside PyFARS — they read the source cells, drafted the modification, ran conformance vectors, submitted the proposal through the governance app, the captain ratified, the build pipeline applied. The PyFARS image at M19 is reconstructable from substrate events of the M18 → M19 cycle. The captain has reviewed and approved at least 10 substantive changes through the governance app during the cycle."
---

# M19 — Self-Developing PyFARS

The capstone.
After [M17](m17-561-productivity-stack.md) gives the captain UI surface and [M18](m18-publishing-and-learning.md) closes the observation → adjustment loop, M19 turns the loop *inward*: agents inside PyFARS read PyFARS's own source cells, propose modifications, run conformance vectors, submit changes through the governance app. The PyFARS image at M19 is reconstructable from substrate events of the prior cycle.

## What's built

### Source-as-substrate-cells

PyFARS's own source code (the Python in `src/pyfars/`, the closure-rule definitions, the type schemas) is loaded as substrate cells via the projector framework — same mechanism that loads governance/library/concepts for [M5](m5-agential-self-generation.md) substrate-writability.
A function definition becomes a cell `(source:pyfars.runtime.dispatch_graph, function:load_store, body, "<python-source>", t)`; module-level imports, decorators, type signatures all settle as cells.

Agents query source the same way they query any other substrate content: `(source:pyfars.runtime.dispatch_graph, *, *, *)`.
The four-layer rule architecture extends to layer-0 (the substrate engine itself); the substrate now reads its own source as just-more-substrate-content.

### Self-development workflow

The end-to-end flow for a captain-priority feature implemented inside PyFARS:

1. **Captain authors workitem.** "Add a `pyfars audit-cells-by-age` verb that lists cells unsettled for > N days."
  Filed in [M17](m17-561-productivity-stack.md) tasks-app.

2. **Dispatch routes to a development-class agent.** The agent's office (`pyfars-development-officer` or similar) carries the capabilities to read source cells and propose source modifications.
  This is the same dispatch graph as [M2](m2-substrate-dispatch.md); the workitem's `requires-capabilities` includes `read-source-cells` and `propose-source-modification`.

3. **Agent reads relevant source cells.** Identifies which modules, which functions, which closure rules need modification.
  Authors a proposal record with diff + rationale + conformance-vector test plan.

4. **Conformance vectors run.** The agent's proposal triggers a vector run on a build of PyFARS *including* the modification.
  The vector run produces a witness: passes or fails with which vectors.
  Failures block governance-app surfacing — the captain doesn't see proposals that don't pass vectors.

5. **Governance-app surfaces ratifiable proposal.** Per [M18](m18-publishing-and-learning.md)'s promotion-ladder pattern, the proposal appears in the governance-app review queue.
  Captain reviews diff, rationale, vector results.

6. **Captain ratifies or rejects.** Ratification fires the build pipeline — applies diff, rebuilds the PyFARS image, the next service restart picks up the new code.
  Rejection emits a witness explaining the rejection (so the agent learns); the proposal closes.

7. **The cycle is recurrent.** Per [predicated-work `recurrent-practice`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md), self-development is itself a recurrent-practice — the operations-loop instantiated for PyFARS development.
  Each captain-priority feature is one instance of the loop.

### Bootstrapping discipline

The hard constraint: **no external compiler, editor, or test infrastructure** is required to run the self-development workflow.
The substrate is fully introspectable and editable from inside; the build pipeline runs entirely on PyFARS itself.

Concretely: - The Python interpreter is a dependency of the host system (we don't ship a Python).
But the PyFARS *build* (turning source-cells into runnable artefact) is substrate-resident. - The conformance-vector runner is a substrate operation — vectors are themselves substrate cells, vector results are substrate cells. - The text-editor used to edit source is the [M15](m15-bundled-userland.md) text-editor on the source-cells (in markdown-with-frontmatter mode for proposal records, in cell-raw mode for source cells). - The test runner is dispatched by the engine; tests are substrate-described workitems. - Git interaction (for distribution) is via a substrate-resident git driver.

This is the substrate-residency commitment at maximum depth: the development workflow lives in the substrate the same way the operations workflow does.

### Conformance vectors as gating witness

Every proposed modification must produce a passing conformance-vector run BEFORE the captain sees it as actionable in the governance-app review queue.
The vector set:

- All [M3](m3-continuous-loop.md) replay-determinism vectors pass on a build with the modification applied.
- All [M6](m6-federation.md) federation-merge vectors pass.
- All [M2](m2-substrate-dispatch.md) dispatch-eligibility vectors pass.
- The modification's own *new* vectors pass (proposals that change behaviour must add vectors that exercise the new behaviour).

A failing vector is a `(proposal:foo, vector:bar, failed-at, <step>, t, witness: <log>)` cell that the governance-app surfaces as "blocked: vector failure" rather than a captain-actionable proposal.

### Image rebuild from substrate events only

At M19's "done" point, the PyFARS image has been rebuilt enough times during the M18 → M19 cycle that *every modification in the image is provenanced* to a substrate event from the cycle.
Replay from the cycle's event log produces a byte-identical image.
This extends [M3](m3-continuous-loop.md)'s replay-determinism (operations replay) to *development* replay.

The conformance criterion: pick a clean state from M18's end; replay every governance-ratified proposal in the cycle, in order; produce an image; that image's SHA-256 matches the M19 production image's SHA-256.

## What M19 does NOT claim

- **Not autonomous code commit.** Every source-modification still passes through captain review.
  The system proposes; the captain ratifies.
  There is no path by which PyFARS modifies its own source without captain authorisation.
- **Not Lisp-style metacircular self-evaluation.** PyFARS self-development is *project-level* — agents propose source diffs and tests; the build system applies them; the new image runs conformance vectors.
  It is not a runtime that reflects on its own AST during execution.
- **Not "agents replacing developers".** M19 is the substrate-residency capstone — the development workflow is in the substrate, just as the operations workflow is.
  The captain remains the developer; agents accelerate the captain by drafting, testing, proposing — the captain reviews and decides.
- **Not a guarantee of safety.** Conformance vectors are the structural-correctness gate. *Polity-correctness* (does the modification align with charter intent?) remains a captain decision, not a vector test.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `source-as-substrate-cells` | PyFARS source loaded as cells via projector framework; agents query source like any other substrate content | open |
| `self-development-workflow` | Captain workitem → development-agent dispatch → source modification proposal → vector run → governance-app review → captain ratify → build pipeline apply | open |
| `bootstrapping-discipline` | No external compiler/editor/test infrastructure required; build pipeline runs on PyFARS itself; tests are substrate-described workitems | open |
| `conformance-vectors-self-test` | All M3/M6/M2 vectors plus per-modification new vectors pass before governance-app surfacing | open |
| `captain-review-via-governance-app` | Proposals appear in M17 governance-app; ratification fires build; rejection emits explanation witness | open |
| `thirty-days-self-development` | 30 consecutive days of cycle-driven development without external dev tools | open |
| `v1-image-from-substrate-events-only` | The M19 image is replay-rebuildable from M18 → M19 cycle events; SHA-256-identical | open |

## Done when

A real captain-priority feature has been implemented end-to-end by agents inside PyFARS, captain-ratified, applied.
30 consecutive days of self-development without external dev tools.
The captain has reviewed and approved at least 10 substantive changes through the governance app during the cycle.
M19 image SHA-256 matches replay-rebuild from cycle events.

## Theoretical shape

**Source-as-substrate-cell.** The four-layer rule architecture extends to layer-0 (the substrate engine itself).
Agents reading source query the substrate like any other content; the substrate-residency commitment holds at maximum depth.

**Development as operations-loop instance.** The operations-loop (plan → execution → observation → finding → adjustment → next plan) instantiates for PyFARS development itself: workitem → agent drafts modification → conformance-vector run → captain ratifies/rejects → next workitem.
Development becomes a recurrent-practice settled by the same closure-rule machinery as operations.

**Charter C3 + C5 jointly closed.** Charter C3 (agential self-generation) was closed at substrate-content scope by [M5](m5-agential-self-generation.md).
Charter C5 (practical reasoning as operator schedule) was closed at runtime scope by [M3](m3-continuous-loop.md).
M19 closes them jointly at *meta* scope: the substrate's machinery for editing its own machinery is a substrate-resident operations loop.

## Risks deferred to captain decision

- **Trust boundary form.** Agents proposing source modifications cross from "agents operate in substrate" to "agents shape substrate machinery".
  The captain's review gate is necessary; the *form* (single LGTM vs. detailed-justification vs. multi-witness quorum) is captain-decided when M19 advances.
- **Rollback operational cost.** A ratified modification that turns out wrong needs rollback.
  Per event-sourcing, the substrate can replay-rebuild any prior image; the operational cost of doing so (decommissioning bad image, restoring prior, communicating rollback) is captain-decided.

## Related

- [Roadmap](roadmap.md)
- [M17 — 561 Productivity Stack](m17-561-productivity-stack.md), [M18 — Publishing & Continuous Learning](m18-publishing-and-learning.md) — prerequisites
- [Charter](../../governance/charter.md) — C3 + C5 commitments M19 jointly closes
