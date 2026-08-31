#!/usr/bin/env node
// scan-trace-floats — a read-only detector for the trace-format migration this file's own
// history is queued behind (see server/world/store.mjs's header comment on rowsFromLog/eavtAppend
// and the lagoon-engine migration report). BEFORE any old-format WORLD_LOG trace can be re-
// appended through @red-cup-engineering/eavt's appendEavt, every row must survive
// @red-cup-engineering/cbor-codec-service's encodeCanonical, which admits ONLY safe-integer
// numbers (Number.isSafeInteger) and rejects any other number outright:
//
//   "CBOR codec numbers must be safe integers; decimals use typed decimal strings"
//
// This scans a trace file — parsed EXACTLY as store.mjs's own rowsFromLog parses it (one JSON
// value per line, via @red-cup-engineering/flatfile's canonical whole-file text read) — and
// reports every row that carries a non-safe-integer number anywhere in its value, so the
// migration's float-safety precondition can be checked against a real trace before anyone builds
// (or runs) a converter. It writes nothing and appends nothing; it is a report, not a repair.
//
// Usage:
//   node scripts/scan-trace-floats.mjs <path-to-trace.jsonl>
//
// The path is a required, explicit argument — this script never reads WORLD_LOG or any other env
// var, so it can never be pointed at a live/prod trace by accident. Point it at a local copy.
//
// Exit codes: 0 clean (no float-bearing rows, trace is migration-safe on this axis alone),
//             1 blocked (at least one float-bearing row found — report below names the fields),
//             2 usage error (bad/missing argument, unreadable file).

import { readFlatfileText } from "@red-cup-engineering/flatfile";
import { assertRow } from "@red-cup-engineering/eavt";

// isSafeIntegerNumber — the exact admission test cbor-codec-service's encodeCanonical applies to
// every `typeof value === "number"` it sees (ported here read-only, not re-implemented against
// its internals — same law, ordinary language: Number.isSafeInteger, nothing looser).
function isSafeIntegerNumber(value) {
  return Number.isSafeInteger(value);
}

// walkNumbers — depth-first walk of a JSON-shaped value, yielding every number found together
// with its dotted/bracketed path from the row root (e.g. "v.x", "v.items[2].qty"). Used to find
// every offending field, not just the first, in a row whose value is itself an object/array.
function* walkNumbers(value, path) {
  if (typeof value === "number") {
    yield { path, value };
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* walkNumbers(value[i], `${path}[${i}]`);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) yield* walkNumbers(v, path ? `${path}.${k}` : k);
  }
}

// scanTrace(text) — the pure scan over already-read file text. Returns a report object; never
// throws on malformed content (a bad line is counted and described, exactly as rowsFromLog would
// silently skip it — but here the skip is REPORTED, not silent, since this is a diagnostic pass).
export function scanTrace(text) {
  const lines = text.split("\n");
  let blankLines = 0;
  let parsedRows = 0;
  const unparseableLines = []; // { line, reason }
  const floatRows = []; // { line, e, a, t, floats: [{ path, value }] }
  let floatOccurrences = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    if (!line.trim()) { blankLines++; continue; }

    let row;
    try {
      row = assertRow(JSON.parse(line));
    } catch (err) {
      unparseableLines.push({ line: lineNo, reason: err instanceof Error ? err.message : String(err) });
      continue;
    }
    parsedRows++;

    const floats = [...walkNumbers(row, "")].filter((n) => !isSafeIntegerNumber(n.value));
    if (floats.length) {
      floatRows.push({ line: lineNo, e: row.e, a: row.a, t: row.t, floats });
      floatOccurrences += floats.length;
    }
  }

  return {
    totalLines: lines.length,
    blankLines,
    parsedRows,
    unparseableLines,
    floatRows,
    floatOccurrences,
    verdict: floatRows.length ? "BLOCKED" : "SAFE",
  };
}

function formatReport(report, path) {
  const out = [];
  out.push(`scan-trace-floats: ${path}`);
  out.push(`  lines: ${report.totalLines} (blank: ${report.blankLines}, unparseable: ${report.unparseableLines.length})`);
  out.push(`  rows parsed: ${report.parsedRows}`);
  out.push(`  rows with float-bearing fields: ${report.floatRows.length} (${report.floatOccurrences} field occurrences)`);
  if (report.unparseableLines.length) {
    out.push(`  unparseable lines (first 10 of ${report.unparseableLines.length}):`);
    for (const u of report.unparseableLines.slice(0, 10)) out.push(`    line ${u.line}: ${u.reason}`);
  }
  if (report.floatRows.length) {
    // group by (a, path) so a report over a real trace reads as "which attributes/fields carry
    // floats" rather than a wall of individual rows.
    const byField = new Map(); // "a|path" -> { a, path, count, example }
    for (const r of report.floatRows) {
      for (const f of r.floats) {
        const key = `${r.a}|${f.path}`;
        const cur = byField.get(key);
        if (cur) cur.count++;
        else byField.set(key, { a: r.a, path: f.path, count: 1, example: f.value, exampleLine: r.line });
      }
    }
    out.push(`  offending fields (by attribute + path):`);
    for (const { a, path, count, example, exampleLine } of byField.values()) {
      out.push(`    a=${JSON.stringify(a)} path=${path || "(root)"} — ${count} occurrence(s), e.g. line ${exampleLine}: ${example}`);
    }
    out.push(`  first 5 offending rows:`);
    for (const r of report.floatRows.slice(0, 5)) {
      out.push(`    line ${r.line}: e=${JSON.stringify(r.e)} a=${JSON.stringify(r.a)} t=${r.t} — ${r.floats.map((f) => `${f.path || "(root)"}=${f.value}`).join(", ")}`);
    }
  }
  out.push(`  verdict: ${report.verdict}${report.verdict === "BLOCKED" ? " — a canonical-CBOR re-append (eavt 0.4.0 appendEavt) would reject these rows outright (encodeCanonical requires Number.isSafeInteger); the trace-format migration cannot proceed as a bare converter until these fields are resolved (e.g. quantized/typed-decimal-string encoding upstream of the row)." : " — every number in every row is a safe integer; the CBOR-safety precondition for a bare converter holds for this trace."}`);
  return out.join("\n");
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    process.stderr.write("usage: node scripts/scan-trace-floats.mjs <path-to-trace.jsonl>\n");
    process.exitCode = 2;
    return;
  }

  let text;
  try {
    text = readFlatfileText(path);
  } catch (err) {
    process.stderr.write(`scan-trace-floats: cannot read ${path}: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 2;
    return;
  }

  const report = scanTrace(text);
  process.stdout.write(formatReport(report, path) + "\n");
  process.exitCode = report.verdict === "BLOCKED" ? 1 : 0;
}

// Only run main() when invoked directly (node scripts/scan-trace-floats.mjs ...), not when
// imported by a test for scanTrace()/formatReport() directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
