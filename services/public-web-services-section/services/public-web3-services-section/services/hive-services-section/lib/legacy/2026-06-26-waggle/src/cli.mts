#!/usr/bin/env node
// waggle CLI — the Hive+ledger compound, driven from the shell.
//
//   waggle sync <account> [--node URL]        fetch + book + reconcile; print summary (the headline)
//   waggle balances <account>                 print persisted balances (no network)
//   waggle key set <account> <role> [--encrypt] [--passphrase-stdin]
//                                             read a WIF on stdin and store it
//   waggle key derive <account> --save=active,posting [--encrypt --passphrase-stdin]
//                                             read a MASTER PASSWORD on stdin, derive the
//                                             named operational keys, store them, and discard
//                                             the password (never written — keep it off the box)
//   waggle key status <account>               role coverage (absent/plaintext/encrypted per role)
//   waggle crypto self-test                   round-trip the at-rest encryption
//
// Secrets are NEVER passed on argv and NEVER printed. `key set` reads the WIF
// from stdin (line 1); with --encrypt --passphrase-stdin it reads the
// passphrase from stdin line 2.
//
// Environment variables:
//   WAGGLE_NODES   optional comma-separated Hive node base URLs (else hive-computer defaults)
//   WAGGLE_ROOT    optional key-store root (else ~/.config/blockchain/hive)
import { HiveComputer } from "@emsenn/computing-with-hive/client";
import { deriveRoleKey, fetchAuthorities } from "@emsenn/computing-with-hive/wallet";
import { PrivateKey } from "@emsenn/computing-with-hive/codecs";
import { syncAccount, loadBalances } from "./sync.mjs";
import { setKey, loadKey, roleStatus, KEYSTORE_ROLES, type KeystoreRole } from "./keystore.mjs";
import { cryptoSelfTest } from "./crypto.mjs";

const argv = process.argv.slice(2);

const out = (v: unknown): void => console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));
const die = (msg: string): never => { console.error(`waggle: ${msg}`); process.exit(1); };

const env = process.env;
const root = env["WAGGLE_ROOT"] || undefined;

function nodesFrom(flagNode: string | undefined): readonly string[] | undefined {
  if (flagNode) return [flagNode];
  if (env["WAGGLE_NODES"]) return env["WAGGLE_NODES"].split(",").map((s) => s.trim()).filter(Boolean);
  return undefined;
}

/** Pull `--flag value` out of an argv slice, returning the value and the remaining positionals. */
function takeFlag(args: string[], flag: string): { value: string | undefined; rest: string[] } {
  const i = args.indexOf(flag);
  if (i === -1) return { value: undefined, rest: args };
  const value = args[i + 1];
  return { value, rest: [...args.slice(0, i), ...args.slice(i + 2)] };
}

function hasFlag(args: string[], flag: string): { present: boolean; rest: string[] } {
  const i = args.indexOf(flag);
  if (i === -1) return { present: false, rest: args };
  return { present: true, rest: [...args.slice(0, i), ...args.slice(i + 1)] };
}

