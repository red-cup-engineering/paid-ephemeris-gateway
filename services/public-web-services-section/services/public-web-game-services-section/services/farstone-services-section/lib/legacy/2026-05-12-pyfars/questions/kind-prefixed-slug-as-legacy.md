---
type: question
status: open
explores: [slug, kind-discriminator, frontmatter, structural-fitness, identifying-entities-by-predication-shape]
---

# Is the `kind:`-prefixed slug convention (e.g. `office:command`, `personnel:emsenn`) load-bearing or legacy?

The pre-pass `runtime/group.py` dataclass loaders synthesized slugs as `f"{kind}:{stem}"` when the frontmatter omitted `slug:` — `office:command-561`, `personnel:emsenn`, `polity:561-group`, `ship:rsc-quiescent`.
The pydantic loaders (`parse_office`, `parse_polity`, `parse_ship`, `parse_personnel`) introduced in this pass synthesize bare stems instead — `command-561`, `emsenn`, `561-group`, `rsc-quiescent`.

The bare-stem choice was made on the captain's reading that kind-prefixed slugs are a *nominal discriminator* — they encode the entity's kind in its identity, which is the opposite of the structural direction (per the open [identifying-entities-by-predication-shape](identifying-entities-by-predication-shape.md) question).
Identity should not announce kind; kind should be derived from cell shape.

This question asks whether that local choice is correct beyond the local scope — whether the kind-prefixed convention is load-bearing somewhere in the corpus, in tooling, or in cross-references that would be silently broken by the bare-stem move.

## What is known

- PyFARS's own records under `governance/offices/`, `governance/incumbents/`, etc., carry explicit `slug:` fields.
  The synthesis path is only hit when `slug:` is omitted, which the PyFARS records never do.
  So PyFARS is unaffected by the synthesis behavior change in its own corpus.
- 561's records under `records/command/group/` (the captain's polity records) often *do* omit `slug:` and rely on filename-derived synthesis.
  Those records were the original consumers of `OfficeRecord.from_frontmatter` etc. The kind-prefixed slug form (`personnel:emsenn`, `office:command-561`) appears in their cross-references (`held-by: personnel:emsenn`, `home-office: office:command-561`).
- If 561's records are loaded with bare-stem synthesis, cross-references like `held-by: personnel:emsenn` would no longer resolve — the loaded slug becomes `emsenn`, not `personnel:emsenn`.

## What would settle it

A claim that establishes one of:

1. **The kind-prefixed convention is legacy.** The bare-stem synthesis is correct for PyFARS-side loaders.
  561's records (and any other corpus using kind-prefixed slugs) need a one-time migration to either add explicit bare-stem `slug:` fields or update cross-references to drop the kind prefix.
2. **The kind-prefixed convention is load-bearing for cross-substrate identification.** Slugs need to disambiguate across kinds (`personnel:emsenn` and `agent:emsenn` and `office:emsenn` would all be distinct), so the prefix is structural metadata.
  The pydantic loaders should restore prefix-aware synthesis, with the prefix derived from the entity-kind being parsed (not from the file's `kind:` field, since that's the nominal discriminator we're trying to escape).
3. **A middle path.** Cross-references resolve through a layer that strips/adds prefixes, so authors may write either form and the loader normalizes.
  This effectively makes the prefix optional.

## Where the answer would live

A claim in `claims/` plus, depending on outcome, either a migration plan in `work/` (option 1) or a restoration of prefix-aware synthesis in `entities/*.py` (option 2).
If the answer turns out to be option 3, the substrate-side resolver gets a new responsibility.

The answer interacts with [identifying-entities-by-predication-shape](identifying-entities-by-predication-shape.md): under structural-fitness, kind-prefixed slugs *cannot* be load-bearing because identity is shape-derived; the prefix would be at most a hint.
So if structural-fitness lands as a claim, this question's answer is automatically option 1.

## Provenance

Filed 2026-05-10 alongside [identifying-entities-by-predication-shape](identifying-entities-by-predication-shape.md), as a follow-on to the office/polity/ship/personnel decruft pass that consolidated `runtime/group.py`'s dataclass loaders into pydantic entities.
The captain made the local call (don't preserve kind-prefixed-slug synthesis); this question marks the broader-corpus consequences for resolution.
