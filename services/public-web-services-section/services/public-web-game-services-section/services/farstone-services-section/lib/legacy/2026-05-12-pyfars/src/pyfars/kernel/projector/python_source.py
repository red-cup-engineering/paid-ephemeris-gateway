"""The python-source projector.

Extracts predication cells from Python source code via the stdlib
``ast`` module. Read-only by design — the system does not rewrite
Python source — so ``create`` is not implemented (and the counit law
holds vacuously over the empty image).

Vocabulary (cells emitted):

  ``imports``       (file, "imports", "<module>")
  ``defines-function``  (file, "defines-function", "<name>")
  ``defines-class``     (file, "defines-class", "<name>")
  ``decorated-by``  ("<defname>", "decorated-by", "<decorator>")

Subject convention: the file path (caller's responsibility); for
class/function definitions, the qualified name
``<file>:<def-name>`` is used so multiple files can carry
overlapping symbol names without aliasing.

This is the first projector that ISN'T key-value-shaped — Python
source has its own grammar, and the cells encode structural facts
about the source rather than a flattened mapping. Demonstrates that
the projector framework handles arbitrary data shapes.
"""
from __future__ import annotations

import ast
from typing import Iterable

from pypredcalc.predication import PredicationCell


class PythonSourceProjector:
    """Python source ↔ ``PredicationCell`` (extract only)."""

    name = "python-source"
    vocabulary: tuple[str, ...] = (
        "imports",
        "defines-function",
        "defines-class",
        "decorated-by",
    )

    def extract(self, data: str, *, subject: str) -> Iterable[PredicationCell]:
        """Parse Python source and yield structural cells.

        Syntax errors raise SyntaxError (the projector does not
        attempt to recover); for tooling that wants tolerance, parse
        with ``ast.parse(... mode='exec')`` and pre-validate.
        """
        tree = ast.parse(data)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    yield PredicationCell(
                        subject=subject,
                        predicate="imports",
                        object=alias.name,
                    )
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    yield PredicationCell(
                        subject=subject,
                        predicate="imports",
                        object=node.module,
                    )
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                yield PredicationCell(
                    subject=subject,
                    predicate="defines-function",
                    object=node.name,
                )
                for dec in node.decorator_list:
                    name = _decorator_name(dec)
                    if name is not None:
                        yield PredicationCell(
                            subject=f"{subject}:{node.name}",
                            predicate="decorated-by",
                            object=name,
                        )
            elif isinstance(node, ast.ClassDef):
                yield PredicationCell(
                    subject=subject,
                    predicate="defines-class",
                    object=node.name,
                )
                for dec in node.decorator_list:
                    name = _decorator_name(dec)
                    if name is not None:
                        yield PredicationCell(
                            subject=f"{subject}:{node.name}",
                            predicate="decorated-by",
                            object=name,
                        )

    # No ``create`` — Python source is read-only from the system's
    # perspective. The compound projector dispatches around this by
    # checking ``hasattr(projector, 'create')`` before write-back.


def _decorator_name(node: ast.expr) -> str | None:
    """Best-effort decorator → string. Returns None for shapes we don't model."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        # ``foo.bar.baz`` → ``"foo.bar.baz"``
        parts: list[str] = []
        cur: ast.expr = node
        while isinstance(cur, ast.Attribute):
            parts.append(cur.attr)
            cur = cur.value
        if isinstance(cur, ast.Name):
            parts.append(cur.id)
            return ".".join(reversed(parts))
    if isinstance(node, ast.Call):
        return _decorator_name(node.func)
    return None


PROJECTOR = PythonSourceProjector()


__all__ = ["PROJECTOR", "PythonSourceProjector"]
