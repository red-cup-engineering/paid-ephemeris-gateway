---
name: waggle
description: "A zero-dependency Node↔Hive blockchain client, rederived from the ground up: JSON-RPC reads, and build/sign/broadcast over hand-rolled secp256k1 and graphene binary serialization, with a high-level API and CLI."
---

# @561-group/waggle

> **waggle** — a zero-dependency Node↔Hive blockchain client, rederived from the ground up.
> Named for the bees' waggle dance, the social signal by which a hive shares where to go.
> It reads Hive over JSON-RPC and it *acts* on Hive: it builds, signs, and broadcasts transactions — votes, posts, comments, follows, reblogs, transfers, reward claims — using only Node builtins.

```sh
pnpm --filter @561-group/waggle test    # offline proofs (crypto · serialize · rpc · end-to-end)
```

```sh
# reads need no keys — point the CLI at a real node:
node scripts/waggle.mjs account hiveio
node scripts/waggle.mjs ranked trending hive 5
node scripts/waggle.mjs pubkey <your-wif>     # derive the STM public key from a WIF, offline
```

## Status

**Experimental.** The cryptography and serialization are verified two ways: against the `@hiveio/dhive` test vector (WIF → `STM…` public key) offline, and against a live mainnet node's own `condenser_api.get_transaction_hex` (our serializer matches the chain byte-for-byte).
Reads are exercised against live public nodes.
Writes are implemented and unit-tested through a mocked transport end-to-end, but have not yet been broadcast with real keys — that is the next step once keys are provided.

## What it does, and the honest division of labor

This repository rederives knowledge from the ground up and keeps a zero-dependency discipline.
There *are* mature Node↔Hive libraries (`@hiveio/dhive`, `hive-tx`, `hive-js`) — every one of them an npm dependency tree. waggle depends on none of them.
Only Node builtins are used: `node:crypto` for SHA-256 / RIPEMD-160 / HMAC, `node:https` for transport.
Everything else — base58, the secp256k1 curve, the graphene serializer — is hand-rolled.

- **Crypto.** secp256k1 in BigInt: RFC6979 deterministic-k, low-S + the graphene canonical-signature loop, recovery id → the 65-byte compact signature.
  WIF decode (double-SHA-256 checksum) and `STM…` public keys (RIPEMD-160 checksum).
- **Serialization.** Graphene little-endian binary: the asset gotcha (symbols go on the wire as the legacy `STEEM`/`SBD`, never `HIVE`/`HBD`), the operation-variant id table (0–49), and the field orders for the operations we broadcast.
- **Transport / reads.** JSON-RPC 2.0 with node failover, honoring the condenser (positional array) vs bridge (named object) parameter split.
- **Pipeline.** Fetch fresh TaPoS (`ref_block_num`/`ref_block_prefix` from the head block) → assemble ops → serialize → digest (`sha256(chain_id ‖ tx)`) → sign → broadcast.

## Usage (library)

```js
import { Waggle } from "@561-group/waggle";

// reads need no keys
const hive = new Waggle();
const [acct] = await hive.getAccounts(["hiveio"]);
const trending = await hive.getRankedPosts({ sort: "trending", tag: "photography", limit: 10 });

// writes: supply WIF keys per role (posting for social, active for value)
const me = new Waggle({ account: "alice", keys: { posting: process.env.POSTING_WIF } });
await me.vote({ author: "bob", permlink: "a-post", weight: 10000 });
await me.follow("bob");
await me.post({ title: "Hello Hive", body: "# hi\nfrom waggle", tags: ["hive", "introduceyourself"] });
```

## Layout

```
lib/
  base58.mjs       Bitcoin-alphabet base58 encode/decode
  hash.mjs         sha256 / sha256d / ripemd160 (+ pure-JS fallback) / hmac-sha256
  secp256k1.mjs    BigInt curve: getPublicKey / sign (canonical, recoverable) / verify / recover
  keys.mjs         PrivateKey (WIF) and PublicKey (STM…) — decode, derive, sign, encode
  serialize.mjs    graphene binary: assets, authorities, the op table, transaction serialization
  transaction.mjs  the chain_id-prefixed signing digest, signTransaction, transactionId
  rpc.mjs          JSON-RPC transport + node failover (injectable for tests)
  chain.mjs        read methods + the ref_block (TaPoS) derivation + broadcast
  ops.mjs          high-level operation builders ([name, payload]) + permlink helpers
  client.mjs       Waggle — the top-level read + build/sign/broadcast API
bin/
  waggle.mjs       the CLI (reads need no keys; writes read WAGGLE_*_KEY from the env)
tests/
  prove-crypto · prove-serialize · prove-rpc · prove-transaction   (run by tests/_run_tests.mjs)
```

## Documentation

waggle is documented several conventional ways:

- **[`docs/`](docs/)** — a [Diátaxis](https://diataxis.fr/)-organized tree: a [tutorial](docs/tutorials/getting-started.md), [how-to guides](docs/how-to/), [reference](docs/reference/) (CLI + library API), and [explanation](docs/explanation/design.md).
- **`man waggle`** — a Unix manual page ([`man/waggle.
  1`](man/waggle.
  1), mdoc).
- **`info waggle`** — a Texinfo/Info manual ([`docs/waggle.texi`](docs/waggle.texi)).
- **`lib/client.d.ts`** — typed API surface for editors/IDEs (hover docs, autocomplete).
- **Shell completions** for bash/zsh/fish under [`completions/`](completions/).

For contributing and key-safety, see [`CONTRIBUTING.md`](CONTRIBUTING.md), [`AGENTS.md`](AGENTS.md), and [`SECURITY.md`](SECURITY.md).

### Derivation specs

The byte-level specifications the implementation was derived from (provenance, exact constants, flagged uncertainties) live under [`docs/dev/notes/`](docs/dev/notes/):

- [01-crypto-signing-spec.md](docs/dev/notes/01-crypto-signing-spec.md) — WIF, keys, secp256k1, the canonical signature.
- [02-serialization-spec.md](docs/dev/notes/02-serialization-spec.md) — graphene binary, the op table, worked example.
- [03-rpc-read-spec.md](docs/dev/notes/03-rpc-read-spec.md) — JSON-RPC, node list, the TaPoS derivation, read methods.

## Notes & limits

- **No memo encryption yet.** Transfers carry plaintext memos; encrypted (`#`-prefixed) memos are not implemented.
- **Single-sig.** One key per role; multi-sig authorities are not assembled (the serializer supports `authority` structs, the high-level API does not yet drive them).
- **Mainnet only.** The chain id and `STM` prefix are pinned to mainnet; testnet constants are noted as unverified in the crypto spec.
- The CLI reads keys from the environment (`WAGGLE_ACCOUNT`, `WAGGLE_POSTING_KEY`, `WAGGLE_ACTIVE_KEY`); it never writes them to disk.
