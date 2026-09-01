# How to read the chain

Task-oriented recipes for reading Hive with waggle.
Reads need no keys.
Each recipe shows the CLI form and the library form.

## Choose which nodes to use

The CLI uses a curated default node list.
Override it with `WAGGLE_NODES` (comma-separated), or pass `nodes` to the constructor:

```sh
export WAGGLE_NODES="https://api.hive.blog,https://anyx.io"
```

```js
const hive = new Waggle({ nodes: ["https://api.hive.blog", "https://anyx.io"] });
```

## Fetch an account

```sh
node scripts/waggle.mjs account hiveio
```

```js
const acct = await hive.getAccount("hiveio");        // single object, or undefined
const many = await hive.getAccounts(["alice", "bob"]); // array
```

## Read a post or comment

```sh
node scripts/waggle.mjs content author the-permlink     # condenser_api.get_content
node scripts/waggle.mjs post author the-permlink         # bridge.get_post
```

```js
const c = await hive.getContent("author", "the-permlink");
const p = await hive.getPost("author", "the-permlink");
```

## List posts

```sh
node scripts/waggle.mjs ranked trending photography 10   # ranked feed, by tag
node scripts/waggle.mjs posts alice blog 10              # a single account's posts
```

```js
const trending = await hive.getRankedPosts({ sort: "trending", tag: "photography", limit: 10 });
const blog = await hive.getAccountPosts({ account: "alice", sort: "blog", limit: 10 });
```

`sort` for `ranked` is `trending | hot | created | …`; for `posts` it is `blog | feed | posts | replies`.

## Profiles, follows, and history

```sh
node scripts/waggle.mjs profile alice
node scripts/waggle.mjs followers alice 50
node scripts/waggle.mjs following alice 50
node scripts/waggle.mjs follow-count alice
node scripts/waggle.mjs history alice 100
```

```js
await hive.getProfile("alice");
await hive.getFollowCount("alice");
await hive.getAccountHistory("alice", -1, 100);
```

## Get the reference block (TaPoS)

Every write is anchored to a recent block.
You rarely need this directly — the write pipeline fetches it for you — but it is available:

```sh
node scripts/waggle.mjs refblock
```

```js
const { ref_block_num, ref_block_prefix, time } = await hive.getReferenceBlockData();
```
