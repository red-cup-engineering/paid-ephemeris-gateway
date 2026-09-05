#!/usr/bin/env node
// lint-citations.mjs
// Validates references: frontmatter maps and annotation files against the citations specification.
//
// Usage:
//   node lint-citations.mjs [--root <path>] [--file <path>] [--json] [--strict]
//
// Exits 0 if clean, 1 if any errors (or warnings when --strict).

import fs from "node:fs";
import path from "node:path";

const CLASSES = new Set(["book", "article", "chapter", "preprint", "report", "thesis", "online", "software"]);
const FORBIDDEN_FIELDS = new Set(["venue", "publication"]);
const BIBLIOGRAPHY_HEADINGS = /^##\s+(references|bibliography|sources)\s*$/im;

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

const VALID_DEGREES = new Set(["phd", "masters"]);
const AUTHOR_RE = /^[^,]+(,\s*.+)?$/;

function parseArgs(argv) {
  const args = { root: null, file: null, json: false, strict: false, help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--root") { args.root = argv[++i]; }
    else if (arg === "--file") { args.file = argv[++i]; }
    else if (arg === "--json") { args.json = true; }
    else if (arg === "--strict") { args.strict = true; }
    else { process.stderr.write(`lint-citations: unknown arg: ${arg}\n`); process.exitCode = 2; return null; }
    i++;
  }
  return args;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  try {
    // Minimal YAML parse: only handle the fields we care about.
    return { raw: m[1], body: m[2] };
  } catch { return null; }
}

