"""Pydantic typed views over system cells.

Each class mirrors one ``type:`` shape in the system. None re-walk
the filesystem; they're constructed from cells via :func:`load_one` /
:func:`load_all` in :mod:`pyfars.sdk.entities._load`.

The kernel exposes cells; the SDK exposes typed views over them. The
kernel never imports from this package — direction is one-way upward.
"""
from __future__ import annotations

from pyfars.sdk.entities._load import gather_fm, load_all, load_one
from pyfars.sdk.entities.agent import Agent, AgentType, CharterBindings, Jurisdiction
from pyfars.sdk.entities.assignment import Assignment
from pyfars.sdk.entities.channel import Channel, ChannelKind, RetentionDiscipline
from pyfars.sdk.entities.credential import (
    Credential,
    CredentialKind,
    find_credential,
)
from pyfars.sdk.entities.endpoint import Endpoint, EndpointRouter
from pyfars.sdk.entities.event import Event, EventCategory, Moment
from pyfars.sdk.entities.federation_envelope import (
    ENVELOPE_ID_FIELDS,
    FederationCell,
    FederationEnvelope,
    FederationPayload,
    FederationSignature,
    PayloadKind,
    canonical_json,
    sha256_hex,
)
from pyfars.sdk.entities.harness import Harness
from pyfars.sdk.entities.hook import Hook
from pyfars.sdk.entities.intent import Intent, IntentStatus, IntentSurface
from pyfars.sdk.entities.jural_relation import (
    JuralKind,
    JuralRelation,
    derive_jural_relations,
)
from pyfars.sdk.entities.message import Message
from pyfars.sdk.entities.peer import (
    PeerRecord,
    TransportBinding,
    VocabularyMismatchPolicy,
)
from pyfars.sdk.entities.office import (
    DeonticProfile,
    Office,
    OfficeType,
    ScopeDimensions,
    WeberType,
)
from pyfars.sdk.entities.prompt import Prompt
from pyfars.sdk.entities.session import MEMORY_BANK_SECTIONS, Session
from pyfars.sdk.entities.skill import Formality, Skill, SkillKind
from pyfars.kernel.witness import Witness, hash_content, hash_path, make_witness


__all__ = [
    "Agent",
    "AgentType",
    "Assignment",
    "Channel",
    "ChannelKind",
    "CharterBindings",
    "Credential",
    "CredentialKind",
    "DeonticProfile",
    "ENVELOPE_ID_FIELDS",
    "Endpoint",
    "EndpointRouter",
    "Event",
    "EventCategory",
    "FederationCell",
    "FederationEnvelope",
    "FederationPayload",
    "FederationSignature",
    "Formality",
    "Harness",
    "Hook",
    "Intent",
    "IntentStatus",
    "IntentSurface",
    "JuralKind",
    "JuralRelation",
    "Jurisdiction",
    "MEMORY_BANK_SECTIONS",
    "Message",
    "Moment",
    "Office",
    "OfficeType",
    "PayloadKind",
    "PeerRecord",
    "Prompt",
    "RetentionDiscipline",
    "ScopeDimensions",
    "Session",
    "Skill",
    "SkillKind",
    "TransportBinding",
    "VocabularyMismatchPolicy",
    "WeberType",
    "Witness",
    "canonical_json",
    "derive_jural_relations",
    "find_credential",
    "gather_fm",
    "hash_content",
    "hash_path",
    "load_all",
    "load_one",
    "make_witness",
    "sha256_hex",
]
