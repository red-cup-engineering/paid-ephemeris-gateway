"""Scope resolution for substrate-scoped loads.

A scope is a bounded sub-region of the predication substrate — in the
flatfile realization, a directory path. Materializers declare which scopes
they operate on; this module resolves those declarations to filesystem
paths via an environment-variable lookup chain, then produces the
``path_filter`` argument for ``extract_tree``.

Resolution order for each scope path ``s`` (e.g. ``"governance/offices"``):

1. Environment variable ``PYFARS_<S>`` where ``<S>`` is the scope path
   uppercased with ``/`` and ``-`` replaced by ``_``
   (e.g. ``PYFARS_GOVERNANCE_OFFICES``).
2. The same variable name looked up in a local ``.envrc`` in the current
   working directory.
3. The same variable name looked up in ``~/.envrc``.
4. Default: ``root / s``.
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Callable


def _scope_to_envvar(scope: str) -> str:
    """``"governance/offices"`` → ``"PYFARS_GOVERNANCE_OFFICES"``."""
    key = re.sub(r"[/\-]", "_", scope).upper()
    return f"PYFARS_{key}"


def _parse_envrc(path: Path) -> dict[str, str]:
    """Parse ``export KEY=value`` lines from an envrc file."""
    result: dict[str, str] = {}
    try:
        for line in path.read_text(errors="replace").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # accept: export KEY=value  or  KEY=value
            line = line.removeprefix("export").strip()
            if "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            result[key] = val
    except OSError:
        pass
    return result


def resolve_scope(
    root: Path,
    scope: str,
    *,
    env: dict[str, str] | None = None,
) -> Path:
    """Resolve one scope path to an absolute filesystem path.

    Lookup order: env var → local .envrc → ~/.envrc → default.
    """
    if env is None:
        env = dict(os.environ)
    varname = _scope_to_envvar(scope)

    # 1. process environment
    if varname in env:
        return Path(env[varname]).expanduser()

    # 2. local .envrc
    local_envrc = _parse_envrc(Path(".envrc"))
    if varname in local_envrc:
        return Path(local_envrc[varname]).expanduser()

    # 3. ~/.envrc
    home_envrc = _parse_envrc(Path.home() / ".envrc")
    if varname in home_envrc:
        return Path(home_envrc[varname]).expanduser()

    # 4. default
    return root / scope


def make_path_filter(
    root: Path,
    scopes: list[str],
    *,
    env: dict[str, str] | None = None,
) -> Callable[[Path], bool] | None:
    """Return a path_filter callable for the given scope list.

    Returns ``None`` when ``scopes`` is empty (no restriction — load
    everything), matching the ``extract_tree`` signature for
    ``path_filter=None``.
    """
    if not scopes:
        return None
    resolved = [resolve_scope(root, s, env=env) for s in scopes]

    def _filter(path: Path) -> bool:
        p = path if path.is_absolute() else root / path
        return any(
            p == r or r in p.parents
            for r in resolved
        )

    return _filter


__all__ = ["make_path_filter", "resolve_scope"]
