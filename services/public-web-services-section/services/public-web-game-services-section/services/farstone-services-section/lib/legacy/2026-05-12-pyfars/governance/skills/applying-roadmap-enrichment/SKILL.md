---
name: "Applying roadmap enrichment"
description: "Walks the roadmap milestone-by-milestone, promotes each milestone's work one fidelity-level closer (sketch → milestone → goal → plan → task; horizon: captured → later → soon → doing), AND extends the roadmap into newly-reachable future work by authoring sketches or milestone-records for far-future milestones the cycle's promotion has made authorable. This is the *integration stage* (stage 5) of the [roadmap-enrichment cycle](../../work/recurrent-practices/roadmap-enrichment-cycle.md); the upstream stages (question selection, research, claim-authoring, objects/morphisms-authoring) are the [`pyfars-roadmap-enrichment-officer`](../offices/pyfars-roadmap-enrichment-officer.md)'s work and produce the substrate handles this skill integrates."
---


## Position in the larger cycle

This skill is **stage 5** of the [roadmap-enrichment cycle](../../work/recurrent-practices/roadmap-enrichment-cycle.md).
The cycle's stages 1–4 (question selection → research → claim-authoring → objects/morphisms-authoring) are owned by the [`pyfars-roadmap-enrichment-officer`](../offices/pyfars-roadmap-enrichment-officer.md) and produce: a question-selection witness, a research witness, a claim record, and a set of object/morphism records.
This skill — held by the [`pyfars-records-officer`](../offices/pyfars-records-officer.md) — takes those upstream outputs and folds them into the roadmap as milestone goals, plan-record steps, and task records.

When invoked **as part of a cycle**, the records officer reads the cycle record's `commissioned-integration:` cells and applies the promotion + extension passes below.
When invoked **standalone** (e.g., for routine fidelity-vs-horizon maintenance with no upstream cycle), the passes still run, but the records officer has no upstream stage-4 outputs to integrate — the work is purely fidelity-promotion over existing milestones.

A cycle that touches the roadmap *without* invoking this skill via a commissioned hand-off is a [`run-full-cycle-not-just-integration`](../duties/run-full-cycle-not-just-integration.md) duty breach by the roadmap-enrichment officer (skipping to integration).
Conversely, this skill applied to milestone shape that has *no* originating claim or objects/morphisms backing it is an absorption-not-derivation move — it integrates content the polity hasn't defended.

## Requirements

- Read access to [`work/milestones/roadmap.md`](../../work/milestones/roadmap.md), [`work/milestones/`](../../work/milestones/), [`work/goals/`](../../work/goals/), [`work/plans/`](../../work/plans/), [`work/tasks/`](../../work/tasks/), [`questions/`](../../questions/), [`questions/_themes.md`](../../questions/_themes.md)
- The [roadmap-enrichment concept](../../concepts/roadmap-enrichment.md) read and understood
- [`writing-milestone-records`](writing-milestone-records.md), [`writing-goal-records`](writing-goal-records.md), [`writing-plan-records`](writing-plan-records.md), [`writing-task-records`](writing-task-records.md), [`promoting-task-horizons`](promoting-task-horizons.md), and [`authoring-future-arc-milestone-records`](authoring-future-arc-milestone-records.md) skills available
- [`derive-from-theory-before-planning`](../duties/derive-from-theory-before-planning.md) and [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md) duties active

## Two passes per cycle

Each enrichment cycle has *two* passes.
The promotion pass is reactive: it brings existing milestones into fidelity-horizon match.
The extension pass is anticipatory: it grows the roadmap's reach into newly-reachable future work.
Skipping the extension pass produces **reach-stagnation** — the roadmap stops tracking what becomes possible.

## Steps — promotion pass

1. **Read the roadmap** at [`work/milestones/roadmap.md`](../../work/milestones/roadmap.md).
  Identify each milestone's current horizon (in its frontmatter) and current fidelity (sketch / milestone-record-only / goals-listed / plans-authored / tasks-authored).

2. **Walk milestones from nearest to farthest.** For each milestone, check fidelity-vs-horizon match per the [roadmap-enrichment concept](../../concepts/roadmap-enrichment.md)'s table:

   | Milestone horizon | Required fidelity |
   |---|---|
   | `doing` | tasks have records; depends-on satisfied; acceptance specific |
   | `soon` | plan with DAG exists; tasks slug-listed in plan; foundational tasks have records |
   | `later` | milestone record with goals enumerated; goal records with theory-grounding |
   | `captured` | sketch in roadmap OR milestone record without goals decomposed |

3. **For each fidelity-violation found**, run the appropriate sub-skill:
   - Missing milestone record at `later` → [`writing-milestone-records`](writing-milestone-records.md)
   - Missing goal records at `later` → [`writing-goal-records`](writing-goal-records.md) (one per goal)
   - Missing plan record at `soon` → [`writing-plan-records`](writing-plan-records.md)
   - Missing task records at `doing` → [`writing-task-records`](writing-task-records.md) (one per task)
   - Tasks at `soon` whose depends-on are satisfied → [`promoting-task-horizons`](promoting-task-horizons.md)

4. **Promote sketches to records** when the captain confirms or when the substrate-side machinery has matured.
  A sketch in the roadmap promotes to a milestone record by [`writing-milestone-records`](writing-milestone-records.md) — but **never** for sketches whose theory the records officer doesn't understand (per [`don't write notes you don't understand`](../../CLAUDE.md) discipline).

