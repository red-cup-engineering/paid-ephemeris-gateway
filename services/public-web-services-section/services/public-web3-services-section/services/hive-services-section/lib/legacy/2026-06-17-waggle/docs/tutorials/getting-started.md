# Getting started with waggle

This tutorial takes you from a fresh checkout to your first read from the Hive blockchain and your first signed transaction.
It is **learning-oriented**: follow it start to finish and you will have seen the whole shape of waggle.
For looking things up afterwards, see the [reference](../reference/).

You will need [Node.js](https://nodejs.org/) `>=18`. waggle has **no dependencies to install** — it uses only Node built-ins.

## 1. Get waggle

From the `561-group` repository root:

```sh
pnpm install
cd apps/interface/waggle
```

Confirm it works by running the offline proof suite:

```sh
pnpm --filter @561-group/waggle test
```

## 2. Your first read (no keys needed)

Reads ask a public Hive node for data and need no keys at all.
Ask for an account:

```sh
node scripts/waggle.mjs account hiveio
```

You should see a large JSON object.
Try a couple more:

```sh
node scripts/waggle.mjs ranked trending hive 5     # five trending posts in the "hive" tag
node scripts/waggle.mjs globals                     # the chain's dynamic global properties
```

That is the whole read surface: point a command at a node and get JSON back.

## 3. Derive a public key, offline

Before signing anything, see the offline crypto work.
Given a WIF private key, waggle derives its `STM…` public key entirely on your machine — nothing is sent anywhere:

```sh
node scripts/waggle.mjs pubkey 5JxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxYourWIF
```

(Use a throwaway key — and note that a key on the command line can land in your shell history.
For real use, prefer the environment, next.)

## 4. Your first signed transaction

Writes build, sign, and broadcast a transaction.
Social actions use your **posting** key, which you provide through the environment — waggle never reads keys from disk:

```sh
export WAGGLE_ACCOUNT=your-account
export WAGGLE_POSTING_KEY=5JyourPostingWIF

node scripts/waggle.mjs vote someauthor their-permlink 5000   # vote at 50%
```

`whoami` confirms what you have configured and the public keys derived from it:

```sh
node scripts/waggle.mjs whoami
```

## 5. The same thing from code

Everything the CLI does, the library does:

```js
import { Waggle } from "@561-group/waggle";

const hive = new Waggle();                                   // reads, no keys
const [acct] = await hive.getAccounts(["hiveio"]);
console.log(acct.name);

const me = new Waggle({                                      // writes, posting key
  account: "your-account",
  keys: { posting: process.env.WAGGLE_POSTING_KEY },
});
await me.vote({ author: "someauthor", permlink: "their-permlink", weight: 5000 });
```

## Where to go next

- Do a specific task → [How-to guides](../how-to/).
- Look up every command → [CLI reference](../reference/cli.md) or `man waggle`.
- Look up the library → [Library API](../reference/library-api.md).
- Understand how signing works → [Design and the signing pipeline](../explanation/design.md).
