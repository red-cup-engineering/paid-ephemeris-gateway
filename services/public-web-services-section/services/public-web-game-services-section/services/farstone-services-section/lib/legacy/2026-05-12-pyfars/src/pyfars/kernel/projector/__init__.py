"""Format projectors — adjoint pairs between data and predication cells.

A *projector* is a pair ``(extract, create)`` between bytes-of-some-format
and ``pypredcalc.PredicationCell`` cells satisfying the **counit law**::

    extract(create(cells)) ≈ cells   (as a set, modulo ordering)

Bytes form a large space; predication cells form a subspace; the
projector maps the big space onto the small one in a way that
preserves the small-space structure exactly. Bytes not in the
projector's image — formatting whitespace, comments, keys the
vocabulary doesn't recognize — are projected away; what remains
round-trips.

Prior art: PAM's ``predication-algebra-model-filesystem-server``
format-projectors (esm-predication archive). PAM's projectors were
JavaScript classes over its own ``Claim`` type; here the claim type
is ``pypredcalc.predication.PredicationCell`` and projectors compose
the pypredcalc bilattice value as the cell's truth axis.

PyFARS realizes ``data <-> predication`` for **all** computer data —
not just markdown frontmatter. Each atomic projector is one data
shape; the compound projector (``pyfars.kernel.projector.compound``,
to be implemented) walks a directory and dispatches to atomic
projectors by file extension, blob inspection, or socket framing.

Each atomic projector:

* declares a stable ``name`` (string identifier for routing)
* declares a ``vocabulary`` (the predicates it emits)
* implements ``extract(data, *, subject) -> Iterable[PredicationCell]``
* may implement ``create(cells) -> data`` (the reverse direction; not
  every projector is invertible — Python source's projector is
  read-only, for instance)

Pure functions only at the atomic level; I/O lives in the compound
orchestrator.
"""
from __future__ import annotations

from typing import Iterable, Protocol, runtime_checkable

from pypredcalc.predication import PredicationCell


@runtime_checkable
class Projector(Protocol):
    """Forward-only projector — bytes → ``PredicationCell``.

    Atomic projectors are pure functions: no I/O, no side effects.
    The compound projector (``pyfars.kernel.projector.compound``)
    is where filesystem reads / writes live.

    Read-only formats (Python source, Rust source — code the
    system does not rewrite) implement only this protocol.
    """

    name: str
    vocabulary: tuple[str, ...]

    def extract(self, data, *, subject: str) -> Iterable[PredicationCell]:
        """Forward direction — bytes → cells.

        ``subject`` is the canonical identifier for the data being
        projected (typically a file path, slug, or URI). All cells
        emitted carry this subject; the predicate / object axes
        encode whatever structure the format reveals.
        """
        ...


@runtime_checkable
class InvertibleProjector(Projector, Protocol):
    """Adjoint pair — both directions plus the counit law.

    Projectors over structured data (markdown frontmatter, YAML,
    JSON) implement this fuller protocol. The counit law

        extract(create(cells)) ≈ cells   (as a set)

    is the projector's claim that it has chosen its image inside the
    bytes-space such that the cell algebra round-trips exactly.
    """

    def create(self, cells: Iterable[PredicationCell]) -> object:
        """Reverse direction — cells → bytes."""
        ...


__all__ = ["InvertibleProjector", "PredicationCell", "Projector"]
