# objects/

Definitions of named structures within PyFARS-as-realization.
One structure per file.

Examples of what belongs here: the corpus-as-flatfile, the predication graph, the verb registry, the harness manifest, the running FastAPI web app, the MCP transport, the running heartbeat process, the OAuth Authorization Server, the user-account index, the running systemd unit.
These are the concrete structures the realization names; claims and morphisms refer to them as objects.

## Frontmatter

```yaml
---
type: definition
status: draft | sketch | settled
realizes: [substrate, harness, ...]                   # concepts this object instantiates, if any
depends-on: [predication-fiber, predicate-category, ...] # upstream warrants and prior PyFARS-side objects
---
```

`status: settled` means the definition has been used by other notes without revision for long enough to be treated as stable.
`draft` and `sketch` are both acceptable working states.

## Body shape

A typical object note contains:

1. The definition itself, formally stated.
  Where the structure is a piece of running software, the definition pins down the *abstract structure* (what's a corpus? what's a verb registry?) and points to the implementation as a realization, not as the definition.
2. Notation conventions specific to this object.
3. Brief discussion of why the definition is set up this way — design choices, alternatives considered, what would change under different choices.
4. Pointers to key examples (`examples/`) and claims (`claims/`) that involve this object — courtesy only; the authoritative reference direction is *outward from* objects.

Keep object notes focused on the *definition*.
Properties that require proof go in `claims/`.
Implementation details (Python class names, file paths, function signatures) belong in [`docs/`](../../docs/) or [`prose/`](../../prose/), not here — though an object note may include a stable identifier (Python module path, slug) so readers can find the implementation.

## Implementation pointers

When an object has a definite implementation in the PyFARS Python package, the note may carry an `implementation:` frontmatter field pointing at the relevant module path (`pyfars.substrate`, `pyfars.cli.dispatch`, …).
This is a soft pointer for navigation, not a load-bearing relation; the object's *theory* stands whether or not the implementation matches at any given commit.
When the implementation drifts from the theory, that's a finding for the theory↔practice fiber to adjudicate, not an error in the theory.
