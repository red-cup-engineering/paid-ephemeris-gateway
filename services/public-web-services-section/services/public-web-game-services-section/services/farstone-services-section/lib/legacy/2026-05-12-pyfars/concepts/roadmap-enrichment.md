---
type: concept
depends-on: [plan, recurrent-practice, dispatch-readiness, formality-layer]
see-also: [fidelity-level, dispatch, heartbeat]
---

# Roadmap enrichment

The discipline of growing the system's representation of work along *two* directions, on cadence: (1) *promotion* — pushing each milestone's existing fidelity one level closer to action; (2) *extension* — adding far-future milestones that become authorable because of the cycle's promotion.
Distant milestones live as sketches; near milestones live as authored records with goals; nearer ones grow plans coordinating their tasks; the nearest become tasks at `doing` horizon. **Each cycle of enrichment promotes the existing roadmap *and* extends the roadmap into newly-reachable future work.**

## What "roadmap enrichment" pins down

The discipline has three interlocking ladders:

- **Fidelity ladder** — the structural form of the work record: roadmap-sketch → milestone-record → goal-records → plan-record → task-records → sub-task-records.
  See [fidelity-level](fidelity-level.md).
- **Horizon ladder** — the temporal label on the work: `captured` (≥9 months out or unscoped) → `later` (3–9 months out) → `soon` (next-milestone candidate) → `doing` (committed and in-flight).
  See [conventions](../governance/conventions.md) §"Horizon (scheduling)".
- **Reach ladder** — how far into the future the roadmap *itself* extends.
  A roadmap that names M1–M8 has reach-8; a roadmap that names M1–M12 has reach-12.
  The cycle's extension step grows reach.

Enrichment discipline holds when, **for every milestone**, the structural fidelity matches the horizon, AND **for the roadmap as a whole**, the reach extends to cover future work that has become authorable.
A milestone at `horizon: doing` whose tasks are still at goal-fidelity is **fidelity-violating**: the work isn't actually doable until tasks are decomposed.
A milestone at `horizon: captured` with full plan-and-task fidelity is **fidelity-overspent**: effort poured into details that may not survive contact with prerequisite milestones.
A roadmap whose reach hasn't grown for several cycles despite mid-arc milestones advancing is **reach-stagnant**: the system's representation of *what becomes possible* has stopped tracking what *is* becoming possible.

## Why enrichment matters

Without enrichment, three failure modes appear:

- **Sketch-stuck** — distant milestones stay as one-paragraph notes forever; when the captain or a successor agent picks up that work, they have to re-derive everything.
  Promotion defeats this by promoting far-future sketches up to authored records as time and confidence permit.
- **Premature-task** — near milestones are decomposed into 30 tasks at the captain's first mention, before goal- and plan-fidelity is settled.
  The 30 tasks then drift as goals shift, and substrate carries dead detail.
  Promotion defeats this by *not* writing tasks until plan-fidelity stabilizes.
- **Roadmap-truncation** — the roadmap names M1–MN, the polity ships M1, and the roadmap stays at M1–MN even though M1's settlement *enables work that needs naming*.
  New possibilities appear at the far edge of the cone of feasibility but stay unnamed because no skill is firing on the "what's now newly authorable?" question.
  Extension defeats this by closing the loop: each promotion makes one or more far-future sketches authorable, and the cycle authors them.

The enrichment discipline is *the discipline that the system's representation of work grows monotonically as time advances*, in **both** directions: existing work gets more specific, *and* the roadmap reaches further.
It is structurally similar to the [formality-layer](../governance/conventions.md) progression (F1 prose → F2 structured → F3 algebraic) applied to *planning* rather than *rule definition*.

## What gets done at each enrichment-step

When the records officer applies enrichment at a session boundary, two passes:

### Promotion pass (existing milestones)

1. **At `horizon: doing`** — tasks must have records, depends-on satisfied, acceptance criteria specific, theory-grounding cited.
  Anything weaker is a fidelity-violation.
2. **At `horizon: soon`** — tasks have records; the milestone has a [plan](../work/plans/) with dependency-DAG and milestone-cells.
  Plan record exists; tasks may be slug-listed in the plan's frontmatter without all having full records yet.
3. **At `horizon: later`** — milestone has a record with goals enumerated; goal records exist with theory-grounding and design-constraints; plan record may exist but isn't required.
4. **At `horizon: captured`** — milestone may be just a sketch in the roadmap, OR an authored record without goals decomposed.
  Acceptable.

When work crosses a horizon boundary (e.g., M3 transitions from `later` to `soon`), the promotion-step authors the missing fidelity. **Crossing inward without authoring is a fidelity-violation; the records officer's [maintain-roadmap-enrichment-discipline](../governance/duties/maintain-roadmap-enrichment-discipline.md) duty fires.**

### Extension pass (newly-reachable future work)

After promotion, the records officer asks: *what far-future work has become authorable as a result of this cycle's advances*?
Three patterns to watch for:

1. **Prerequisite-discharged extension**: a milestone advancing to `soon` or `doing` settles enough of the substrate that work previously *unstateable without the prerequisite* becomes stateable.
  Example: M6 (federation) advancing makes a "federation between PyFARS and other-substrate systems" milestone newly authorable.
2. **Question-cluster extension**: a question or question-cluster has matured enough (through threading, theme-indexing, or partial answers) that the questions' yes-answer would be a *named milestone* rather than just a re-scope of an existing one.
  Example: a yes-answer to [`distributed-coordination-primitives-for-federation`](../questions/distributed-coordination-primitives-for-federation.md) is plausibly its own milestone, not a rescope of M6.
