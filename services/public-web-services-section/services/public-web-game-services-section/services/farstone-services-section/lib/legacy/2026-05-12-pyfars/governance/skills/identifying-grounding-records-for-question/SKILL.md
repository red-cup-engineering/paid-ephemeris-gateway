---
name: "Identifying grounding records for a question"
description: "Produces a list of the concepts, objects, morphisms, and claims that need to be authored in pyfars/ for a given self-theory question to become resolvable, with each record's role in the resolution chain. Use when a self-theory question is filed but the path to resolution is not yet visible — before lifting upstream patterns, this skill plans which lifts are needed."
---


## Requirements

- Read access to the question record in `pyfars/questions/`.
- Read access to the upstream theory entities the question references (via its `explores:` field).
- Read access to existing PyFARS-side content under the type subdirectories — to identify which grounding records already exist and which still need to be authored.

## Steps

1. **Read the question carefully.** Distinguish its flavor (per `questions/_index.md`):
   - **Realization question** — asking what PyFARS commits to or how PyFARS realizes some upstream structure.
     Resolution is a claim with a proof obligation.
   - **Program-shaping question** — asking what PyFARS should construct or theorize next.
     Resolution is a new object or claim that constitutes the construction.
   - **Governance-grounding question** — a realization question that additionally grounds a governance commitment.
     Resolution is typically a claim here plus a corresponding decision in `governance/decisions/`.

2. **List the upstream entities the question explores.** Walk `explores:` and `depends-on:` chains.
  For each upstream entity, ask whether it is *already lifted* into PyFARS-side content.
  Existing lifts are reusable; missing lifts are records that need authoring.

3. **For each missing lift, identify the right note kind**:
   - A *role* PyFARS plays under the upstream pattern → concept.
   - A *structure* PyFARS instantiates → object.
   - A *fact about PyFARS's structure* with proof obligation → claim.
   - An operation between PyFARS structures → morphism.

4. **Order the missing lifts by dependency.** Lifts whose `depends-on:` is satisfied (upstream + existing PyFARS-side records) are ready to author.
  Lifts that depend on other missing lifts must wait.
  The result is a partial order over the missing records — a directed dependency graph from "ready to write now" to "needs upstream lifts first."

5. **Write the grounding manifest** as a comment on the question (or as a temporary scratch record): list each record needed, its kind (concept/object/morphism/claim), its `depends-on:` set, and its role in the resolution.
  The manifest is itself not a substrate record — it is working-memory for the records officer or theory-derivation officer.

6. **Identify the resolving artifact.** What note, when written, makes the question redundant such that the question note can be deleted?
  Typically a single claim (for realization questions) or a single object plus a claim about it (for program-shaping questions).
  Naming the resolving artifact ahead of time clarifies the goal.

7. **Identify possible new questions the lifts will surface.** Lifting an upstream pattern often raises questions the pattern itself doesn't answer (e.g., "which discipline does PyFARS use?").
  Anticipating these prevents the work from feeling like ground keeps slipping; new questions are expected, are not failures, and should be filed in `questions/` as they surface.

## Outcomes

For the given question:

1. A list of grounding records to author, in dependency order.
2. The kind (concept / object / morphism / claim) for each record.
3. The expected resolving artifact — the note whose existence makes the question redundant.
4. An anticipation of follow-up questions the lifting work will surface.

The records officer or theory-derivation officer can then author the records using the [`lifting-upstream-pattern-to-self-theory`](lifting-upstream-pattern-to-self-theory.md) skill, in the order the manifest specifies.
Each subsequent phase of lifting has the prior phase's outputs available as `depends-on:` targets, so the work accretes context as it proceeds.
