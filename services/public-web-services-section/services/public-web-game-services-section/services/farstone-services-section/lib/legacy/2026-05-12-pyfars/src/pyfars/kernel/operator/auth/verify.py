"""Signature verification primitives — kernel-pure crypto.

``BridgeProgram.authorize_peer`` and ``BridgeProgram.handle_call`` are
both authority gates; neither does cryptography. The bridge SHALL
verify a credential's cryptographic signature against the matched
public key BEFORE the authority gate, and only call ``authorize_peer``
on a verified key. This module provides that verification.

Two schemes shipped in v1:

- :func:`verify_ed25519` — raw Ed25519 over 32-byte public keys. Used
  for federation envelopes, where the sender's public key is the
  envelope's ``signature.key_id`` (base64-encoded raw bytes) and the
  signed message is the envelope-id.

- :func:`verify_rsa_pss_sha256` — RSA-PSS-SHA256 over PEM public
  keys. Used for ActivityPub HTTP-Signatures, where the sender's
  public key lives at the URL named by the ``keyId`` parameter and
  the signed message is the HTTP-Signature canonical string.

Verification failure (bad signature, malformed key, scheme mismatch)
returns ``False``. Callers SHALL treat ``False`` as "drop the message
and witness the rejection"; the gate beyond that records *why* the
caller decided not to admit.
"""
from __future__ import annotations

import base64


def verify_ed25519(
    public_key_b64: str, message: bytes, signature_b64: str,
) -> bool:
    """Verify ``signature`` is a valid Ed25519 signature over ``message``.

    Both ``public_key_b64`` and ``signature_b64`` are
    url-safe base64-encoded raw bytes (no PEM framing). Returns
    ``True`` iff the signature verifies.
    """
    try:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives.asymmetric.ed25519 import (
            Ed25519PublicKey,
        )
    except ImportError:
        return False
    try:
        public_key_bytes = base64.urlsafe_b64decode(_pad(public_key_b64))
        signature_bytes = base64.urlsafe_b64decode(_pad(signature_b64))
    except (ValueError, base64.binascii.Error):
        return False
    if len(public_key_bytes) != 32:
        return False
    try:
        key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
        key.verify(signature_bytes, message)
        return True
    except (InvalidSignature, ValueError):
        return False


def verify_rsa_pss_sha256(
    public_key_pem: bytes, message: bytes, signature: bytes,
) -> bool:
    """Verify ``signature`` is a valid RSASSA-PSS-SHA256 over ``message``.

    ``public_key_pem`` is a PEM-encoded RSA public key (the standard
    AP / HTTP-Signature carrier). ``signature`` is raw bytes (the
    base64-decoded ``signature=`` field from the Signature header).
    """
    try:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric.padding import (
            MGF1, PSS,
        )
        from cryptography.hazmat.primitives.serialization import (
            load_pem_public_key,
        )
    except ImportError:
        return False
    try:
        key = load_pem_public_key(public_key_pem)
        key.verify(
            signature, message,
            PSS(mgf=MGF1(hashes.SHA256()), salt_length=PSS.MAX_LENGTH),
            hashes.SHA256(),
        )
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False


def _pad(b64: str) -> str:
    """Pad a base64 string to a multiple of 4 characters."""
    missing = (-len(b64)) % 4
    return b64 + ("=" * missing)


__all__ = ["verify_ed25519", "verify_rsa_pss_sha256"]
