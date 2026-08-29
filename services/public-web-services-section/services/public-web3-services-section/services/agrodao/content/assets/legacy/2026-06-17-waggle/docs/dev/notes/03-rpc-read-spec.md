# SPEC — Hive blockchain JSON-RPC client, READ side (pure JS, Node builtins)

> Provenance: from the Hive developer docs (`developers.hive.io`), the condenser API reference, and the official serialize-and-sign tutorial.
> Covers the read side plus the read-derived inputs needed to assemble a transaction (TaPoS).
> Implemented in `lib/rpc.mjs` (transport + failover) and `lib/chain.mjs` (read methods + ref_block derivation).
> Flags **[UNCERTAIN]**.

---

## 1. JSON-RPC 2.0 request envelope

```json
{ "jsonrpc": "2.0", "method": "<api>.<method>", "params": <array-or-object>, "id": <number> }
```

`params` shape depends on the API namespace — the single most important compatibility rule:

| API namespace | params style | example |
|---|---|---|
| `condenser_api` | **positional array** (legacy) | `["alice", -1, 1000]` |
| `bridge` | **named object** | `{"sort":"trending","tag":""}` |
| `database_api` | **named object** | `{"accounts":["alice"]}` |
| `account_history_api` | **named object** | `{"account":"alice","start":-1,"limit":1000}` |

```json
{"jsonrpc":"2.0","method":"condenser_api.get_accounts","params":[["hiveio"]],"id":1}
{"jsonrpc":"2.0","method":"bridge.get_ranked_posts","params":{"sort":"trending","tag":"","observer":"alice"},"id":1}
```
Note the double-bracket `[["hiveio"]]`: the first positional param is itself an array of names.
For no-arg condenser methods, always send `"params": []`.

---

## 2. Transport, errors, failover

- **POST** to the node base URL over HTTPS (RPC served at root `/`).
  Header `Content-Type: application/json`.
  Body = the JSON-RPC object.
  Use `node:https`.
- Success: `{ "jsonrpc":"2.0", "id":1, "result": <...> }`.
- Error: `{ "jsonrpc":"2.0", "id":1, "error": { "code", "message", "data" } }` — often with HTTP `200`.
  Errors surface three ways, check all: (1) network/transport failure, (2) non-2xx HTTP, (3) a JSON-RPC `error` object on HTTP 200. **[UNCERTAIN]** numeric `error.code` values are not standardized across node implementations — treat `error` presence as the signal, don't branch on codes.

**Failover strategy:** ordered list of node base URLs; per request, try nodes in order until one returns a usable `result`.
Per-attempt timeout ~8–10s via `AbortController`/socket timeout.
Retry-next-node on: network failure, non-2xx, malformed body.
For JSON-RPC `error` objects — some are node-specific (behind/plugin-disabled/overload, worth retrying), others request-specific (bad params/unknown account, fail identically everywhere); since codes are unreliable, default to retry next node up to N nodes, then surface the last error.
Rotate the starting node / promote last-good to front.
Back off on repeated `429`/`503` from a node.

---

## 3. Curated public mainnet API nodes

```
https://api.hive.blog          (@blocktrades)
https://api.deathwing.me       (@deathwing)
https://api.openhive.network   (@gtg)
https://anyx.io                (@anyx)
https://hive-api.arcange.eu    (@arcange)
https://techcoderx.com         (@techcoderx)
https://rpc.mahdiyari.info     (@mahdiyari)
https://api.c0ff33a.uk         (@c0ff33a)
```
Alternates: `https://rpc.ausbit.dev`, `https://hive.roelandp.nl`, `https://hived.emre.sh`, `https://api.hive.blue`, `https://hive-api.
3speak.tv`, `https://hiveapi.actifit.io`.

**[UNCERTAIN]** Node availability and which plugin APIs each enables drift over time; failover routes around a node with a given plugin disabled.

---

## 4. Methods we need

### 4.1 `condenser_api.get_dynamic_global_properties` + the TaPoS derivation

