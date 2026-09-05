# waggle documentation

This documentation is organized by the [Diátaxis](https://diataxis.fr/) framework — four kinds of documentation that serve four distinct needs.
Pick by what you are trying to do:

| If you want to… | Read | Kind |
| --- | --- | --- |
| learn waggle by doing | [tutorials/](tutorials/) | learning-oriented |
| accomplish a specific task | [how-to/](how-to/) | task-oriented |
| look up a command, method, or option | [reference/](reference/) | information-oriented |
| understand how and why it works | [explanation/](explanation/) | understanding-oriented |

## Map

- **Tutorials** — [Getting started](tutorials/getting-started.md): from clone to your first read and your first signed transaction.
- **How-to guides** — [Read the chain](how-to/read-the-chain.md) · [Publish, vote, and transfer](how-to/publish-vote-transfer.md).
- **Reference** — [CLI](reference/cli.md) (also `man waggle`) · [Library API](reference/library-api.md) (also the types in `lib/client.d.ts`).
- **Explanation** — [Design and the signing pipeline](explanation/design.md).

## The derivation specs

Beneath the Diátaxis tree, [`dev/notes/`](dev/notes/) holds the byte-level specifications the implementation was derived from — provenance, exact constants, and flagged uncertainties.
These are reference material for implementers, not user documentation:

- [`01-crypto-signing-spec.md`](dev/notes/01-crypto-signing-spec.md)
- [`02-serialization-spec.md`](dev/notes/02-serialization-spec.md)
- [`03-rpc-read-spec.md`](dev/notes/03-rpc-read-spec.md)

## Other formats

The same material is available as a Unix manual page (`man waggle`, source [`../man/waggle.
1`](../man/waggle.
1)) and as a Texinfo/Info manual ([`waggle.texi`](waggle.texi), read with `info waggle` once installed).
