"""``fars list-verbs [--json]`` — emit the verb catalog.

Lists every verb the dispatcher knows about, with its description,
example, and (when available) full parameter spec — typed parameter
shape, JSON Schema for MCP, the works.

Verbs that have migrated to ``SPEC`` emit their full spec; verbs that
haven't fall back to the legacy ``cli/help.py:_HELP`` description tuple.

JSON form is suitable for tooling integrations (MCP servers, IDE
plugins, agent-discoverable surfaces) that want the full tool surface
without reflecting through argparse.
"""
from __future__ import annotations

import importlib
import sys

from fars.cli.help import _HELP
from fars.render.json_dump import dump as render_json
from fars.spec import Parameter, VerbSpec, make_argparse, to_dict

SPEC = VerbSpec(
    name="list-verbs",
    description="Emit the verb catalog with descriptions + examples + parameter specs.",
    example="fars list-verbs --json",
    notes="Designed for tooling integrations (MCP servers, IDE plugins).",
    output="Markdown catalog grouped by verb; --json emits a list of full spec dicts.",
    parameters=(
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def _maybe_spec(suffix: str):
    """Return the verb module's SPEC if it has one, else None."""
    try:
        module = importlib.import_module(f"fars.cli.{suffix}")
    except ImportError:
        return None
    return getattr(module, "SPEC", None)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)

    from fars.cli.__main__ import VERB_MODULES
    rows = []
    for verb in sorted(VERB_MODULES):
        spec = _maybe_spec(VERB_MODULES[verb])
        if spec is not None:
            row = to_dict(spec)
            row["module"] = f"fars.cli.{VERB_MODULES[verb]}"
            row["spec_driven"] = True
        else:
            entry = _HELP.get(verb, ("", "", ""))
            desc, example, notes = entry
            row = {
                "name": verb,
                "description": desc,
                "example": example,
                "notes": notes,
                "module": f"fars.cli.{VERB_MODULES[verb]}",
                "spec_driven": False,
            }
        rows.append(row)

    if args.json:
        sys.stdout.write(render_json(rows, meta={"count": len(rows)}))
        return 0

    n_typed = sum(1 for r in rows if r["spec_driven"])
    print(f"# {len(rows)} verbs ({n_typed} spec-driven, {len(rows) - n_typed} legacy)")
    print()
    for r in rows:
        marker = "[spec]" if r["spec_driven"] else "[legacy]"
        print(f"## `fars {r['name']}` {marker}")
        if r["description"]:
            print()
            print(r["description"])
        if r.get("example"):
            print()
            print(f"    $ {r['example']}")
        if r.get("notes"):
            print()
            print(r["notes"])
        if r.get("parameters"):
            print()
            print("Parameters:")
            for p in r["parameters"]:
                kind = p["kind"]
                default = (f" (default: `{p['default']}`)"
                           if p.get("default") is not None and kind != "store_true"
                           else "")
                print(f"  - **`{p['name']}`** ({kind}){default}: {p['description']}")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
