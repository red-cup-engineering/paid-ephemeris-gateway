"""Filesystem-mutating edit operators — each emits a Witness on success.

Each module exports one function that performs a targeted mutation of a
note's frontmatter or body (set a key, add a value, remove a key, rename a
key, rewrite a link, move the file, snapshot it). The function reads the
current file, applies the change in memory, writes the result atomically,
and returns a :class:`pyfars.kernel.witness.Witness` for the event log.

Operators are idempotent where the operation is naturally idempotent (e.g.
fm_set to the current value is a no-op that still emits a witness). They do
not orchestrate each other; composition is the caller's responsibility.
"""
