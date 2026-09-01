# Design and the signing pipeline

This is **understanding-oriented**: it explains how waggle is put together and why, rather than how to use it (see the [how-to guides](../how-to/)) or what each call does (see the [reference](../reference/)).
The exact constants and byte layouts are derived in [`../dev/notes/`](../dev/notes/).

## The one constraint that shapes everything: zero dependencies

There are mature Node↔Hive libraries — `@hiveio/dhive`, `hive-tx`, `hive-js` — and every one of them brings an npm dependency tree. waggle deliberately brings none.
It uses only Node built-ins: `node:crypto` for SHA-256 / RIPEMD-160 / HMAC, and `node:https` for transport.
Everything else is hand-rolled.

That constraint is why the package is shaped the way it is.
Each thing a dependency would have provided becomes a small, single-purpose module that derives the behavior from a stated source:

- `base58.mjs` — Bitcoin-alphabet base58.
- `hash.mjs` — the hash primitives (with a pure-JS RIPEMD-160 fallback).
- `secp256k1.mjs` — the elliptic curve in `BigInt`.
- `keys.mjs` — WIF and `STM…` keys on top of the curve and the hashes.
- `serialize.mjs` — the graphene binary format.
- `transaction.mjs` — the signing digest and transaction id.
- `rpc.mjs` — JSON-RPC transport with node failover.
- `chain.mjs` — the read methods, TaPoS derivation, and broadcast.
- `ops.mjs` — operation builders.
- `client.mjs` — the `Waggle` façade over all of it.

## The honest division of labor

waggle does not claim to reimplement all of Hive.
It implements exactly the operations it broadcasts, and it records where each constant came from.
The cryptography and serialization are verified two ways: against a `dhive` test vector (WIF → `STM…` public key, offline), and byte-for-byte against a live node's `condenser_api.get_transaction_hex` (the serializer matches the chain's own bytes).
Reads run against live public nodes.
Writes are unit-tested through a mocked transport end-to-end but, as of this writing, have not been broadcast with real keys.

## Reads vs writes

Reads are simple: a JSON-RPC call to a node, with failover across the node list, honoring the two parameter conventions Hive uses — the **condenser** API takes a positional array, the **bridge** API takes a named object.
No keys are involved.

Writes are where the work is.
The `Waggle` façade keeps keys per *role* (posting for social actions, active for value) and never reads them from disk — they come from the constructor or, for the CLI, the environment.

## The write pipeline

Every write follows the same path (`Waggle.broadcast` → `buildAndSign`):

1. **Fetch fresh TaPoS.** Read the chain head to get `ref_block_num`, `ref_block_prefix`, and the head `time`.
  These anchor the transaction to a recent block (Hive's transaction-as-proof-of-stake replay protection).
2. **Set expiration.** `time + expirySeconds` (default 60s), formatted as the chain expects (ISO without milliseconds or a trailing `Z`).
  After this, the network will reject the transaction.
3. **Assemble operations.** Each is a `[name, payload]` pair from `ops.mjs`.
4. **Serialize.** `serialize.mjs` writes the transaction to graphene little-endian binary.
  Two gotchas live here: asset symbols go on the wire as the **legacy** `STEEM`/`SBD`, never `HIVE`/`HBD`; and operations are identified by a numeric variant id from a fixed table.
5. **Digest.** `sha256(chain_id ‖ serialized_tx)` — the chain id is prefixed so a signature is valid only on the chain it was made for.
6. **Sign.** secp256k1 with RFC 6979 deterministic-`k`, reduced to low-S, looped until the signature is *canonical* by graphene's rule, with a recovery id packed into the 65-byte compact signature.
7. **Broadcast.** Send the signed transaction to a node (`broadcast`), or wait for the synchronous result (`broadcastSync`).

The transaction id returned to you is the ripemd160-truncated digest of the serialized transaction.

## Why keys are role-scoped and env-only

Hive accounts have a key hierarchy; the posting key can do social things but cannot move funds, and the potential key can.
Mirroring that in the API — `transfer` requires the potential key, everything social requires posting — means a session that only posts never needs to load a key that can spend.
Keeping keys in the environment, never on disk, keeps waggle out of the business of storing secrets.
The trade-offs and operator responsibilities are spelled out in [`../../SECURITY.md`](../../SECURITY.md).

## Known limits, and why they are limits

- **No memo encryption.** Encrypted (`#`-prefixed) memos need the memo-key ECDH path, which is not implemented; transfers carry plaintext memos.
- **Single-sig.** The serializer understands `authority` structs, but the high-level API drives one key per role, not multi-sig assemblies.
- **Mainnet only.** The chain id and `STM` prefix are pinned; the testnet constants are noted as unverified in the crypto spec.
