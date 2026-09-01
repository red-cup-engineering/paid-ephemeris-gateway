---
type: cycle
question: witness-emission-codepath-uniformity
officer: pyfars-roadmap-enrichment-officer
status: complete
opened-at: 2026-05-09T00:00:00Z
closed-at: 2026-05-09T23:59:59Z
authored-claims: [witness-emission-is-surface-invariant]
authored-objects: [event-log-append-call-site]
authored-morphisms: [auditing-codepath-uniqueness]
authored-concepts: [surface-invariant-codepath]
theory-cited:
  - substrate-purity
  - log-and-record-are-distinct-resource-types
  - jsonl-is-canonical-state
  - witness
  - closure-2-monad
  - closure-2-monad-lax-idempotence
  - settling-calm-corollary
  - regime-classification-is-load-bearing
prior-art-cited:
  - src/pyfars/entities/witness.py
  - src/pyfars/runtime/event_log.py
  - src/pyfars/cli/hook_dispatch.py
  - src/pyfars/runtime/session.py
  - src/pyfars/runtime/federation.py
  - src/pyfars/runtime/lifecycle.py
  - src/pyfars/runtime/promote.py
  - src/pyfars/runtime/tool_registry.py
  - src/pyfars/web/app.py
  - src/pyfars/mcp/tools.py
commissioned-integration:
  - {touchpoint: ship-mcp-write-tool-surface, action: enrich-with-cycle-provenance, detail: "Plan frontmatter gains derives-from-claim/cycle/spec; theory-basis extended; body §What-this-plan-does cites the cycle/claim/spec; §Theory-grounding extended; §What-this-does-NOT-claim names R11–R12 deferral."}
  - {touchpoint: author-mcp-append-witness-tool, action: enrich-with-cycle-provenance, detail: "Task frontmatter gains plan/derives-from-claim/derives-from-spec/satisfies-requirements; description body cites spec R1–R6; acceptance criteria cite spec §6 sections."}
  - {touchpoint: route-hook-dispatch-through-mcp-append-witness, action: enrich-with-cycle-provenance, detail: "Task frontmatter gains plan/derives-from-claim/derives-from-spec/satisfies-requirements (R1–R2); description body acknowledges that the cycle's prior-art audit found this surface already satisfies codepath uniqueness; acceptance criteria operationalize the joint codepath-uniqueness invariant on both surfaces and cite the manual-grep settlement posture."}
integration-finding: cascade-application-2026-05-09-witness-emission-codepath-uniformity
---

# Cycle 2026-05-09 — witness-emission-codepath-uniformity

## Stage 1 — Question selected

The captain (and XO research) staged a leading-edge plan [`ship-mcp-write-tool-surface`](../plans/ship-mcp-write-tool-surface.md) under [`claude-as-pyfars-runtime`](../goals/claude-as-pyfars-runtime.md) Phase 1 to land `append_witness` as the first MCP write tool and route the hook dispatcher's witness-emission through it.
The plan and its two task records were authored as stage-7-of-cycle-A artifacts without first running stages 2–6 — a duty breach against [`run-full-cycle-not-just-integration`](../../governance/duties/run-full-cycle-not-just-integration.md), which the captain caught and corrected.

The cycle's stage-1 question — [`witness-emission-codepath-uniformity`](../../questions/witness-emission-codepath-uniformity.md) — names the substrate commitment the leading-edge plan informally relies on: that PyFARS's witness-emission codepath is uniform across the surfaces that emit witnesses (hook dispatcher, MCP tools, in-process Python, FastAPI, federation), and that the uniformity is theory-grounded rather than incidental.
Without this question's claim, the leading-edge plan's "witness-event-log, single-codepath, true = T" milestone-cell has no theoretical content; it is an engineering preference, not a substrate commitment.

