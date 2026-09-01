"""Theorem-like notes carry a ``status:``, and proved ones have a Proof
section ending with a ``$\\square$`` marker.
"""
from __future__ import annotations

import re
from typing import Iterator

from fars.convention import BADGE_KINDS as _THEOREMLIKE
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile
_PROOF_HEADING_RE = re.compile(r"^##+ Proof", re.MULTILINE)
_PROOF_END_RE = re.compile(r"\$\\square\$")


def check(notes: list[Flatfile]) -> Iterator[Diagnostic]:
    for n in notes:
        if n.kind not in _THEOREMLIKE:
            continue
        status = n.fm.get("status")
        if not status:
            yield Diagnostic(
                code="missing-status",
                severity="warning",
                message=f"`{n.slug}` ({n.kind}) has no status",
                path=n.path,
                extra={"slug": n.slug},
            )
            continue
        if status == "proved":
            if not _PROOF_HEADING_RE.search(n.body):
                yield Diagnostic(
                    code="missing-proof",
                    severity="error",
                    message="status: proved — no Proof heading",
                    path=n.path,
                    extra={"slug": n.slug, "reason": "no Proof heading"},
                )
            elif not _PROOF_END_RE.search(n.body):
                yield Diagnostic(
                    code="missing-proof",
                    severity="error",
                    message="status: proved — no $\\square$ marker",
                    path=n.path,
                    extra={"slug": n.slug, "reason": "no $\\square$ marker"},
                )
        elif status in ("sketch", "draft"):
            yield Diagnostic(
                code="wip-theorem",
                severity="warning",
                message=f"`{n.slug}` — {status}",
                path=n.path,
                extra={"slug": n.slug, "status": status},
            )
        else:
            yield Diagnostic(
                code="missing-status",
                severity="warning",
                message=f"`{n.slug}` has unrecognized status `{status}`",
                path=n.path,
                extra={"slug": n.slug, "status": status},
            )
