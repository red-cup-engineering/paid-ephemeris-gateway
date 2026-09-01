"""Single source of truth for corpus convention constants.

Every set of "what kinds exist", "which fm keys are relations", "which
statuses count as proved" — pulled into one module, imported everywhere.
Previously these literals lived next to one consumer and were imported
(or re-defined) from 3-7 other places, with drift risk.

Five logical groups:

  - **kinds**: ``KIND_LABEL`` (display labels), ``THEOREM_KINDS``,
    ``ANCHOR_KINDS``, ``BADGE_KINDS`` (theorem-likes that show a status
    badge in the monograph).
  - **statuses**: ``UNPROVED`` (draft / sketch / wip), ``PROVED``.
  - **relations**: ``RELATION_KEYS`` (typed fm edges — depends-on,
    see-also, …), plus ``INTERNAL_FIELDS`` (corpus-internal fm keys
    that should not appear in rendered BibTeX).
  - **predicates**: ``META`` (file-about-itself fm keys),
    ``SCALAR_CONFIG`` (literal scalars, not entity refs). Used by the
    EAVT-style query subcommands to category-bucket predicates.
  - **dirs**: ``SUBCOLLECTIONS`` (within-domain container dirs) plus
    ``DEFAULT_LIB_DIRS`` (the canonical research-program subdir set).

When the corpus convention changes, edit this file. Nothing else.
"""
from __future__ import annotations

# --- kinds ------------------------------------------------------------------

KIND_LABEL: dict[str, str] = {
    "concept":     "Concept",
    "definition":  "Definition",
    "morphism":    "Definition",
    "theorem":     "Theorem",
    "lemma":       "Lemma",
    "proposition": "Proposition",
    "corollary":   "Corollary",
    "example":     "Example",
    "question":    "Open problem",
    "conjecture":  "Conjecture",
}

THEOREM_KINDS: frozenset[str] = frozenset({
    "theorem", "lemma", "proposition", "corollary",
})

ANCHOR_KINDS: frozenset[str] = frozenset({
    "definition", "concept", "morphism",
})

# Theorem-like kinds that show a status badge ([SKETCH], [DRAFT], …) in
# the monograph when status != "proved". Adds ``conjecture`` to the
# theorem-kinds set since conjectures are explicitly unproved.
BADGE_KINDS: frozenset[str] = THEOREM_KINDS | frozenset({"conjecture"})


# --- statuses ---------------------------------------------------------------

UNPROVED: frozenset[str] = frozenset({"draft", "sketch", "wip"})
PROVED: frozenset[str] = frozenset({"proved"})


# --- relations --------------------------------------------------------------

RELATION_KEYS: tuple[str, ...] = (
    "depends-on", "introduces", "recaps", "discusses",
    "instantiates", "see-also", "realizes", "closes",
    "chapters", "explores", "specializes", "component-of",
)

# Fm keys that describe the *citing note* in the corpus, not a *cited
# work*. Stripped from rendered BibTeX entries; passed as the
# ``INTERNAL_FIELDS`` argument by the citation parser/renderer.
INTERNAL_FIELDS: frozenset[str] = frozenset({
    "kind", "status", "anchor",
    "references",
    *RELATION_KEYS,
})


# --- predicate categories ---------------------------------------------------

META: frozenset[str] = frozenset({
    "title", "description", "summary", "name", "slug", "layout", "aliases",
    "date", "date-created", "date-modified", "date-updated", "date-completed",
    "date-published", "date-introduced", "modified", "task-done",
    "authors", "permalink", "dg-permalink", "dg-publish", "x-permalink",
    "toc", "draft", "draft-names", "color", "color-scheme", "language",
    "redirect_to", "description-title", "x-i18n", "tags", "readiness",
})

SCALAR_CONFIG: frozenset[str] = frozenset({
    "temperature", "top_p", "presence_penalty", "frequency_penalty",
    "max_tokens", "n", "model", "stop",
    "version", "nav_order", "index", "priority", "number", "position-in-cycle",
    "year", "section",
    "note-maturity", "title-class",
})


# --- directories ------------------------------------------------------------

# Within-domain container dirs (terms/, concepts/, theorems/, …). Walking up
# from a note, these are skipped when looking for the enclosing domain.
SUBCOLLECTIONS: frozenset[str] = frozenset({
    "terms", "texts", "narratives", "concepts", "objects", "morphisms",
    "theorems", "questions", "examples", "references", "archive", "domains",
    "logs", "records",
})

DEFAULT_LIB_DIRS: tuple[str, ...] = (
    "concepts", "objects", "morphisms", "theorems",
    "examples", "narratives", "questions", "references",
)