The question fits the *Theory-API & substrate-runtime invariants* axis in [`questions/_themes.md`](../../questions/_themes.md).
It is cross-cutting; it shapes the operational vocabulary across M1 (harness installation), M5 (agential self-generation, where MCP write tools land), and M8 (inbound MCP clients, where third-party callers join the same write surface).

## Stage 2 — Research

### What was read

**PyFARS-side claims** (theory-cited):

- [`substrate-purity`](../../claims/substrate-purity.md) — the foundational claim that "PyFARS does not modify substrate state outside of explicit substrate-transitioning verbs whose modifications are recorded as witness events in the JSONL log."
  Stage-3 candidate proof routing target.
  The claim's §1 ("Verbs are the only substrate transitions") and §2 ("Verb witnesses are accurate") together commit to *what* writes are allowed but do not commit to *codepath topology* — they leave open whether one verb's implementation could open the event-log file directly while another routes through a library function.
  The codepath-uniformity claim is a *strengthening* in this dimension.
- [`log-and-record-are-distinct-resource-types`](../../claims/log-and-record-are-distinct-resource-types.md) — commits to two storage disciplines: append-only EAVT logs and self-contained frontmatter-bearing records.
  Sketch §1 ("Storage disciplines are inverse"): "A log's storage discipline is *append-only with monotonic time order*."
  The single-writer property is mentioned in [`event_log.py`](../../src/pyfars/runtime/event_log.py) line 21: "No locking; the JSONL append-line semantics are atomic enough on POSIX for single-writer use.
  Multi-writer setups would need a more careful implementation."
  A multi-codepath emitter pattern would still be single-*process* single-writer if all paths share a process, but it would expand the audit surface for "which path wrote this?" without the witness payload knowing.
- [`jsonl-is-canonical-state`](../../claims/jsonl-is-canonical-state.md) — substrate at $\tau$ is the closure of $L_{\leq \tau}$ under the active rule-system.
  Discussion §"What this claim does not say": "It does not say the markdown corpus is *unimportant*."
  Crucially, it also does not say which surface authored each event — the claim is surface-agnostic, which is consistent with codepath-uniformity but does not entail it.

**Upstream theory** (theory-cited):

- The [`closure-2-monad`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md) is defined fiberwise on the predication algebra: $\mathrm{Cl}(\mathcal{E})_q := \mathrm{cl}_q(\mathcal{E}_q)$.
  The iteration to fixed point consumes only the cell content; it has no surface-coordinate.
  Therefore the closure's behavior is *necessarily* surface-invariant — but only if the cell content itself does not encode surface in a way the rules read.
  The witness payload's `channel`/`origin` fields are present in the EAVT cell as part of the event record but are *not* read by closure rules in the current realization (per [`event_log.py`](../../src/pyfars/runtime/event_log.py) `_matches` filter, which is a *reader-side* filter, not a closure-rule input).
- [`closure-2-monad-lax-idempotence`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md) — Kock-Zöberlein lax-idempotence guarantees that re-iterating closure at a fixed point is the identity.
  Joining a hook-authored cell and an MCP-authored cell with byte-equivalent payloads (modulo timestamp/hash) produces the same fixed point — they are interchangeable inputs to $\mathrm{Cl}$.
  This is a strong constraint: the surface cannot affect the closure result *up to payload equivalence*.
- [`settling-calm-corollary`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md) — the active-frontier query is coordination-free; this is consistent with single-writer single-codepath without coordination, and weakens if writes from disparate codepaths needed to coordinate (which they do not in the current realization, because they all funnel through one `EventLog.append`).
- [`regime-classification-is-load-bearing`](../../../pypredcomp/docs/dev/decisions/regime-classification-is-load-bearing.md) — strict regime: finite values, finite live entities, $\kappa < \omega$ closure ordinal, endpoint snapshots.
  The strict regime's auditability commitment requires that every cell trace to its log event in finite hops; multiple uncoordinated codepath writers would break the trace's locality without adding additional schema.

