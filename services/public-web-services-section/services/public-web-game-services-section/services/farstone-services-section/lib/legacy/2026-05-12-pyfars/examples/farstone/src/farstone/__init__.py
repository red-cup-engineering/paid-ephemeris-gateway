"""Farstone polity package."""
from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version


try:
    __version__ = version("farstone")
except PackageNotFoundError:  # pragma: no cover - source tree import
    __version__ = "0+unknown"


__all__ = ["__version__"]
