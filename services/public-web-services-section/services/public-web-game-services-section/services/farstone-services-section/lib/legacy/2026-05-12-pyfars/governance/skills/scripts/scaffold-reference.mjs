#!/usr/bin/env node
// scaffold-reference.mjs
// Scaffolds a new references/<citekey>.md annotation file, or prints a ready-to-paste
// references: map entry for insertion into a citing file's frontmatter.
//
// Usage:
//   node scaffold-reference.mjs <citekey> --class <class> --title "..." \
//     --author "Surname, First" [--author "Surname2, First2"] --year YYYY \
//     [--journal "..."] [--publisher "..."] [--location "..."] \
//     [--in "container title"] [--editors "Surname, First"] [--pages "x-y"] \
//     [--series "..."] [--volume N] [--issue N] [--edition "..."] \
//     [--doi "..."] [--isbn "..."] [--url "..."] [--note "..."] \
//     [--repository "..."] [--institution "..."] [--degree phd|masters] \
//     [--refs-dir <path>] [--entry-only]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

const CLASSES = ["book", "article", "chapter", "preprint", "report", "thesis", "online", "software"];

const CLASS_REQUIRED = {
  book: [],
  article: ["journal"],
  chapter: ["in"],
  preprint: ["repository"],
  report: ["institution"],
  thesis: ["institution", "degree"],
  online: ["url"],
  software: [],
};

function parseArgs(argv) {
  const args = {
    citekey: null,
    class: null,
    title: null,
    authors: [],
    year: null,
    journal: null,
    publisher: null,
    location: null,
    in: null,
    editors: [],
    pages: null,
    series: null,
    volume: null,
    issue: null,
    edition: null,
    doi: null,
    isbn: null,
    url: null,
    note: null,
    repository: null,
    institution: null,
    degree: null,
    refsDir: null,
    entryOnly: false,
    help: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--class") { args.class = argv[++i]; }
    else if (arg === "--title") { args.title = argv[++i]; }
    else if (arg === "--author") { args.authors.push(argv[++i]); }
    else if (arg === "--year") { args.year = parseInt(argv[++i], 10); }
    else if (arg === "--journal") { args.journal = argv[++i]; }
    else if (arg === "--publisher") { args.publisher = argv[++i]; }
    else if (arg === "--location") { args.location = argv[++i]; }
    else if (arg === "--in") { args.in = argv[++i]; }
    else if (arg === "--editor") { args.editors.push(argv[++i]); }
    else if (arg === "--pages") { args.pages = argv[++i]; }
    else if (arg === "--series") { args.series = argv[++i]; }
    else if (arg === "--volume") { args.volume = argv[++i]; }
    else if (arg === "--issue") { args.issue = argv[++i]; }
    else if (arg === "--edition") { args.edition = argv[++i]; }
    else if (arg === "--doi") { args.doi = argv[++i]; }
    else if (arg === "--isbn") { args.isbn = argv[++i]; }
    else if (arg === "--url") { args.url = argv[++i]; }
    else if (arg === "--note") { args.note = argv[++i]; }
    else if (arg === "--repository") { args.repository = argv[++i]; }
    else if (arg === "--institution") { args.institution = argv[++i]; }
    else if (arg === "--degree") { args.degree = argv[++i]; }
    else if (arg === "--refs-dir") { args.refsDir = argv[++i]; }
    else if (arg === "--entry-only") { args.entryOnly = true; }
    else if (args.citekey === null) { args.citekey = arg; }
    else { process.stderr.write(`scaffold-reference: unknown arg: ${arg}\n`); process.exitCode = 2; return null; }
    i++;
  }
  return args;
}

function yamlList(items) {
  if (!items || items.length === 0) return "[]";
  return `[${items.map(s => `"${s}"`).join(", ")}]`;
}

function optionalField(key, value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return `${key}: "${value}"\n`;
  return `${key}: ${value}\n`;
}

