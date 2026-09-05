"""ScriptProgram — one-shot subprocess enactment of a workitem.

The script-enactment path lives here, in its own program-frame class,
rather than inside the engine. When a polity-authored Assignment names
an ``agent`` whose ``Agent.type`` is ``automated-process``, dispatch
spawns a :class:`ScriptProgram` rather than a :class:`HarnessProgram`.

The agent record names a substrate cell ``(agent, run-command, argv) = T``
that gives the command to run. The script's stdout/stderr land in a
witness on the ``enactment`` channel. Polities that do not author the
``run-command`` cell get a ``script_no_command`` witness and no
subprocess.

The math:

  - Same Program lifecycle (validate → boot → run → halt).
  - Same Assignment shape ``(workitem, agent)``.
  - One witness per run, addressed by ``workitem/<slug>`` so the
    enactment chain reconstructs cleanly.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path

from pyfars.kernel import query
from pyfars.kernel.witness import make_witness
from pyfars.programs.base import Program, ProgramResult, _now_iso


@dataclass
class ScriptResult(ProgramResult):
    """Outcome of one ScriptProgram run."""
    workitem: str = ""
    agent: str = ""
    returncode: int | None = None
    stdout: str = ""
    stderr: str = ""


class ScriptProgram(Program):
    """One-shot subprocess enactment.

    Construct with the polity root and the Assignment fields (workitem,
    agent). The agent record's ``run-command`` cell names argv; the
    program runs it once, captures output, emits a witness, and halts.
    """

    def __init__(
        self,
        root: Path,
        *,
        workitem: str,
        agent: str,
        channel: str = "enactment",
    ) -> None:
        super().__init__(root)
        self.workitem = workitem
        self.agent_slug = agent
        self.channel = channel

    async def run(self) -> ScriptResult:
        started_at = _now_iso()
        self.validate()
        self.boot()
        store = self.system.store

        cmds = list(query.objects_under(
            store, self.agent_slug, ("run-command",),
        ))
        if not cmds:
            self._witness(
                operator="script_no_command",
                details={
                    "workitem": self.workitem,
                    "agent": self.agent_slug,
                },
                kind="observation",
            )
            halted_at = _now_iso()
            self.halt()
            return ScriptResult(
                started_at=started_at,
                halted_at=halted_at,
                workitem=self.workitem,
                agent=self.agent_slug,
            )

        cmd = cmds[0]
        argv = cmd.split() if isinstance(cmd, str) else list(cmd)
        proc = await asyncio.create_subprocess_exec(
            *argv,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_bytes, stderr_bytes = await proc.communicate()
        stdout = stdout_bytes.decode(errors="replace")[:4000]
        stderr = stderr_bytes.decode(errors="replace")[:4000]

        self._witness(
            operator="script_run",
            details={
                "workitem": self.workitem,
                "agent": self.agent_slug,
                "argv": argv,
                "returncode": proc.returncode,
                "stdout": stdout,
                "stderr": stderr,
            },
            kind="mutation",
        )
        halted_at = _now_iso()
        self.halt()
        return ScriptResult(
            started_at=started_at,
            halted_at=halted_at,
            workitem=self.workitem,
            agent=self.agent_slug,
            returncode=proc.returncode,
            stdout=stdout,
            stderr=stderr,
        )

    def _witness(self, *, operator: str, details: dict, kind: str) -> None:
        try:
            self.log.append(make_witness(
                operator=operator,
                target=f"workitem/{self.workitem}",
                before_hash=None,
                after_hash=None,
                details=details,
                agent=self.agent_slug,
                channel=self.channel,
                kind=kind,
                origin="ScriptProgram",
            ))
        except OSError:
            pass


__all__ = ["ScriptProgram", "ScriptResult"]
