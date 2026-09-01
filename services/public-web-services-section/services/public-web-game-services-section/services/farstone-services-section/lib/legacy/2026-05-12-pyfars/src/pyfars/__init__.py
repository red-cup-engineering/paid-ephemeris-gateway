"""PyFARS — Flatfile Agentic Resource System (Python).

Read a polity (a tree of flatfiles) into the system cell store,
close it under polity-authored closure rules, dispatch agents
through it, witness mutations.

    from pyfars import System
    s = System.from_root("/path/to/polity")            # silent load

    from pyfars.programs import LoadDirectoryProgram   # auditable load
    program = LoadDirectoryProgram(Path("/path/to/polity"))
    await program.run()
    s = program.system
"""
from importlib.metadata import PackageNotFoundError as _PNF
from importlib.metadata import version as _pkg_version

from pyfars.kernel.store import System

try:
    __version__ = _pkg_version("pyfars")
except _PNF:
    __version__ = "0.0.0+dev"

__all__ = ["System", "__version__"]