### What was inspected (prior-art-cited)

**The current append codepath in the realization is a single library function.** The `EventLog` class at [`runtime/event_log.py`](../../src/pyfars/runtime/event_log.py) lines 74–105 carries the `append(witness)` method whose body is exactly:

```python
def append(self, witness: Witness) -> None:
    """Append a witness to today's log file."""
    path = self._today_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(witness.to_json())
        f.write("\n")
```

Every existing event-log writer in pyfars terminates here:

- [`runtime/session.py`](../../src/pyfars/runtime/session.py) line 263 — session lifecycle bracketing witnesses (`self.event_log.append(make_witness(...))
  `).
- [`runtime/federation.py`](../../src/pyfars/runtime/federation.py) lines 421, 538, 605 — federation envelope admit/reject witnesses.
- [`runtime/lifecycle.py`](../../src/pyfars/runtime/lifecycle.py) lines 144, 330 — engine tick lifecycle witnesses.
- [`runtime/promote.py`](../../src/pyfars/runtime/promote.py) lines 1338, 1376 — promotion-to-instinct witnesses.
- [`runtime/tool_registry.py`](../../src/pyfars/runtime/tool_registry.py) line 75 — explicit comment: *"The runtime sets this to `event_log.append` so every tool [witness goes through one place]"*.
- [`web/app.py`](../../src/pyfars/web/app.py) line 461 — FastAPI configures `witness_sink=engine.event_log.append`, so HTTP-served writes also funnel here.
- [`cli/hook_dispatch.py`](../../src/pyfars/cli/hook_dispatch.py) — instantiates an `EventLog` and calls `.append(witness)` in its main flow (line 195 references the error path).
- [`mcp/tools.py`](../../src/pyfars/mcp/tools.py) — currently read-only; future write tools will (per [`ship-mcp-write-tool-surface`](../plans/ship-mcp-write-tool-surface.md)) terminate at the same `event_log.append`.

**The Witness payload's surface fields are filter-only, not closure-input.** [`entities/witness.py`](../../src/pyfars/entities/witness.py) defines `Witness` as `frozen=True, extra="forbid"` (line 56).
The `channel: str | None`, `origin: str | None`, and `agent: str | None` fields (lines 65–66, 64) carry surface-identity.
The `_matches()` predicate in `event_log.py` (lines 54–71) filters on these fields *at read time*, which is a downstream consumer concern; the closure-rule machinery in [`runtime/dispatch_graph.py`](../../src/pyfars/runtime/dispatch_graph.py) does not branch on `channel`/`origin` (per the consistency commitment in `dispatch-composes-authorization`).

**The realization is therefore *substantially already* surface-invariant.** The single library function exists; every caller invokes it; the witness payload carries surface-identity in fields that closure rules do not read.

### Defended position

The claim *"PyFARS's cell-write codepath is uniform across the surfaces that invoke it"* is true *in the current realization* but is not yet *named as a substrate commitment*.
The risk the unnamed commitment carries: a future patch that adds a second `with path.open("a")` call (e.g., a perf optimization that batches multiple witnesses through a separate buffered writer; a sub-MCP server that serves a sub-session and writes directly; a federation-admit fast-path that bypasses `EventLog.append`) would not be flagged as a violation.
The codepath-uniformity claim, once authored, becomes the load-bearing discipline that audits and reviews enforce.

Three theoretical anchors weigh in support:

1. **[`substrate-purity`](../../claims/substrate-purity.md) §3 ("The runtime does not touch substrate")** is silent on codepath topology but sets the parent commitment: every transition routes through a verb.
  Codepath-uniformity is the *codepath-level* expression of substrate-purity's *transition-level* claim.
  The new claim *strengthens* substrate-purity to commit also to codepath singularity.
