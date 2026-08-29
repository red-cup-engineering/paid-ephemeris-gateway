#!/usr/bin/env node
// waggle CLI — drive the Hive client from the shell. Reads need no keys; writes read the relevant
// key from the environment:
//   WAGGLE_ACCOUNT       default account for write commands and observer for reads
//   WAGGLE_POSTING_KEY   WIF posting key  (vote, publish, reply, follow, reblog, claim)
//   WAGGLE_ACTIVE_KEY    WIF active key   (transfer)
//   WAGGLE_NODES         optional comma-separated node base URLs (else the curated defaults)
import { Waggle } from "../lib/client.mjs";
import { PrivateKey } from "../lib/keys.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0];
const a = argv.slice(1);

const env = process.env;
const nodes = env.WAGGLE_NODES ? env.WAGGLE_NODES.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

function client() {
  return new Waggle({
    nodes,
    account: env.WAGGLE_ACCOUNT,
    keys: {
      posting: env.WAGGLE_POSTING_KEY,
      active: env.WAGGLE_ACTIVE_KEY,
      owner: env.WAGGLE_OWNER_KEY,
      memo: env.WAGGLE_MEMO_KEY,
    },
  });
}

const out = (v) => console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));
const die = (msg) => { console.error(`waggle: ${msg}`); process.exit(1); };

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}
// A body argument of "-" means read the body from stdin.
async function bodyArg(v) { return v === "-" ? (await readStdin()).trim() : v; }

const HELP = `waggle — a zero-dependency Node↔Hive client

reads (no keys needed):
  globals                                 dynamic global properties
  refblock                                ref_block_num / ref_block_prefix / chain time
  account <name>                          account object
  content <author> <permlink>             condenser_api.get_content
  post <author> <permlink>                bridge.get_post
  ranked <sort> [tag] [limit]             bridge.get_ranked_posts (sort: trending|hot|created|...)
  posts <account> [sort] [limit]          bridge.get_account_posts (sort: blog|feed|posts|replies)
  profile <account>                       bridge.get_profile
  followers <account> [limit]
  following <account> [limit]
  follow-count <account>
  history <account> [limit]

writes (need the relevant key in the environment):
  vote <author> <permlink> [weight]       weight basis points, default 10000 (100%)
  unvote <author> <permlink>
  publish <title> <body|-> [tag]          new top-level post (body "-" reads stdin)
  reply <parentAuthor> <parentPermlink> <body|->
  transfer <to> <amount> [memo]           amount like "1.000 HIVE" (needs ACTIVE key)
  follow <account>
  unfollow <account>
  reblog <author> <permlink>
  claim                                   claim all pending rewards

util:
  pubkey <wif>                            derive the STM public key from a WIF (offline)
  whoami                                  configured account + derived public keys`;

try {
  switch (cmd) {
    // --- reads ---
    case "globals": out(await client().getDynamicGlobalProperties()); break;
    case "refblock": out(await client().getReferenceBlockData()); break;
    case "account": out(await client().getAccount(a[0] || die("account <name>"))); break;
    case "content": out(await client().getContent(a[0], a[1])); break;
    case "post": out(await client().getPost(a[0], a[1])); break;
    case "ranked": out(await client().getRankedPosts({ sort: a[0] || "trending", tag: a[1] || "", limit: a[2] ? +a[2] : undefined })); break;
    case "posts": out(await client().getAccountPosts({ account: a[0] || die("posts <account>"), sort: a[1] || "blog", limit: a[2] ? +a[2] : undefined })); break;
    case "profile": out(await client().getProfile(a[0] || die("profile <account>"))); break;
    case "followers": out(await client().getFollowers(a[0] || die("followers <account>"), null, "blog", a[1] ? +a[1] : 100)); break;
    case "following": out(await client().getFollowing(a[0] || die("following <account>"), null, "blog", a[1] ? +a[1] : 100)); break;
    case "follow-count": out(await client().getFollowCount(a[0] || die("follow-count <account>"))); break;
    case "history": out(await client().getAccountHistory(a[0] || die("history <account>"), -1, a[1] ? +a[1] : 100)); break;

    // --- writes ---
    case "vote": out(await client().vote({ author: a[0], permlink: a[1], weight: a[2] ? +a[2] : 10000 })); break;
    case "unvote": out(await client().vote({ author: a[0], permlink: a[1], weight: 0 })); break;
    case "publish": out(await client().post({ title: a[0], body: await bodyArg(a[1]), tags: a[2] ? [a[2]] : ["hive"] })); break;
    case "reply": out(await client().comment({ parentAuthor: a[0], parentPermlink: a[1], body: await bodyArg(a[2]) })); break;
    case "transfer": out(await client().transfer({ to: a[0], amount: a[1], memo: a[2] || "" })); break;
    case "follow": out(await client().follow(a[0] || die("follow <account>"))); break;
    case "unfollow": out(await client().unfollow(a[0] || die("unfollow <account>"))); break;
    case "reblog": out(await client().reblog({ author: a[0], permlink: a[1] })); break;
    case "claim": out(await client().claimRewards()); break;

    // --- util ---
    case "pubkey": out(PrivateKey.from(a[0] || die("pubkey <wif>")).createPublic().toString()); break;
    case "whoami": out({ account: env.WAGGLE_ACCOUNT || null, publicKeys: client().publicKeys() }); break;

    case "help": case "--help": case "-h": case undefined: out(HELP); break;
    default: die(`unknown command "${cmd}" — try \`waggle help\``);
  }
} catch (err) {
  die(err.message);
}
