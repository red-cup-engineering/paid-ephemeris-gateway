# concepts/

Semantic anchors that recur across PyFARS as a realization.
Not realizations in themselves; objects and morphisms *realize* concepts.

A concept here is a role — *substrate*, *projection*, *settling*, *harness*, *verb*, *dispatch*, *witness*, *closure* — that takes different specific shapes in different parts of PyFARS.
The concept note describes the role and tracks how it is realized across the realization's surfaces (CLI, web app, MCP transport, file system, runtime).

Objects and morphisms that realize a concept declare it via `realizes:` in frontmatter.
To find every realization of a concept, `grep -l "realizes:.*<concept>"` over `objects/` and `morphisms/`.

## Frontmatter

```yaml
---
type: concept
depends-on: [bilattice, predication-fiber, ...]   # upstream concepts/objects this concept depends on
---
```

Concept notes do not carry `status` (they are not claims).
They carry `depends-on:` when the role can only be precisely named after certain upstream notes exist — e.g., *settling* depends on the closure 2-monad and on the four-regime classification from predication-categories.
A concept that names a role *implicit in PyFARS's own framing* (e.g., *harness*, which is meaningful from PyFARS itself before any predication framing) carries no `depends-on:` until the role is restated against the math.

## Body shape

A concept note's body describes the role: what it names within PyFARS, what pressures it imposes on any structure that realizes it, what gets settled by adjudicating the role across realizations.
Written in PyFARS-and-upstream-theory terms, never in terms of "the Python package does X" — the implementation belongs in the realization, not in the concept's body.
Where a citation is needed, the cited material lives in `references/` or upstream and is linked via `see-also:`.

A short opening line under the file's `# Title` gives the concept's role in one sentence.
As the realization grows, the concept's body grows by appending sections named after the *structural move* that brought new shape to the role — for example, `## Under web-server realization`, `## Under MCP exposure`, `## Across heartbeat dispatch`.

## When to add a concept

When the same word starts to do load-bearing work across two or more distinct surfaces of PyFARS, and it becomes useful to ask "is this still the same X across surfaces?" — promote it to a concept.
If a word only appears inside one object or one morphism, it does not need a concept note.

A concept also gets a note when an upstream theory names a role that PyFARS realizes — *truth*, *knowledge*, *settling*, *predication-fiber* are all upstream concepts that PyFARS commits to and so deserve PyFARS-side concept notes documenting how they land in this realization.
