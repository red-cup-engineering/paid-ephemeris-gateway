---
title: "Cite question in claim"
type: jural-relation
kind: duty
active-holder: pyfars-roadmap-enrichment-officer
passive-party: pyfars-community
scope-action: author-claim-record-under-cycle
triggering-powers: [run-roadmap-enrichment-cycle, author-roadmap-claim]
required-action: include-derived-from-question-cell-in-claim-frontmatter
enforcement: substrate-violation
rule-type: N→N
theory-basis: [roadmap-enrichment, jural-relation, derivation-chain-integrity]
---


When the roadmap-enrichment officer authors a claim record under a cycle, the claim's frontmatter MUST include a `derived-from-question:` cell citing the originating question record at `questions/<question-slug>.md`.
A claim authored under a cycle without this citation is a duty breach.

## Why

Derivation provenance — being able to walk from any milestone back through its claim to the originating question — is what distinguishes substrate-derived roadmap content from absorbed-from-elsewhere content.
Without the citation, a future audit reading a claim cannot reconstruct *why* the polity holds the claim; the claim becomes a free-floating commitment with no trace of motivation.

## Required action

In the claim record's frontmatter, add:

```yaml
derived-from-question: <question-slug>
derived-from-cycle: <cycle-slug>
```

The `derived-from-cycle:` cell completes the chain: question → cycle → claim → objects/morphisms → integration.
Audit reads the cycle record to see what other stage-outputs share this provenance.

## Exemptions

- **Captain-direct claims**.
  A claim the captain authors directly (not under a cycle) does not require the citation; instead, frontmatter cites `direct-from-captain: <ord>`.
- **Pre-cycle legacy claims**.
  Claims authored before the cycle discipline was instituted (before 2026-05-09) are grandfathered.
  New cycles that *re-engage* a legacy claim should add the citation when re-touching the claim, not retroactively rewrite history.

## Enforcement

Pre-M5: manual; the cycle skill's stage-3 step requires the citation.
Audit by grepping `claims/*.md` for `derived-from-question:` against the cycle records that should have produced them.

Post-M5: closure rule that walks the substrate event log; for every claim-authoring event under a cycle, verifies the resulting claim record has the citation cell.
Mismatch emits `provenance-violation`.
