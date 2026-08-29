# references/

One markdown note per cited work, with annotation.
Citations into the upstream theory lineage (predication-categories, predicated-computing, FARS theory) generally use direct relative links rather than reference notes here, since the upstream material is part of the same polity corpus.
Reference notes here are for *outside* literature: papers, books, RFCs, software documentation, and other sources that PyFARS-self-theory cites without controlling.

## Frontmatter

```yaml
---
type: reference
authors: [Surname, ...]
year: 2018
title: "..."
venue: "..."           # journal, conference, book series, arXiv id, RFC number, etc.
---
```

## Body shape

1. **Full citation.** Bibliographic info beyond what fits in frontmatter (DOI, arXiv id, ISBN, RFC number, publisher, page range).
2. **Status.** Whether the source has been read locally, skimmed, accessed via abstract, or referenced via citation network.
  Whether a copy lives at `sources/<cite-key>.<ext>`.
3. **Annotation.** What this work contributes that PyFARS-self-theory uses.
  One paragraph is usually enough; longer where the relationship to the realization is subtle.
  Notation tables, key formulae, and protocol details extracted for use go here.
4. **Where used.** Optional.
  The authoritative direction is *outward from* references — notes that cite this work mention it in their body or in `see-also:`.
  A "where used" section here is a courtesy and need not be kept exhaustive.

## Filename convention

`<surname><year>.md` for single-author works, `<surname1>-<surname2><year>.md` for two authors, `<surname1>-et-al<year>.md` for three or more.
For RFCs and standards, use the canonical short identifier (`rfc6749.md`, `rfc7591.md`).
For software documentation pinned to a version, include the version (`fastapi-0.115.md`).
Disambiguate with a letter suffix where needed.

## What does not belong here

- Citations to upstream theories in this polity's corpus (predication-categories, predicated-computing, FARS theory, …) — link directly via relative path; no reference note needed.
- Citations to other parts of PyFARS-self-theory — same; use `see-also:` or `depends-on:`.
- Citations to PyFARS's own governance decisions or work records — same; relative link.

Reference notes are for sources whose canonical home is outside the polity's corpus.