5. **Use questions to rescope existing milestones.** Per [`questions/_themes.md`](../../questions/_themes.md), the substrate carries open questions whose framing may sharpen or rescope existing milestones.
  When a question's content is clear and structurally affects a milestone (e.g., the question argues the milestone is *bigger* than currently scoped), update the milestone-record substantively — not just by threading a "Related self-questions" reference. **Distinguish**: threading a reference is enrichment-as-pointer; rescoping is enrichment-as-content.
  Both are appropriate at different cycles.

## Steps — extension pass

6. **Identify newly-reachable future work.** After the promotion pass, ask three diagnostic questions:

a. **Prerequisite-discharged extension**: did any milestone advance to `soon` or `doing` this cycle?
If yes, what work *requiring* that milestone as prerequisite is now stateable but isn't on the roadmap?
(Often this is work the polity has informally discussed; the cycle is the moment to substrate-it.)

b. **Question-cluster extension**: does any question or question-cluster (per [`questions/_themes.md`](../../questions/_themes.md)) now describe a yes-answer that would be its *own* milestone rather than a rescope of an existing one?
A yes-answer that produces ≥3 new goals not present in any existing milestone is a milestone-extension candidate, not a rescope.

c. **Substrate-realization extension**: does [`surveying-record-type-gaps-against-predwork-predgov`](surveying-record-type-gaps-against-predwork-predgov.md) (or recent invocation thereof) surface a substrate gap whose closure would itself be a named milestone?

7. **For each extension candidate, author at the right fidelity:**
   - **Sketch in roadmap.md** if theory has not yet been read sufficiently for an honest milestone record.
     The sketch lives as a paragraph under a heading like `### MN+1 — <sketch title>`; carries a one-paragraph framing; lists prerequisite milestones; cites the discharging-prerequisite or question-cluster.
   - **Milestone record** at [`work/milestones/MN+1-<slug>.md`](../../work/milestones/) if theory has been read sufficiently for honest framing per [`authoring-future-arc-milestone-records`](authoring-future-arc-milestone-records.md).
     Frontmatter `horizon: captured`; explicit "What [milestone] does NOT claim" section per [`author-honest-non-claims-section`](../duties/author-honest-non-claims-section.md).

8. **Update the roadmap** to reflect any extensions: roadmap.md gains the new sketch (at the dependency-DAG position appropriate to the prerequisite chain) or a link to the new milestone record.

9. **Update the dependency diagram** in [`work/milestones/roadmap.md`](../../work/milestones/roadmap.md) §"Dependency Diagram" to include the new milestones, showing what they depend on and what they unblock.

10. **Witness** the enrichment-cycle: emit a substrate-record under [`work/findings/`](../../work/findings/_index.md) with slug `roadmap-enrichment-cycle-<YYYY-MM-DD>` listing what was promoted (promotion pass), what was extended (extension pass), what fidelity-violations were resolved, what remains, and what was deferred.

## Outcomes

- Every milestone's structural fidelity matches its horizon.
- The roadmap's reach extends to cover work the cycle's promotions have made authorable.
- Some existing milestones may have been rescoped substantively per question content.
- The session's enrichment work is witnessed as a finding for audit.
- Subsequent sessions or successor agents can pick up the cycle where this session left off without re-deriving the state.

## When NOT to apply

- During an emergency response (charter violation, stuck dispatch, anomaly review).
  Enrichment discipline yields to operational urgency; resume after.
- When the captain has explicitly suspended a milestone or campaign — promoting its work then would generate fidelity-violations the captain has already chosen to accept.
- When upstream theory required to ground a goal's design-constraints isn't yet authored.
  Per [`escalate-when-theory-gap-found`](../duties/escalate-when-theory-gap-found.md), enrichment pauses for theory work; resume after the gap is filled.

## When the extension pass is the *only* pass needed

Some cycles produce no fidelity-violations (the promotion pass is a no-op) but still produce extension work.
This is the discipline working correctly — when no milestone has crossed a horizon boundary but the polity's understanding of the future has grown (new questions threaded, new theory read, new captain framing surfaced), the extension pass alone advances the substrate's representation of work. **An extension-only cycle is a valid cycle**; do not skip it because there's nothing to promote.

## Discipline notes

- **Don't enrich inward without theory grounding.** A milestone promoted from sketch to record without theory-basis cells is fidelity-violating in the other direction (premature commitment).
  Per [`derive-from-theory-before-planning`](../duties/derive-from-theory-before-planning.md), each milestone, goal, and load-bearing task carries `theory-basis:` in its frontmatter.
- **Don't extend without the cycle making the extension authorable.** Authoring far-future milestones the polity has *not yet matured toward* is sketch-overspending: the new milestone's framing will likely shift before its prerequisite reaches `soon`.
  The extension pass authors what *this cycle's promotion has enabled*, not the polity's full conceivable far-future.
- **Never elide the "What X does NOT claim" sections.** Per [`author-honest-non-claims-section`](../duties/author-honest-non-claims-section.md), milestones and load-bearing goals carry honesty-bounds explicitly.
  Enrichment-promotion or extension that drops these is incomplete.
- **Use markdown links, not shortcodes**, when cross-referencing milestones/goals/plans/tasks.
  Per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md): substrate-readable references must resolve to substrate cells.
- **Enrichment is a [recurrent practice](../../work/recurrent-practices/_index.md)**, not a one-shot.
  Schedule it: per session, per milestone-transition, per captain-prompt-asking-about-roadmap.
- **Per memory feedback "561 — focus user's idea, not your own"**: when the captain frames a far-future direction in conversation, the extension pass authors *that* direction.
  Counter-architecting from precedent is not enrichment.
- **Per memory feedback "561 — don't invent adjacent scope"**: extension authors what the cycle's promotion has made authorable.
  Authoring lateral/orthogonal milestones (not in the prerequisite chain) requires explicit captain direction.
