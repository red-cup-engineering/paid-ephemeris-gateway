# How to publish, vote, and transfer

Task-oriented recipes for **writes** — actions that build, sign, and broadcast a transaction.
Each needs the relevant key in the environment (CLI) or constructor (library).

> **Keys.** Social actions use the **posting** key (`WAGGLE_POSTING_KEY`).
> Value transfers use the **potential** key (`WAGGLE_ACTIVE_KEY`). waggle never writes keys to disk; see [`../../SECURITY.md`](../../SECURITY.md).

Set up once for the CLI examples:

```sh
export WAGGLE_ACCOUNT=alice
export WAGGLE_POSTING_KEY=5J...    # for everything except transfer
export WAGGLE_ACTIVE_KEY=5K...     # only needed for transfer
```

…or once for the library examples:

```js
import { Waggle } from "@561-group/waggle";
const me = new Waggle({
  account: "alice",
  keys: { posting: process.env.WAGGLE_POSTING_KEY, active: process.env.WAGGLE_ACTIVE_KEY },
});
```

## Vote and unvote

Weight is in basis points: `10000` is 100%, `-10000` a full downvote.

```sh
node scripts/waggle.mjs vote bob a-post 5000      # 50%
node scripts/waggle.mjs unvote bob a-post         # remove the vote
```

```js
await me.vote({ author: "bob", permlink: "a-post", weight: 5000 });
await me.vote({ author: "bob", permlink: "a-post", weight: 0 });
```

## Publish a post

`tags[0]` becomes the post's category.
If you do not give a permlink, waggle slugs the title and appends a uniquifier so re-posts do not collide.

```sh
node scripts/waggle.mjs publish "Hello Hive" "# hi\nfrom waggle" introduceyourself
node scripts/waggle.mjs publish "From a file" - hive < post.md     # body "-" reads stdin
```

```js
await me.post({
  title: "Hello Hive",
  body: "# hi\nfrom waggle",
  tags: ["introduceyourself", "hive"],
});
```

## Reply

```sh
node scripts/waggle.mjs reply bob a-post "good post"
node scripts/waggle.mjs reply bob a-post - < reply.md             # body from stdin
```

```js
await me.comment({ parentAuthor: "bob", parentPermlink: "a-post", body: "good post" });
```

## Follow, unfollow, reblog

```sh
node scripts/waggle.mjs follow bob
node scripts/waggle.mjs unfollow bob
node scripts/waggle.mjs reblog bob a-post
```

```js
await me.follow("bob");
await me.unfollow("bob");
await me.reblog({ author: "bob", permlink: "a-post" });
```

## Transfer value (potential key)

The amount is a string with its symbol.
The memo is **plaintext** — never put a secret in it.

```sh
node scripts/waggle.mjs transfer bob "1.000 HIVE" "thanks"
```

```js
await me.transfer({ to: "bob", amount: "1.000 HIVE", memo: "thanks" });
```

## Claim rewards

```sh
node scripts/waggle.mjs claim
```

```js
await me.claimRewards();   // reads pending balances, then claims them
```

## Lower-level: broadcast arbitrary operations

When a helper does not exist, assemble operations yourself and broadcast them.
The pipeline fetches fresh TaPoS, sets expiration, signs with the role key, and sends:

```js
import { Waggle, ops } from "@561-group/waggle";
const me = new Waggle({ account: "alice", keys: { posting: process.env.WAGGLE_POSTING_KEY } });

const { id } = await me.broadcast([
  ops.vote({ voter: "alice", author: "bob", permlink: "a-post", weight: 10000 }),
]);
console.log("broadcast", id);
```