2. **[`closure-2-monad`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/closure-2-monad.md) fiberwise definition** entails surface-invariance at the *closure result* level: $\mathrm{Cl}$ has no surface coordinate.
  The new claim says surface-invariance also holds at the *substrate write* level — the *input* to $\mathrm{Cl}$ does not depend on surface up to payload equivalence.
  Together they ensure surface-invariance *end-to-end*.
3. **[`log-and-record-are-distinct-resource-types`](../../claims/log-and-record-are-distinct-resource-types.md) sketch §1 ("Storage disciplines are inverse")** treats the log as a single append-only resource.
  A single-writer codepath is the lightest-weight realization that respects this discipline; multiple-writers would either coordinate (heavier substrate commitment, breaks CALM-friendliness per [`settling-calm-corollary`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md)) or risk interleaving (breaks ordering).

The defended position synthesizes the three: codepath-uniformity is the realization-level discipline that operationalizes substrate-purity at the codepath layer, that aligns with closure-2-monad's surface-blind iteration, and that fits log-and-record-are-distinct-resource-types' single-writer storage discipline.
Stage 3 will state this as a precise claim with a discharge that routes through these three.

### Witness assertion

`(cycle:2026-05-09-witness-emission-codepath-uniformity, research-completed, true) = T` with `theory-cited:` and `prior-art-cited:` cells populated above.

## Stage 3 — Claim authored

