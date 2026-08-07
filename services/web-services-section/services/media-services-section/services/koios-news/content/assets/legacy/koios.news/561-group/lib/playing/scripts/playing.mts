#!/usr/bin/env node
/**
 * playing — the single front bin the workspace `make playing` target forwards to.
 *
 * `make playing <args>` passes its trailing words straight here, so this routes:
 *   playing                  → print the discovery surface (the operations + transports)
 *   playing run              → bring up play-serve (HTTP/OpenAPI/MCP/web)
 *   playing <verb> [flags]   → dispatch the verb via the relating CLI (stdin → stdout)
 *
 * All capability is the same one relating `induceBins` apex, projected to CLI here
 * and to the four transports by `run`; this front bin invents nothing. Every
 * dispatch witnesses as EAVT into playing's own ledger (PLAYING_DATA).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { induceBins } from "@emsenn/relating";
import { actions } from "../src/actions.mjs";

const here = dirname(fileURLToPath(import.meta.url));

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

function printDiscovery(): void {
  const { discovery } = induceBins(actions, { packageName: "@emsenn/playing" });
  const lines: string[] = [
    `${discovery.package} — the *-autonomous interaction faculty (the cut; the outside; the spiral's hinge)`,
    ``,
    `Usage (from the workspace root):`,
    `  make playing                print this surface`,
    `  make playing run            bring up the server (web · OpenAPI · MCP · CLI)`,
    `  make playing <verb>         run a verb (the input arrives on stdin)`,
    ``,
    `Operations (the *-autonomous morphisms over designs/games, and the play readings):`,
  ];
  for (const bin of discovery.bins) lines.push(`  ${bin.name.padEnd(16)} ${bin.summary ?? ""}`);
  lines.push(``, `Each verb projects to CLI, OpenAPI (GET /openapi.json), MCP (POST /mcp), and web (GET /).`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

/** Bring up the server, handing this process over to the child until it exits. */
function run(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, "serve.mjs")], { stdio: "inherit", env: { ...process.env } });
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", (error) => {
      process.stderr.write(`playing: ${error instanceof Error ? error.message : String(error)}\n`);
      resolve(1);
    });
  });
}

async function dispatchVerb(argv: readonly string[]): Promise<number> {
  const { dispatch } = induceBins(actions, { packageName: "@emsenn/playing" });
  const stdin = await readStdin();
  const dataRoot = process.env["PLAYING_DATA"];
  const result = dispatch([...argv], stdin, {
    program: "playing",
    caller: { transport: "cli" },
    ...(dataRoot === undefined ? {} : { dataRoot }),
  });
  if (result.stdout !== "") process.stdout.write(result.stdout);
  if (result.stderr !== "") process.stderr.write(result.stderr);
  return result.code;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const first = argv[0];
  if (first === undefined || first === "help" || first === "--help" || first === "-h") {
    printDiscovery();
    return 0;
  }
  if (first === "run" || first === "serve") {
    return run();
  }
  return dispatchVerb(argv);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`playing: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
