"""Runtime scaffolding for a long-running FARS process.

The static-analysis side of FARS lives in ``fars.substrate``,
``fars.operator``, and ``fars.closure``. This subpackage holds the
pieces a FARS instance needs to *run* as a process:

- ``event_log`` — append-only log of operator witnesses.
- ``agent`` — agent abstraction (skill, capability, runbook).
- ``dispatch`` — predication-cell-based message dispatch table.
- ``heartbeat`` — scheduler that selects unsettled flatfiles and emits ticks.

Together these instantiate the AOP loop: heartbeat → dispatch → agent →
operator → witness → event log. None of them are required for the
existing batch-mode CLI verbs; they activate when ``fars heartbeat``
(or equivalent) is invoked.
"""