/** Like takeFlag but also accepts the `--flag=value` form. */
function takeEqFlag(args: string[], flag: string): { value: string | undefined; rest: string[] } {
  const i = args.findIndex((a) => a.startsWith(`${flag}=`));
  if (i !== -1) return { value: args[i]!.slice(flag.length + 1), rest: [...args.slice(0, i), ...args.slice(i + 1)] };
  return takeFlag(args, flag);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function cmdSync(args: string[]): Promise<number> {
  const { value: node, rest } = takeFlag(args, "--node");
  const account = rest[0];
  if (!account) return die("sync <account> — the Hive account to sync");
  const nodes = nodesFrom(node);
  const client = new HiveComputer({ ...(nodes !== undefined ? { nodes } : {}) });
  const result = await syncAccount({ client, account, ...(root !== undefined ? { root } : {}) });
  out(`@${result.account} — synced ${result.opsFetched} new op(s) over ${result.pagesFetched} page(s), lastSeq=${result.lastSeq}`);
  out(`transactions=${result.transactionsTotal}  unmapped=${result.unmappedTotal}`);
  out("");
  out("balances:");
  for (const b of result.balances) out(`  ${b}`);
  out("");
  out(`reconciliation: ${result.reconcile.reconciled ? "RECONCILED" : "NOT reconciled"}`);
  for (const l of result.reconcile.lines) {
    out(`  ${l.reconciled ? "ok  " : "DIFF"}  ${l.account}  booked ${l.booked}  actual ${l.actual}${l.reconciled ? "" : `  delta ${l.delta}`}`);
  }
  return result.reconcile.reconciled ? 0 : 2;
}

function cmdBalances(args: string[]): number {
  const account = args[0];
  if (!account) return die("balances <account>");
  const loaded = loadBalances(account, root);
  if (!loaded) { console.error(`waggle: no persisted ledger for @${account}; run \`waggle sync ${account}\` first`); return 1; }
  out(`@${account} — lastSeq=${loaded.lastSeq}  unmapped=${loaded.unmappedCount}`);
  for (const b of loaded.balances) out(`  ${b}`);
  return 0;
}

function isRole(s: string): s is KeystoreRole {
  return (KEYSTORE_ROLES as readonly string[]).includes(s);
}

async function cmdKeySet(args: string[]): Promise<number> {
  const { present: encrypt, rest: r1 } = hasFlag(args, "--encrypt");
  const { present: passStdin, rest: rest } = hasFlag(r1, "--passphrase-stdin");
  const [account, role] = rest;
  if (!account || !role) return die("key set <account> <role> [--encrypt] [--passphrase-stdin]");
  if (!isRole(role)) return die(`unknown role ${role}; expected one of ${KEYSTORE_ROLES.join(", ")}`);

  const stdin = await readStdin();
  const lines = stdin.split("\n");
  const wif = (lines[0] ?? "").trim();
  if (!wif) return die("no WIF on stdin (line 1)");

  if (encrypt) {
    if (!passStdin) return die("--encrypt requires --passphrase-stdin (passphrase on stdin line 2)");
    const passphrase = (lines[1] ?? "").replace(/\n$/, "");
    if (!passphrase) return die("no passphrase on stdin (line 2)");
    setKey(account, role, wif, { encrypt: true, passphrase, ...(root !== undefined ? { root } : {}) });
    out(`stored encrypted ${role} key for @${account}`);
    return 0;
  }
  setKey(account, role, wif, { ...(root !== undefined ? { root } : {}) });
  out(`stored plaintext ${role} key for @${account}`);
  return 0;
}

// Derive operational role keys FROM a master password and store ONLY the
// ones named in --save. The master password is read from stdin, used to
// derive, and never written anywhere — the design's whole point is to pull
// out the operational keys and discard the crown jewel, so the high-level
// secret has no reason to stay on this box. Each derived key is verified
// against the account's on-chain authority by default, so a wrong password
// or rotated keys are skipped loudly instead of storing junk.
//
//   <master-password>  on stdin line 1   (consumed, never stored)
//   <encryption-pass>  on stdin line 2   (only with --encrypt)
async function cmdKeyDerive(args: string[]): Promise<number> {
  const { present: encrypt, rest: r1 } = hasFlag(args, "--encrypt");
  const { present: passStdin, rest: r2 } = hasFlag(r1, "--passphrase-stdin");
  const { present: noVerify, rest: r3 } = hasFlag(r2, "--no-verify");
  const { present: force, rest: r4 } = hasFlag(r3, "--force");
  const { value: node, rest: r5 } = takeFlag(r4, "--node");
  const { value: saveRaw, rest } = takeEqFlag(r5, "--save");
  const account = rest[0];
  if (!account) return die("key derive <account> --save=active,posting [--encrypt --passphrase-stdin] [--no-verify] [--force]\n  master password on stdin line 1 (consumed, never stored); encryption passphrase on line 2 with --encrypt");

  // Default to the operational set, deliberately excluding owner.
  const roles: KeystoreRole[] = [];
  for (const r of (saveRaw ?? "active,posting,memo").split(",").map((s) => s.trim()).filter(Boolean)) {
    if (!isRole(r)) return die(`unknown role ${r}; expected from ${KEYSTORE_ROLES.join(", ")}`);
    roles.push(r);
  }
  if (roles.includes("owner") && !force) {
    return die("refusing to store the OWNER key operationally — it controls the whole account; keep it cold. Re-run with --force if you truly mean to.");
  }

  const stdin = await readStdin();
  const lines = stdin.split("\n");
  const password = (lines[0] ?? "").trim();
  if (!password) return die("no master password on stdin (line 1)");
  if (encrypt && !passStdin) return die("--encrypt requires --passphrase-stdin (encryption passphrase on stdin line 2)");
  const passphrase = encrypt ? (lines[1] ?? "").replace(/\n$/, "") : "";
  if (encrypt && !passphrase) return die("no encryption passphrase on stdin (line 2)");

  // One authority fetch for all requested roles.
  let roleKeys: Map<string, string> | undefined;
  if (!noVerify) {
    const nodes = nodesFrom(node);
    const client = new HiveComputer({ ...(nodes !== undefined ? { nodes } : {}) });
    const auth = await fetchAuthorities(client.rpc, [account]);
    roleKeys = auth.get(account);
    if (!roleKeys && !force) return die(`@${account} not found on chain; use --no-verify to skip the check or --force to store anyway`);
  }

  let stored = 0;
  for (const role of roles) {
    const priv = deriveRoleKey(account, role, password);
    const pub = priv.createPublic().toString();
    if (roleKeys) {
      if (roleKeys.get(pub) !== role) {
        if (!force) { out(`SKIP ${role}: derived key ${pub} is not @${account}'s on-chain ${role} authority (wrong master password, or keys rotated)`); continue; }
        out(`WARNING ${role}: derived key does not match the chain; storing anyway (--force)`);
      } else {
        out(`verified ${role}: matches @${account}'s on-chain authority`);
      }
    }
    try {
      setKey(account, role, priv.toWif(), { ...(encrypt ? { encrypt: true, passphrase } : {}), ...(root !== undefined ? { root } : {}) });
      out(`stored ${encrypt ? "encrypted" : "plaintext"} ${role} key for @${account} (${pub})`);
      stored += 1;
    } catch (error) {
      out(`SKIP ${role}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  out("");
  out(`done: ${stored}/${roles.length} role key(s) stored. The master password was used to derive and was NOT saved — keep it off this box.`);
  return stored > 0 ? 0 : 1;
}

function cmdKeyStatus(args: string[]): number {
  const account = args[0];
  if (!account) return die("key status <account>");
  const status = roleStatus(account, root);
  out(`@${account} key coverage:`);
  for (const role of KEYSTORE_ROLES) out(`  ${role}: ${status[role]}`);
  return 0;
}

// Verify stored role keys against the chain: load each, derive its public
// key, and confirm it really is that account's on-chain authority for the
// role. Read-only; prints public keys and verdicts only, never the secret.
// Encrypted keys are skipped unless --passphrase-stdin is given.
async function cmdKeyCheck(args: string[]): Promise<number> {
  const { value: node, rest: r1 } = takeFlag(args, "--node");
  const { present: passStdin, rest } = hasFlag(r1, "--passphrase-stdin");
  const account = rest[0];
  if (!account) return die("key check <account> [--node URL] [--passphrase-stdin]");
  const status = roleStatus(account, root);
  const present = KEYSTORE_ROLES.filter((r) => status[r] !== "absent");
  if (present.length === 0) { out(`@${account}: no stored keys`); return 1; }

  const passphrase = passStdin ? (await readStdin()).split("\n")[0]?.trim() : undefined;
  const nodes = nodesFrom(node);
  const client = new HiveComputer({ ...(nodes !== undefined ? { nodes } : {}) });
  const roleKeys = (await fetchAuthorities(client.rpc, [account])).get(account);

  out(`@${account} key check:`);
  let mismatches = 0;
  for (const role of present) {
    if (status[role] === "encrypted" && passphrase === undefined) { out(`  ${role}: encrypted — pass --passphrase-stdin to verify`); continue; }
    let pub: string;
    try {
      const wif = loadKey(account, role, { ...(passphrase !== undefined ? { passphrase } : {}), ...(root !== undefined ? { root } : {}) });
      pub = PrivateKey.from(wif).createPublic().toString();
    } catch (error) { out(`  ${role}: cannot load (${error instanceof Error ? error.message : String(error)})`); continue; }
    if (!roleKeys) { out(`  ${role}: ${pub} — @${account} not found on chain`); continue; }
    const chainRole = roleKeys.get(pub);
    if (chainRole === role) {
      out(`  ${role}: ✓ matches @${account}'s on-chain ${role} authority`);
    } else {
      mismatches += 1;
      out(`  ${role}: ✗ MISMATCH — stored key ${pub} is ${chainRole ? `the ${chainRole} key` : "not an authority"} of @${account}`);
    }
  }
  return mismatches > 0 ? 2 : 0;
}

async function main(): Promise<number> {
  const cmd = argv[0];
  const rest = argv.slice(1);
  switch (cmd) {
    case "sync": return cmdSync(rest);
    case "balances": return cmdBalances(rest);
    case "key": {
      const sub = rest[0];
      if (sub === "set") return cmdKeySet(rest.slice(1));
      if (sub === "derive") return cmdKeyDerive(rest.slice(1));
      if (sub === "status") return cmdKeyStatus(rest.slice(1));
      if (sub === "check") return cmdKeyCheck(rest.slice(1));
      return die("key <set|derive|status|check> ...");
    }
    case "crypto": {
      if (rest[0] === "self-test") { cryptoSelfTest(); out("crypto self-test OK: AES-256-GCM round-trip, wrong-passphrase rejected"); return 0; }
      return die("crypto self-test");
    }
    default:
      console.error("usage: waggle <sync|balances|key|crypto> ...");
      console.error("  waggle sync <account> [--node URL]");
      console.error("  waggle balances <account>");
      console.error("  waggle key set <account> <role> [--encrypt] [--passphrase-stdin]");
      console.error("  waggle key derive <account> --save=active,posting [--encrypt --passphrase-stdin]");
      console.error("  waggle key status <account>");
      console.error("  waggle key check <account> [--passphrase-stdin]");
      console.error("  waggle crypto self-test");
      return cmd ? 1 : 1;
  }
}

main().then((code) => { process.exitCode = code; }).catch((err: unknown) => {
  console.error(`waggle: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
