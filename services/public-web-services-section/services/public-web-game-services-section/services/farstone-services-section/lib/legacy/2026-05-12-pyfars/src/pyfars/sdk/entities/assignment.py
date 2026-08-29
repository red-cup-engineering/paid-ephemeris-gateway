"""Assignment — the minimal typed pairing ``(workitem, agent)``.

An Assignment is the substrate's name for one (workitem, agent)
pairing produced by polity-authored closure rules. Two fields
carry the entity; everything else lives in cells around the
workitem or the agent.

By design this record holds *only* the pairing. The richer state
that classical dispatch literature wedges onto an "assignment"
(status state machine, priority, eligibility provenance, deadlines)
lives as cells around the workitem in the system:

  - ``(workitem, status, open|active|settled|escalated) = T`` —
    written by whichever program is currently working on the
    workitem (HarnessProgram on ``mark_done``/``escalate``;
    dispatch on spawn).
  - ``(workitem, priority, N) = T`` — authored by the polity or
    derived by closure rules; dispatch sorts by this.
  - ``(workitem, to-office, O) = T`` — upstream routing input.
  - ``(workitem, from-sender, S) = T`` — provenance.
  - ``(workitem, eligible-agent, A) = T`` — closure-rule output
    that names the agents eligible to take the workitem.

A polity authors a closure rule that walks
``(workitem, eligible-agent, A) ∧ <load/priority math> →
(assignment, workitem, W) ∧ (assignment, agent, A) = T`` and
emits an Assignment record per chosen pairing.

The HarnessProgram reads "assignments where agent = me" via this
typed view, then reads cells around each workitem for the rich
context the agentic loop needs.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Assignment(BaseModel):
    """One ``(workitem, agent)`` pairing as a typed view over cells.

    Hydrated from substrate cells via :func:`pyfars.sdk.entities.load_one`;
    no parallel persistence shape, no field stuffing. The Pydantic
    model carries the pairing plus the persistence handle (slug).
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    slug: str
    workitem: str
    agent: str


__all__ = ["Assignment"]
