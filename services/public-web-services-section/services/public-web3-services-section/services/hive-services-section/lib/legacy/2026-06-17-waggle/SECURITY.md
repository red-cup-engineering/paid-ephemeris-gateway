# Security Policy

`waggle` builds, signs, and broadcasts Hive blockchain transactions.
It therefore handles **private keys that control real on-chain accounts and value.** Read this before using it with keys that matter.

## Supported versions

`waggle` is **experimental** (`0.0.x`).
Only the current `main` is supported; there are no backported security fixes for older tags.

| Version | Supported |
| ------- | --------- |
| `0.0.x` (current `main`) | ✅ |
| anything older | ❌ |

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue for anything that could expose keys or funds.

- Preferred: email **emsenn@emsenn.net** with `waggle security` in the subject.
- Alternatively, use GitHub's [private vulnerability reporting](https://github.com/emsenn/561-group/security/advisories/new) on the repository.

Include the version/commit, a description, and a reproduction if you have one.
Expect an acknowledgement within a few days.
Because this is a pre-release research project, there is no formal SLA or bounty.

## The key-handling model

This is the part that matters.
`waggle` is deliberate about keys:

- **Keys come from the environment only.** The CLI reads `WAGGLE_POSTING_KEY`, `WAGGLE_ACTIVE_KEY`, `WAGGLE_OWNER_KEY`, and `WAGGLE_MEMO_KEY` from the process environment.
  The library takes them as constructor arguments (WIF strings or `PrivateKey` instances).
- **Keys are never written to disk** by `waggle`, and never transmitted anywhere except as the signature inside a transaction you asked it to broadcast.
- **Signing is local.** Transactions are serialized and signed in-process; the private key never leaves your machine.
  Only the resulting signed transaction is sent to a node.
- **Use the least-privileged key.** Social actions (`vote`, `publish`, `reply`, `follow`, `reblog`, `claim`) need only the **posting** key.
  Value transfers need the **potential** key.
  Do not export an active or owner key for a session that only reads or posts.

## Operator responsibilities (your threat surface, not waggle's)

- **Shell history.** Passing a WIF as a command-line argument (e.g. `waggle pubkey 5J…`) can record it in your shell history and process listing.
  Prefer the environment for secrets, and consider clearing history after.
- **Environment exposure.** Environment variables are visible to child processes and some diagnostics.
  Export keys only for as long as you need them; unset them after.
- **Node trust.** Reads and broadcasts go to remote Hive nodes over HTTPS.
  A malicious or compromised node can lie about chain state (e.g. return stale TaPoS data) or withhold your broadcast.
  Point `WAGGLE_NODES` at nodes you trust.
- **No memo encryption.** Transfer memos are sent **in plaintext** on a public chain.
  Never put a secret in a memo.

## Cryptography notes

- secp256k1, RFC 6979 deterministic-`k`, low-S, and the graphene canonical-signature rule are **hand-rolled** here as a from-the-ground-up rederivation, not a vetted crypto library.
  The signing has been checked against a `dhive` test vector and byte-for-byte against a live node's `get_transaction_hex`, but it has **not** had an independent security audit.
  Weigh that before trusting it with significant value.
- The chain id and `STM` address prefix are pinned to Hive **mainnet**.
