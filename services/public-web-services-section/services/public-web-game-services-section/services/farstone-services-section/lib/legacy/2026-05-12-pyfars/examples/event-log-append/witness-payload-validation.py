# Spec: event-log-append:2026.05.09+event-log-append §6.3 — Witness payload validation
# Fixture: pairs of (constructor-args, expected-outcome) for Witness construction.
# Tests load these to assert the bilattice axes' [0,1] validator fires.
"""Witness construction fixtures for §6.3 acceptance."""
from __future__ import annotations

VALID_PAYLOADS = [
    {
        "operator": "test-emit",
        "target": "cells/test",
        "truth": 1.0,
        "evidence": 1.0,
    },
    {
        "operator": "test-emit",
        "target": "cells/test",
        "truth": 0.7,
        "evidence": 0.5,
        "channel": "test",
        "origin": "fixture",
    },
    {
        "operator": "test-emit",
        "target": "cells/test",
        "truth": 0.0,
        "evidence": 0.0,
    },
]

INVALID_PAYLOADS = [
    {
        "operator": "test-emit",
        "target": "cells/test",
        "truth": 2.0,
        "evidence": 1.0,
    },
    {
        "operator": "test-emit",
        "target": "cells/test",
        "truth": 1.0,
        "evidence": -0.1,
    },
    {
        "operator": "test-emit",
        "target": "cells/test",
        "truth": 1.0,
        "evidence": 1.5,
    },
]
