"""Flatten a frontmatter dict into ``(attr_path_tuple, scalar, flat)`` triples.

Top-level scalar → ``flat=True``. Top-level list of scalars → one ``flat=True``
triple per item. Anything nested (dict-in-dict, list of dicts) → one
``flat=False`` triple at the key with ``value=None`` (we record that the
key exists but don't try to flatten its body).
"""
from __future__ import annotations

import datetime
from typing import Any, Iterator

_SCALAR = (str, int, float, bool, datetime.date, datetime.datetime, datetime.time)


def walk(obj: Any, prefix: tuple[str, ...] = ()
         ) -> Iterator[tuple[tuple[str, ...], Any, bool]]:
    if not isinstance(obj, dict):
        return
    for k, v in obj.items():
        key = prefix + (str(k),)
        if isinstance(v, _SCALAR) or v is None:
            yield key, v, True
        elif isinstance(v, list) and all(isinstance(x, _SCALAR) or x is None for x in v):
            for item in v:
                yield key, item, True
        else:
            yield key, None, False
