"""SDK — Python ergonomics over a system.

The kernel exposes cells, closure, queries, and witness-emitting
operators. The SDK adds Python-caller conveniences on top: Pydantic
typed views (``entities/``) so callers can read system cells as
type-checked field access, plus the helpers that drive the system
from agent code.

Nothing in the kernel imports the SDK; the SDK is one-way upward.
"""
from pyfars.sdk.entities import (
    Agent,
    Assignment,
    Channel,
    Endpoint,
    Event,
    Harness,
    Hook,
    Intent,
    Message,
    Office,
    Prompt,
    Session,
    Skill,
    gather_fm,
    load_all,
    load_one,
)

__all__ = [
    "Agent",
    "Assignment",
    "Channel",
    "Endpoint",
    "Event",
    "Harness",
    "Hook",
    "Intent",
    "Message",
    "Office",
    "Prompt",
    "Session",
    "Skill",
    "gather_fm",
    "load_all",
    "load_one",
]
