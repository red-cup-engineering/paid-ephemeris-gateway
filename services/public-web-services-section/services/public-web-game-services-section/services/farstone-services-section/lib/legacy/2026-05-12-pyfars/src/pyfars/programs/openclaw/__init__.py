"""OpenClaw programs — workspace materializer and (future) bridge.

The OpenClaw workspace materializer projects the polity's governance
personas into ``.openclaw/agents/`` so OpenClaw discovers them as
selectable agents. Run with::

    python -m pyfars.programs.openclaw <polity-root>

or call :class:`OpenClawWorkspaceMaterializer` directly.
"""
from pyfars.programs.openclaw.workspace import OpenClawWorkspaceMaterializer

__all__ = ["OpenClawWorkspaceMaterializer"]
