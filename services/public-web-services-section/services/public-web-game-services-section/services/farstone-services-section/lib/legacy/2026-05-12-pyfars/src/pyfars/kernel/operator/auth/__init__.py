"""Authorization operators — the substrate's auth primitives.

Per the FARS theory's ``morphisms/check-authorization.md``, authorization
is the substrate primitive every mutating operator passes through. The
math is the right-residuation on **FOUR** per
``theorems/residuated-restriction-as-authority-gate.md``: four authority
profiles, each with distinct action on each candidate payload value.
The conformance contract is the table, not a Boolean ACL.

Modules:

- :mod:`compute_working_fiber` — composes agent + office + mode scope
  contributions into the session's working fiber.
- :mod:`check_authorization` — the FOUR-valued gate; emits a
  ``guard``-channel witness; returns ``(decision, witness)``.

Bridges (web, MCP, federation, AP, a2a, identity) call these via
``BridgeProgram.handle_call`` rather than directly; see
``pyfars.programs.bridge``.
"""
from pyfars.kernel.operator.auth.check_authorization import (
    Action,
    Decision,
    RequiredPredicate,
    authority_gate,
    check_authorization,
)
from pyfars.kernel.operator.auth.compute_working_fiber import (
    WorkingFiber,
    compute_working_fiber,
)
from pyfars.kernel.operator.auth.verify import (
    verify_ed25519,
    verify_rsa_pss_sha256,
)

__all__ = [
    "Action",
    "Decision",
    "RequiredPredicate",
    "WorkingFiber",
    "authority_gate",
    "check_authorization",
    "compute_working_fiber",
    "verify_ed25519",
    "verify_rsa_pss_sha256",
]