function buildFrontmatter(args) {
  const cls = args.class;
  let fm = "";
  fm += `class: ${cls}\n`;
  fm += `authors: ${yamlList(args.authors.length ? args.authors : ["# TODO: Surname, Firstname"])}\n`;
  fm += `year: ${args.year ?? "# TODO: YYYY"}\n`;
  fm += `title: "${args.title ?? "# TODO: Full title"}"\n`;

  if (cls === "article") fm += optionalField("journal", args.journal ?? "# TODO");
  if (cls === "chapter") {
    fm += optionalField("in", args.in ?? "# TODO: containing volume title");
    if (args.editors.length) fm += `editors: ${yamlList(args.editors)}\n`;
    if (args.pages) fm += optionalField("pages", args.pages);
  }
  if (cls === "preprint") fm += optionalField("repository", args.repository ?? "# TODO: arXiv|SSRN|...");
  if (cls === "report" || cls === "thesis") fm += optionalField("institution", args.institution ?? "# TODO");
  if (cls === "thesis") fm += optionalField("degree", args.degree ?? "# TODO: phd|masters");
  if (cls === "online" || cls === "software") fm += optionalField("url", args.url ?? "# TODO");

  if (args.publisher) fm += optionalField("publisher", args.publisher);
  if (args.location) fm += optionalField("location", args.location);
  if (args.series) fm += optionalField("series", args.series);
  if (args.volume !== null) fm += optionalField("volume", args.volume);
  if (args.issue !== null) fm += optionalField("issue", args.issue);
  if (args.edition) fm += optionalField("edition", args.edition);
  if (args.doi) fm += optionalField("doi", args.doi);
  if (args.isbn) fm += optionalField("isbn", args.isbn);
  if (args.url && cls !== "online" && cls !== "software") fm += optionalField("url", args.url);
  if (args.note) fm += optionalField("note", args.note);

  return fm;
}

function buildEntry(args) {
  return buildFrontmatter(args).trimEnd();
}

function buildAnnotationFile(args) {
  const fm = `type: reference\ncitekey: ${args.citekey}\n` + buildFrontmatter(args);
  return `---\n${fm}---\n\n# ${args.citekey}\n\n<!-- Extended annotation: reading summary, argument structure, where this work grounds corpus content. -->\n`;
}

function buildMapEntry(args) {
  const body = buildEntry(args);
  const indented = body.split("\n").map(l => l ? `  ${l}` : "").join("\n");
  return `${args.citekey}:\n${indented}\n`;
}

function printHelp() {
  process.stdout.write(`scaffold-reference.mjs — scaffold a citation reference entry or annotation file

Usage:
  node scaffold-reference.mjs <citekey> --class <class> --title "..." \\
    --author "Surname, First" --year YYYY [options]

Classes: ${CLASSES.join(", ")}

Core options:
  --class <class>      Reference class (required)
  --title "..."        Full title (required)
  --author "..."       Author in "Surname, First" format (repeatable)
  --year YYYY          Publication year

Class-specific options:
  --journal "..."      (article) Journal name
  --in "..."           (chapter) Containing volume title
  --editor "..."       (chapter) Editor in "Surname, First" format (repeatable)
  --pages "x-y"        (chapter/article) Page range
  --repository "..."   (preprint/software) Repository name
  --institution "..."  (report/thesis) Institution name
  --degree phd|masters (thesis) Degree type

Optional bibliographic fields:
  --publisher "..."    Publisher name
  --location "..."     Publication location
  --series "..."       Book series name
  --volume N           Volume number
  --issue N            Issue number
  --edition "..."      Edition descriptor
  --doi "..."          DOI (without https://doi.org/ prefix)
  --isbn "..."         ISBN-13
  --url "..."          Access URL
  --note "..."         Short editorial note

Output options:
  --refs-dir <path>    Write annotation file to this directory (default: ./references/)
  --entry-only         Print only the YAML map entry; do not create a file
  -h, --help           Show this help
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args === null) return;

  if (args.help || !args.citekey) {
    printHelp();
    if (!args.help) process.exitCode = 1;
    return;
  }

  if (!args.class) {
    process.stderr.write(`scaffold-reference: --class is required. Classes: ${CLASSES.join(", ")}\n`);
    process.exitCode = 1;
    return;
  }

  if (!CLASSES.includes(args.class)) {
    process.stderr.write(`scaffold-reference: unknown class "${args.class}". Classes: ${CLASSES.join(", ")}\n`);
    process.exitCode = 1;
    return;
  }

  if (args.entryOnly) {
    process.stdout.write(buildMapEntry(args));
    return;
  }

  const refsDir = args.refsDir ? path.resolve(args.refsDir) : path.join(process.cwd(), "references");
  const outPath = path.join(refsDir, `${args.citekey}.md`);

  if (fs.existsSync(outPath)) {
    process.stderr.write(`scaffold-reference: already exists: ${outPath}\n`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(refsDir, { recursive: true });
  fs.writeFileSync(outPath, buildAnnotationFile(args), "utf8");
  process.stdout.write(`Created annotation file: ${outPath}\n`);
  process.stdout.write(`\nPaste this into the citing file's references: map:\n\n`);
  process.stdout.write(buildMapEntry(args));
}

main();