3. **Substrate-realization extension**: a substrate gap surfaces (per [`surveying-record-type-gaps-against-predwork-predgov`](../governance/skills/surveying-record-type-gaps-against-predwork-predgov.md)) that the current roadmap doesn't name an effort to close.
  Example: a missing realization of a PredGov object whose absence is blocking near-term work warrants a named substrate-extension milestone.

For each candidate, the records officer authors *either* a sketch in [`work/milestones/roadmap.md`](../work/milestones/roadmap.md) OR (when sufficient theory has been read per [`authoring-future-arc-milestone-records`](../governance/skills/authoring-future-arc-milestone-records.md)) a full milestone-record with `horizon: captured`.
The roadmap's reach grows; no goals or tasks are authored for the newly-extended milestones (per the captured-tier discipline).

## Roadmap enrichment applied across milestones

A typical session-application of enrichment walks the roadmap from nearest to farthest, then asks the extension question:

| Milestone position | Promotion action | Extension question |
|---|---|---|
| Nearest (`horizon: soon` or `doing`) | Verify all tasks have records; promote depends-on-satisfied tasks to `doing` horizon | Has this advance enabled work the next-near milestone doesn't yet name? |
| Next-after-nearest (`horizon: later`) | Verify plan exists; verify goals authored with theory-grounding; consider promoting foundational independent tasks to `soon` | n/a |
| Mid-distance (`horizon: later` → `captured` boundary) | Verify milestone record exists; verify goals listed in frontmatter; goal records may or may not exist | n/a |
| Far-future (`horizon: captured`, sketches) | Promote oldest-stable sketches to milestone records when ready; otherwise leave as sketches | What far-future work, made authorable by current cycle, isn't yet captured at all? |

The walk produces "more specific plans and tasks for our development roadmap, as well as moving the nearest-next work from plans to tasks, the stuff past that from whatever to plans, and so on, down through each milestone" — the captain's framing of the discipline — *and additionally* "the next step into the future that's made possible by that cycle".

## Enrichment and the substrate algebra

Enrichment discipline is *not* claim-shaped — it does not assert that the work *will* be completed in any particular order, only that *the system's representation of the work* matches its current horizon and that the system's roadmap reflects the polity's current sense of what is becoming possible.
This makes enrichment compose with [dispatch](dispatch.md): dispatch reads the active task frontier (per [dispatch-readiness](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md)) and finds tasks whose `horizon: doing` actually corresponds to current dispatchability — without enrichment, dispatch picks up half-formed sketches and either fails or wastes work.

Enrichment is **substrate-purity-preserving**: it doesn't change what work the substrate carries; it changes the *fidelity of representation* of that work, level by level, *and* the *reach* of that representation, far edge first.
Substrate holds *what is*; enrichment keeps *what is* legible at the right depth and at the right reach.

## Position relative to the operations loop

The [operations-loop](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/operations-loop.md) cycles plan → execution → observation → finding → adjustment → next plan.
Enrichment is what keeps the *plan* end of that loop populated at the right depth *and* the right reach.
Without enrichment, the loop's plan-input is ad-hoc; with enrichment, the plan-input is *the system's authored representation of work-at-horizon-and-reach*.

This makes enrichment the **planning side's recurrent practice**: a [recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) at session-cadence, with the records officer as the cycling agent, and the system's milestone/goal/plan/task fidelity-and-reach as the cells the practice settles.

## What roadmap enrichment is not

- *Not a project-management tool.* Enrichment is a system-readable discipline, not a Gantt chart, milestone-tracker, or sprint-planning meeting.
  It's what the substrate carries; it's not what humans coordinate around in a separate space.
- *Not a Waterfall artifact.* Enrichment does not force work to flow strictly milestone → goal → plan → task in time.
  It forces work-at-horizon to have appropriate fidelity *and* the roadmap to have appropriate reach.
  A captain may revise plans mid-stream, abandon goals, promote sketches, or rescope far-future milestones — the enrichment discipline ensures the substrate represents the current state at appropriate fidelity-and-reach.
- *Not a rigid hierarchy.* A goal may not need a plan record; a milestone may have very few tasks; a plan may dissolve back into goals if the dependency structure is simpler than first thought.
  The fidelity ladder is *what's available*; only what's needed gets used.
  Similarly, the extension step is *what's authorable now*; only the genuinely-newly-reachable gets named.
- *Not a guarantee that the roadmap reflects what will happen.* Enrichment ensures the roadmap reflects what the polity *currently understands as possible and intended*.
  The polity's understanding evolves; the roadmap evolves with it; past versions are system-readable via git history and via the findings (`work/findings/roadmap-enrichment-cycle-*.md`) that witness each cycle.

## Vocabulary used elsewhere

The discipline produces these terms in findings, audit reports, and cross-references:

- **fidelity-violation**: a milestone's actual fidelity is below the minimum required by its horizon.
  Triggers [`maintain-roadmap-enrichment-discipline`](../governance/duties/maintain-roadmap-enrichment-discipline.md).
- **fidelity-overspent**: a milestone's actual fidelity exceeds what its horizon warrants.
  Not blocking; flagged for revision-likelihood (see [`work/plans/ship-m6-federation.md`](../work/plans/ship-m6-federation.md) for an example annotation).
- **reach-stagnant**: the roadmap's reach hasn't grown for ≥3 cycles despite mid-arc advances.
  Suggests the extension pass is being skipped.
- **enrichment-cycle**: one application of the discipline to the substrate.
  Witnessed by a finding with slug `roadmap-enrichment-cycle-<YYYY-MM-DD>` (legacy findings authored before this rename use slug `cascade-application-<YYYY-MM-DD>`; both pattern-classes are valid history).
