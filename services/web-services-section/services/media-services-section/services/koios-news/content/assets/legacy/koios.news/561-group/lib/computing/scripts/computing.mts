#!/usr/bin/env node
/**
 * computing — the single front bin the workspace `make computing` target forwards to.
 *
 *   computing                  → print the discovery surface (operations + transports)
 *   computing run              → bring up compute-serve (HTTP/OpenAPI/MCP/web)
 *   computing <verb> [flags]   → dispatch the verb via the relating CLI (stdin → stdout)
 *
 * All capability is the same one relating `induceBins` apex, projected to CLI here and
 * to the four transports by `run`; this front bin invents nothing.
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
  const { discovery } = induceBins(actions, { packageName: "@emsenn/computing" });
  const lines: string[] = [
    `${discovery.package} — the effective topos Eff = Kl(!) on playing's CGS (computable functions, settled to FOUR)`,
    ``,
    `Usage (from the workspace root):`,
    `  make computing                     print this surface`,
    `  make computing run                 bring up the server (web · OpenAPI · MCP · CLI)`,
    `  make computing <verb> [flags]      run a verb (the input arrives on stdin)`,
    ``,
    `Operations:`,
  ];
  for (const bin of discovery.bins) lines.push(`  ${bin.name.padEnd(12)} ${bin.summary ?? ""}`);
  lines.push(``, `Each verb projects to CLI, OpenAPI (GET /openapi.json), MCP (POST /mcp), and web (GET /).`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

function run(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, "serve.mjs")], { stdio: "inherit", env: { ...process.env } });
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", (error) => {
      process.stderr.write(`computing: ${error instanceof Error ? error.message : String(error)}\n`);
      resolve(1);
    });
  });
}

async function dispatchVerb(argv: readonly string[]): Promise<number> {
  const { dispatch } = induceBins(actions, { packageName: "@emsenn/computing" });
  const stdin = await readStdin();
  const dataRoot = process.env["COMPUTING_DATA"];
  const result = dispatch([...argv], stdin, {
    program: "computing",
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
  if (first === "run" || first === "serve") return run();
  return dispatchVerb(argv);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`computing: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
