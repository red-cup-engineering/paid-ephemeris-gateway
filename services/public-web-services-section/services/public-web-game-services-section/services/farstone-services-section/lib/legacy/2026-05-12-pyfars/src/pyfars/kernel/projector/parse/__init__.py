"""Text-to-typed parsers used by projectors. Pure functions, no I/O.

Each module exports one ``parse(text, …)`` function. Filesystem I/O
lives in :mod:`pyfars.kernel.projector.compound`, which is what calls
these.
"""
