# Library API reference

The public entry point is the `Waggle` class.
The authoritative, machine-checked types live in [`lib/client.d.ts`](../../lib/client.d.ts) — your editor reads them for hover docs and autocomplete.
This page is the prose mirror.

```js
import { Waggle, ops, PrivateKey } from "@561-group/waggle";
// `import Waggle from "@561-group/waggle"` (default) also works.
```

## `new Waggle(options?)`

All options are optional; with no keys, only reads work.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `nodes` | `string[]` | curated list | node base URLs, tried in order |
| `timeout` | `number` | — | per-request timeout (ms) |
| `transport` | `object` | built-in HTTPS | injectable transport (tests) |
| `account` | `string` | — | default author/voter; observer for reads |
| `keys` | `{ posting?, active?, owner?, memo? }` | `{}` | WIF strings or `PrivateKey`s |
| `chainId` | `string` | Hive mainnet | chain id override |
| `expirySeconds` | `number` | `60` | transaction lifetime before expiration |

## Reads (no keys)

| Method | Returns |
| --- | --- |
| `getDynamicGlobalProperties()` | global properties |
| `getReferenceBlockData()` | `{ ref_block_num, ref_block_prefix, time }` |
| `getAccounts(names)` | account objects (array) |
| `getAccount(name)` | one account, or `undefined` |
| `getContent(author, permlink)` | post/comment (`get_content`) |
| `getPost(author, permlink, observer?)` | post (bridge) |
| `getRankedPosts({ sort, tag, limit, observer })` | ranked posts |
| `getAccountPosts({ account, sort, limit, observer })` | account posts |
| `getProfile(account, observer?)` | profile |
| `getFollowCount(account)` | counts |
| `getFollowers(account, start, type, limit)` | followers |
| `getFollowing(account, start, type, limit)` | following |
| `getAccountHistory(account, start, limit)` | history |

## Writes

Each returns `{ id, tx }` — the transaction id and the signed transaction.
Social actions use the posting key; `transfer` uses the potential key.

| Method | Key | Notes |
| --- | --- | --- |
| `vote({ author, permlink, weight=10000, voter })` | posting | weight in basis points |
| `post({ title, body, tags=["hive"], permlink, author, beneficiaries, json_metadata })` | posting | `tags[0]` = category |
| `comment({ parentAuthor, parentPermlink, body, author, permlink, json_metadata })` | posting | reply |
| `follow(following, follower?)` | posting | |
| `unfollow(following, follower?)` | posting | |
| `reblog({ author, permlink, account })` | posting | |
| `transfer({ to, amount, memo="", from })` | **active** | `amount` like `"1.000 HIVE"`; memo plaintext |
| `claimRewards(account?)` | posting | reads balances, then claims |

## The pipeline (lower level)

| Method | Returns | Notes |
| --- | --- | --- |
| `buildAndSign(operations, role="posting")` | signed tx | fresh TaPoS + expiration, signed |
| `broadcast(operations, role="posting")` | `{ id, tx }` | build, sign, send |
| `broadcastSync(operations, role="posting")` | `{ ...result, tx }` | waits for the sync result |
| `requireKey(role)` | `PrivateKey` | throws if the role key is missing |
| `publicKeys()` | `{ role: "STM…" }` | public key per configured role |

## Other exports

- **`ops`** — low-level operation builders returning `[name, payload]` (`ops.vote`, `ops.comment`, `ops.transfer`, …), plus `ops.slugify(title)` and `ops.commentPermlink(parentAuthor, parentPermlink, salt)`.
- **`PrivateKey`** — `PrivateKey.from(wif)`, `.createPublic()`, `.toString()`.

## Example

```js
import { Waggle } from "@561-group/waggle";

const me = new Waggle({
  account: "alice",
  keys: { posting: process.env.WAGGLE_POSTING_KEY },
});

const { id } = await me.vote({ author: "bob", permlink: "a-post", weight: 10000 });
console.log("voted:", id);
```
