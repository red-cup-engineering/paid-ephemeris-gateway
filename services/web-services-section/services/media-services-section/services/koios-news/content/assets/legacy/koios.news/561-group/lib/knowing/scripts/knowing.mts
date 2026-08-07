#!/usr/bin/env node
/**
 * knowing — front bin for the package discovery, server, and CLI dispatch.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { induceBins, type JsonValue } from "@emsenn/relating";
import { actions } from "../src/actions.mjs";
import {
  admitActionResearchSequenceInput,
  admitAperiodicDreamInput,
  aperiodicActionResearchCycles,
  aperiodicDreamConjectures,
} from "../src/dreaming/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

function printDiscovery(): void {
  const { discovery } = induceBins(actions, { packageName: "@emsenn/knowing" });
  const lines: string[] = [
    `${discovery.package} - epistemic proof, concept, and cognizing actions`,
    ``,
    `Usage:`,
    `  knowing                 print this surface`,
    `  knowing run             serve web/OpenAPI/MCP over knowing actions`,
    `  knowing dream-stream    stream aperiodic dream conjectures as JSON lines`,
    `  knowing cycle-stream    stream action-research cycles as JSON lines`,
    `  knowing <verb> [flags]  run a verb; input arrives on stdin`,
    ``,
    `Operations:`,
  ];
  for (const bin of discovery.bins) lines.push(`  ${bin.name.padEnd(18)} ${bin.summary ?? ""}`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

function argValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  return argv[index + 1];
}

function nonNegativeIntegerArg(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new TypeError(`${name} must be a non-negative integer`);
  return parsed;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamDream(argv: readonly string[]): Promise<number> {
  const stdin = await readStdin();
  const parsed = stdin.trim() === "" ? { observations: [] } : JSON.parse(stdin) as unknown;
  const admitted = admitAperiodicDreamInput(parsed as JsonValue, "dream-stream");
  const limit = nonNegativeIntegerArg(argValue(argv, "--limit"), "--limit") ?? admitted.limit;
  const interval = nonNegativeIntegerArg(argValue(argv, "--interval-ms"), "--interval-ms") ?? 0;
  let emitted = 0;
  for (const candidate of aperiodicDreamConjectures(admitted.observations, {
    ...(admitted.start === undefined ? {} : { start: admitted.start }),
  })) {
    if (limit !== undefined && emitted >= limit) break;
    process.stdout.write(`${JSON.stringify(candidate)}\n`);
    emitted += 1;
    if (interval > 0) await wait(interval);
  }
  return 0;
}

async function streamCycles(argv: readonly string[]): Promise<number> {
  const stdin = await readStdin();
  const parsed = stdin.trim() === "" ? { before: [], batches: [] } : JSON.parse(stdin) as unknown;
  const admitted = admitActionResearchSequenceInput(parsed as JsonValue, "cycle-stream");
  const cycleLimit = nonNegativeIntegerArg(argValue(argv, "--cycles"), "--cycles") ?? admitted.cycleLimit;
  const interval = nonNegativeIntegerArg(argValue(argv, "--interval-ms"), "--interval-ms") ?? 0;
  for (const event of aperiodicActionResearchCycles({
    ...admitted,
    ...(cycleLimit === undefined ? {} : { cycleLimit }),
  })) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
    if (interval > 0) await wait(interval);
  }
  return 0;
}

function run(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, "serve.mjs")], { stdio: "inherit", env: { ...process.env } });
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", (error) => {
      process.stderr.write(`knowing: ${error instanceof Error ? error.message : String(error)}\n`);
      resolve(1);
    });
  });
}

async function dispatchVerb(argv: readonly string[]): Promise<number> {
  const { dispatch } = induceBins(actions, { packageName: "@emsenn/knowing" });
  const stdin = await readStdin();
  const dataRoot = process.env["KNOWING_DATA"];
  const result = dispatch([...argv], stdin, {
    program: "knowing",
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
  if (first === "dream-stream") return streamDream(argv.slice(1));
  if (first === "cycle-stream") return streamCycles(argv.slice(1));
  return dispatchVerb(argv);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`knowing: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
