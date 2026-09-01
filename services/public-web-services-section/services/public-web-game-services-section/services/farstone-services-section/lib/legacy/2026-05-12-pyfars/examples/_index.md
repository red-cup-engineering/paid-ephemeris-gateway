# examples/

Worked instances of the concepts, objects, morphisms, and claims.
One example per file.

Examples carry weight in self-theory because they are how we check that abstract definitions actually do the work we intended in a running realization.
A markdown-as-projection example shows a specific note and its substrate row side by side; a dispatch example shows a specific intent moving from triage through assignment to witness; a public-projection example shows a specific corpus subset and the closure-rule that selects it.

## Frontmatter

```yaml
---
type: example
status: draft | sketch | verified
depends-on: [substrate, dispatch, ...]              # objects/morphisms/claims instantiated
instantiates: [substrate-purity, ...]               # specific claims this example demonstrates
---
```

`verified` means the example has been computed end-to-end against an actual PyFARS deployment and the computation has been checked.

## Body shape

1. **What is being instantiated.** Which object(s), morphism(s), and claim(s).
2. **The construction.** Concrete data: the corpus state, the input, the running configuration, the relevant substrate notes.
3. **The computation or behavior.** What the example shows — the projection produced, the dispatch path taken, the closure that converges, the validation diagnostics emitted.
4. **What this example illustrates.** One paragraph: what the example is *for*.
  An example without a clear "this is what it is showing" loses value over time.

## Drawn from running deployments

PyFARS examples are drawn from real deployments — the 561 polity, future polities, the pyfars-developer office's own substrate, etc. Where an example uses a snapshot of a real corpus, name the deployment and the commit (or near-equivalent) so the example can be re-checked against the source.
Examples whose data is fabricated for illustration should say so.

## Counterexamples

A counterexample to a claim that has now been refuted lives here, with a pointer to the (now-deleted) claim note.
Refutations are useful and should not be hidden.
Counterexamples to *contingent* choices — examples showing PyFARS could have realized FARS differently — are also welcome here; they sharpen the line between load-bearing commitments and contingent realizations.