```json
{"jsonrpc":"2.0","method":"condenser_api.get_dynamic_global_properties","params":[],"id":1}
```
Needed fields: `head_block_number` (int), `head_block_id` (hex string), `time` (ISO-8601 UTC, no `Z`).
Use chain `time` (not local clock) as the basis for transaction `expiration`.

**TaPoS reference fields (computed purely from the read result):**
```
ref_block_num    = head_block_number & 0xffff
ref_block_prefix = readUInt32LE( bytesFromHex(head_block_id), offset = 4 )
                 = Buffer.from(head_block_id, 'hex').readUInt32LE(4)
```
The `head_block_id` first 4 bytes are the block number big-endian; the **next** 4 bytes are read as a little-endian uint32.

**Worked example:** `head_block_number = 0x057B8D48 = 91983176`, `head_block_id` begins `00112233 44556677 …`.
Then `ref_block_num = 0x8D48 = 36168`; `ref_block_prefix` = bytes `44 55 66 77` read LE = `0x77665544 = 2003195204`.
(This derivation is the load-bearing, firmly-confirmed part — straight from the official serialize-and-sign tutorial.)

### 4.2 `condenser_api.get_accounts`

```json
{"jsonrpc":"2.0","method":"condenser_api.get_accounts","params":[["hiveio","alice"]],"id":1}
```
Optional 2nd boolean for delayed-votes. **Result:** array (one per existing name; unknown names omitted — map by `name`, don't assume index alignment).
Each account: `name`, `owner`/`active`/ `posting` (authority objects with `key_auths` = arrays of `[pubKey, weight]`), `memo_key`, `json_metadata` & `posting_json_metadata` (**stringified JSON — parse again**), `balance`, `hbd_balance`, `vesting_shares` (**asset strings like `"1234.567 HIVE"` — parse amount+symbol**), `reputation`, `created`, etc.

### 4.3 Account history (two equivalent APIs)

`condenser_api.get_account_history` (positional): `["alice", -1, 1000, low?, high?]
`.
`start=-1` = most recent. **Result:** array of `[seq, entry]`; `entry.op` is `["<op_name>", {...payload}]`.

`account_history_api.get_account_history` (named): `{"account":"alice","start":-1,"limit":1000,"include_reversible":true}`. **Result:** object with `history` array of `[seq, entry]`. **[UNCERTAIN]** `op` here is typically `{"type":..,"value":..}
` (object form) vs condenser's `[name, payload]` — normalize internally; confirm live.
Operation filter bit indices are enum-ordered and not fully enumerated — verify before use.

### 4.4 Broadcast (write; spec'd for completeness)

`condenser_api.broadcast_transaction` — param `[transaction]`; **Result** `{}` on mempool accept.
`condenser_api.broadcast_transaction_synchronous` — same param, blocks; **Result** `{ id, block_num, trx_num, expired }`.

Transaction object (all declared required fields): `ref_block_num` (uint16), `ref_block_prefix` (uint32), `expiration` (ISO-8601, no `Z`), `operations` (array of `[name, payload]`), `extensions` (`[]`), `signatures` (hex strings).
Expiration from chain `time` + window (tutorial uses 60s): `new Date(base + 60000).toISOString().slice(0, -5)` → `"YYYY-MM-DDTHH:MM:SS"`.

### 4.5 Single post — legacy vs bridge

`condenser_api.get_content` (positional `[author, permlink]`) — comment object: `author`, `permlink`, `parent_author`, `parent_permlink`, `category`, `title`, `body`, `json_metadata` (stringified), `created`, `children`, `net_votes`, `pending_payout_value`, `active_votes`, … **Non-existent post → object with empty `author`, not an error** (check `author`/`permlink`).

`bridge.get_post` (named `{author, permlink, observer?}
`) — Hivemind-shaped: `author`, `permlink`, `category`, `title`, `body`, `json_metadata` (**often already an object**), `created`, `children`, `payout`, `pending_payout_value`, `stats`, `active_votes`, `author_reputation`, `community`/`community_title`, `url`. **[UNCERTAIN]** bridge returns json_metadata parsed; handle both (string → JSON.parse).

### 4.6 `bridge.get_ranked_posts`

`{sort, tag?, observer?, start_author?, start_permlink?, limit?}
`.
`sort` ∈ `trending`, `hot`, `created`, `promoted`, `payout`, `payout_comments`, `muted`.
`tag` = a tag / community (`hive-xxxxx`) / `""` for global. **Result:** array of post objects.
Paginate by feeding the last element's `author`/`permlink` as `start_author`/`start_permlink`. **[UNCERTAIN]** limit max ~100.

### 4.7 `bridge.get_account_posts`

`{sort, account, observer?, start_author?, start_permlink?, limit?}
`.
`sort` ∈ `blog` (posts + reblogs), `feed` (followed accounts), `posts` (originals only), `replies`, `payout`. **Result:** array of post objects; same cursor pagination.

### 4.8 `bridge.get_profile`

`{account, observer?}
`. **Result:** `{id, name, created, reputation, metadata:{profile:{name, about, profile_image, cover_image, location, website}}, stats:{rank, followers, following}, active}`.
`stats.followers`/`following` give counts directly.

### 4.9 `condenser_api.get_follow_count`

`[account]` → `{account, follower_count, following_count}`.

### 4.10 `condenser_api.get_followers` / `get_following`

`[account, start, type, limit]`.
`start` = account name to start after (`null`/`""` first page).
`type` normally `"blog"` (also `"ignore"` for mutes).
`limit` ≤ 1000. **Result:** array of `{follower, following, what:[...]}
`.
Paginate by passing the last row's account as `start` (inclusive cursor — drop the first element of subsequent pages). **[UNCERTAIN]** cursor inclusivity and extra `type` strings — confirm live.
For counts, prefer `bridge.get_profile.stats`.

---

## 5. Permlink slug rules & comment-permlink generation

**[UNCERTAIN]** — assembled from chain behavior + library convention.
Post slug from a title: lowercase; allowed `[a-z0-9-]`; spaces/disallowed runs → single hyphens; trim leading/trailing hyphens; empty result is invalid (fall back to a generated id); max length 256; uniqueness is per-author.

Comment/reply permlink (hive-js/condenser convention): `re-<parent_author>-<parent_permlink>-<timestamp>` (parent_author `@`-stripped; timestamp a current-time component for uniqueness), then slug-normalized + truncated. **Simplest correct default for programmatic comments:** a random base-36 string (`Math.random().toString(36).substring(2)`), which the official tutorial uses — sidesteps slug rules entirely.

---

## 6. `json_metadata` conventions for posts

Stored on-chain as **stringified JSON** (stringify on write; condenser returns it stringified, bridge parsed).
Conventional fields:
```json
{ "app":"myapp/1.0.0", "format":"markdown", "tags":["hive","photography"],
  "image":["https://…/first.jpg"], "users":["alice"], "links":["https://…"],
  "description":"preview summary", "canonical_url":"https://…/@author/permlink" }
```
- `tags` — lowercase slug strings; **the first tag is conventionally the post's `parent_permlink` / category** in the `comment` op for a top-level post (empty `parent_author`, first tag as `parent_permlink`).
- `image` — first is the cover/thumbnail.
  Minimal valid metadata = `{"tags":["…"]}`.
- **[UNCERTAIN]** exact key set is convention; the chain only requires valid JSON within the size limit, and front-ends read/write slightly different optional keys.

---

## Summary of flagged uncertainties

1. JSON-RPC numeric error codes not standardized — branch on `error` presence, not code.
2. Which plugin APIs each node enables varies — rely on failover.
3. `op` shape differs: condenser `[name, payload]` vs account_history_api `{type, value}` — verify live.
4. Operation filter bit indices enum-ordered, not enumerated here — verify before use.
5. bridge returns json_metadata parsed; condenser stringified — handle both.
6. `limit` maxima and follower-cursor inclusivity are conventional — confirm live.
7. Permlink slug grammar / `re-…` pattern are convention, not a single formal spec.
8. json_metadata key set is convention; chain enforces only valid JSON + size.
