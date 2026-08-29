"""check-authorization — the substrate's authorization primitive.

Per ``morphisms/check-authorization.md``, every operator that mutates
substrate state passes through this gate. Inputs: a session's
:class:`WorkingFiber` (composed agent + office + mode scope) and an
:class:`Action` (the action's required-predicate fiber). Outputs:
``(decision, witness)`` where ``decision`` is one of
``admit / deny / contested / unknown`` and ``witness`` is a
``guard``-channel record the caller appends to its event log.

The decision projection (from the spec):

- All required predicates carry $\\mathbf{t}$ → ``admit``.
- Any required predicate carries $\\mathbf{f}$ → ``deny``.
- Any required predicate carries $\\top$ → ``contested``.
- Any required predicate carries $\\bot$ (and no $\\mathbf{f}$/$\\top$) →
  ``unknown``. Per the strict/permissive policy on the action: strict
  treats unknown as ``deny`` at the caller's branch; the default is
  strict.

This module also exposes :func:`authority_gate`, the FOUR-valued right-
residuation function ``R_a(x) = a ⇒ x`` whose conformance table is
``theorems/residuated-restriction-as-authority-gate.md``. The gate is
the math behind federation-envelope admission (the trust-grade gates
each cell in an incoming payload). check-authorization itself does NOT
use it — it looks up working-fiber values directly per the morphism
spec. The gate ships alongside because the same module is the right
home: both functions encode the substrate's FOUR-valued auth math.
"""
from __future__ import annotations

import hashlib
import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pypredcalc import BilatticeValue

from pyfars.kernel.operator.auth.compute_working_fiber import WorkingFiber
from pyfars.kernel.witness import Witness, make_witness
from pyfars.sdk.entities.jural_relation import JuralKind


Decision = Literal["admit", "deny", "contested", "unknown"]


# Right-residuation table on FOUR, per
# residuated-restriction-as-authority-gate.md. Indexed
# [authority][payload] → result.
#
#   R_a(x), a\x | BOT | T   | F   | TOP
#   ------------|-----|-----|-----|-----
#   BOT         |  T  |  T  | BOT | BOT
#   T           | BOT |  T  |  F  |  F
#   F           |  T  |  T  |  T  |  T
#   TOP         | BOT |  T  |  F  | TOP
_T = BilatticeValue.T
_F = BilatticeValue.F
_BOT = BilatticeValue.BOT
_TOP = BilatticeValue.TOP

_RESIDUATION: dict[
    BilatticeValue, dict[BilatticeValue, BilatticeValue]
] = {
    _BOT: {_BOT: _T, _T: _T, _F: _BOT, _TOP: _BOT},
    _T:   {_BOT: _BOT, _T: _T, _F: _F, _TOP: _F},
    _F:   {_BOT: _T, _T: _T, _F: _T, _TOP: _T},
    _TOP: {_BOT: _BOT, _T: _T, _F: _F, _TOP: _TOP},
}


def authority_gate(
    authority: BilatticeValue, candidate: BilatticeValue,
) -> BilatticeValue:
    """Right-residuation ``R_authority(candidate) = authority ⇒ candidate``.

    Used for sender-as-authority gating: a peer's trust-grade gates an
    incoming envelope's contribution to a target cell. See
    ``concepts/authority-gate.md``.

    Note three counter-intuitive rows from the conformance table:

      - ``F`` authority is uniformly ``T``-producing (ex-falso).
      - ``BOT`` authority collapses negative-content payloads to ``BOT``.
      - ``TOP`` authority is the **identity** — it does *no* gating.
    """
    return _RESIDUATION[authority][candidate]


class RequiredPredicate(BaseModel):
    """One required cell in an :class:`Action`'s required-predicate fiber."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    kind: JuralKind
    scope_action: str


class Action(BaseModel):
    """The required-predicate fiber for an in-flight action.

    Constructed per call by the bridge or operator that needs an
    authorization decision. Ephemeral — not substrate-resident.
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str = Field(description="action identifier (operator slug, endpoint, etc.)")
    required_predicates: tuple[RequiredPredicate, ...] = ()
    policy: Literal["strict", "permissive"] = "strict"


def _hash_action(action: Action) -> str:
    payload = json.dumps(
        action.model_dump(mode="python"), sort_keys=True, ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _hash_restriction(
    cells: tuple[tuple[str, str, str], ...],
) -> str:
    payload = json.dumps(
        sorted(cells), sort_keys=True, ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def check_authorization(
    working_fiber: WorkingFiber,
    action: Action,
    *,
    session: str | None = None,
) -> tuple[Decision, Witness]:
    """Run the authorization gate; return ``(decision, guard-witness)``.

    The witness carries the spec's payload — action-hash, decision,
    restriction-result-hash, and the contested-or-unknown cells. The
    caller (typically ``BridgeProgram.handle_call``) appends the
    witness to its event log.
    """
    values: list[BilatticeValue] = []
    flagged: list[tuple[str, str, str]] = []
    for required in action.required_predicates:
        v = working_fiber.value_for(required.kind, required.scope_action)
        values.append(v)
        if v in (_BOT, _F, _TOP):
            flagged.append((required.kind, required.scope_action, v.value))

    if any(v is _F for v in values):
        decision: Decision = "deny"
    elif any(v is _TOP for v in values):
        decision = "contested"
    elif any(v is _BOT for v in values):
        decision = "unknown"
    elif not values:
        # No required predicates — vacuously admissible. The spec
        # doesn't address this; we treat empty-requirements as admit
        # (no gate to fail).
        decision = "admit"
    else:
        decision = "admit"

    witness = make_witness(
        operator="check_authorization",
        target=session or working_fiber.agent,
        before_hash=None,
        after_hash=None,
        details={
            "action": action.name,
            "action_hash": _hash_action(action),
            "decision": decision,
            "restriction_result_hash": _hash_restriction(tuple(flagged)),
            "flagged_cells": flagged,
            "agent": working_fiber.agent,
            "office": working_fiber.office,
            "mode": working_fiber.mode,
        },
        agent=working_fiber.agent,
        acting_office=working_fiber.office,
        channel="guard",
        kind="guard",
    )
    return decision, witness


__all__ = [
    "Action",
    "Decision",
    "RequiredPredicate",
    "authority_gate",
    "check_authorization",
]
