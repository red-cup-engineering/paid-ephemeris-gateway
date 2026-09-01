"""Single declarative spec per verb that drives every surface.

A ``VerbSpec`` describes one CLI verb's name, description, parameters,
and example. Generators in this module turn the spec into:

  - an ``argparse.ArgumentParser`` (the CLI)
  - a JSON Schema for parameters (consumed by the MCP server)
  - a typed Python wrapper (for ``fars.api``)
  - human-readable help text (for ``fars help <verb>``)
  - a row in ``fars list-verbs --json`` (for tooling integrations)

This eliminates the previous duplication where each verb's argument
shape lived in argparse, in ``api.py``, in ``cli/mcp.py`` (as string
parsing), and in ``cli/help.py``'s description dict — all four drifting
independently.

A verb that has migrated to a spec exposes:

  ``SPEC``: the ``VerbSpec`` constant
  ``run(**kwargs) -> Result``: typed entry point
  ``main(argv) -> int``: argparse wrapper (calls ``run``, prints output)

Verbs that haven't migrated continue working through their own
hand-rolled ``main``; the migration is one file at a time.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable, Literal, get_type_hints

ParamKind = Literal["positional", "flag", "store_true", "append"]


@dataclass(frozen=True)
class Parameter:
    """One verb parameter — positional or flag, with type + description."""

    name: str
    """Python identifier (and argparse dest); hyphens allowed in flag names but
    converted to underscores for the dest, matching argparse defaults."""

    kind: ParamKind
    """One of: ``positional`` (required positional unless ``required=False``);
    ``flag`` (``--name VALUE``); ``store_true`` (boolean flag); ``append``
    (repeatable ``--name VALUE`` collected into a list)."""

    type: type = str
    """Python type. Used for argparse ``type=``, JSON Schema generation,
    and api kwarg validation. Common values: str, int, float, bool, Path."""

    default: Any = None
    required: bool = False
    description: str = ""
    short: str | None = None
    """Optional short flag like ``-r`` for ``--root``."""
    choices: tuple[str, ...] | None = None
    nargs: str | int | None = None
    """argparse nargs for positionals: ``?``, ``*``, ``+``, or an integer."""
    metavar: str | None = None


@dataclass(frozen=True)
class VerbSpec:
    """Declarative description of one verb."""

    name: str
    description: str
    example: str = ""
    notes: str = ""
    parameters: tuple[Parameter, ...] = ()
    output: str = ""
    """Human description of what the verb produces — used in help."""


# --- generators -------------------------------------------------------------

_TYPE_TO_JSONSCHEMA: dict[type, str] = {
    str: "string",
    int: "integer",
    float: "number",
    bool: "boolean",
    Path: "string",
}


def make_argparse(spec: VerbSpec) -> argparse.ArgumentParser:
    """Build an ``argparse.ArgumentParser`` from a ``VerbSpec``."""
    ap = argparse.ArgumentParser(
        prog=f"corpus {spec.name}", description=spec.description,
    )
    for p in spec.parameters:
        if p.kind == "positional":
            kwargs: dict = {"help": p.description}
            if p.type is not str:
                kwargs["type"] = p.type
            if p.default is not None or not p.required:
                kwargs["default"] = p.default
                kwargs["nargs"] = p.nargs or "?"
            elif p.nargs is not None:
                kwargs["nargs"] = p.nargs
            if p.choices:
                kwargs["choices"] = p.choices
            if p.metavar:
                kwargs["metavar"] = p.metavar
            ap.add_argument(p.name, **kwargs)
        elif p.kind == "flag":
            flag = f"--{p.name.replace('_', '-')}"
            args = [flag] + ([p.short] if p.short else [])
            kwargs = {"default": p.default, "help": p.description}
            if p.type is not str:
                kwargs["type"] = p.type
            if p.choices:
                kwargs["choices"] = p.choices
            if p.metavar:
                kwargs["metavar"] = p.metavar
            ap.add_argument(*args, **kwargs)
        elif p.kind == "store_true":
            flag = f"--{p.name.replace('_', '-')}"
            args = [flag] + ([p.short] if p.short else [])
            ap.add_argument(*args, action="store_true", help=p.description)
        elif p.kind == "append":
            flag = f"--{p.name.replace('_', '-')}"
            args = [flag] + ([p.short] if p.short else [])
            kwargs = {"action": "append", "default": list(p.default or []),
                      "help": p.description}
            if p.type is not str:
                kwargs["type"] = p.type
            if p.metavar:
                kwargs["metavar"] = p.metavar
            ap.add_argument(*args, **kwargs)
    return ap


def make_json_schema(spec: VerbSpec) -> dict:
    """Build a JSON Schema describing the verb's parameters.

    Used by the MCP server to advertise typed tool signatures so agents
    don't have to construct space-separated argv strings.
    """
    properties: dict[str, dict] = {}
    required: list[str] = []
    for p in spec.parameters:
        prop: dict = {
            "type": _TYPE_TO_JSONSCHEMA.get(p.type, "string"),
            "description": p.description,
        }
        if p.kind == "store_true":
            prop["type"] = "boolean"
            prop["default"] = False
        elif p.kind == "append":
            prop = {
                "type": "array",
                "items": {"type": _TYPE_TO_JSONSCHEMA.get(p.type, "string")},
                "description": p.description,
            }
        elif p.default is not None:
            prop["default"] = (str(p.default) if isinstance(p.default, Path)
                               else p.default)
        if p.choices:
            prop["enum"] = list(p.choices)
        properties[p.name] = prop
        if p.kind == "positional" and p.required:
            required.append(p.name)
    schema: dict = {
        "type": "object",
        "properties": properties,
    }
    if required:
        schema["required"] = required
    return schema


def parse_kwargs(spec: VerbSpec, argv: list[str] | None = None) -> dict:
    """Parse ``argv`` and return a dict of typed kwargs.

    The mirror of ``make_argparse``: takes argv, returns the
    ``{param_name: value}`` dict that ``run(**kwargs)`` consumes.
    """
    args = make_argparse(spec).parse_args(argv)
    return vars(args)


def kwargs_from_dict(spec: VerbSpec, raw: dict) -> dict:
    """Coerce a dict (e.g. JSON from MCP) into the verb's typed kwargs.

    Casts strings to declared types where possible. Missing optional
    parameters fall back to their defaults.
    """
    out: dict = {}
    for p in spec.parameters:
        if p.name in raw:
            v = raw[p.name]
            if p.type is Path and not isinstance(v, Path):
                v = Path(v) if v is not None else None
            elif p.type is bool and not isinstance(v, bool):
                v = bool(v)
            elif p.type is int and not isinstance(v, int):
                v = int(v)
            elif p.type is float and not isinstance(v, float):
                v = float(v)
            out[p.name] = v
        else:
            out[p.name] = p.default
    return out


def format_help(spec: VerbSpec) -> str:
    """Render markdown help for ``fars help <verb>``."""
    out: list[str] = [f"# corpus {spec.name}", "", spec.description, ""]
    if spec.example:
        out += ["## Example", "", f"    $ {spec.example}", ""]
    if spec.notes:
        out += [spec.notes, ""]
    if spec.parameters:
        out += ["## Parameters", ""]
        for p in spec.parameters:
            kind = {"positional": "positional",
                    "flag": "flag",
                    "store_true": "boolean flag",
                    "append": "repeatable flag"}[p.kind]
            default = (f" (default: `{p.default}`)"
                       if p.default is not None and p.kind != "store_true"
                       else "")
            out.append(f"- **`{p.name}`** ({kind}){default}: {p.description}")
        out.append("")
    if spec.output:
        out += ["## Output", "", spec.output, ""]
    out.append(f"Run `fars {spec.name} --help` for the full argparse listing.")
    return "\n".join(out)


def to_dict(spec: VerbSpec) -> dict:
    """Serialize a spec to a JSON-friendly dict (for ``list-verbs --json``)."""
    return {
        "name": spec.name,
        "description": spec.description,
        "example": spec.example,
        "notes": spec.notes,
        "output": spec.output,
        "parameters": [
            {
                "name": p.name,
                "kind": p.kind,
                "type": p.type.__name__ if p.type else "str",
                "default": str(p.default) if isinstance(p.default, Path) else p.default,
                "required": p.required,
                "description": p.description,
                "short": p.short,
                "choices": list(p.choices) if p.choices else None,
                "nargs": p.nargs,
                "metavar": p.metavar,
            }
            for p in spec.parameters
        ],
        "json_schema": make_json_schema(spec),
    }
