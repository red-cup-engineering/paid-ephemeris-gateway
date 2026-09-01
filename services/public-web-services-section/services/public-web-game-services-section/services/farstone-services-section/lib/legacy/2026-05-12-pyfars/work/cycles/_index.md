---
title: "Cycles"
type: index
status: active
realizes: [roadmap-enrichment-cycle, recurrent-practice-witness, derivation-chain-integrity]
---


Per-invocation witness records of the [roadmap-enrichment cycle](../recurrent-practices/roadmap-enrichment-cycle.md).
Each cycle invocation produces one record at `<YYYY-MM-DD>-<question-slug>.md` capturing the five stages' substrate witnesses: question selected, research completed, claim authored, objects/morphisms authored, integration commissioned.

## Frontmatter

```yaml
---
type: cycle
slug: <YYYY-MM-DD>-<question-slug>
question: <question-slug>          # the cycle's stage-1 selection
officer: pyfars-roadmap-enrichment-officer
status: stage-1-question-selected | stage-2-research-completed | stage-3-claim-authored | stage-4-objects-and-morphisms-authored | stage-5-integration-commissioned | complete | paused | aborted
opened-at: <ord>                   # cycle opening timestamp
closed-at: <ord>                   # set when status: complete
authored-claims: [<claim-slug>, ...]
authored-objects: [<obj-slug>, ...]
authored-morphisms: [<morph-slug>, ...]
theory-cited: [<theory-slug>, ...]   # what was read in stage 2
prior-art-cited: [<external-path>, ...]   # external prior art read in stage 2
commissioned-integration: [{touchpoint: <milestone-slug>, action: <add-goal|rescope|extend-arc|...>, detail: <...>}]
integration-finding: <finding-slug>   # records-officer's resulting witness
---
```

## Body sections

```markdown
## Stage 1 — Question selected
Brief: why this question was picked for this cycle.

## Stage 2 — Research
What was read; what defended position assembled. The stage's witnesses live in
the frontmatter `theory-cited:` and `prior-art-cited:`; the body discusses the
position.

## Stage 3 — Claim authored
The claim slug(s); a one-paragraph précis of the claim. Full content lives in
`claims/<claim-slug>.md` per [`authoring-realization-claim`](../../governance/skills/authoring-realization-claim.md).

## Stage 4 — Objects and morphisms authored
Per object/morphism: slug, kind, brief role. Full content lives in canonical
type-directories per [`authoring-objects-and-morphisms-from-claim`](../../governance/skills/authoring-objects-and-morphisms-from-claim.md).

## Stage 5 — Integration commissioned
The hand-off note: which milestones the records officer should touch, and how.
The records officer's resulting integration-finding cited as
`integration-finding:` in frontmatter.

## Deferred
Anything stage-4 surfaced that wasn't authored this cycle (theory gap, captain
decision, downstream cycle dependency). Each item with reason.

## What this cycle changed
One paragraph: the substantive shift in the polity's roadmap from this cycle.
Distinct from "what records were authored" — this is the *interpretation*
delta.
```

## When NOT to author here

- **Maintenance edits** that aren't roadmap-shape-changing (typo, broken link, slug rename) — those are records-officer maintenance, no cycle needed.
- **Captain-direct roadmap edits** that bypass the cycle — those carry their own captain-attestation witness rather than a cycle record.
- **Other officers' work** (theory derivation, governance amendment, etc.) — those have their own witness conventions in their respective directories.

## Theory grounding

- [Predwork recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) — cycle records are per-cycle witness emissions per the practice's aggregation structure.
- [Roadmap-enrichment cycle](../recurrent-practices/roadmap-enrichment-cycle.md) — the practice these records witness.
- [Run full cycle not just integration](../../governance/duties/run-full-cycle-not-just-integration.md) — the duty whose enforcement reads these records.
