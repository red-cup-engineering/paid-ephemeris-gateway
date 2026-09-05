---
name: "Deriving a practice anchor from self-theory"
description: "Produces the minimal piece of running practice (PyFARS source code, configuration, deployment artifact) that anchors a freshly-authored self-theory slice — the first cell of the theory↔practice fiber for a sub-domain. Use after `expanding-self-theory-for-sub-domain` has produced a slice and the practice that slice was authored to ground needs to be implemented."
---


## Requirements

- Read access to the self-theory slice the practice will anchor (typically a recently-authored set of concepts/objects/morphisms/claims under a sub-domain).
- Read access to PyFARS source (`tools/platform/pyfars/src/`) and to the polity's `governance/specifications/` directory.
- An understanding of what the *minimal* practice for the slice looks like — the smallest implementable thing that can be tested against the slice's claims.

## Steps

1. **Identify the practice-anchoring claims.** From the self-theory slice, name the claims whose proofs *should* be visible in the running implementation.
  (E.g., for the web slice: `homepage-derives-from-public-fiber`, `view-composition-for-authenticated-principals`.)
  These claims are what the practice will demonstrate.

2. **Choose the minimum viable practice.** The practice should be the smallest concrete artifact that exercises the claims meaningfully.
  For the web slice, this is a single rendered HTML response from PyFARS, derived from the public-fiber, served via existing transport infrastructure.
  Not the full ERP; just *one* anchored render.

**Initial conflation is admissible.** When the *cleanest* minimum (faithful to all theory distinctions) requires substantially more substrate work than is justified for a first anchor, the practice may *initially conflate* theory distinctions — e.g., reading specific frontmatter fields rather than computing closure under a public-licit closure-rule-system.
Conflations must be (a) deliberate and named (the implementing code says "this conflates X with Y for now"), (b) filed as theory questions or developer triage notes so the gap is substrate-tracked, and (c) treated as friction for the next iteration to revise.
A conflation that's not surfaced as friction is hidden technical debt; a conflation that's surfaced is a fiber-anchor with an explicit growth path.

3. **Map theory entries to implementation surfaces.** For each foundational entry in the slice, identify where in the source the implementation lives (or will live):
   - Concepts and objects → typically have a corresponding Python module or class.
   - Morphisms → typically have a verb implementation in `cli/` plus library code in the relevant module.
   - Claims → not directly implemented; their *truth* is what the implementation must satisfy.

4. **Implement the practice.** Write the code, configuration, and deployment artifacts.
  As you go:
   - Cite the self-theory entry for each non-trivial decision (e.g., a comment "per `morphisms/render-as-http-response.md`, this function is pure").
     Citations don't need to be exhaustive — only where the theory's commitment is load-bearing for the code's correctness.
   - Use existing infrastructure where it exists (don't rebuild what's already in `pyfars.api`, `pyfars.web.app`, etc.).
   - Log gaps as you find them: if the theory says X but no code path exists for X, that's a gap to fill (either implement, or file as a question if implementation requires more theory).

5. **Test against the claims.** For each practice-anchoring claim, identify a way to test that the running practice satisfies it.
  The test may be:
   - A unit test that exercises a code path corresponding to the claim.
   - An integration test that runs the practice against a fixture corpus and checks the output.
   - A manual verification that the running deployment behaves consistently with the claim.

When test infrastructure for the claim's scope does not yet exist (no fixture corpus, no deployment harness, no test runner for the integration boundary), file a triage note describing what test would be needed and where the testing gap is.
The practice may proceed without testing for an initial anchor; the test-gap is friction for a subsequent iteration to close.

6. **Surface findings back to theory.** If implementation reveals that a theory entry's claim is wrong (the running practice can't satisfy it), file a question or a refutation candidate.
  If implementation reveals a theory gap (the practice needs ground that's not yet in self-theory), file a new question or run `expanding-self-theory-for-sub-domain` again.

7. **Surface friction as governance revision.** Per the duty `surface-friction-as-governance-revision`, when this skill's procedure doesn't fit the work, file a revision intent.

## Outcomes

A running piece of practice that:

1. Anchors at least one fiber-cell of the theory↔practice fiber for the sub-domain.
2. Cites self-theory entries for non-trivial decisions.
3. Is testable against the practice-anchoring claims.
4. Surfaces any gaps discovered during implementation as questions or refutation candidates.

The fiber begins with this single cell.
Each subsequent practice piece adds another cell; over time the fiber thickens and the theory↔practice tether stabilizes.
Friction during this skill's runs is data — the meta-discipline expects revisions both upstream (in self-theory) and laterally (in governance).
