#!/usr/bin/env node
/**
 * @skill writing-a-work
 * @verb-phrase writing a work
 * @closure-kind process
 * @description Writes a work record from data, validating it against work.schema.json and refusing every unmet precondition; amends a seated work to a changed schema with --amend; and with --check validates every seated work, exiting non-zero on any that does not conform, and non-zero on an empty sweep. Use when seating a new work, amending one to a changed schema, or proving the works pool still says what it claims.
 *
 * @precondition work.schema.json is seated in the schema pool and parses
 * @precondition the work does not already exist, unless amending, in which case it must
 * @precondition the data conforms to work.schema.json as it is on disk right now
 * @precondition the id equals the record's own basename
 * @postcondition the work exists and reads back clean against the schema on disk
 * @postcondition no work that failed its read-back remains on disk
 * @witness the id written and the path it was written to
 * @witness on refusal, the unmet precondition and the schema it was checked against
 * @witness on --check, every work checked, its schema errors, and its residual errors
 *
 * Design: lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/content/text/documents/lld-commission-write-a-duty-and-write-a-work.md
 * (reviewed by senior-software-engineer, verdict PASS-WITH-CONDITIONS, both
 * conditions discharged on the record before this file was written). Sibling:
 * write-a-duty.js, which this file mirrors verbatim in shape. The one
 * structural difference: work.schema.json's `needs` field declares no
 * resolution obligation (its own $comment never says a `needs` entry must
 * resolve to a skill, unlike duty.schema.json's `skills`), and the seated
 * pool bears this out — some `needs` entries name seated skill ids, others
 * name bare capability phrases. Guessing which is which would be exactly the
 * shape-guessing read-a-schema.js itself refuses to do, so REFERENCE_POOLS is
 * empty here: `needs` is read, never checked against a pool.
 *
 * The schema is loaded at RUNTIME and is the only authority on shape.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-work.js --check      # validate every seated work
 * echo '{...}' | node .../write-a-work.js
 * echo '{...}' | node .../write-a-work.js --amend
 * ```
 *
 * `--from` (default: the caller's working directory) is where the works pool
 * is asked for; only where that walk finds nothing does resolution walk up
 * from this script's own file location before refusing.
 *
 * Input is JSON. Output is JSON. Neither is ever prose.
 *
 * ## What it refuses, and why that is the skill
 *
 * A work that already exists, refused and never overwritten. A record that
 * fails its own read-back, withdrawn rather than left seated. An empty
 * --check sweep, because a checker that finds nothing and reports success is
 * worse than none — it reads as proof.
 *
 * ## When NOT to use
 *
 * - Not for editing work.schema.json — the schema is the contract this discharges.
 * - Not for a duty record — that is write-a-duty.js.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = argValue("--from") ?? process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const CHECK = process.argv.includes("--check");

const TYPE = "work";
const POOL_NAME = "works";
// Deliberately empty: work.schema.json declares no field that must resolve
// to another pool. See the header note on `needs`.
const REFERENCE_POOLS = {};
const RESOLVED_POOLS = ["works"];

const UNREADABLE = "__unreadable__";

// ── resolution ─────────────────────────────────────────────────────────────
// Ported verbatim from write-an-office.js / write-a-duty.js: the one
// resolution strategy this firm uses, not a third one invented here.
function findUp(from, shape) {
  let d = resolve(from);
  for (;;) {
    const at = join(d, shape);
    if (existsSync(at)) return at;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

function findSkill(flatName, from) {
  const beside = join(HERE, flatName);
  if (existsSync(beside)) return beside;
  const pooled = findUp(from, join("lib/management/skills", flatName));
  if (pooled) return pooled;
  for (const dir of ["lib/management/skills", ".claude/skills"]) {
    let d = resolve(from);
    for (;;) {
      const holder = join(d, dir);
      if (existsSync(holder)) {
        for (const entry of readdirSync(holder)) {
          const at = join(holder, entry, "scripts", flatName);
          if (existsSync(at)) return at;
        }
      }
      const up = dirname(d);
      if (up === d) break;
      d = up;
    }
  }
  return null;
}

function findUnitRoot(from) {
  let d = resolve(from);
  for (;;) {
    if (existsSync(join(d, "content")) || existsSync(join(d, "lib/management"))) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

const UNIT = (() => {
  const unit = findUnitRoot(FROM) ?? findUnitRoot(HERE);
  if (!unit) die(`⊥ no unit at or above ${FROM} — nothing carries content/ or lib/management. Ask from inside the unit whose records you mean, with --from.`);
  return unit;
})();

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function die(message) {
  process.stdout.write(JSON.stringify({ ok: false, error: message }, null, 2) + "\n");
  process.exit(1);
}

function poolsOf(kind) {
  // Work instances are append-only records in the configuration-management
  // plan's canonical data/records/works carrier; an empty content/works
  // directory must not shadow that authoritative pool.
  if (kind === "works") {
    const data = join(UNIT, "data", "records", kind);
    if (existsSync(data)) return [data];
  }
  const content = join(UNIT, "content", kind);
  if (existsSync(content)) return [content];
  const legacy = join(UNIT, "lib/management", kind);
  return existsSync(legacy) ? [legacy] : [];
}

// Every record seated in a pool, by id — ported verbatim from
// write-an-office.js's seated(). works is presently the plain <id>.json form
// only, but this handles every shape the pool convention admits, exactly as
// write-a-duty.js does, rather than a narrower reader that would silently
// diverge from its sibling.
function seated(kind) {
  const found = new Map();
  for (const pool of poolsOf(kind)) {
    for (const entry of readdirSync(pool)) {
      const flat = join(pool, entry);
      let path;
      if (existsSync(join(flat, "skill.json"))) path = join(flat, "skill.json");
      else if (entry.endsWith(".md") || entry.endsWith(".json")) path = flat;
      else if (existsSync(join(flat, `${entry}.md`))) path = join(flat, `${entry}.md`);
      else if (existsSync(join(flat, "SKILL.md"))) path = join(flat, "SKILL.md");
      else continue;
      let id;
      const base = basename(path);
      if (base === "skill.json" || base === "SKILL.md") id = basename(dirname(path));
      else if (base.endsWith(".schema.json")) id = base.slice(0, -".schema.json".length);
      else if (base.endsWith(".json")) id = basename(base, ".json");
      else id = basename(base, ".md");
      if (!found.has(id)) found.set(id, []);
      found.get(id).push(path);
    }
  }
  return found;
}

function recordOf(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return { [UNREADABLE]: e.message };
  }
}

function asList(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// One answer per question, resolved from where you stand — ported verbatim.
// Present for shape-parity with write-a-duty.js and for the day
// REFERENCE_POOLS grows a first entry; unreachable while it is empty.
function resolveFrom(paths, referrer) {
  if (paths.length === 1) return { path: paths[0] };
  const from = referrer.split("/");
  const scored = paths.map((p) => {
    const parts = p.split("/");
    let shared = 0;
    while (shared < from.length && shared < parts.length && from[shared] === parts[shared]) shared += 1;
    return { path: p, shared, depth: parts.length };
  });
  scored.sort((a, b) => b.shared - a.shared || a.depth - b.depth);
  const [best, next] = scored;
  if (next && next.shared === best.shared && next.depth === best.depth) {
    return { tie: [best.path, next.path] };
  }
  return { path: best.path };
}

// The one validator, called and never copied.
function violationsOf(record) {
  const reader = findSkill("read-a-schema.js", FROM);
  if (!reader) die("⊥ cannot find reading-a-schema — the one validator. No record is written unchecked.");
  const r = spawnSync(process.execPath, [reader, TYPE, "--from", FROM], {
    input: JSON.stringify(record),
    encoding: "utf8",
  });
  let verdict = null;
  try {
    verdict = JSON.parse(r.stdout);
  } catch {
    die(`⊥ reading-a-schema returned nothing parseable checking a ${TYPE}: ${(r.stderr || r.stdout || "").trim()}`);
  }
  return verdict.ok ? [] : (verdict.errors ?? [verdict.error]);
}

async function loadAll() {
  const allSeated = {};
  for (const pool of RESOLVED_POOLS) allSeated[pool] = seated(pool);
  return allSeated;
}

// The residual obligation work.schema.json delegates to a script: id equals
// its basename. REFERENCE_POOLS is empty, so the resolution loop never fires
// today; it is kept in the same shape as write-a-duty.js's so a future field
// that does need resolving costs one REFERENCE_POOLS entry, not a rewrite.
function residualErrors(data, id, allSeated, self) {
  const errs = [];

  if (data.id !== id) {
    errs.push(`id '${data.id}' does not equal its basename '${id}'`);
  }

  for (const [key, pool] of Object.entries(REFERENCE_POOLS)) {
    for (const ref of asList(data[key])) {
      if (!allSeated[pool].has(ref)) {
        errs.push(`${key} names '${ref}', which seats in no ${pool} pool`);
        continue;
      }
      const hit = resolveFrom(allSeated[pool].get(ref), self);
      if (hit.tie) {
        errs.push(`${key} names '${ref}', a true tie between ${hit.tie.join(" and ")}`);
      }
    }
  }

  return errs;
}

async function check() {
  const allSeated = await loadAll();
  const report = { ok: true, checked: 0, records: [] };

  for (const [id, paths] of allSeated[POOL_NAME]) {
    for (const path of paths) {
      const data = recordOf(path);
      report.checked += 1;
      if (data[UNREADABLE]) {
        report.ok = false;
        report.records.push({ id, type: TYPE, path: relative(FROM, path), unreadable: data[UNREADABLE] });
        continue;
      }
      const schemaErrs = violationsOf(data);
      const residual = residualErrors(data, id, allSeated, path);
      if (schemaErrs.length || residual.length) report.ok = false;
      report.records.push({ id, type: TYPE, path: relative(FROM, path), schema: schemaErrs, residual });
    }
  }

  if (report.checked === 0) {
    report.ok = false;
    report.error = "found no records at all — an empty sweep is a broken sweep, not a clean one";
  }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  process.exit(report.ok ? 0 : 1);
}

function readStdinRecord(verb) {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die(`no data on stdin — this ${verb} from data, never from prose`);
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }
  const { body = "", ...data } = parsed;
  if (String(body).trim()) {
    die(`the record carries a prose body — a ${TYPE} record is a JSON instance, and prose belongs in content/text/documents`);
  }
  const id = data.id;
  if (typeof id !== "string" || !id) die("data has no 'id'");
  return data;
}

async function commission() {
  const data = readStdinRecord("commissions");
  const id = data.id;

  const allSeated = await loadAll();
  if (allSeated[POOL_NAME].has(id)) {
    die(`${TYPE} '${id}' already exists at ${relative(FROM, allSeated[POOL_NAME].get(id)[0])} — refused, never overwritten`);
  }

  const schemaErrs = violationsOf(data);
  if (schemaErrs.length) die(`${TYPE} '${id}' does not conform to ${TYPE}.schema.json: ${schemaErrs.join("; ")}`);

  const pool = argValue("--pool") ?? join(UNIT, "data", "records", POOL_NAME);
  const path = join(pool, `${id}.json`);

  const residual = residualErrors(data, id, allSeated, path);
  if (residual.length) die(`${TYPE} '${id}': ${residual.join("; ")}`);

  if (DRY_RUN) {
    process.stdout.write(JSON.stringify({ ok: true, dryRun: true, would: { write: relative(FROM, path) } }, null, 2) + "\n");
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

  // Postcondition, checked rather than assumed.
  const after = await loadAll();
  const backData = recordOf(path);
  const backErrs = backData[UNREADABLE]
    ? [`the record cannot be read back: ${backData[UNREADABLE]}`]
    : [...violationsOf(backData), ...residualErrors(backData, id, after, path)];
  if (backErrs.length) {
    rmSync(path, { force: true });
    die(`${TYPE} '${id}' was written but does not read back clean, so it was withdrawn: ${backErrs.join("; ")}`);
  }

  process.stdout.write(JSON.stringify({ ok: true, commissioned: { type: TYPE, id, path: relative(FROM, path) } }, null, 2) + "\n");
}

async function amend() {
  const data = readStdinRecord("amends");
  const id = data.id;

  const allSeated = await loadAll();
  if (!allSeated[POOL_NAME].has(id)) die(`${TYPE} '${id}' seats nowhere — amend edits what exists; use commission to seat it`);

  const hit = resolveFrom(allSeated[POOL_NAME].get(id), join(UNIT, "data", "records", POOL_NAME));
  if (hit.tie) die(`${TYPE} '${id}' is a true tie between ${hit.tie.join(" and ")}`);

  const before = recordOf(hit.path);
  if (before[UNREADABLE]) die(`${TYPE} '${id}' cannot be read: ${before[UNREADABLE]}`);

  const errs = [...violationsOf(data), ...residualErrors(data, id, allSeated, hit.path)];
  if (errs.length) die(`${TYPE} '${id}' would not conform after amendment: ${errs.join("; ")}`);

  if (DRY_RUN) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          would: {
            amend: relative(FROM, hit.path),
            dropped: Object.keys(before).filter((k) => !(k in data)),
            added: Object.keys(data).filter((k) => !(k in before)),
          },
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  writeFileSync(hit.path, JSON.stringify(data, null, 2) + "\n");

  const back = recordOf(hit.path);
  if (back[UNREADABLE]) die(`${TYPE} '${id}' was amended but cannot be read back: ${back[UNREADABLE]}`);
  const backErrs = [...violationsOf(back), ...residualErrors(back, id, await loadAll(), hit.path)];
  if (backErrs.length) die(`${TYPE} '${id}' was amended but does not read back clean: ${backErrs.join("; ")}`);

  process.stdout.write(
    JSON.stringify({ ok: true, amended: { type: TYPE, id, path: relative(FROM, hit.path) }, dropped: Object.keys(before).filter((k) => !(k in data)) }, null, 2) + "\n",
  );
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node write-a-work.js --check      # validate every seated work",
      "  echo '{...}' | node write-a-work.js",
      "  echo '{...}' | node write-a-work.js --amend",
      "  node write-a-work.js --help",
      "",
      "Input is JSON. Output is JSON. Neither is ever prose.",
    ].join("\n") + "\n",
  );
}

if (process.argv.includes("--help")) printUsage();
else await (CHECK ? check() : process.argv.includes("--amend") ? amend() : commission());
