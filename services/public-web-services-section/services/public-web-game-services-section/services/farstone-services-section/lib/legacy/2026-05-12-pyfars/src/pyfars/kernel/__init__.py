"""Kernel — the system-frame primitives.

The kernel exposes the system frame of a FARS instance (see FARS
theory: ``concepts/system.md``). A directory is a tree of files; the
kernel projects every recognised file to predication cells
(``projector/``), composes them under a ``closure-rule-record``
system to fixed point (``closure``), exposes the result as a
queryable system (``store.System`` + ``query``), and writes
mutations back via witness-emitting operators (``operator/``).

The kernel knows about cells, rules, witnesses, and projectors; it
does not know about agents, offices, or dispatch — those are
polity-frame concerns built on the system-frame primitives the
kernel provides.

One algebra, four motions:

  - **Project** (bytes → cells) — ``projector/`` and its parsing kit.
  - **Close**   (cells → cells) — ``closure``.
  - **Query**   (cells → answer) — ``query`` (and ``traversal/`` for
    graph walks).
  - **Operate** (cells → cells via witness) — ``operator/``.

The ``System`` facade glues them together; everything else here is
pure, replaceable infrastructure.
"""
from pyfars.kernel.store import System

__all__ = ["System"]
