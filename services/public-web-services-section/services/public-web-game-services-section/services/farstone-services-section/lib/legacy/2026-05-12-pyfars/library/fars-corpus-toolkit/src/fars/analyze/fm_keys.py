"""Tally every frontmatter key in the corpus, with frequency + sample values.

Useful for spotting drift (``Date-Created`` vs ``date-created``), seeing
what fields the corpus actually uses, and finding rare keys that may be
typos. Returns ``[(key, count, sample_values, sample_paths), ...]``
sorted by count descending.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Iterable

from fars.substrate.flatfile import Flatfile


def gather(notes: Iterable[Flatfile], *,
           value_samples: int = 3,
           path_samples: int = 3,
           ) -> list[tuple[str, int, list[str], list[str]]]:
    counts: Counter[str] = Counter()
    values: dict[str, list[str]] = defaultdict(list)
    paths: dict[str, list[str]] = defaultdict(list)
    for n in notes:
        for k, v in n.fm.items():
            counts[k] += 1
            if len(values[k]) < value_samples:
                if isinstance(v, list):
                    s = ", ".join(str(x) for x in v[:3])
                else:
                    s = str(v)
                if len(s) > 80:
                    s = s[:77] + "…"
                values[k].append(s)
            if len(paths[k]) < path_samples:
                paths[k].append(str(n.path).replace("\\", "/"))
    out = []
    for key, count in counts.most_common():
        out.append((key, count, values[key], paths[key]))
    return out
