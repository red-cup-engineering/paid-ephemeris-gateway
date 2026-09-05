#!/usr/bin/env node
// scaffold-spec.mjs
// Creates governance/specifications/<slug>.md with correct frontmatter and section skeleton.
// Usage: node scaffold-spec.mjs <slug> [--title "Human Title"] [--derives-from <slug,...>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { slug: null, title: null, derivesFrom: [], help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--title") { args.title = argv[++i]; }
    else if (arg === "--derives-from") { args.derivesFrom = argv[++i].split(",").map(s => s.trim()); }
    else if (args.slug === null) { args.slug = arg; }
    else { throw new Error(`Unexpected argument: ${arg}`); }
    i++;
  }
  return args;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function versionNoun(slug) {
  // Convert kebab-slug to compact noun: predication-graph-walk -> predication-graph-walk
  // Keep as-is; the noun IS the slug (compact already).
  return slug;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.slug) {
    console.log("Usage: scaffold-spec.mjs <slug> [--title \"Human Title\"] [--derives-from <slug,...>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const slug = slugify(args.slug);
  const title = args.title ?? slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  const date = today();
  const version = `${date.replace(/-/g, ".")}.${versionNoun(slug)}`;

  const derivesFrom = args.derivesFrom.length > 0
    ? `[${args.derivesFrom.join(", ")}]`
    : `[] # TODO: list claim-slugs, object-slugs, morphism-slugs, concept-slugs`;

  const specsDir = path.join(pyfarsRoot, "governance", "specifications");
  const outPath = path.join(specsDir, `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const content = `---
title: "${title}"
type: specification
status: draft
version: "${version}"
date: ${date}
authors: []
derives-from: ${derivesFrom}
supersedes: []
---

# ${title}

## §1 Abstract

<!-- One paragraph: what this specification covers and why it exists. Non-normative. -->

## §2 Status

This document is **draft**. It is not yet stable; it may change without notice. Do not implement
against a draft specification without accepting that the acceptance criteria may be revised.

## §3 Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY,
and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

A **conformant implementation** is <!-- TODO: define what it means to conform to this spec -->.

## §4 Terminology

<!-- Define each technical term used in §5 requirements.
     For pyfars-concept realizations, cite inline: realizes: <concept-slug> -->

## §5 Requirements

<!-- Numbered normative requirements. Each MUST be independently testable.
     Each MUST cite the object, morphism, or claim it derives from. -->

### 5.1

<!-- TODO -->

## §6 Acceptance criteria

<!-- Explicit, checkable conditions for well-formedness. What tests assert.
     Derived from §5 but stated in terms of observable substrate state. -->

1. <!-- TODO -->

## §7 Non-normative examples

> **Non-normative.** The following examples illustrate the requirements but do not modify them.

<!-- Pointers to math examples (examples/<slug>--*.md) and, once authored, code examples. -->

## §8 What this specification does not decide

<!-- Named silences, deferred decisions, out-of-scope items.
     A spec silent on important edge cases is dangerous — name the silences. -->

## §9 References

### Normative

<!-- Records this spec depends on for correctness. -->

### Informative

<!-- Records that informed the spec but are not load-bearing. -->
`;

  fs.mkdirSync(specsDir, { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
  console.log(`Version: ${version}`);
}

main();
