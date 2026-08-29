"""Append-only ledger of files this system has projected to disk.

Every successful ``create_file`` records a line in
``<root>/.pyfars/projections.jsonl`` capturing what bytes the
system believes are at a given path. Before the next write to the
same subject, ``check_writable`` re-hashes the file on disk and
compares against the most recent recorded hash:

* file absent → OK
* file present, hash matches the latest recorded projection → OK
* file present, no recorded projection → ``ProjectionConflict``
* file present, hash differs from the latest recorded projection
  → ``ProjectionConflict``

Conflict is unconditional: the projector refuses to overwrite a file
the system did not last write. The caller's recourse is to delete the file (the system has no record of it)
the file by hand (or rebuild the ledger after reconciling).

The ledger doubles as a system claim log — ``to_cells`` renders
the records as ``PredicationCell`` triples
``(<rel-path>, "projected-as-sha256", <hex>)`` so the same data is
queryable through the predication algebra.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from pypredcalc.predication import PredicationCell


LEDGER_RELPATH = ".pyfars/projections.jsonl"
PROJECTED_PREDICATE = "projected-as-sha256"


class ProjectionConflict(Exception):
    """Raised when a pre-write check finds the on-disk file does not
    match the system's recorded projection for that subject."""


@dataclass(frozen=True)
class ProjectionRecord:
    subject: str
    sha256: str
    byte_length: int
    projected_at: str  # ISO 8601 UTC, e.g. "2026-05-09T14:32:11Z"

    def to_json_line(self) -> str:
        return json.dumps(
            {
                "subject": self.subject,
                "sha256": self.sha256,
                "byte_length": self.byte_length,
                "projected_at": self.projected_at,
            },
            sort_keys=True,
        ) + "\n"

    @classmethod
    def from_json_line(cls, line: str) -> "ProjectionRecord":
        d = json.loads(line)
        return cls(
            subject=d["subject"],
            sha256=d["sha256"],
            byte_length=int(d["byte_length"]),
            projected_at=d["projected_at"],
        )


def ledger_path(root: Path) -> Path:
    return root / LEDGER_RELPATH


def _hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hash_file(path: Path) -> str:
    return _hash_bytes(path.read_bytes())


def read_records(root: Path) -> list[ProjectionRecord]:
    """All records in the ledger, in append (chronological) order.

    Returns ``[]`` if the ledger does not exist. Malformed lines are
    skipped silently — the ledger is operational data, not load-bearing
    for system correctness."""
    p = ledger_path(root)
    if not p.is_file():
        return []
    out: list[ProjectionRecord] = []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(ProjectionRecord.from_json_line(line))
        except (json.JSONDecodeError, KeyError, ValueError):
            continue
    return out


def last_record_for(root: Path,
                    subject: str) -> ProjectionRecord | None:
    """Most recent ledger record for ``subject``, or ``None``."""
    latest: ProjectionRecord | None = None
    for rec in read_records(root):
        if rec.subject == subject:
            latest = rec
    return latest


def append_record(root: Path,
                  subject: str,
                  content_bytes: bytes,
                  *,
                  now: datetime | None = None) -> ProjectionRecord:
    """Append a projection record for ``subject`` and return it."""
    when = (now or datetime.now(tz=timezone.utc)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    rec = ProjectionRecord(
        subject=subject,
        sha256=_hash_bytes(content_bytes),
        byte_length=len(content_bytes),
        projected_at=when,
    )
    p = ledger_path(root)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(rec.to_json_line())
    return rec


def check_writable(root: Path, path: Path, subject: str) -> None:
    """Raise ``ProjectionConflict`` unless ``path`` is safe to overwrite.

    Safe means: the file does not yet exist, OR the file's current
    bytes hash to the most recent recorded projection for ``subject``.
    """
    if not path.exists():
        return
    if not path.is_file():
        raise ProjectionConflict(
            f"{path} exists but is not a regular file"
        )
    on_disk = hash_file(path)
    rec = last_record_for(root, subject)
    if rec is None:
        raise ProjectionConflict(
            f"{path} exists on disk but the system has no record "
            f"of projecting it (sha256={on_disk}). Delete the file "
            f"by hand if you mean to overwrite it."
        )
    if rec.sha256 != on_disk:
        raise ProjectionConflict(
            f"{path} on disk (sha256={on_disk}) does not match the "
            f"system's last projection for {subject!r} "
            f"(sha256={rec.sha256} at {rec.projected_at}). The file "
            f"was edited outside the system; reconcile by hand."
        )


def to_cells(records: Iterable[ProjectionRecord]
             ) -> list[PredicationCell]:
    """Render ledger records as system cells.

    One cell per record: ``(subject=path, predicate="projected-as-sha256",
    object=<hex>)``. History (multiple records for the same subject)
    is preserved as multiple cells; consumers wanting "latest" should
    fold over the records first via :func:`last_record_for`.
    """
    return [
        PredicationCell(
            subject=rec.subject,
            predicate=PROJECTED_PREDICATE,
            object=rec.sha256,
        )
        for rec in records
    ]


__all__ = [
    "LEDGER_RELPATH",
    "PROJECTED_PREDICATE",
    "ProjectionConflict",
    "ProjectionRecord",
    "append_record",
    "check_writable",
    "hash_file",
    "last_record_for",
    "ledger_path",
    "read_records",
    "to_cells",
]
