"""Credential — substrate-resident binding from external proof to a subject.

A credential records that *some external thing* — an OAuth account, a
signing key, an API key, a password hash — names a substrate-resident
subject (personnel, persona-agent, peer). Bridges call
:func:`find_credential` after verifying an incoming credential to
resolve the subject the call should run as. The subject is what
``compute_working_fiber`` keys off; the credential is the binding
from off-substrate identity to on-substrate subject.

The four credential kinds in v1:

- ``oauth-account``: OAuth/OIDC issuer + subject claim.
- ``signing-key``: a public verifying key.
- ``api-key``: an opaque API key's SHA-256 fingerprint.
- ``password-hash``: a hashed password (Argon2id / bcrypt).

Credential records live as ``kind: credential`` cells under the
polity's ``governance/credentials/`` directory (or wherever offices
choose to author them). One credential, one record — no parallel
shapes.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pypredcalc.predication import PredicationStore

from pyfars.kernel import query


CredentialKind = Literal[
    "oauth-account",
    "signing-key",
    "api-key",
    "password-hash",
]


class Credential(BaseModel):
    """One credential — external proof bound to a substrate subject."""
    model_config = ConfigDict(frozen=True, extra="ignore", populate_by_name=True)

    slug: str
    kind: CredentialKind
    bound_to: str = Field(
        alias="bound-to",
        description="subject slug this credential authenticates (personnel:X, peer:Y, persona:Z)",
    )

    # OAuth/OIDC fields
    issuer: str | None = None
    subject: str | None = None
    email: str | None = None

    # Signing-key fields
    public_key: str | None = Field(default=None, alias="public-key")
    fingerprint: str | None = None

    # API-key / password fields
    audience: list[str] = Field(default_factory=list)
    revoked: bool = False


def find_credential(
    store: PredicationStore,
    *,
    kind: CredentialKind | None = None,
    slug: str | None = None,
    issuer: str | None = None,
    subject: str | None = None,
    public_key: str | None = None,
    fingerprint: str | None = None,
) -> Credential | None:
    """Look up a kind:credential record by external-proof keys or by slug.

    Returns the first match or ``None``. The match is exact on whichever
    lookup keys were passed; callers MUST pass the keys appropriate for
    the credential kind:

      - ``oauth-account`` — ``issuer`` + ``subject``.
      - ``signing-key`` — ``public_key`` or ``fingerprint``.
      - ``api-key`` / ``password-hash`` — ``fingerprint``.

    ``slug`` is the direct-by-slug lookup path used by HTTP-Signature
    verifiers (where the signature header's ``keyId`` is the credential
    slug). When ``slug`` is given, ``kind`` is optional — the lookup
    returns whatever record carries that slug.
    """
    if slug is not None:
        return _hydrate(store, slug) if _is_credential(store, slug) else None
    if kind is None:
        return None
    for candidate in query.subjects_of_type(store, ("credential",)):
        slug_s = str(candidate)
        kinds = [str(k) for k in query.objects_under(store, slug_s, ("kind",))]
        if kind not in kinds:
            continue
        if not _matches(
            store, slug_s,
            issuer=issuer, subject=subject,
            public_key=public_key, fingerprint=fingerprint,
        ):
            continue
        return _hydrate(store, slug_s)
    return None


def _is_credential(store: PredicationStore, slug: str) -> bool:
    types = [str(t) for t in query.objects_under(store, slug, ("type",))]
    return "credential" in types


def _matches(
    store: PredicationStore, slug: str, **lookup: str | None,
) -> bool:
    for key, expected in lookup.items():
        if expected is None:
            continue
        pred = key.replace("_", "-")
        actual = next(iter(query.objects_under(store, slug, (pred,))), None)
        if actual is None or str(actual) != expected:
            return False
    return True


def _hydrate(store: PredicationStore, slug: str) -> Credential | None:
    from pyfars.sdk.entities._load import load_one
    return load_one(Credential, store, slug)


__all__ = [
    "Credential",
    "CredentialKind",
    "find_credential",
]
