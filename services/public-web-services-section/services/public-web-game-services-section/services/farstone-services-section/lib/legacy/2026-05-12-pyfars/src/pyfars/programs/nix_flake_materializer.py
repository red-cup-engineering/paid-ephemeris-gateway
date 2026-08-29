"""Nix-flake materializer program — emits ``flake.nix`` from system cells.

Bound materializer: ``materializer:nix-flake``. The transform decomposes
into a closure rule (which produces the rendering context) and a
projector create-direction (the Jinja template at
``pyfars.apps.materializer_templates:nix-flake/templates/flake.nix.j2``):

    materialize(system)
      = render(template, context = build_context(system))

Every context field is computed from system cells; no filesystem reads.
Nested-YAML frontmatter projects to dotted-path predicates per the
markdown-frontmatter projector, so the polity's ``nix-package`` and
``devshells`` declarations are first-class cells.

No supervisor handoff: ``nix-daemon`` reads ``flake.nix`` lazily when
an operator runs ``nix build``; the flake-write step needs no
notification.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, ClassVar, Mapping

from pyfars.kernel import query
from pyfars.kernel.store import System
from pyfars.programs.materializer import (
    ServiceMaterializerProgram, materializer_jinja_env,
)


def _scalar(store, subject: str, predicate: str, default: Any = "") -> Any:
    """Read a single object cell, or return ``default`` if absent."""
    for obj in query.objects_under(store, subject, (predicate,)):
        return obj
    return default


def _multi(store, subject: str, predicate: str) -> list[Any]:
    """Read every object cell under ``(subject, predicate, ?)`` as a list."""
    return sorted(query.objects_under(store, subject, (predicate,)), key=str)


def _subjects_with_predicate(store, predicate: str) -> set[str]:
    """Subjects that have at least one T-cell under ``predicate``."""
    return {str(s) for (s, p, _o) in query.t_cells(store) if p == predicate}


def _subgroups_under(store, subject: str, prefix: str) -> set[str]:
    """Distinct second-segment names beneath ``prefix.`` on ``subject``.

    E.g. for ``subject`` with cells like ``devshells.dev.*`` and
    ``devshells.tests.*`` and prefix ``"devshells"``, returns
    ``{"dev", "tests"}``. Powers the nested-mapping → list-of-records
    walk that the polity's devshells dict produces.
    """
    needle = f"{prefix}."
    out: set[str] = set()
    for cell in query.cells_at(store, subject):
        _s, p, _o = cell
        ps = str(p)
        if not ps.startswith(needle):
            continue
        rest = ps[len(needle):]
        head = rest.split(".", 1)[0]
        if head:
            out.add(head)
    return out


class NixFlakeMaterializerProgram(ServiceMaterializerProgram):
    """Materialize the polity's ``flake.nix`` from system cells."""

    materializer_slug: ClassVar[str] = "nix-flake"
    scopes: ClassVar[list[str]] = ["governance/assets/computing"]

    def materialize(self, system: System) -> Mapping[Path, bytes]:
        context = self._build_context(system)
        env = materializer_jinja_env(self.materializer_slug)
        template = env.get_template("flake.nix.j2")
        rendered = template.render(**context)
        return {Path("flake.nix"): rendered.encode("utf-8")}

    def handoff(self, written):
        return ()  # nix-daemon reads flake.nix lazily; no notification needed

    # ---- context construction ---------------------------------------

    def _build_context(self, system: System) -> dict[str, Any]:
        return {
            "polity": self._polity(system),
            "computer_systems": self._computer_systems(system),
            "tool_packages": self._tool_packages(system),
            "tool_input_names": self._tool_input_names(system),
            "polity_devshells": self._polity_devshells(system),
            "substrate_root": ".",
            "generated_at": _now_iso(),
            "generation_command": "pyfars materialize nix-flake",
        }

    def _polity(self, system: System) -> dict[str, Any]:
        """Read polity identity — falls back to directory name."""
        return {
            "title": "",
            "slug": self.root.name.lower().replace(" ", "-"),
        }

    def _computer_systems(self, system: System) -> list[dict[str, Any]]:
        """Read computer-system records from the computing assets scope.

        Skips records that don't have a ``nix-system`` cell.
        """
        store = system.store
        out: list[dict[str, Any]] = []
        for slug in sorted(system.all_subjects(), key=str):
            slug_s = str(slug)
            nix_system = _scalar(store, slug_s, "nix-system", "")
            if not nix_system:
                continue
            out.append({
                "slug": slug_s,
                "title": str(_scalar(store, slug_s, "title", slug_s)),
                "description": str(_scalar(store, slug_s, "description", "")),
                "nix_system": str(nix_system),
                "role": str(_scalar(store, slug_s, "role", "")),
                "host_class": str(_scalar(store, slug_s, "host-class", "")),
                "os_family": str(_scalar(store, slug_s, "os-family", "")),
                "deployment_class":
                    str(_scalar(store, slug_s, "deployment-class", "")),
                "nixos_managed":
                    bool(_scalar(store, slug_s, "nixos-managed", False)),
                "service_manager":
                    str(_scalar(store, slug_s, "service-manager", "")),
                "runtime_root":
                    str(_scalar(store, slug_s, "runtime-root", "")),
                "primary_user": _scalar(store, slug_s, "primary-user", None),
            })
        return out

    def _tool_packages(self, system: System) -> list[dict[str, Any]]:
        """Read tool flake-input declarations from system cells.

        Walks every subject with a ``nix-package.input-name`` cell;
        reads the sibling ``nix-package.*`` cells for each. The
        markdown-frontmatter projector lowers nested YAML to dotted-
        path predicates, so the polity's ``nix-package:`` block on a
        tool's ``_index.md`` becomes first-class cells.
        """
        store = system.store
        out: list[dict[str, Any]] = []
        for slug in sorted(
            _subjects_with_predicate(store, "nix-package.input-name"),
        ):
            input_name = _scalar(store, slug, "nix-package.input-name", "")
            if not input_name:
                continue
            out.append({
                "input_name": str(input_name),
                "flake_url": str(_scalar(
                    store, slug, "nix-package.flake-url", "",
                )),
                "follows_inputs": [
                    str(o) for o in
                    _multi(store, slug, "nix-package.follows-inputs")
                ],
                "package_name": str(_scalar(
                    store, slug, "nix-package.package-name", input_name,
                )),
            })
        return out

    def _tool_input_names(self, system: System) -> set[str]:
        return {p["input_name"] for p in self._tool_packages(system)}

    def _polity_devshells(self, system: System) -> list[dict[str, Any]]:
        """Read the polity's devshell declarations from system cells.

        The polity authors a nested ``devshells:`` block on a record of
        type ``nix-flake-asset`` (one such record per polity, by
        convention). The nested YAML projects to dotted-path predicates;
        this method walks them.
        """
        store = system.store
        out: list[dict[str, Any]] = []
        for asset_slug in sorted(system.all_subjects(), key=str):
            asset = str(asset_slug)
            for name in sorted(_subgroups_under(store, asset, "devshells")):
                prefix = f"devshells.{name}"
                out.append({
                    "name": name,
                    "purpose": str(_scalar(
                        store, asset, f"{prefix}.purpose", "",
                    )),
                    "nixpkgs_packages": [
                        str(o) for o in
                        _multi(store, asset, f"{prefix}.packages.nixpkgs")
                    ],
                    "python_extras": [
                        str(o) for o in
                        _multi(
                            store, asset,
                            f"{prefix}.packages.python-extras",
                        )
                    ],
                    "tool_default": [
                        str(o) for o in
                        _multi(
                            store, asset, f"{prefix}.packages.tool-default",
                        )
                    ],
                    "tool_shell_merge": [
                        str(o) for o in
                        _multi(
                            store, asset,
                            f"{prefix}.packages.tool-shell-merge",
                        )
                    ],
                })
        return out


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


__all__ = ["NixFlakeMaterializerProgram"]
