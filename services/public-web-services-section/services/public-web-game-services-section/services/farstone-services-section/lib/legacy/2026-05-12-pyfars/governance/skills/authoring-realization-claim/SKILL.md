---
name: "Authoring a realization claim"
description: "Produces a `claims/<slug>.md` entry asserting a PyFARS commitment (markdown-as-projection, substrate-purity, view-composition-for-authenticated-principals, etc.) with the proof obligation routed through upstream theory via depends-on. Use when a load-bearing PyFARS commitment has been identified but is not yet stated as a precise claim with a discharge-able proof obligation."
---


## Requirements

- Read access to `claims/_index.md` for the convention.
- Read access to the PyFARS-side concepts and objects the claim is about (the claim's domain).
- Read access to the upstream theorem/claim/object the proof obligation routes to.
- A clear statement of the commitment (what PyFARS asserts about itself).

## Steps

1. **State the claim precisely.** A claim's statement is a single declarative sentence whose subject is PyFARS (or a specific PyFARS object) and whose predicate is a structural fact.
  "PyFARS does not modify substrate state outside of explicit substrate-transitioning verbs."
  "The corpus is a projection of substrate state, not the canonical state."
  If the statement is a paragraph, the claim is too broad — split it.

2. **Identify the proof obligation.** What would have to be shown for the claim to be true?
  Most PyFARS claims have proofs that route through upstream theorems — the upstream result does the heavy lifting; the PyFARS-side proof constructs the realization map and verifies the upstream theorem's conditions are met.

3. **Set the status.** `draft` if the claim is precisely stated but no proof attempt yet.
  `sketch` if a proof outline exists with explicitly-marked gaps.
  `proved` if a complete proof is in the file (or in a clearly-cited upstream reference); proved claims include `## Proof` and end with `$\square$`.
  `open` if the proof obligation routes upstream into a still-open theorem (PyFARS's commitment is conditional on the upstream landing).

4. **Set `depends-on:`** to include: every PyFARS-side concept/object/morphism the claim is about, every upstream theorem/claim that the proof obligation routes through.
  Do not include concepts/objects merely *mentioned* in the body — only those whose existence is required for the claim to be precisely stated.

5. **Write the body** in this order:
   - **Statement** — the claim, formally stated.
     May include mathematical notation.
   - **Sketch** (or **Proof**) — the discharge of the obligation, with explicit gap markers if `status: sketch`.
     For most PyFARS claims, the sketch routes through an upstream theorem cited by slug; the PyFARS-side work is constructing the realization map and verifying conditions.
   - **Discussion** — where the claim is used in PyFARS, what it does *not* say (to prevent over-reading), and what would have to be different in PyFARS for the claim to fail (to distinguish load-bearing from contingent).
   - **Connection to upstream** — name the upstream theorem/claim the proof routes through.

6. **Cross-check refutation conditions.** What observation about a running PyFARS instance would refute the claim?
  If the claim is unfalsifiable in any practical sense, it is too vague — sharpen the statement.

## Outcomes

A new `claims/<slug>.md` entry that:

1. States the commitment precisely.
2. Discharges (or routes) the proof obligation, with status accurately reflecting how complete the discharge is.
3. Is referenceable by examples, narratives, and other claims via `depends-on:` and `instantiates:`.
4. Names what would refute the claim, distinguishing load-bearing commitments from contingent realizations.

The claim becomes a settled commitment of PyFARS-as-realization (at the asserted status).
When later work conflicts with the claim, the conflict is a finding for either the work to revise or the claim to be refuted (never both ignored).
When upstream theory advances past the claim, the claim is updated; when upstream theory's parent theorem is refuted, the PyFARS claim must be re-examined.