// Very small YAML value extractor — handles string, number, list of strings, and nested maps.
// Not a full YAML parser; handles the subset actually used in this substrate.
function extractYamlFields(raw) {
  const fields = {};
  const lines = raw.split(/\r?\n/);
  let i = 0;

  function parseValue(line, rest) {
    const trimmed = line.trimEnd();
    // Inline list: [a, b, c]
    if (trimmed.startsWith("[")) {
      const inner = trimmed.slice(1, trimmed.lastIndexOf("]"));
      return inner.split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    }
    // Number
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    // Quoted string
    if (/^["']/.test(trimmed)) return trimmed.replace(/^["']|["']$/g, "");
    // Unquoted value
    return trimmed || null;
  }

  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)/);
    if (!m) { i++; continue; }
    const key = m[1];
    const rest = m[2].trim();

    if (rest === "" || rest === "|" || rest === ">") {
      // Could be a nested map block
      const nested = {};
      i++;
      while (i < lines.length && /^  /.test(lines[i])) {
        const nm = lines[i].match(/^  ([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)/);
        if (nm) {
          const nk = nm[1], nv = nm[2].trim();
          // Check for further nesting (4-space indent)
          const subNested = {};
          let j = i + 1;
          while (j < lines.length && /^    /.test(lines[j])) {
            const snm = lines[j].match(/^    ([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)/);
            if (snm) subNested[snm[1]] = parseValue(snm[2].trim(), []);
            j++;
          }
          if (Object.keys(subNested).length > 0) {
            nested[nk] = subNested;
            i = j;
          } else {
            nested[nk] = parseValue(nv, []);
            i++;
          }
        } else {
          i++;
        }
      }
      fields[key] = Object.keys(nested).length > 0 ? nested : null;
    } else if (rest.startsWith("-")) {
      // Block list
      const items = [];
      const sub = rest.slice(1).trim();
      if (sub) items.push(sub.replace(/^["']|["']$/g, ""));
      i++;
      while (i < lines.length && /^  - /.test(lines[i])) {
        items.push(lines[i].slice(4).trim().replace(/^["']|["']$/g, ""));
        i++;
      }
      fields[key] = items;
    } else {
      fields[key] = parseValue(rest, []);
      i++;
    }
  }
  return fields;
}

function isValidAuthor(s) {
  if (typeof s !== "string" || !s.trim()) return false;
  // Corporate authors (no comma) are OK; individual authors must be "Surname, First"
  // We accept either: contains a comma with content on both sides, or contains no comma (corporate).
  // We reject: starts with a first name (no comma at all and single word is suspicious but allowed for corporate).
  // Simple heuristic: if there's a comma, both sides must be non-empty.
  if (s.includes(",")) {
    const parts = s.split(",");
    return parts[0].trim().length > 0 && parts[1].trim().length > 0;
  }
  return true; // corporate / single-name author
}

function lintEntry(citekey, entry, filePath) {
  const findings = [];
  const warn = (msg) => findings.push({ level: "warning", citekey, file: filePath, message: msg });
  const error = (msg) => findings.push({ level: "error", citekey, file: filePath, message: msg });

  if (!entry || typeof entry !== "object") {
    error("references: entry is not an object");
    return findings;
  }

  // Forbidden fields
  for (const f of FORBIDDEN_FIELDS) {
    if (f in entry) error(`forbidden field "${f}:" — decompose into journal:, publisher:, series:, location:`);
  }

  // Universal required
  if (!entry.class) { error("missing required field: class"); }
  else if (!CLASSES.has(entry.class)) { error(`unknown class: "${entry.class}"`); }
  if (!entry.authors) { error("missing required field: authors"); }
  else if (!Array.isArray(entry.authors) || entry.authors.length === 0) { error("authors: must be a non-empty list"); }
  else {
    for (const a of entry.authors) {
      if (!isValidAuthor(a)) warn(`author "${a}" may not follow "Surname, Firstname" format`);
    }
  }
  if (entry.editors) {
    for (const e of entry.editors) {
      if (!isValidAuthor(e)) warn(`editor "${e}" may not follow "Surname, Firstname" format`);
    }
  }
  if (!entry.year) { error("missing required field: year"); }
  else if (typeof entry.year !== "number") { warn(`year: should be an integer, got "${entry.year}"`); }
  if (!entry.title) { error("missing required field: title"); }

  // Class-specific required
  const cls = entry.class;
  if (cls && CLASSES.has(cls)) {
    for (const req of (CLASS_REQUIRED[cls] ?? [])) {
      if (!entry[req]) error(`class "${cls}" requires field: ${req}:`);
    }
    if (cls === "thesis" && entry.degree && !VALID_DEGREES.has(entry.degree)) {
      error(`degree: must be "phd" or "masters", got "${entry.degree}"`);
    }
  }

  return findings;
}

function lintCitingFile(filePath) {
  const findings = [];
  let text;
  try { text = fs.readFileSync(filePath, "utf8"); } catch { return findings; }

  const parsed = parseFrontmatter(text);
  if (!parsed) return findings;

  const fields = extractYamlFields(parsed.raw);

  // Check for references: map
  if (fields.references) {
    if (typeof fields.references !== "object" || Array.isArray(fields.references)) {
      findings.push({ level: "error", citekey: null, file: filePath, message: "references: must be a map (citekey → object)" });
    } else {
      for (const [key, entry] of Object.entries(fields.references)) {
        const entryFindings = lintEntry(key, entry, filePath);
        findings.push(...entryFindings);
      }
    }
  }

  // Legacy patterns
  if (fields.cites && !fields.references) {
    findings.push({ level: "warning", citekey: null, file: filePath, message: "has cites: list but no references: map — migrate to references: with full bibliographic data" });
  }

  // Body bibliography section
  if (BIBLIOGRAPHY_HEADINGS.test(parsed.body)) {
    findings.push({ level: "error", citekey: null, file: filePath, message: "body contains ## References/Bibliography/Sources section — move all bibliography to references: frontmatter" });
  }

  return findings;
}

function lintAnnotationFile(filePath) {
  const findings = [];
  let text;
  try { text = fs.readFileSync(filePath, "utf8"); } catch { return findings; }

  const parsed = parseFrontmatter(text);
  if (!parsed) {
    findings.push({ level: "error", citekey: null, file: filePath, message: "annotation file has no frontmatter" });
    return findings;
  }

  const fields = extractYamlFields(parsed.raw);
  const basename = path.basename(filePath, ".md");

  if (fields.type !== "reference") {
    findings.push({ level: "error", citekey: basename, file: filePath, message: 'annotation file missing type: reference' });
  }
  if (!fields.citekey) {
    findings.push({ level: "error", citekey: basename, file: filePath, message: "annotation file missing citekey:" });
  } else if (fields.citekey !== basename) {
    findings.push({ level: "error", citekey: basename, file: filePath, message: `citekey "${fields.citekey}" does not match filename "${basename}"` });
  }

  // Annotation frontmatter must also be a complete reference entry
  const entryFindings = lintEntry(basename, fields, filePath);
  findings.push(...entryFindings);

  return findings;
}

function collectFiles(rootDir) {
  const citing = [];
  const annotations = [];

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const isRefsDir = path.basename(dir) === "references";

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "_index.md") {
        if (isRefsDir) {
          annotations.push(full);
        } else {
          citing.push(full);
        }
      }
    }
  }

  walk(rootDir);
  return { citing, annotations };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args === null) return;

  if (args.help) {
    process.stdout.write(`lint-citations.mjs — validate citations against the spec

Usage:
  node lint-citations.mjs [--root <path>] [--file <path>] [--json] [--strict]

Options:
  --root <path>   Root directory to walk (default: cwd)
  --file <path>   Lint a single file
  --json          Output JSON report
  --strict        Treat warnings as errors (affects exit code)
  -h, --help      Show this help

Exit codes:
  0  No errors (warnings allowed unless --strict)
  1  One or more errors found
  2  Bad arguments
`);
    return;
  }

  const allFindings = [];

  if (args.file) {
    const f = path.resolve(args.file);
    const isAnnotation = path.basename(path.dirname(f)) === "references";
    if (isAnnotation) {
      allFindings.push(...lintAnnotationFile(f));
    } else {
      allFindings.push(...lintCitingFile(f));
    }
  } else {
    const root = path.resolve(args.root ?? process.cwd());
    const { citing, annotations } = collectFiles(root);
    for (const f of citing) allFindings.push(...lintCitingFile(f));
    for (const f of annotations) allFindings.push(...lintAnnotationFile(f));
  }

  const errors = allFindings.filter(f => f.level === "error");
  const warnings = allFindings.filter(f => f.level === "warning");

  if (args.json) {
    process.stdout.write(JSON.stringify({ errors: errors.length, warnings: warnings.length, findings: allFindings }, null, 2) + "\n");
  } else {
    const root = path.resolve(args.root ?? process.cwd());
    process.stdout.write(`lint-citations (root: ${root})\n`);
    process.stdout.write(`  errors: ${errors.length}  warnings: ${warnings.length}\n`);
    for (const f of allFindings) {
      const rel = path.relative(process.cwd(), f.file);
      const prefix = f.level === "error" ? "ERROR" : "WARN ";
      const citekey = f.citekey ? ` [${f.citekey}]` : "";
      process.stdout.write(`  ${prefix} ${rel}${citekey}: ${f.message}\n`);
    }
  }

  const hasProblems = errors.length > 0 || (args.strict && warnings.length > 0);
  process.exitCode = hasProblems ? 1 : 0;
}

main();
