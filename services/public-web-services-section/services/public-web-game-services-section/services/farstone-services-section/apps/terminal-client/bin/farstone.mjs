#!/usr/bin/env node
// farstone — Farstone's terminal client: the game's REST adapter composed with the generic
// Wheatstone terminal UI (Wheatstone holds no Farstone-specific code). Usage/defaults/keys are
// in usage() below. The Ctrl-B/`/audit` panel stays empty over this wire on purpose — there is
// no GMCP/MSDP-equivalent channel here (see src/world.mjs), so nothing is synthesized to fill it.

import { run } from "@red-cup-engineering/wheatstone/app";
import { argument } from "@red-cup-engineering/javascript-argv-parsing-services-section/parse-javascript-argv";
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

const base = argument("--base", argv) || process.env.FARSTONE_BASE || "https://farstone.561.group";
const name = argument("--name", argv) || process.env.FARSTONE_NAME || "wanderer";

const world = farstoneWorld({ base, name });
run({ world, target: base.replace(/^https?:\/\//, "") });
