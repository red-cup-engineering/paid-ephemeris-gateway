---
name: "Running the roadmap-enrichment cycle"
description: "The composite seven-stage skill that runs question → research → claim → objects/morphisms/concepts → math-examples → specifications → integration as one cycle. Use when the captain prompts for roadmap enrichment, or when a question's status reaches ripe-for-cycle, or on the recurrent-practice's scheduled cadence."
---


The cycle's structure is question → research → claim → objects/morphisms/concepts → math examples → specifications → integration.
Each stage produces a substrate witness; the whole is captured by a `cycle-record` at `work/cycles/<YYYY-MM-DD>-<question-slug>.md`.
This skill is the integrating composite — each stage delegates to a more specific skill, and the cycle-record binds them.

## Requirements

- The [`pyfars-roadmap-enrichment-officer`](../offices/pyfars-roadmap-enrichment-officer.md) office held.
- The [`run-full-cycle-not-just-integration`](../duties/run-full-cycle-not-just-integration.md) duty active.
- Read access to `questions/`, `claims/`, `concepts/`, `governance/objects/`, `governance/morphisms/`, `work/milestones/`, the predicated-work and predicated-categories theory directories.
- Skills available: [`identifying-grounding-records-for-question`](identifying-grounding-records-for-question.md), [`consulting-predwork-theory`](consulting-predwork-theory.md), [`authoring-realization-claim`](authoring-realization-claim.md), [`authoring-objects-and-morphisms-from-claim`](authoring-objects-and-morphisms-from-claim.md), [`authoring-math-examples`](authoring-math-examples.md), [`authoring-a-specification`](authoring-a-specification.md), [`applying-roadmap-enrichment`](applying-roadmap-enrichment.md) (records officer hand-off target).

## Stage 1 — Select question

1. **Read the question backlog** at `questions/` (and `questions/_themes.md` for cross-cutting groupings).
2. **Filter for cycle-readiness**:
   - Has substantive upstream theory the polity has already partially read.
   - Is not blocked on captain-decision (some questions are awaiting captain framing; do not select these).
   - Is not currently in another cycle (check `work/cycles/` for open cycle records).
3. **Pick one** — by captain instruction, or by your own judgment if the captain delegated picking.
  When in doubt about which to pick, ask the captain via AskUserQuestion rather than choosing arbitrarily.
4. **Open a cycle record** at `work/cycles/<YYYY-MM-DD>-<question-slug>.md`.
  Frontmatter: `type: cycle`, `question:`, `officer:`, `status: stage-1-question-selected`, `stage-witnesses: [{stage: select-question, witnessed-at: <ord>}]`.
  Body: brief reason for selection.

**Stage-1 witness**: assertion `(cycle:<slug>, selected-question, <question-slug>, t)` recorded in the cycle record.

## Stage 2 — Research

1. **Read the question carefully**, including its `explores:` and any `depends-on:` chains.
  Walk to upstream theory the question references.
2. **Read the upstream theory** — actually read, not survey.
  The output is a defended position, not a summary.
  For research-heavy questions, this stage may take significant time; that is expected and correct.
3. **Read prior art** — relevant pypredcomp specs, engineering-archive notes, mash content, anything else the polity has already done in adjacent space.
  Prior art is *evidence* for or against tenable claims, not the claim itself.
4. **Read existing PyFARS-side content** under the type subdirectories (`concepts/`, `objects/`, `claims/`, `morphisms/`) for any partial lifts already in place.
5. **Apply [`consulting-predwork-theory`](consulting-predwork-theory.md)** if the question touches work-shape (most do).
6. **Apply [`identifying-grounding-records-for-question`](identifying-grounding-records-for-question.md)** to produce a draft list of grounding records the resolution will require — a manifest, not a commitment.
7. **Decide**: is the research sufficient to commit to a position?
  If no — escalate (theory gap or captain-decision required); pause cycle.
  If yes — proceed to stage 3.

