"""Tools for the relationality repository's frontmatter-markdown fars.

Every leaf module is one of:
  - one frozen dataclass        (under ``fars.substrate.types``)
  - one pure function           (everywhere else)
  - one CLI entry               (``fars.cli.<verb>``)

Composition happens at the call site. No leaf module orchestrates.
"""
from fars.substrate.flatfile import Flatfile
from fars.substrate.types.reference import Reference
from fars.substrate.predication import Predication
from fars.substrate.types.claim import Claim
from fars.substrate.types.link import Link
from fars.substrate.types.citekey import CiteKey
from fars.substrate.types.bibentry import BibEntry
from fars.substrate.types.diagnostic import Diagnostic

__all__ = [
    "Flatfile", "Reference", "Predication", "Claim", "Link",
    "CiteKey", "BibEntry", "Diagnostic",
]
