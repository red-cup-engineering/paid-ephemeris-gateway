---
name: "Authoring math examples"
description: "Takes newly-authored objects, morphisms, and concepts (post stage-4 of the roadmap-enrichment cycle) and produces at least one worked mathematical instantiation of each. Use as stage 5 of the roadmap-enrichment cycle."
---


A math example is a worked instantiation of one or more pyfars objects, morphisms, or concepts using concrete mathematical values — not code, not prose, but a formal trace through the substrate formalism.
The `adult-parent-settling` example in predication categories is the upstream template: it names a concrete entity set, predicate category, fiber algebras, and traces settling-to-quiescence step by step.
This skill produces the pyfars-layer analogues.

Math examples serve two purposes: they confirm that an object or morphism is well-defined (an object with no satisfying instance is a schema ghost, not a substrate object), and they ground the specification stage (stage 6) with concrete witnesses that the objects/morphisms behave as claimed.

## Requirements

- The [`pyfars-roadmap-enrichment-officer`](../offices/pyfars-roadmap-enrichment-officer.md) office held.
- Stage-4 outputs: at least one object, morphism, or concept record in its canonical type-directory.
- Read access to upstream theory examples (predication categories `examples/`, pypredcomp examples) as templates.

## Steps

1. **For each stage-4 object**, identify a concrete domain where the object has at least one instance.
  Choose the simplest non-trivial instance — a single predication, a two-node graph, a one-cell fiber.
  The goal is minimality: the example must witness the object without obscuring it in complexity.

2. **For each stage-4 morphism**, identify a concrete input-output pair.
  The example must show: the premise cells (what the morphism reads), the transformation, and the conclusion cells (what it writes).
  If the morphism requires prior objects, the example must instantiate those too.

3. **For each stage-4 concept**, identify at least one object and one morphism from the stage-4 set (or upstream) that realizes it.
  The math example for a concept is a brief trace demonstrating that the `realizes:` claim holds concretely — not a proof, but a witness.

4. **Author each example** at `examples/<object-slug>--<example-slug>.md` (object-anchored) or `examples/<concept-slug>--<example-slug>.md` (concept demonstrations).
  Frontmatter:
   ```yaml
   ---
   type: example
   kind: math
   instantiates: [<object-or-morphism-or-concept-slugs>]
   derives-from-claim: <claim-slug>
   depends-on: [<upstream records the example cites>]
   ---
   ```
Body: the worked instantiation.
Name every value, trace every step.
Narrative prose is permitted only to name what each step is doing — the formalism must be explicit.

5. **Check that each example is falsifiable.** If the example would hold for any instantiation of the object regardless of its constraints, the example is not witnessing the constraints.
  Tighten until at least one constraint is actively exercised.

6. **Update the cycle record** with `authored-math-examples: [<example-slugs>]`.
  For any object or morphism where no satisfying example could yet be authored, note it under `deferred-math-examples:` with reason — a forward-pointer is acceptable when the instantiating substrate state doesn't yet exist, but the deferral must be named.

## Outcomes

- At least one `examples/<slug>.md` record with `kind: math` for each stage-4 object and morphism.
- Each math example is a substrate-resident witness that the stage-4 structures are instantiable.
- The specification stage (stage 6) has concrete mathematical witnesses to cite as non-normative examples.

## Discipline notes

- **Math examples are not code examples.** No Python, no pyfars CLI invocations.
  Those belong to `authoring-code-examples` in the implementation chain.
  Math examples operate at the level of the formalism — sets, functions, cell-shapes, value domains.
- **Minimality is a virtue.** An example that takes many pages to set up is evidence that the object is over-specified or that the wrong example was chosen.
  If minimal instantiation is genuinely hard, note it in the cycle record.
- **One example per object is a floor, not a ceiling.** If an object has multiple interesting behavioral regimes (e.g., a morphism that behaves differently under quiescence vs. non-quiescence), author an example for each regime — but don't multiply without purpose.
