"""FARS corpus metadata decorators for Python classes and functions.

These decorators attach corpus slugs to Python objects, making the
connection between code and theory explicit without imposing any runtime
overhead. The attributes are purely informational — tooling and
documentation generators can read them; the runtime ignores them.

Usage::

    from pyfars._metadata import fars_object, fars_morphism

    @fars_object("concepts/flatfile")
    @dataclass(frozen=True)
    class Flatfile:
        ...

    @fars_morphism("morphisms/ancestors")
    def ancestors(slug, depends_on):
        ...

The slug convention follows the corpus path relative to the repository
root: ``concepts/<slug>``, ``objects/<slug>``, ``morphisms/<slug>``, etc.
"""
from __future__ import annotations

from typing import Any, Callable, TypeVar

_T = TypeVar("_T")


def fars_object(slug: str) -> Callable[[_T], _T]:
    """Tag a class or value as the Python realization of a FARS corpus object.

    Args:
        slug: Corpus-relative path to the object's note, e.g.
            ``"concepts/flatfile"`` or ``"objects/closure-rule-record"``.

    Returns:
        A decorator that sets ``__fars_object__`` on the target and returns
        it unchanged.
    """
    def decorator(obj: _T) -> _T:
        obj.__fars_object__ = slug  # type: ignore[attr-defined]
        return obj
    return decorator


def fars_morphism(slug: str) -> Callable[[_T], _T]:
    """Tag a function as the Python realization of a FARS corpus morphism.

    Args:
        slug: Corpus-relative path to the morphism's note, e.g.
            ``"morphisms/ancestors"`` or ``"morphisms/dispatching"``.

    Returns:
        A decorator that sets ``__fars_morphism__`` on the target and returns
        it unchanged.
    """
    def decorator(obj: _T) -> _T:
        obj.__fars_morphism__ = slug  # type: ignore[attr-defined]
        return obj
    return decorator


def get_fars_object(obj: Any) -> str | None:
    """Return the FARS corpus object slug attached to *obj*, or ``None``."""
    return getattr(obj, "__fars_object__", None)


def get_fars_morphism(obj: Any) -> str | None:
    """Return the FARS corpus morphism slug attached to *obj*, or ``None``."""
    return getattr(obj, "__fars_morphism__", None)
