# Changelog

All notable changes to `@561-group/waggle` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] — unreleased

### Added

- **Crypto.** Hand-rolled secp256k1 over `BigInt` (`lib/secp256k1.mjs`): `getPublicKey`, recoverable canonical `sign` (RFC 6979 deterministic-`k`, low-S plus the graphene canonical-signature loop, recovery id), `verify`, `recover`.
  WIF and `STM…` key handling in `lib/keys.mjs` (`PrivateKey`, `PublicKey`), with base58 (`lib/base58.mjs`) and the hash primitives (`lib/hash.mjs`: sha256 / sha256d / ripemd160 with a pure-JS fallback / hmac-sha256).
- **Serialization.** Graphene little-endian binary (`lib/serialize.mjs`): assets (the legacy `STEEM`/`SBD` wire symbols), authority structs, the operation-variant id table, and transaction serialization.
- **Signing pipeline.** The `chain_id`-prefixed signing digest, `signTransaction`, and `transactionId` (`lib/transaction.mjs`).
- **Transport / reads.** JSON-RPC 2.0 transport with node failover (`lib/rpc.mjs`, injectable for tests) honoring the condenser positional vs bridge named-object split, and the read layer plus TaPoS derivation and broadcast (`lib/chain.mjs`).
- **High-level API.** The `Waggle` class (`lib/client.mjs`): reads, the build/sign/broadcast pipeline, and helpers (`vote`, `post`, `comment`, `follow`, `reblog`, `transfer`, `claimRewards`), with operation builders in `lib/ops.mjs`.
- **CLI.** `scripts/waggle.mjs` — reads need no keys; writes read `WAGGLE_*` keys from the environment.
- **Tests.** Offline proof suites for crypto, serialize, rpc, and end-to-end transaction assembly (`tests/`, run by `tests/_run_tests.mjs`).
- **Documentation.** `man/waggle.
  1` (mdoc) manual page; Texinfo manual; a Diátaxis `docs/` tree; shell completions; and the conventional `CONTRIBUTING.md`, `SECURITY.md`, and `AGENTS.md`.

### Known limits

- No memo encryption — transfers carry plaintext memos.
- Single-signature authorities only.
- Mainnet only — the chain id and `STM` prefix are pinned; testnet constants are unverified.
- Writes are unit-tested through a mocked transport but have not been broadcast with real keys.

[Unreleased]: https://github.com/emsenn/561-group/commits/main
[0.0.1]: https://github.com/emsenn/561-group/releases/tag/waggle-v0.0.1
