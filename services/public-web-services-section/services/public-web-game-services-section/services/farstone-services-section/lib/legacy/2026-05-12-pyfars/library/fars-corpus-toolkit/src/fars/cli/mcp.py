"""``fars mcp [--root R]`` — start an MCP server exposing every corpus verb.

Each top-level verb becomes an MCP tool. Verbs that have a ``SPEC``
expose typed tool parameters (an MCP client gets a proper JSON Schema
describing each flag); verbs that haven't migrated yet fall back to a
single ``args_str`` parameter (space-separated argv).

Requires the ``mcp`` Python package (``pip install mcp``). When the
package is missing, prints a helpful install hint and exits 2.

The server runs over stdio by default — appropriate for being launched
as a subprocess by an MCP-aware agent runtime.
"""
from __future__ import annotations

import importlib
import io
import sys
from contextlib import redirect_stdout
from pathlib import Path
from typing import Callable

from fars.cli._runner import as_directory
from fars.spec import Parameter, VerbSpec, kwargs_from_dict, make_argparse

SPEC = VerbSpec(
    name="mcp",
    description="Run an MCP server exposing every corpus verb as a tool.",
    example="fars mcp --root .",
    notes="Requires `pip install mcp`. Stdio transport — designed to be launched as a subprocess.",
    output="Long-running stdio server; logs verb counts to stderr on startup.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r",
                  description="default corpus root passed to verbs (default: CWD)"),
        Parameter(name="name", kind="flag", default="corpus",
                  description="MCP server name advertised to clients"),
    ),
)


def _verb_modules() -> dict[str, str]:
    from fars.cli.__main__ import VERB_MODULES
    return VERB_MODULES


def _spec_for(verb: str) -> VerbSpec | None:
    """Return the verb's ``SPEC`` if it has migrated, else None."""
    suffix = _verb_modules()[verb]
    module = importlib.import_module(f"fars.cli.{suffix}")
    return getattr(module, "SPEC", None)


def _verb_main(verb: str) -> Callable[[list[str] | None], int]:
    suffix = _verb_modules()[verb]
    module = importlib.import_module(f"fars.cli.{suffix}")
    return module.main


def _run_argv(verb: str, argv: list[str], default_root: Path) -> str:
    fn = _verb_main(verb)
    if "--root" not in argv and "-r" not in argv and verb not in (
        "help", "install-hooks",
    ):
        argv = ["--root", str(default_root), *argv]
    buf = io.StringIO()
    try:
        with redirect_stdout(buf):
            fn(argv)
    except SystemExit:
        pass
    return buf.getvalue() or "(no stdout output — check stderr in server logs)"


def _run_typed(verb: str, params: dict, default_root: Path) -> str:
    """Invoke a spec-driven verb with typed kwargs, capture stdout.

    Reconstructs argv from the typed dict using the verb's spec, then
    routes through ``main()`` — the renderer logic stays in ``main()``,
    so MCP output matches CLI output byte-for-byte.
    """
    spec = _spec_for(verb)
    if spec is None:
        return _run_argv(verb, [], default_root)

    params = kwargs_from_dict(spec, params)
    if "root" in params and params["root"] in (None, ""):
        params["root"] = str(default_root)

    argv: list[str] = []
    for p in spec.parameters:
        v = params.get(p.name)
        if v is None or v == "":
            continue
        if p.kind == "positional":
            argv.append(str(v))
        elif p.kind == "store_true":
            if v:
                argv.append(f"--{p.name.replace('_', '-')}")
        elif p.kind == "flag":
            argv.append(f"--{p.name.replace('_', '-')}")
            argv.append(str(v))
        elif p.kind == "append":
            for item in (v if isinstance(v, list) else [v]):
                argv.append(f"--{p.name.replace('_', '-')}")
                argv.append(str(item))
    return _run_argv(verb, argv, default_root)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)

    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        print("fars mcp: the `mcp` package is not installed.", file=sys.stderr)
        print("  pip install mcp", file=sys.stderr)
        return 2

    root = as_directory(args.root, "fars mcp")
    if root is None:
        return 2
    server = FastMCP(args.name)

    typed_count = 0
    untyped_count = 0
    for verb in sorted(_verb_modules()):
        spec = _spec_for(verb)
        tool_name = f"corpus_{verb.replace('-', '_')}"

        if spec is not None:
            def _make_typed_tool(v: str, sp: VerbSpec):
                def tool(**kwargs) -> str:
                    return _run_typed(v, kwargs, root)
                tool.__name__ = f"corpus_{v.replace('-', '_')}"
                tool.__doc__ = (
                    f"{sp.description}\n\n"
                    f"Example: `{sp.example}`\n\n"
                    + ("\n".join(
                        f"  - {p.name}: {p.description}"
                        for p in sp.parameters
                    ))
                )
                return tool
            server.tool(name=tool_name)(_make_typed_tool(verb, spec))
            typed_count += 1
        else:
            def _make_untyped_tool(v: str):
                def tool(args_str: str = "") -> str:
                    """Run the corpus verb. Pass arguments as a single string,
                    space-separated, e.g. `--kind concept --limit 5`."""
                    argv = args_str.split() if args_str else []
                    return _run_argv(v, argv, root)
                tool.__name__ = f"corpus_{v.replace('-', '_')}"
                tool.__doc__ = f"Run `fars {v}`. " + (tool.__doc__ or "")
                return tool
            server.tool(name=tool_name)(_make_untyped_tool(verb))
            untyped_count += 1

    print(f"fars mcp: {typed_count} typed tools + {untyped_count} untyped tools "
          f"(root={root})", file=sys.stderr)
    server.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
