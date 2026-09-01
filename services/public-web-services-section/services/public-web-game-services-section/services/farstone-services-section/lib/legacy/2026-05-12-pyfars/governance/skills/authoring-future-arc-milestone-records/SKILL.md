---
name: "Authoring future-arc milestone records"
description: "Promotes a future-arc milestone (typically `horizon: captured` or `horizon: later`) from sketch to authored milestone-record when sufficient theory has been read to author honestly, with explicit non-claims sections. Use when accumulated reading-and-research justifies promoting a sketched far-future milestone to record-fidelity, but tasks and plans remain inappropriate."
---


## Requirements

- The milestone is currently a sketch in [`work/milestones/roadmap.md`](../../work/milestones/roadmap.md) without a milestone-record file.
- Sufficient theory has been read to author honestly: the [predicated-computing](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/) sub-theory, sub-sub-theory, or external research that grounds the milestone is now legible to the records officer.
- The milestone's claim-space is bounded: the records officer can author the "What [milestone] does NOT claim" section per [`author-honest-non-claims-section`](../duties/author-honest-non-claims-section.md) without overreach.
- The milestone's `horizon:` will remain `captured` or `later` after authoring; this skill does *not* advance horizon, only fidelity.

## Steps

1. **Read the sketch** in [`work/milestones/roadmap.md`](../../work/milestones/roadmap.md).
  Capture the milestone's title, current sketch content, position in the dependency-DAG, and named theory-grounding (if any).

2. **Read the supporting theory.** For each theory-citation in the sketch, read the cited entity.
  For sketches that lack theory-citation, identify the theory that *would* ground the milestone and read it; if no theory grounds it, escalate per [`escalate-when-theory-gap-found`](../duties/escalate-when-theory-gap-found.md).

3. **Verify the captain's intent.** A sketch's content reflects the captain's framing at the time of writing; per memory feedback "561 — focus user's idea, not your own", the milestone-record develops the *captain's* framing, not the records officer's preferred architecture.
  If the records officer's reading suggests a different architecture, file a question per [`work/questions/`](../../work/questions/) rather than re-architecting in the milestone-record.

4. **Apply [`writing-milestone-records`](writing-milestone-records.md)** to author the file.
  Frontmatter `horizon:` stays at `captured` or `later`; `status: planning`.

5. **Author the "What [milestone] does NOT claim" section** with explicit care per [`author-honest-non-claims-section`](../duties/author-honest-non-claims-section.md).
  Future-arc milestones are especially prone to overclaim because they're far enough out that no current substrate refutes them.
  Cite the bounding theorems explicitly:
   - For embodied / autonomy / drone-swarm milestones: cite [`swarm-vs-orchestration-dichotomy`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theories/swarm-intelligence/theorems/swarm-vs-orchestration-dichotomy.md) and [`llm-swarms-fail-classical-conditions`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md).
   - For federation / Byzantine / consensus milestones: name the consensus theorem hypothesis-set the milestone does *not* satisfy.
   - For cost-quantale / optimality milestones: name the Pareto-frontier or strategy-proofness conditions the milestone does *not* claim.

6. **Link the milestone record from the roadmap.** Update [`work/milestones/roadmap.md`](../../work/milestones/roadmap.md) so the sketch's position now contains a markdown link to the milestone record (rather than just inline text).

7. **Do NOT author goals or tasks for the milestone.** Per [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md), a milestone at `horizon: captured` or `later` does not need goal records or task records yet.
  Authoring them is fidelity-overspent; the goals will likely shift before the milestone reaches `soon`.

## Outcomes

A new file in [`work/milestones/`](../../work/milestones/) with `type: milestone`, `horizon: captured` or `later`, theory-basis cells, and an explicit non-claims section.
The roadmap entry now links to the milestone record.
No goals or tasks for the milestone yet — those come when horizon advances.

## Discipline notes

- **Premature future-arc authoring is fidelity-overspent.** A captured milestone authored without sufficient theory-reading produces a record whose claims will be revised when prerequisite milestones ship.
  Wait until the theory-reading is genuinely complete; partial reading produces partial non-claims sections, which is worse than no record.
- **Future-arc milestones are revision-likely.** The milestone-record's body should explicitly note "this milestone's framing will be revised when [prerequisite milestone] ships" if known.
  Substrate readers should not treat a captured milestone as an authoritative deliverable spec.
- **Per memory feedback "561 — proceed without per-step confirmation"**, when the captain authorizes future-arc authoring as part of a multi-task plan, push through.
  Do not stop to ask permission for each milestone in the future-arc series; if the captain wanted to halt, they would have said so.
- **Authoring multiple future-arc milestones in one session is acceptable** if (a) they form a coherent arc, (b) the supporting theory is read together, and (c) the non-claims sections cite the same bounding theorems.
  M9-M12 in this codebase were authored this way during the embodied-deployment arc work.