[`claims/witness-emission-is-surface-invariant.md`](../../claims/witness-emission-is-surface-invariant.md) authored at `status: sketch`.
Précis: every cell-write that produces a Witness reaches the event-log file via the single library function `pyfars.runtime.event_log.
EventLog.append`, and substrate behavior under the new cell depends only on the witness payload (not on the surface that invoked `append`).
Discharge factors through (1) `log-and-record-are-distinct-resource-types` for codepath uniqueness, (2) `closure-2-monad` fiberwise definition for surface-invariance of substrate effect, (3) `substrate-purity` for the strengthening relationship.
Two explicit gaps marked: the closure-rule-system constraint (rules don't branch on surface-fields) is not currently audited; multi-process polities are out-of-scope.

Witness assertion: `(cycle:2026-05-09-witness-emission-codepath-uniformity, claim-authored, witness-emission-is-surface-invariant) = T`.

## Stage 4 — Objects and morphisms authored

Three records authored, one each kind:

- **Concept:** [`concepts/surface-invariant-codepath.md`](../../concepts/surface-invariant-codepath.md) — names the realization-property the claim asserts: codepath uniqueness + surface-blindness of substrate effect.
  Realizes `substrate-purity` and `log-and-record-are-distinct-resource-types`; theory-basis cites `closure-2-monad` and `settling-calm-corollary`.
- **Object:** [`objects/event-log-append-call-site.md`](../../objects/event-log-append-call-site.md) — substrate-readable record naming the canonical call site (`pyfars.runtime.event_log.
  EventLog.append`) so the audit reads from substrate, not from a per-commit grep.
  Singleton-per-polity-per-event-log-resource.
- **Morphism:** [`morphisms/auditing-codepath-uniqueness.md`](../../morphisms/auditing-codepath-uniqueness.md) — closure rule that fires on a posted code-survey result cell and produces either an `audit-state: ok` assertion or a `codepath-uniqueness-violation` finding, depending on whether the survey's matches equal the call-site object's named location.
  Strict regime, `substrate-state-only-context` purity (IO is outside the rule).

Witness assertion: `(cycle:2026-05-09-witness-emission-codepath-uniformity, objects-and-morphisms-authored, [surface-invariant-codepath, event-log-append-call-site, auditing-codepath-uniqueness]) = T`.

## Stage 5 — Math examples authored

Three math examples authored, covering the object (also serving the concept) and the morphism in both regimes:

- [`examples/event-log-append-call-site--singleton-instance.md`](../../examples/event-log-append-call-site--singleton-instance.md) — concrete cell trace for the singleton call-site record in the running 561 polity; witnesses both the object's well-formedness and the [`surface-invariant-codepath`](../../concepts/surface-invariant-codepath.md) concept's codepath-uniqueness clause.
- [`examples/auditing-codepath-uniqueness--pass.md`](../../examples/auditing-codepath-uniqueness--pass.md) — pass-regime: survey returns single match equal to canonical site; rule fires on pass branch; produces `audit-state: ok` cells.
- [`examples/auditing-codepath-uniqueness--violation-multiple.md`](../../examples/auditing-codepath-uniqueness--violation-multiple.md) — violation-regime: survey returns two matches; rule fires on otherwise branch; produces a `codepath-uniqueness-violation` finding and `audit-state: violated`.
  Includes the $\top$-cell repair trace for the audit-state transition.

The surface-blindness clause of the concept (the second half of the claim) is *not* witnessed at this cycle; per the morphism's discipline note, the corresponding audit and its example are deferred to a follow-on cycle.
See *Deferred* below.

Witness assertion: `(cycle:2026-05-09-witness-emission-codepath-uniformity, math-examples-authored, [event-log-append-call-site--singleton-instance, auditing-codepath-uniqueness--pass, auditing-codepath-uniqueness--violation-multiple]) = T`.

## Stage 6 — Specification authored

[`governance/specifications/event-log-append.md`](../../governance/specifications/event-log-append.md) authored at `status: draft`, version `2026.05.09+event-log-append`.
Twelve requirements (R1–R12) covering canonical call site (R1–R3), witness payload schema (R4–R6), surface-blindness (R7–R8), append atomicity (R9–R10), and audit (R11–R12).
Five acceptance criteria (§6.1–§6.5) operational-testable against the realization.
Non-normative §7 points at the three stage-5 math examples and names four pending code examples for the implementation chain.

§8 names what this specification does not decide: surface-blindness audit (deferred follow-on); multi-writer / multi-process appends; compaction; cross-polity merge protocol; cryptographic signing; office-authority binding on append (subject of [`delegable-powers-distinct-from-full-powers`](../../questions/delegable-powers-distinct-from-full-powers.md) cycle).

Witness assertion: `(cycle:2026-05-09-witness-emission-codepath-uniformity, specification-authored, event-log-append:2026.05.09+event-log-append) = T`.

## Stage 7 — Integration commissioned

Three records reconciled with the cycle's outputs:

- [`ship-mcp-write-tool-surface`](../plans/ship-mcp-write-tool-surface.md) plan frontmatter extended with `derives-from-claim`, `derives-from-cycle`, `derives-from-spec`, `theory-basis` fields.
  Body §"What this plan does" rewritten to cite the cycle/claim/spec/object/morphism; §"Theory grounding" extended with cycle outputs; §"What this plan does NOT claim" names the spec R11–R12 deferral and the manual-inspection settlement posture for the codepath-uniqueness milestone-cell.
- [`author-mcp-append-witness-tool`](../tasks/engineering/author-mcp-append-witness-tool.md) task frontmatter gains `plan`, `derives-from-claim`, `derives-from-spec`, `satisfies-requirements: [R1–R6]`.
  Body description cites spec R1–R6; acceptance criteria each cite the spec section operationalized.
- [`route-hook-dispatch-through-mcp-append-witness`](../tasks/engineering/route-hook-dispatch-through-mcp-append-witness.md) task frontmatter gains the same provenance fields with `satisfies-requirements: [R1–R2]`.
  Body description acknowledges that the cycle's stage-2 prior-art audit found this surface *already* satisfies codepath uniqueness; the task formalizes and verifies the joint property after the MCP tool lands.
  Acceptance criteria cite spec §6 sections and operate over code-example fixtures (named in implementation-chain step 2).

The reconciled plan + tasks now form a complete derivation chain from upstream theory (closure-2-monad, substrate-purity, log-and-record-are-distinct-resource-types) through the cycle's claim, objects, morphisms, and specification, down to operational acceptance criteria.
Each task can be picked up by an engineer who reads only the task and the spec — the spec carries the context, the spec cites the claim, the claim's discharge routes through the upstream theorems.

Witness assertion: `(cycle:2026-05-09-witness-emission-codepath-uniformity, integration-commissioned, [ship-mcp-write-tool-surface, author-mcp-append-witness-tool, route-hook-dispatch-through-mcp-append-witness]) = T`.

## Deferred

Three deferrals surfaced across stages 4–7:

- **Surface-blindness audit morphism.** [`witness-emission-is-surface-invariant`](../../claims/witness-emission-is-surface-invariant.md)'s second clause (closure-rule-system does not branch on `channel`/`origin`/`agent`) is named in the claim and stated as spec R7–R8 but is *not* substrate-audit-enforced; no closure rule fires on a closure-rule-survey to detect violations.
  A follow-on cycle authors `morphisms/auditing-closure-rule-surface-blindness.md` plus the corresponding survey-emission verb.
  Reason for deferral: the closure-rule-survey machinery does not yet exist; authoring it is downstream-cycle work.
- **Substrate-resident codepath audit operation.** Spec R11 commits the realization to a `pyfars audit-codepaths` CLI verb (or CI integration) that posts code-survey result cells to substrate; spec R12 commits to the [`auditing-codepath-uniqueness`](../../morphisms/auditing-codepath-uniqueness.md) closure rule's runtime registration.
  Neither lands in this cycle's plan; both are needed for the plan's milestone-cell `(witness-event-log, single-codepath, true) = T` to settle on substrate-derived audit rather than manual inspection.
  Reason for deferral: scope-control on the leading-edge `ship-mcp-write-tool-surface` plan; a follow-on plan `ship-codepath-uniqueness-audit` will carry both.
- **Multi-process append coordination.** Spec R10 explicitly defers this.
  The current single-process strict-regime polity does not need it; introducing it would require a separate cycle whose research stage covers POSIX advisory locking, single-writer-via-supervisor patterns, or a coordination service.
  No urgency.

## What this cycle changed

The polity now holds **witness-emission codepath uniformity** as a named substrate commitment.
Before this cycle, the leading-edge `ship-mcp-write-tool-surface` plan asserted a "single codepath" milestone-cell as engineering preference; the realization in fact already satisfied codepath uniqueness across all current callers, but no claim, object, morphism, or specification named the property as load-bearing.
After this cycle, the property is:

- *named* as a claim ([`witness-emission-is-surface-invariant`](../../claims/witness-emission-is-surface-invariant.md)) with proof obligation routed through `closure-2-monad`, `substrate-purity`, and `log-and-record-are-distinct-resource-types`;
- *substrate-readable* via the [`event-log-append-call-site`](../../objects/event-log-append-call-site.md) singleton object;
- *audit-mechanizable* via the [`auditing-codepath-uniqueness`](../../morphisms/auditing-codepath-uniqueness.md) closure rule (not yet runtime-registered; deferred);
- *normatively required* via spec [`event-log-append`](../../../governance/specifications/event-log-append.md) R1–R12;
- *concretely-witnessed* via three math examples (singleton instance, audit pass, audit violation);
- *operationally bound* to the leading-edge plan's two tasks via reconciliation.

The leading-edge plan and its tasks are now stage-7-derivation-chain-intact: an engineer engaging either task can read the task → the spec → the claim → the upstream theorems, and a reviewer can audit the chain end-to-end.

The substantive shift in the polity's roadmap: a category of leading-edge harness work that previously would have been authored as stage-7-only integration ("we need a plan for X") now has a template — author the question first, run the cycle, then integrate.
The cycle's seven stages are no longer aspirational; this is the first complete cycle the polity has run since the captain articulated the duty on 2026-05-09.
The duty is now substrate-witnessed by this cycle's existence.
