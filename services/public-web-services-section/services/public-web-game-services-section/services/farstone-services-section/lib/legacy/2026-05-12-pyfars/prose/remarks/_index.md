# remarks/

Short essays attached to a single atom (theorem, morphism, object, concept), addressing one structural observation, lineage connection, or edge case that would distract from the host atom's main statement and proof.

Remarks replace the inline `## Remark` sections that would otherwise live inside theorem and object bodies.
Migrating them out keeps atom bodies focused on the main statement; the remark file carries the digression at full length without bloating the host.

## Frontmatter

```yaml
---
type: remark
depends-on: [<host-atom-slug>, ...]    # the atom this remark hangs off of
---
```

A remark's host is the first item in `depends-on:`.
The renderer places the remark immediately after the host atom in linear reads.

## Length

Aim for 100–600 words.
A remark longer than that is probably a narrative; move it to `narratives/`.
A remark shorter than that is probably a sentence that belongs in the host atom's body.

## Examples of remark angles

- A connection between a PyFARS theorem and a result from outside literature (cite via `references/`).
- An edge case that the host theorem's proof rules out without naming.
- A historical note on why a particular slug was chosen, when the choice has implications for readers.
- A bridge between a PyFARS-side commitment and the upstream theorem it routes through.

## When a remark becomes something else

When a remark grows past 600 words and starts walking through multiple atoms, it's becoming a narrative; move it to `narratives/`.
When a remark turns out to be its own claim with its own proof obligation, it's a theorem; move it to `theorems/`.
