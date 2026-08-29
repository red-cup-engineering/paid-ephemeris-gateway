# CLI reference

Complete reference for the `waggle` command.
This mirrors `man waggle` and the `--help` output; for task-focused guidance see the [how-to guides](../how-to/).

```
waggle <command> [arguments...]
waggle help | --help | -h
```

Results print to stdout as pretty-printed JSON, or as a bare string for scalar results.
Errors print to stderr prefixed with `waggle:` and exit non-zero (`0` on success).

## Environment

| Variable | Meaning |
| --- | --- |
| `WAGGLE_ACCOUNT` | default account for writes; observer for reads that accept one |
| `WAGGLE_POSTING_KEY` | WIF posting key — `vote`, `publish`, `reply`, `follow`, `reblog`, `claim` |
| `WAGGLE_ACTIVE_KEY` | WIF active key — `transfer` |
| `WAGGLE_OWNER_KEY` | WIF owner key |
| `WAGGLE_MEMO_KEY` | WIF memo key |
| `WAGGLE_NODES` | comma-separated node base URLs (else the built-in defaults) |

## Read commands (no keys)

| Command | Description |
| --- | --- |
| `globals` | dynamic global properties |
| `refblock` | `ref_block_num` / `ref_block_prefix` / chain head time |
| `account <name>` | account object |
| `content <author> <permlink>` | `condenser_api.get_content` |
| `post <author> <permlink>` | `bridge.get_post` |
| `ranked <sort> [tag] [limit]` | ranked posts (`trending`\|`hot`\|`created`\|…) |
| `posts <account> [sort] [limit]` | account posts (`blog`\|`feed`\|`posts`\|`replies`) |
| `profile <account>` | social profile |
| `followers <account> [limit]` | accounts following `<account>` |
| `following <account> [limit]` | accounts `<account>` follows |
| `follow-count <account>` | follower/following counts |
| `history <account> [limit]` | account operation history |

## Write commands (need the relevant key)

| Command | Key | Description |
| --- | --- | --- |
| `vote <author> <permlink> [weight]` | posting | vote; weight in basis points, default `10000` |
| `unvote <author> <permlink>` | posting | remove a vote (weight `0`) |
| `publish <title> <body\|-> [tag]` | posting | new top-level post; body `-` reads stdin |
| `reply <parentAuthor> <parentPermlink> <body\|->` | posting | reply; body `-` reads stdin |
| `transfer <to> <amount> [memo]` | active | transfer value, e.g. `"1.000 HIVE"`; memo is plaintext |
| `follow <account>` | posting | follow |
| `unfollow <account>` | posting | unfollow |
| `reblog <author> <permlink>` | posting | reblog to your blog |
| `claim` | posting | claim all pending rewards |

## Utility commands

| Command | Description |
| --- | --- |
| `pubkey <wif>` | derive and print the `STM` public key for a WIF, offline |
| `whoami` | configured account + derived public keys |
| `help`, `--help`, `-h` | usage summary |

## Examples

```sh
waggle account hiveio
waggle ranked trending hive 5
waggle pubkey 5J...                                # offline
WAGGLE_POSTING_KEY=5J... waggle vote bob a-post 5000
waggle publish "Hello Hive" - hive < post.md       # body from stdin
```
