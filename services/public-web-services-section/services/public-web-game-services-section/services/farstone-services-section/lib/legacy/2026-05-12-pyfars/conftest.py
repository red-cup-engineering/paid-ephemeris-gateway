"""Pytest config for direct test runs from a checkout.

The Nix package/check path is canonical. This local path insertion only keeps
``pytest`` inside the devshell pointed at the checkout's ``pyfars`` sources.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
