"""Build the merged citation-key index from a fars.

For each note, we collect:
  - **Inline declarations** (its frontmatter ``references:`` block) — the
    citation manifest authored next to the prose that uses it.
  - **Annotation declarations** (notes whose ``dir == "references"`` and
    whose ``kind`` is ``reference`` or unset) — long-form research notes
    on cited works, where the file's whole frontmatter *is* one entry.

Merge policy:
  1. Inline declarations form the canonical record. First inline for a
     key wins; subsequent inlines whose fields disagree become an
     ``inline-mismatch`` warning.
  2. Annotations supplement *only* — fields they carry that the inline
     declaration didn't fill get folded in. Annotations never override.
  3. A key that appears only in an annotation file (no inline citation)
     is included silently — the user's research notes may predate any
     citation.

Returns ``(merged, diagnostics)``.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from fars.substrate.parse.fm_annotation import parse as parse_annotation
from fars.substrate.parse.fm_references import parse as parse_inline
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile
from fars.substrate.types.reference import Reference

COMMON_FIELDS: frozenset[str] = frozenset({
    "authors", "editors", "translators",
    "title", "subtitle", "shorttitle",
    "year", "month", "date",
    "journal", "booktitle", "series", "edition", "volume", "number", "pages",
    "publisher", "address", "institution", "organization", "school",
    "howpublished", "note",
    "doi", "isbn", "issn", "url", "urldate",
    "eprint", "eprinttype", "eprintclass", "archiveprefix", "primaryclass",
    "abstract", "keywords", "venue",
})


def build(notes: Iterable[Flatfile]) -> tuple[dict[str, Reference], list[Diagnostic]]:
    inlines: list[Reference] = []
    annotations: list[Reference] = []
    diagnostics: list[Diagnostic] = []

    for n in notes:
        refs, errs = parse_inline(n.fm, source_path=str(n.path))
        inlines.extend(refs)
        diagnostics.extend(errs)
        if n.dir == "references":
            ref, errs = parse_annotation(
                n.fm, source_path=str(n.path), default_key=n.slug,
            )
            diagnostics.extend(errs)
            if ref is not None:
                annotations.append(ref)

    by_key: dict[str, Reference] = {}

    inline_by_key: dict[str, list[Reference]] = defaultdict(list)
    for r in inlines:
        inline_by_key[r.key].append(r)
    for key, group in inline_by_key.items():
        first = group[0]
        by_key[key] = first
        for r in group[1:]:
            for f in COMMON_FIELDS:
                fv = first.fields.get(f)
                rv = r.fields.get(f)
                if rv is not None and fv is not None and rv != fv:
                    diagnostics.append(Diagnostic(
                        code="inline-mismatch",
                        severity="warning",
                        message=f"`{key}`: inline `{f}` differs from `{first.source_path}`: "
                                f"{rv!r} vs {fv!r}",
                        extra={"key": key, "field": f},
                    ))

    extras_by_key: dict[str, list[Reference]] = defaultdict(list)
    for r in annotations:
        extras_by_key[r.key].append(r)
    for key, group in extras_by_key.items():
        if len(group) > 1:
            paths = ", ".join(g.source_path or "?" for g in group)
            diagnostics.append(Diagnostic(
                code="duplicate-research-note",
                severity="error",
                message=f"`{key}`: multiple research-note files: {paths}",
                extra={"key": key},
            ))
        extra = group[0]
        if key in by_key:
            inline = by_key[key]
            merged_fields = {**extra.fields, **inline.fields}
            by_key[key] = Reference(
                key=key,
                type=inline.type or extra.type,
                fields=merged_fields,
                source_path=inline.source_path,
                declared_inline=True,
            )
        else:
            by_key[key] = extra

    return by_key, diagnostics
