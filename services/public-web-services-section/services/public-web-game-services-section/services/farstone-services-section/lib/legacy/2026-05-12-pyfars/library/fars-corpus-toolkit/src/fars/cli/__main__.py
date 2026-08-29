"""``python -m fars <verb> [args...]`` dispatcher.

Lazy: looks up the verb in ``VERB_MODULES``, imports the module on
demand, calls its ``main`` with the remaining argv. Listing verbs (no
args) reads ``cli.help._HELP`` directly — no verb modules touched.

Each verb is a sibling module under ``fars.cli`` exposing a
``main(argv)`` entry point. Add a verb by:

  1. adding a module under ``cli/<verb>.py``,
  2. adding an entry to ``VERB_MODULES`` below,
  3. adding an entry to ``cli.help._HELP`` so descriptions appear.
"""
from __future__ import annotations

import importlib
import sys
from typing import Callable

# Reports use ✓/✗/⚠/→ — force UTF-8 stdout/stderr so the Windows console's
# default cp1252 encoding doesn't crash on these characters.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass

# verb-name → module-suffix (relative to ``fars.cli``). Hyphens in verb
# names map to underscores in module names. ``query`` is a sub-package
# whose ``__main__`` is the entry point.
VERB_MODULES: dict[str, str] = {
    "agents": "agents",
    "audit": "audit",
    "check": "check",
    "cite": "cite",
    "commit": "commit",
    "compose": "compose",
    "context": "context",
    "diff": "diff",
    "dispatch": "dispatch",
    "fm": "fm",
    "fm-keys": "fm_keys",
    "from-template": "from_template",
    "help": "help",
    "impact": "impact",
    "index": "index",
    "install-hooks": "install_hooks",
    "lint": "lint",
    "list": "list",
    "list-verbs": "list_verbs",
    "mcp": "mcp",
    "move": "move",
    "new": "new",
    "plan": "plan",
    "profile": "profile",
    "query": "query.__main__",
    "ramp": "ramp",
    "rename-fm-key": "rename_fm_key",
    "rewrite-slug": "rewrite_slug",
    "search": "search",
    "show": "show",
    "snapshot": "snapshot",
    "stats": "stats",
    "undo": "undo",
    "validate": "validate",
    "watch": "watch",
    "where": "where",
    "witness-log": "witness_log",
}


def _load(verb: str) -> Callable[[list[str] | None], int]:
    """Import the verb's module and return its ``main`` callable."""
    suffix = VERB_MODULES[verb]
    module = importlib.import_module(f"fars.cli.{suffix}")
    return module.main


# Backward-compatible eager dict for callers that introspect VERBS.
# Resolves each name to a lazy proxy; the import only happens on call.
class _LazyVerbMap:
    def __getitem__(self, key: str) -> Callable[[list[str] | None], int]:
        if key not in VERB_MODULES:
            raise KeyError(key)
        return _load(key)

    def __contains__(self, key: object) -> bool:
        return key in VERB_MODULES

    def __iter__(self):
        return iter(VERB_MODULES)

    def keys(self):
        return VERB_MODULES.keys()


VERBS: _LazyVerbMap = _LazyVerbMap()


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if not argv or argv[0] in ("-h", "--help"):
        print("usage: fars <verb> [args...]")
        print("verbs: " + ", ".join(sorted(VERB_MODULES)))
        return 0 if argv else 1
    verb = argv[0]
    if verb not in VERB_MODULES:
        print(f"fars: unknown verb {verb!r}", file=sys.stderr)
        print("verbs: " + ", ".join(sorted(VERB_MODULES)), file=sys.stderr)
        return 2
    return _load(verb)(argv[1:])


if __name__ == "__main__":
    sys.exit(main())
