# Contributing to waggle

Thanks for looking at `waggle`.
This is a research package inside the `561-group` monorepo, and it keeps a few disciplines that are stricter than a typical Node project.
Read this before opening a change.

## The two disciplines

1. **Zero runtime dependencies.** `waggle` uses **only Node built-ins** — `node:crypto` for SHA-256 / RIPEMD-160 / HMAC, `node:https` for transport.
  Everything else (base58, the secp256k1 curve, the graphene serializer) is hand-rolled.
  A change that adds an npm runtime dependency will not be accepted; find a way to derive it instead.
2. **Rederive from the ground up.** The repository rederives knowledge rather than importing it as received fact.
  When you implement something, derive it from a stated source and record that provenance (see `docs/dev/notes/`), including the constants you pinned and any uncertainty you carried.

## Setup

```sh
# from the repo root — waggle has no install step of its own (zero deps)
pnpm install                         # wires the workspace
```

Node `>=18` is required (see `engines` in `package.json`).

## Running the tests

```sh
pnpm --filter @561-group/waggle test     # or, from this directory:
node tests/_run_tests.mjs
```

The suite is **offline**: crypto is checked against a known `dhive` test vector, and the serializer is checked byte-for-byte against a recorded `get_transaction_hex`.
The RPC layer is exercised through an injected mock transport — tests never hit the network.
Keep it that way: if a change needs network behavior, drive it through the injectable `transport`.

## Code style

- ES modules (`.mjs`), Node built-ins only.
- Match the surrounding code: small focused modules under `lib/`, one concern each (`lib/keys.mjs`, `lib/serialize.mjs`, …); concise top-of-file and inline comments that explain *why*, not *what*.
- Public API changes belong in `lib/client.mjs` (the `Waggle` class) and must be reflected in the type declarations (`lib/client.d.ts`) and the docs (below).

## Keeping the docs honest

Documentation here is part of the change, not an afterthought.
When you touch the public surface, update the artifact that mirrors it:

| You changed… | Also update… |
| --- | --- |
| a CLI command / flag | `man/waggle.1`, the `HELP` string in `scripts/waggle.mjs`, `docs/waggle.texi`, the completions in `completions/` |
| the library API | `lib/client.d.ts` (types + TSDoc), `docs/reference/library-api.md` |
| behavior / limits | `README.md`, `CHANGELOG.md`, and `SECURITY.md` if keys/safety are involved |

Render checks (use whichever you have installed):

```sh
mandoc -T lint man/waggle.1        # man page lints clean
makeinfo docs/waggle.texi          # Texinfo builds
node --check lib/client.mjs        # source parses
```

## Commits and pull requests

- Write [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `feat(cli): add reblog command`, `fix(serialize): correct asset symbol on the wire`, `docs(man): document WAGGLE_NODES`.
  The `CHANGELOG.md` is derived from these.
- Keep each change focused; add or update a test that proves it.
- Note any new flagged uncertainty (a pinned constant you could not verify) in both the relevant `docs/dev/notes/` spec and the PR description.

## Security

Do **not** report a vulnerability in a public issue or PR.
See [`SECURITY.md`](SECURITY.md).
Never commit a real WIF, key, or seed — not in code, tests, fixtures, or examples.
