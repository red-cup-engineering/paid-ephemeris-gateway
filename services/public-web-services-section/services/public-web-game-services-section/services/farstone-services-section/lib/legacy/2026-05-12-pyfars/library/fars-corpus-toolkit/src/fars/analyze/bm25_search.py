"""BM25-ranked text search across notes.

Tokenization is whitespace + punctuation, lowercased. Each note gets
its title, slug, description, and body concatenated as one document
with the title/slug terms repeated to weight them higher (a
poor-person's field-weighting). BM25 parameters: ``k1=1.5``, ``b=0.75``.

Better than substring search for fuzzy "find the slug closest to this
description" queries; orders of magnitude cheaper than embedding-based
semantic search and depends on no external models. True embedding search
remains a future addition if the corpus grows past BM25's reach.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from typing import Iterable

from fars.substrate.flatfile import Flatfile

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _document(n: Flatfile) -> list[str]:
    title = str(n.fm.get("title") or n.fm.get("name") or "")
    description = str(n.fm.get("description") or "")
    # Repeat title and slug tokens to bias ranking toward them.
    tokens = _tokenize(title) * 3 + _tokenize(n.slug) * 2
    tokens += _tokenize(description) * 2
    tokens += _tokenize(n.body)
    return tokens


def find(notes: Iterable[Flatfile], query: str, *,
         kind: str | None = None,
         domain: str | None = None,
         path_contains: str | None = None,
         k1: float = 1.5,
         b: float = 0.75,
         limit: int = 30,
         ) -> list[tuple[float, Flatfile]]:
    candidates = [
        n for n in notes
        if (kind is None or n.kind == kind)
        and (domain is None or n.dir == domain)
        and (path_contains is None or path_contains in str(n.path).replace("\\", "/"))
    ]
    if not candidates:
        return []

    docs = [_document(n) for n in candidates]
    doc_lens = [len(d) for d in docs]
    avg_len = sum(doc_lens) / len(doc_lens) if doc_lens else 0
    n_docs = len(docs)

    df: Counter[str] = Counter()
    doc_terms: list[Counter[str]] = []
    for d in docs:
        terms = Counter(d)
        doc_terms.append(terms)
        for t in terms:
            df[t] += 1

    q_tokens = _tokenize(query)
    if not q_tokens:
        return []

    scores: list[float] = []
    for terms, dlen in zip(doc_terms, doc_lens):
        s = 0.0
        for q in q_tokens:
            if q not in terms:
                continue
            tf = terms[q]
            idf = math.log(1 + (n_docs - df[q] + 0.5) / (df[q] + 0.5))
            denom = tf + k1 * (1 - b + b * (dlen / avg_len if avg_len else 1))
            s += idf * (tf * (k1 + 1)) / max(denom, 1e-9)
        scores.append(s)

    pairs = [(s, n) for s, n in zip(scores, candidates) if s > 0]
    pairs.sort(key=lambda x: -x[0])
    return pairs[:limit]