**Stage-2 witness**: in the cycle record, append `theory-cited:` listing every theorem/claim/object slug read and `prior-art-cited:` listing every external prior-art file read.
Status → `stage-2-research-completed`.

## Stage 3 — Author claim

1. **Apply [`authoring-realization-claim`](authoring-realization-claim.md)** with the position assembled in stage 2.
2. **The claim's frontmatter must include `derived-from-question:`** citing the question selected in stage 1 (per [`cite-question-in-claim`](../duties/cite-question-in-claim.md) duty).
3. **One claim per cycle is the typical case**, but a research stage that surfaces multiple defensible positions can author multiple claims; cite each in the cycle record.
4. **Set status appropriately**: `draft` (claim precisely stated, no proof), `sketch` (proof outline with gaps), `proved` (complete proof or upstream-theorem citation discharges), `open` (proof routes to still-open upstream theorem).

**Stage-3 witness**: the new `claims/<claim-slug>.md` record(s); update cycle record with `authored-claims: [<claim-slugs>]`, status → `stage-3-claim-authored`.

## Stage 4 — Author objects, morphisms, and concepts

1. **Apply [`authoring-objects-and-morphisms-from-claim`](authoring-objects-and-morphisms-from-claim.md)** to enumerate the substrate objects (record-types, cell-shapes), morphisms (closure rules, transformations), and concepts (semantic role anchors) the claim requires for engineerability.
2. **For each concept**, author a record at `concepts/<slug>.md`.
  A concept is a semantic anchor — it names a role that recurs across multiple structures; objects and morphisms declare which concepts they `realizes:`.
3. **For each object**, author a record in the canonical type-directory (`governance/objects/<slug>.md` or domain-appropriate `objects/`).
  Per CLAUDE.md, use `pyfars where <kind> <slug>` to locate the canonical directory.
