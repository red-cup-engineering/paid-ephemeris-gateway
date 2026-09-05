"""Shared loading + indexing for query subcommands.

Thin wrapper over ``fars.substrate.store.Substrate`` — the only thing query
needs that the standard scaffold doesn't is the ``include_triage``
escape hatch (the ``triage-cands`` subcommand specifically wants to see
draft content). Everything else (notes, by_slug, by_domain, edges,
in_edges, out_edges, claims) is already a cached_property on Substrate.

``QueryContext`` is kept as a name alias so existing subcommand
signatures stay stable; it's literally ``Substrate``.
"""
from __future__ import annotations

from pathlib import Path

from fars.substrate.store import Substrate

# Alias: query subcommand modules accept ``ctx: QueryContext``. Keeping
# the name documents intent while removing the duplicated dataclass.
QueryContext = Substrate


def load(root: Path, *, include_triage: bool = False) -> Substrate:
    if include_triage:
        path_filter = lambda p: True  # noqa: E731
    else:
        from fars.substrate.load._path_filter import keep
        path_filter = keep
    return Substrate(root=root, path_filter=path_filter)
