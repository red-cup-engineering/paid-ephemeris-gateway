"""Operators — cells → cells via filesystem mutation + witness emission.

Three categories: ``insertion`` (add cells), ``retraction`` (remove
cells), ``relocation`` (restructure without changing cell content).
Each operator reads the target file, computes a before-hash, applies a
pure transformation from ``edit/``, writes back, computes the
after-hash, and returns a :class:`Witness` for the event log.
"""
