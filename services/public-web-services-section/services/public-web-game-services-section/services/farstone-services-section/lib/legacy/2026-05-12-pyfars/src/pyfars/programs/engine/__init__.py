"""Engine — the long-running engine program package.

The engine is a Program of the **engine class** (per ``concepts/program.md``):
loads a system, ticks the closure-and-dispatch loop, serves UDS to
other programs, and spawns child programs (HarnessProgram /
ScriptProgram) when polity-authored closure rules emit new Assignments.

    from pyfars.programs import EngineProgram

    program = EngineProgram(Path("/path/to/directory"))
    await program.run()

Package layout:

  - ``program.py``    The :class:`EngineProgram` class.
  - ``dispatch.py``   Per-tick LangGraph: load → read assignments → spawn.
  - ``server.py``     UDS server (FastAPI/uvicorn on a Unix socket).

The engine never calls ``pydantic_ai`` itself. LLM-driven work runs
in :class:`HarnessProgram`, spawned by dispatch when a new Assignment
names an agent of type ``ai-model`` / ``hybrid``. Subprocess work runs
in :class:`ScriptProgram`. The split keeps :func:`check_authorization`
on the path of every LLM tool call.

EventLog is at ``pyfars.kernel.event_log`` — it's witness storage,
kernel-level, used by every program that emits witnesses.
"""
from pyfars.programs.engine.program import EngineProgram

__all__ = ["EngineProgram"]