4. **For each morphism**, author a closure-rule record (`governance/morphisms/<slug>.md` or domain-appropriate location) with explicit premise → conclusion shape.
5. **Each authored record's frontmatter must include `derives-from-claim:`** citing the claim from stage 3 (per [`cite-claim-in-objects-and-morphisms`](../duties/cite-claim-in-objects-and-morphisms.md) duty).
6. **If stage 4 reveals a theory gap** (the claim's objects/morphisms have no upstream theorem to ground them), pause cycle and escalate per [`escalate-when-theory-gap-found`](../duties/escalate-when-theory-gap-found.md).
7. **Do not author examples in this stage.** Identify what math examples will be needed and note them in the cycle record as `pending-math-examples:`; stage 5 authors them.

**Stage-4 witness**: the new concepts/objects/morphisms records; update cycle record with `authored-concepts: [<concept-slugs>]`, `authored-objects: [<obj-slugs>]`, and `authored-morphisms: [<morph-slugs>]`, status → `stage-4-objects-and-morphisms-authored`.

## Stage 5 — Author math examples

1. **Apply [`authoring-math-examples`](authoring-math-examples.md)** for each object, morphism, and concept authored in stage 4.
2. For each, produce at least one worked mathematical instantiation at `examples/<slug>--<example-slug>.md` with `kind: math`.
3. Math examples are not code — no Python, no CLI invocations.
  They instantiate the formalism with concrete mathematical values.
4. If no satisfying example can be authored for a structure (because the instantiating substrate state doesn't yet exist), record a forward-pointer under `deferred-math-examples:` in the cycle record.

**Stage-5 witness**: the new `examples/<slug>.md` records; update cycle record with `authored-math-examples: [<example-slugs>]`, status → `stage-5-math-examples-authored`.

## Stage 6 — Author specifications

1. **Apply [`authoring-a-specification`](authoring-a-specification.md)** for the objects, morphisms, and concepts from stage 4, grounded by the math examples from stage 5.
2. Produce a `governance/specifications/<slug>.md` record with `status: draft` and version `YYYY.
  MM.
  DD.noun`.
3. The spec's §6 acceptance criteria become the direct inputs to test authoring in the implementation chain.
4. Review every normative requirement in §5 against at least one stage-5 math example; flag gaps in §8.

**Stage-6 witness**: the new `governance/specifications/<slug>.md` record; update cycle record with `authored-specifications: [<spec-slugs>]`, status → `stage-6-specifications-authored`.

## Stage 7 — Commission integration

1. **Identify roadmap touchpoints** — for each authored object/morphism, which existing milestone(s) it attaches to, and whether it implies a new milestone, goal rescope, or arc extension.
2. **Commission spec implementation** — for each authored specification, commission a task for the developer to run the implementation chain (`running-implementation-chain`).
  The task's input is the spec slug; the acceptance condition is all tests passing.
3. **Author a hand-off note** in the cycle record: `commissioned-integration:` listing each (touchpoint, action) pair.
  Examples: `(M3, add-goal: emit-cycle-completion-witness)`; `(new-milestone, M20-cycle-audit-tooling, sketch-only)`; `(spec: predication-graph-walk, commission: implementation-chain)`.
4. **Hand off to the records officer**, who applies [`applying-roadmap-enrichment`](applying-roadmap-enrichment.md) — promotion pass + extension pass — over the touchpoints.
5. **The records officer's existing duty** [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md) governs fidelity-vs-horizon matching at integration time; that's their stage, not this office's.
6. **The integration is itself substrate-witnessed** by the records officer's existing finding-record convention (`work/findings/roadmap-enrichment-cycle-<YYYY-MM-DD>.md`).
  The cycle record cites the finding.

**Stage-7 witness**: `commissioned-integration:` cells in the cycle record; the records officer's resulting integration-finding cited as `integration-finding:` in the cycle record.
Status → `stage-7-integration-commissioned` then (after integration completes) → `complete`.

## Outcomes

- A `cycle-record` capturing all seven stages with substrate witnesses.
- One or more new `claims/<slug>.md` records with derivation provenance back to the originating question.
- One or more new concepts/objects/morphisms records in canonical type-directories, each citing the originating claim.
- One or more `examples/<slug>.md` math examples with `kind: math` witnessing the new structures.
- One or more `governance/specifications/<slug>.md` records at `status: draft`, with commissioned implementation-chain tasks.
- A records-officer integration that folds the new objects/morphisms into the roadmap, with fidelity-vs-horizon matching per [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md).
- The originating question's `status` updated: `resolved` (cycle output discharges it), `partially-resolved` (cycle output addresses one facet; question remains open on others), or `unchanged` (cycle did not advance the question; the cycle is still valuable but the question awaits another cycle).

## When NOT to apply

- **Maintenance-shaped edits** (typo fix, broken link, slug rename) — those are records-officer maintenance, not cycle work.
- **Captain-explicitly-suspended cycle** — when the captain wants ad-hoc roadmap work that bypasses the cycle (e.g., emergency rescope), this skill yields.
  The captain's suspension is itself a substrate-witnessed event.
- **Theory not yet authored** — when stage 2 reveals the question's upstream theory hasn't been written, escalate to the theory-derivation officer; resume cycle when the gap is filled.
- **Question selected is captain-decision-blocked** — if research surfaces a captain-decision required to commit to a position (e.g., "should the polity adopt the W-MSR Byzantine-filtering discipline?"), pause cycle and route to captain.

## Discipline notes

- **One cycle, one cycle-record.** Multiple parallel cycles each have their own record; do not co-author.
- **Prior art enters at stage 2 or stage 4, never stage 1 or stage 5 as seed.** A cycle whose stage-1 was "absorb pypredcomp v0.7" without a substrate-question grounding it is a discipline breach.
  Prior art is read in stage 2 as evidence, and may *partially realise* the objects/morphisms in stage 4 — but the question and claim must be substrate-resident.
- **Per memory feedback "561 — milestone/plan records must be self-contained"**: when integration commissions new milestone records (or rescopes existing ones), the substantive content lives in the milestone file.
  The cycle record + claim + objects/morphisms records support derivation provenance; they do not substitute for the milestone's body.
