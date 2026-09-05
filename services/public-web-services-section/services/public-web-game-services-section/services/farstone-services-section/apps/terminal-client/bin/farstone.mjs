#!/usr/bin/env node
// farstone — Farstone's terminal client. The game owns its REST adapter and composes it with the
// generic Wheatstone terminal UI; Wheatstone contains no Farstone-specific code or content.
//
//   node bin/farstone.mjs [--base <url>] [--name <player name>]
//
// defaults: --base https://farstone.561.group (or FARSTONE_BASE)
//           --name FARSTONE_NAME env, else "wanderer"
//
// in-app: /help  /quit
// keys:   PgUp/PgDn scroll  Ctrl-L to tail  Up/Down history  Ctrl-C quit
//
// There is no GMCP/MSDP-equivalent channel on this wire (see farstone-world.mjs's header), so the
// Ctrl-B / /audit side panel stays empty over this carrier — that is the honest state, not a bug:
// everything Farstone tells you arrives as prose in the output pane, nothing is synthesized to fill
// a panel that has no real data behind it.

import { run } from "@red-cup-engineering/wheatstone/app";
import { farstoneWorld } from "../src/world.mjs";

const argv = process.argv.slice(2);

function usage() {
  process.stderr.write([
    "usage: farstone [--base <url>] [--name <player name>]",
    "",
    "  --base   the Farstone REST server (default https://farstone.561.group, or FARSTONE_BASE)",
    "  --name   this player's name (default FARSTONE_NAME env, or \"wanderer\")",
    "",
    "in-app: /help  /quit",
    "keys:   PgUp/PgDn scroll  Ctrl-L to tail  Up/Down history  Ctrl-C quit",
    "",
    "(no GMCP/MSDP-equivalent channel exists on this wire, so the side panel stays empty — honest,",
    " not a bug: see src/world.mjs's header)",
    "",
  ].join("\n"));
}

if (argv.includes("-h") || argv.includes("--help")) { usage(); process.exit(0); }

function argAfter(flag) {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
}

const base = argAfter("--base") || process.env.FARSTONE_BASE || "https://farstone.561.group";
const name = argAfter("--name") || process.env.FARSTONE_NAME || "wanderer";

const world = farstoneWorld({ base, name });
run({ world, target: base.replace(/^https?:\/\//, "") });
