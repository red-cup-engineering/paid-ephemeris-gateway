#!/usr/bin/env node
/**
 * play — the Farstone terminal. The endpoint, in the transport sense: it pipes the
 * game to stdout. The web layer just streams what this prints.
 *
 * Three ways to drive it, one game loop beneath all of them:
 *
 *   node scripts/play.mjs                    interactive REPL (when stdin is a TTY)
 *   node scripts/play.mjs "look" "west" ...  scripted: one command per argument
 *   printf 'look\nwest\n' | node scripts/play.mjs   scripted: one command per stdin line
 *
 * The scripted forms run a fresh game through the given commands and print the
 * transcript — that is what the site's /play route transports.
 */
import { createInterface } from "node:readline";
import { describe, newGame, step } from "../src/play.mjs";

const BANNER = 'Farstone Harbor — a working waterfront after the summer trade. Type "help".';

/** Run a list of command lines against a fresh game, printing a transcript. */
function runScript(lines) {
  let state = newGame();
  const out = [BANNER, "", describe(state), ""];
  for (const line of lines) {
    if (!line.trim()) continue;
    out.push(`> ${line}`);
    const turn = step(state, line);
    state = turn.state;
    if (turn.output) out.push(turn.output);
    out.push("");
    if (turn.quit) break;
  }
  process.stdout.write(out.join("\n") + "\n");
}

/** Read every line from a piped stdin. */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
}

/** The interactive read-eval-print loop. */
function repl() {
  let state = newGame();
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "> " });
  process.stdout.write(`${BANNER}\n\n${describe(state)}\n\n`);
  rl.prompt();
  rl.on("line", (line) => {
    const turn = step(state, line);
    state = turn.state;
    if (turn.output) process.stdout.write(turn.output + "\n");
    if (turn.quit) {
      rl.close();
      return;
    }
    rl.prompt();
  });
  rl.on("close", () => process.exit(0));
}

const args = process.argv.slice(2);
if (args.length) {
  runScript(args);
} else if (process.stdin.isTTY) {
  repl();
} else {
  runScript(await readStdin());
}
