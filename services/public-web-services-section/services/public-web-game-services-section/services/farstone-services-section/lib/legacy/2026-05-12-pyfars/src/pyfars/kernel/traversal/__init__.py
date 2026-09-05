"""Pure graph-traversal functions over the depends-on / dependents graph.

All functions accept pre-built index maps (``depends_on``, ``dependents``,
``by_slug``) rather than the raw note list. This keeps them fast (no I/O),
testable (inject any dict), and usable from both CLI and runtime paths.

Functions never mutate their inputs and never emit witnesses — traversal is
always read-only. Composition happens at the call site.
"""
