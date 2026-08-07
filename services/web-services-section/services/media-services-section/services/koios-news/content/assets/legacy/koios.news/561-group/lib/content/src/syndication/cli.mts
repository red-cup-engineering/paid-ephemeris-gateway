#!/usr/bin/env node
// syndication-codecs — parse syndication XML on stdin into SyndicationItem records.
// The CLI is a rendering edge over the pure parsers.

import process from "node:process";

import { parseArxivAtom, parseFeed } from "./index.mjs";

const HELP = `syndication-codecs <command>

Commands:
  parse-feed     read RSS/Atom XML on stdin, print SyndicationItem records as JSON
  parse-arxiv    read arXiv Atom XML on stdin, print SyndicationItem records as JSON
  help           print this help

All parsers are pure (no network I/O).
`;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * The CLI entry point: dispatches argv[0] to the syndication parsers -
 * "parse-feed" runs parseFeed and "parse-arxiv" runs parseArxivAtom over stdin
 * XML, printing the resulting SyndicationItem records as JSON, while "help"
 * prints usage. Returns the process exit code (0 on success, 2 on an unknown
 * command).
 */
export async function main(argv: readonly string[]): Promise<number> {
  const command = argv[0] ?? "help";
  if (command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(HELP);
    return 0;
  }
  if (command === "parse-feed" || command === "parse-arxiv") {
    const xml = await readStdin();
    const items = command === "parse-feed" ? parseFeed(xml) : parseArxivAtom(xml);
    process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
    return 0;
  }
  process.stderr.write(`unknown command: ${command}\n\n${HELP}`);
  return 2;
}

process.exitCode = await main(process.argv.slice(2));
