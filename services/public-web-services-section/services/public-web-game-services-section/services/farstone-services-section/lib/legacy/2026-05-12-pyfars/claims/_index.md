# claims/

Claims PyFARS makes about itself.
One claim per file.

This includes load-bearing commitments (markdown-as-projection, substrate-purity, dispatch-reads-substrate, …), conformance claims (PyFARS realizes FARS in the precise sense of …), and structural results about the realization (the verb-registry forms a category in the sense of …).
The grain is "one claim, one proof obligation" — if a result has two genuinely independent parts, they are two files.

`claims/` is PyFARS's name for what other theories in the polity corpus call `theorems/`.
The naming is a Group-wide standard the polity is migrating to: a *claim* is what the realization asserts; a *proof* (or sketch, or routing into upstream) is what discharges the claim's obligation.
The shift in name reflects that PyFARS is foremost a *running realization* — most of its assertions route their proofs through upstream theorems rather than re-deriving them, and "claim" reads more honestly than "theorem" for that flavor of statement.

## Frontmatter

```yaml
---
type: claim
status: draft | sketch | proved | open
depends-on: [substrate, predication-fiber, closure-2-monad, ...]   # objects, morphisms, upstream claims/theorems
---
```

Status meanings:

- `draft` — the claim is precisely stated; no complete proof attempt yet.
- `sketch` — a proof outline exists; gaps are explicitly marked in the body.
- `proved` — a complete proof is in the file (or in a clearly-cited upstream reference) and has been checked.
  The proof has a `## Proof` section heading and ends with a `$\square$` marker.
- `open` — used for claims where the assertion is made as a PyFARS commitment but the proof obligation routes upstream into a theorem/claim that itself remains open (so PyFARS's commitment is conditional on the upstream work landing).

When a claim is shown false, the file is *deleted*.
The refutation lives wherever it naturally belongs — as a counterexample example, as the body of a stronger claim, or in the relevant narrative.

A statement that is precisely stated and believed-true but for which no proof has been attempted lives here as `draft`, not in `questions/`.
`questions/` is for genuinely open self-questions about *what* to claim or construct rather than attempts at proving an already-stated claim.

## Body shape

1. **Statement.** Precise, self-contained.
2. **Proof** (or **Sketch** under `status: sketch`).
  For sketches, mark gaps explicitly: "[gap: requires the four-regime classification of dispatch closure to be Scott-continuous]".
  Most PyFARS claims will route their proof through upstream theorems via citation rather than re-deriving the upstream result.
3. **Discussion**, brief: where the claim is used in PyFARS, what it depends on conceptually, what it does *not* say.
  In particular, name what would have to be different in PyFARS for the claim to fail — this is how contingent choices are distinguished from load-bearing commitments.

## Conformance claims

A conformance claim has the form: *PyFARS realizes [upstream-object] in the precise sense of [upstream-theorem]*.
These are the load-bearing claims that bind PyFARS to its lineage.
Their proofs typically construct the realization map and verify the conditions of the upstream theorem.

## When PyFARS commits but the proof routes upstream

Many PyFARS commitments — that the predication graph is well-defined, that closure converges, that dispatch is monotonic — are claims whose proofs already exist upstream.
The PyFARS-side claim states the commitment in PyFARS-realization terms, then cites the upstream result in `depends-on:` and refers to it in the proof.
This is not duplication; it's the load-bearing tether between realization and theory.
