---
name: "Lifting upstream pattern to self-theory"
description: "Produces a PyFARS-side concept or object that instantiates an upstream theory pattern (consensus-closure, restorative-accountability, governing-by-kinship, etc.) in PyFARS-specific terms, with depends-on chain into the upstream warrant. Use when a self-theory question asks how an upstream pattern would apply to PyFARS, and the answer requires writing the theoretical ground before the governance can settle."
---


## Requirements

- Read access to the upstream theory entity being lifted (in `theories/`).
- Read access to the existing `pyfars/` content — to avoid duplicating concepts already authored, and to identify reusable foundational concepts the lift can build on.
- Read access to the relevant `pyfars/questions/` question (if the lift is grounding a question).
- Knowledge of the predication-categories convention (see [`predication-categories/_index.md`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md)).

## Steps

1. **Read the upstream entity carefully.** Identify the pattern's structural commitments: what data the pattern requires (a tuple, a closure rule, a fiber), what the closure rule's antecedent reads, what its consequent settles.
  Note where the upstream allows variation (the "polity's choice" points) — these are where PyFARS will need to choose, not derive.

2. **Identify what counts as PyFARS-side data for the pattern.** For each variable in the upstream pattern, ask: what is its PyFARS-specific value?
  E.g., for `consensus-closure`, the pattern requires a populace; in PyFARS, the populace might be the three governing offices (under one reading), or all PyFARS personnel (under another).
  Naming the PyFARS-side data is the load-bearing step — it determines what the resulting concept/object actually says.

3. **Choose the right note kind**:
   - **Concept** (in `concepts/`) when lifting names a *role* PyFARS plays under the upstream pattern (e.g., `pyfars-as-polity-substrate`).
     No `status` field; a concept describes a role, not a settled claim.
   - **Object** (in `objects/`) when lifting names a *structure* PyFARS instantiates (e.g., `pyfars-governing-quorum`).
     Carries `status: draft|sketch|settled`, optional `symbol:`, optional `realizes:` listing concepts the object instantiates.
   - **Claim** (in `claims/`) when lifting asserts a *structural fact* with proof obligation routed to the upstream theorem.
     Carries `status: draft|sketch|proved|open`.

4. **Write the note**, following the predication-categories convention.
  Body opens with one sentence stating the role/structure, followed by sections whose headings name the structural moves the body makes — e.g., `## Data`, `## Notation`, `## What this commits to`, `## What this does not specify`, `## Boundary cases`, `## Connection to upstream`, `## Implementation pointers`, `## Open structural questions`.
  The list is exemplar, not exhaustive; choose the headings that fit the content and let the body's structure determine the headings, not the other way round.
  Cite the upstream entity via the long path; cite PyFARS-side entities via relative links.
  Do not include "the Python package does X" content in the theory body.

5. **Set `depends-on:` carefully.** The list should include the upstream entity being lifted *and* any PyFARS-side concepts/objects the new note builds on.
  Each entry must resolve — either to a real upstream slug (in `theories/`) or to an existing or in-flight PyFARS-side slug.
  Do not invent placeholder slugs.
  If the lift derives from a parent theory generally rather than from a specific upstream entity (e.g., the realization of "what HTTP requests look like in PyFARS" derives from the web-server-platform theory broadly rather than from one specific morphism), cite the parent theory's `_index.md` rather than a specific entity slug — this is honest about the citation's scope.

6. **Record what the lift does *not* settle.** The lift typically leaves polity-level choices open (which pattern variant, which alignment cells fire when, which discipline applies).
  Note these as a `## Status` or `## What this object does not yet specify` section, and where appropriate file as new questions in `questions/`.

7. **If the lift exposes that an existing self-theory entry needs updating** (e.g., a new specialization should be cross-referenced in its parent, or a foundational claim should mention how the new claim composes with it), propose the update — either edit the existing entry directly if the change is small and uncontroversial, or file a triage note for `pyfars-records-officer` if the change is more substantial.

8. **Verify `depends-on:` resolves.** Run `pyfars validate <slug>` if validate is configured for the type subdirectories.
  If not configured, manually check: every entry in `depends-on:` should be either an existing PyFARS-side slug (verifiable by `find concepts objects morphisms claims questions examples -name "<slug>.md"`), an existing upstream slug at the cited path, or another entry being authored in the same slice (which will exist by the time the slice is complete).

9. **Update the answering question's status if appropriate.** If the lift partially settles the grounding question, set `status: partial` on the question; keep the question open until the *resolving claim or object* makes the question redundant, at which point the question note is *deleted* (per `questions/_index.md`'s discipline) and the live record is the resolving artifact.
  When a slice authors multiple entries that *together* settle the question (no single resolving artifact), keep the question at `partial` until all entries reach `status: sketch` or higher, then delete.

## Outcomes

A new PyFARS-side concept, object, or claim that:

1. States the lift in PyFARS-specific terms — names the actual cells, populations, disciplines that the pattern would apply to.
2. Cites the upstream via `depends-on:`.
3. Identifies remaining polity-level choices as open subquestions or status notes.
4. Does not duplicate the upstream theory — it instantiates it.

The lift is the substrate that lets governance choose, not a governance choice itself.
After the lift, the captain (or polity) can compare PyFARS-shaped readings of multiple upstream patterns and choose with full structural visibility into each.
