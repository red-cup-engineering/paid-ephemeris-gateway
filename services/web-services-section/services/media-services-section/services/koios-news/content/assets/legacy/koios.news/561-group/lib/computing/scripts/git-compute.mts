#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  computeWithGit,
  GIT_COMPUTER_ACTIONS,
  type GitComputerAction,
  type GitComputerToken,
} from "../src/git-mark.mjs";

const COMMAND_ACTION: Readonly<Record<string, GitComputerAction>> = Object.freeze({
  worktree: "worktree.status",
  log: "log.read",
  refs: "refs.read",
  remotes: "remotes.read",
});

interface ParsedArgs {
  readonly command: string | undefined;
  readonly repo: string;
  readonly json: boolean;
  readonly limit?: number;
  readonly revision?: string;
}

function takeValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new TypeError(`${flag} requires a value`);
  return value;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const [command, ...rest] = argv;
  let repo = process.cwd();
  let json = false;
  let limit: number | undefined;
  let revision: string | undefined;
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]!;
    if (arg === "--json") {
      json = true;
    } else if (arg === "--repo") {
      repo = takeValue(rest, index, arg);
      index += 1;
    } else if (arg === "--limit") {
      limit = Number.parseInt(takeValue(rest, index, arg), 10);
      index += 1;
    } else if (arg === "--revision") {
      revision = takeValue(rest, index, arg);
      index += 1;
    } else {
      throw new TypeError(`unknown option ${arg}`);
    }
  }
  return {
    command,
    repo: path.resolve(repo),
    json,
    ...(limit === undefined ? {} : { limit }),
    ...(revision === undefined ? {} : { revision }),
  };
}

function usage(): string {
  return [
    "git-compute worktree [--repo <path>] [--json]",
    "git-compute log      [--repo <path>] [--limit N] [--revision <rev>] [--json]",
    "git-compute refs     [--repo <path>] [--json]",
    "git-compute remotes  [--repo <path>] [--json]",
    "",
  ].join("\n");
}

async function main(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.command === undefined || parsed.command === "help" || parsed.command === "--help") {
    process.stdout.write(usage());
    return 0;
  }
  const action = COMMAND_ACTION[parsed.command];
  if (action === undefined) {
    throw new TypeError(
      `unknown command ${parsed.command} (expected one of ${Object.keys(COMMAND_ACTION).join(", ")}; actions: ${GIT_COMPUTER_ACTIONS.join(", ")})`,
    );
  }

  const token: GitComputerToken = {
    repoRoot: parsed.repo,
    ...(parsed.limit === undefined ? {} : { limit: parsed.limit }),
    ...(parsed.revision === undefined ? {} : { revision: parsed.revision }),
  };
  const admission = await computeWithGit(action, token);

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(admission, null, 2)}\n`);
  } else {
    const head = JSON.stringify({
      action: admission.action,
      admitted: admission.admitted,
      status: admission.status,
      ...(admission.obstruction === undefined ? {} : { obstruction: admission.obstruction.kind }),
    });
    const rows = admission.utterances.map((uttered) =>
      JSON.stringify({
        e: uttered.token.mark.value,
        a: uttered.claim.mark.value,
      }),
    );
    process.stdout.write([head, ...rows].join("\n") + "\n");
  }
  return admission.admitted ? 0 : 1;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      process.stderr.write(`git-compute: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
