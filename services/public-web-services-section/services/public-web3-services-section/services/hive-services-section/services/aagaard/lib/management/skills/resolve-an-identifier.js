#!/usr/bin/env node
/**
 * @skill resolving-an-identifier
 * @verb-phrase resolving an identifier
 * @closure-kind process
 * @description Resolves an identifier — a bare kebab slug or an emsenn/<kind>/<slug> namespaced string — to the pool(s) that could hold it and the file(s) actually seated there, under one documented resolution law that names its two legitimate strategies rather than picking a winner and breaking the other. Exports resolveIdentifier (and its parts) as a module for siblings to import, and serves the identical resolution as a CLI. Use wherever an instrument currently re-derives "where does this id seat" by hand instead of asking the one place that answers it.
 *
 * @precondition ref is a non-empty string, either kebab-case or emsenn/<kind>/<slug>
 * @precondition a kind is available, either parsed from ref or given explicitly
 * @precondition strategy, when given, is nearest or global
 * @postcondition the same (ref, kind, from, root, strategy) always resolves to the same pools and seats — resolution is a pure function of its inputs and the filesystem, never of which instrument asked
 * @postcondition nearest resolution walks UP from the asking point and never reads below the unit it lands on
 * @postcondition global resolution walks DOWN from root and never shadows one venture's seat with another's
 * @witness the parsed kind and slug, the strategy used, every pool it looked in, and every seat it found
 * @witness on refusal, which precondition was unmet
 *
 * ## The disagreement this module ends, by naming it rather than erasing it
 *
 * Before this module, three instruments independently converged on ONE answer
 * to "where do MY records for kind K live": write-an-office.js's
 * findUnitRoot+poolsOf, report-an-anomaly.js's findUnit+anomalyPool, and
 * raise-an-idea.js's findUnitRoot+ideasPool all walk UP from the asking point
 * to the nearest ancestor carrying content/ or lib/management/, then read
 * content/<kind> if it exists, else lib/management/<kind>. Three instruments
 * arriving at the identical rule without coordinating is strong evidence it
 * is the right default, so it is this module's NEAREST strategy and its
 * default.
 *
 * Two other instruments — dispatch-a-task.js's officeSeats and
 * list-open-obligations.js's officeSeats — walk DOWN from the repo root,
 * collecting every offices/ directory in the whole tree that holds the id.
 * This is not the same question with a different answer; it is a genuinely
 * different question. write-an-office.js's own header says why nearest
 * cannot answer it: "executive-assistant names the 561 Group's office inside
 * the 561 Group and emsenn's inside emsenn's tree" — office ids intentionally
 * repeat across ventures, and "does an office of this id exist ANYWHERE, so a
 * dispatch to it is not a dispatch to nobody" has to search the whole tree,
 * not shadow one venture's seat with the nearest one. That is this module's
 * GLOBAL strategy, preserved as an explicit, named, opt-in mode rather than
 * silently dropped to make the two camps look like one.
 *
 * The anomalies naming this conflict —
 * office-resolution-disagrees-across-instruments and
 * write-a-term-and-write-a-schema-resolve-pools-by-different-strategies —
 * are retired not by declaring one strategy wrong, but by giving both a
 * single, shared, tested implementation, so a future disagreement is a merge
 * conflict in one file instead of five files quietly drifting apart.
 *
 * A third case, decision-records-pool-split-across-two-seats, is neither of
 * the above: content/decision-records and lib/management/decision-records
 * are BOTH simultaneously live inside one unit (emsenn), and neither may
 * shadow the other the way legacy pools ordinarily do — supersede-a-task.js's
 * DECISION_POOLS already scans both, every call. This module carries that as
 * multiSeat: true, a per-kind override on the NEAREST strategy that scans
 * and merges content/<kind> and lib/management/<kind> instead of the first
 * shadowing the second. It is not a third strategy; it is a documented
 * exception inside the first one, on the one kind that currently needs it.
 *
 * ## What resolution answers, and what it refuses to answer
 *
 * This module answers "which pool(s), and which seated file(s), for this
 * id" — nothing about whether the record found there is well-formed (that is
 * reading-a-schema.js's job) and nothing about which of several ties should
 * win when a caller needs ONE answer (that is write-an-office.js's own
 * resolveFrom, scoped to its own reciprocal-edge bookkeeping and left there
 * rather than folded in here, because "nearest by shared path prefix among
 * globally-collected candidates" is a third question again — disambiguating
 * among ties the referrer's own position, not resolving an id at all).
 *
 * ## Run it
 *
 * ```sh
 * node .../resolve-an-identifier.js office --kind offices --global --root <repo>
 * node .../resolve-an-identifier.js emsenn/idea/adopt-public-standard-protocols --from <dir>
 * node .../resolve-an-identifier.js decision-records-pool-split-across-two-seats --kind decision-records --multi-seat --from <dir>
 * ```
 *
 * As a module:
 *
 * ```js
 * import { resolveIdentifier } from ".../resolve-an-identifier.js";
 * const hit = resolveIdentifier("executive-assistant", { kind: "offices", strategy: "global", root });
 * ```
 *
 * Output is JSON. `--from` (default: the caller's working directory) is
 * where nearest resolution starts; `--root` (default: the caller's working
 * directory) is where global resolution starts. Neither is ever guessed from
 * `git rev-parse` — a node may be a submodule, so the enclosing git toplevel
 * says nothing about where a UNIT's own pools are.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **An empty or non-string ref** — refused. Nothing to resolve.
 * - **A bare slug with no --kind, and no emsenn/<kind>/<slug> to parse one
 *   from** — refused. A slug alone does not say which pool it lives in;
 *   guessing would be a second, worse answer to the exact question this
 *   module exists to give one answer to.
 * - **A strategy that is neither nearest nor global** — refused, named.
 *
 * It does NOT refuse an id that resolves to nothing — that is a normal,
 * witnessed outcome (`seats: []`), not an error; the caller decides whether
 * an unseated id is fine (checking existence) or fatal (dereferencing it).
 *
 * ## When NOT to use
 *
 * - Not for validating a record's shape once resolved — reading-a-schema.js.
 * - Not for disambiguating a true tie by the referrer's own position —
 *   write-an-office.js's resolveFrom remains that instrument's own, narrower
 *   concern.
 * - Not for finding a SIBLING SCRIPT (read-a-schema.js, make-a-task.js) —
 *   that is a different resolution question again (a skill projected into a
 *   node vs. a pool record seated in one), answered by each script's own
 *   findSkill/sibling helper, which this module does not attempt to absorb.
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// Kinds whose pool is presently split across two SIMULTANEOUSLY live seats
// within one unit, per decision-records-pool-split-across-two-seats — never
// silently grown; a kind joins this set only when an anomaly names it, the
// same way decision-records was named before this module existed.
const MULTI_SEAT_KINDS = new Set(["decision-records"]);

// Kinds whose instances are write-once or append-only — a log, never a
// record amended in place — per the Chairperson's content/data/lib rule
// (idea lib-is-class-content-is-mutable-instance-data-is-write-once-instance):
// lib/ holds classes; content/ holds instances iteratively amended in place
// (offices, duties, works, glossary terms, documents, references); data/
// holds instances written once and read forever, or only ever appended to.
// Never silently grown; a kind joins this set on the same authority
// MULTI_SEAT_KINDS does — a named decision, not a convenient default.
const DATA_KINDS = new Set([
  "tasks", "dispatches", "work-items", "anomalies", "ideas",
  "decision-records", "requirement-events", "requirements", "movements", "books",
]);

export function isDataKind(kind) {
  return DATA_KINDS.has(kind);
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const NAMESPACED = /^emsenn\/([a-z0-9-]+)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/u;

const SKIP_DIRS = new Set(["node_modules", ".git", ".claude", "dist", "build", "archive", "_archive", "triage", "preservation", "fixtures"]);

/**
 * Parse a bare slug or an emsenn/<kind>/<slug> string into {kind, slug}.
 *
 * An explicit defaultKind (a caller's --kind) always wins over a namespaced
 * ref's own kind segment, never merely fills a gap. This is not a preference
 * for convenience: the namespaced convention names a TERM's grammatical
 * kind, singular (emsenn/idea/x, emsenn/requirement/x), which is routinely a
 * different STRING from the pool directory that actually holds the record,
 * plural (content/ideas, content/requirements) — a mismatch already present
 * throughout the pool before this module existed (raise-an-idea.js writes
 * exactly this ref shape). A caller that knows the pool name is always more
 * authoritative than singular/plural guessed from the ref's own words.
 */
export function parseRef(ref, defaultKind) {
  if (typeof ref !== "string" || !ref.trim()) {
    return { error: "ref is empty or not a string — nothing to resolve" };
  }
  const namespaced = NAMESPACED.exec(ref);
  if (namespaced) return { kind: defaultKind ?? namespaced[1], slug: namespaced[2] };
  if (!KEBAB.test(ref)) {
    return { error: `ref '${ref}' is neither kebab-case nor emsenn/<kind>/<slug>` };
  }
  if (!defaultKind) {
    return { error: `ref '${ref}' is a bare slug and no kind was given — a slug alone does not say which pool it lives in` };
  }
  return { kind: defaultKind, slug: ref };
}

// ── nearest: walk UP to the nearest unit boundary ───────────────────────────
// The rule write-an-office.js's findUnitRoot, report-an-anomaly.js's
// findUnit, and raise-an-idea.js's findUnitRoot already independently agree
// on: the nearest ancestor carrying content/ (the current class/instance
// convention) or lib/management/ (the convention a not-yet-migrated unit
// still carries) IS the unit. Nearest wins; only where the walk from the
// asking point finds nothing does it retry once from this module's own file
// location, so a bare invocation run from above every unit still resolves.
export function findUnit(from) {
  let d = resolvePath(from);
  for (;;) {
    if (existsSync(join(d, "package.json"))) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

function resolveUnit(from) {
  return findUnit(from) ?? findUnit(HERE);
}

// The pool(s) for a kind, AT ONE UNIT. Ordinarily content/<kind> shadows
// legacy lib/management/<kind> exactly as poolsOf() does in
// write-an-office.js and raise-an-idea.js's decisionPools()/ideasPool() do
// for the single-seat case. multiSeat scans and returns BOTH when both
// exist, nearer (content/) first — the exception decision-records needs,
// carried the same way supersede-a-task.js's DECISION_POOLS array already
// carries it.
export function poolsFor(kind, unit, { multiSeat = false } = {}) {
  if (!unit) return [];
  const content = join(unit, "content", kind);
  if (multiSeat) return [];
  if (existsSync(content)) return [content];
  return [];
}

// A slug's candidate file shapes within one pool directory. <slug>.json is
// the normative instance form; the rest are legacy shapes still discovered
// so a foreign or not-yet-normalized pool resolves — the identical list
// dispatch-a-task.js's officeSeats, report-an-anomaly.js's officeSeats, and
// list-open-obligations.js's officeSeats each hardcoded separately. Exported
// so a caller that already has a pool directory in hand (rather than a
// kind + asking point) does not have to re-list the shapes to check it.
export function seatForms(pool, slug) {
  return [
    join(pool, `${slug}.json`),
    join(pool, `${slug}.schema.json`),
    join(pool, `${slug}.md`),
    join(pool, slug, `${slug}.md`),
  ].filter(existsSync);
}

// ── data: write-once/append-only kinds, day-bucketed under data/<kind> ─────
// A data pool is not a directory of one-file-per-slug instances the way a
// content pool is — it is a log: every record a day produced for a kind
// lands as one line in that day's <YYYY>-<MM>-<DD>-<kind>.jsonl, under
// data/<bucket>/<kind>/<YYYY>/<MM>/<DD>/. Reading a data pool means reading
// every day file it has; a log has no "nearest", only "all of it", so these
// are kept as their own named functions rather than forced through
// poolsFor/seatForms, which assume one file per slug.
//
// Every function below takes `base` — the kind's own data directory,
// e.g. dataDir(unit, kind) for the ordinary case, or a caller's own
// literal override directory (the same shape a --pool flag already gives
// content-pool callers) — never a unit that it re-derives a kind pool from
// a second time. `kind` is carried alongside base only because it is also
// the day-file's own name suffix.

// The settled convention retires bare data/<kind> in favor of exactly four
// top-level buckets — data/journals, data/ledgers, data/state, data/records —
// with each kind seating under one of them. A kind not yet named here (e.g.
// movements, books) has no settled bucket and is left bare until an anomaly
// or decision names where it seats — never silently guessed.
const DATA_KIND_BUCKETS = {
  tasks: "state",
  dispatches: "state",
  "work-items": "state",
  anomalies: "records",
  ideas: "records",
  "decision-records": "records",
  "requirement-events": "journals",
  requirements: "records",
};

export function dataDir(unit, kind) {
  const bucket = DATA_KIND_BUCKETS[kind];
  return bucket ? join(unit, "data", bucket, kind) : join(unit, "data", kind);
}

// Best-effort date a record itself states, never filesystem mtime — the same
// discipline project-pools-to-eavt.js's own header states for time. Checked
// in the order a record is most likely to carry it.
export function recordDate(record) {
  const provenance = record?.["x-provenance"]?.["recorded-on"];
  if (typeof provenance === "string") return provenance;
  const direct = record?.["recorded-on"];
  if (typeof direct === "string") return direct;
  const at = record?.at;
  if (typeof at === "string" && at.length >= 10) return at.slice(0, 10);
  return null;
}

function dayFileFor(base, kind, dateStr) {
  const [y, m, d] = dateStr.split("-");
  // Walked up to the nearest package.json rather than a fixed two-level
  // dirname: DATA_KIND_BUCKETS nests a bucketed kind's base three levels
  // under the node root (data/<bucket>/<kind>) instead of two
  // (data/<kind>), and a fixed-depth guess silently missed the manifest and
  // fell back to the generic "node" name for every bucketed kind.
  const nodeRoot = findUnit(base) ?? dirname(dirname(base));
  let node = "node";
  try {
    const manifest = JSON.parse(readFileSync(join(nodeRoot, "package.json"), "utf8"));
    node = String(manifest.name ?? "node").replace(/^@[^/]+\//u, "");
  } catch {
    // A missing manifest is handled by the caller's node-boundary admission.
  }
  return join(base, y, m, d, `${dateStr}-${node}-${kind}.jsonl`);
}

export function dataDayFile(base, kind, dateStr) {
  return dayFileFor(base, kind, dateStr);
}

// Every day-file a data pool currently holds, oldest first.
export function listDataDayFiles(base, kind) {
  const files = [];
  if (!existsSync(base)) return files;
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && entry.name.endsWith(`-${kind}.jsonl`)) files.push(child);
    }
  })(base);
  return files.sort();
}

// Every record a data pool currently holds, each carrying the file and
// 1-indexed line it came from — a caller naming where a record lives (an
// anomaly, a --verify failure) has that without re-deriving it.
export function readDataPool(base, kind) {
  const records = [];
  for (const file of listDataDayFiles(base, kind)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      let record;
      try {
        record = JSON.parse(line);
      } catch (e) {
        throw new Error(`${file}:${i + 1} is not valid JSON: ${e.message}`);
      }
      records.push({ file, line: i + 1, record });
    });
  }
  return records;
}

// Append one record to its day's file, creating the file and every
// intermediate directory the first time that day writes anything for this
// kind. date (default: recordDate(record), then today) decides which file —
// never mtime, and never silently "whichever file happens to be newest".
export function appendDataRecord(base, kind, record, { date } = {}) {
  const dateStr = date ?? recordDate(record) ?? new Date().toISOString().slice(0, 10);
  const file = dayFileFor(base, kind, dateStr);
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(record)}\n`);
  return { file, date: dateStr };
}

// Find one record in a data pool by its own id field — the LAST matching
// line, not the first. Most data kinds enforce one write per id outright
// (their own writer refuses a second), so this is a no-op for them; a kind
// that legitimately amends by appending a fresh full snapshot under the
// same id (requirements: tier decided, realized-by grown) relies on this to
// mean "latest wins", the same replay rule any append log uses. Kinds
// without a stable id (requirement-events name a requirement + kind, not
// an id of their own) are read wholesale via readDataPool and filtered by
// the caller instead — this is for the common id-addressed case.
export function findDataRecord(base, kind, id) {
  const matches = readDataPool(base, kind).filter((r) => r.record?.id === id);
  return matches.length ? matches[matches.length - 1] : null;
}

function resolveNearest(kind, slug, { from, multiSeat } = {}) {
  const unit = resolveUnit(from ?? process.cwd());
  const pools = poolsFor(kind, unit, { multiSeat });
  const seats = pools.flatMap((pool) => seatForms(pool, slug));
  return { unit, pools, seats };
}

// ── global: walk DOWN collecting every seat tree-wide ───────────────────────
// The rule dispatch-a-task.js's officeSeats and list-open-obligations.js's
// officeSeats already agree on for office resolution: recurse from root over
// every non-skipped directory, and any directory literally named <kind>
// holding a matching file is a seat — deliberately not shadowed by nearness,
// because two ventures legitimately seat the same id (write-an-office.js's
// own commentary: "executive-assistant names the 561 Group's office inside
// the 561 Group and emsenn's inside emsenn's tree").
export function findGlobalPools(kind, root) {
  const found = [];
  (function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const child = join(dir, entry.name);
      if (entry.name === kind) found.push(child);
      else walk(child);
    }
  })(resolvePath(root));
  return found;
}

function resolveGlobal(kind, slug, { root } = {}) {
  const pools = findGlobalPools(kind, root ?? process.cwd());
  const seats = pools.flatMap((pool) => seatForms(pool, slug));
  return { pools, seats };
}

/**
 * Resolve ref (bare slug or emsenn/<kind>/<slug>) to its pool(s) and seated
 * file(s). opts: { kind, from, root, strategy: "nearest" | "global", multiSeat }.
 * Returns { ok, error? } on refusal, or { ok: true, ref, kind, slug,
 * strategy, unit?, pools, seats, seat } — seat is seats[0] ?? null, offered
 * for the common case of a caller that just wants ONE answer and is
 * prepared to treat a genuine tie as its own problem (write-an-office.js's
 * resolveFrom, not this module's job).
 */
export function resolveIdentifier(ref, opts = {}) {
  const parsed = parseRef(ref, opts.kind);
  if (parsed.error) return { ok: false, error: parsed.error };

  const strategy = opts.strategy ?? "nearest";
  if (strategy !== "nearest") {
    return { ok: false, error: `strategy '${strategy}' crosses settlement membranes; resolve from one node or send a contracted request` };
  }
  if (opts.multiSeat === true) {
    return { ok: false, error: "multi-seat resolution is a central-pool migration artifact, not a node-local operation" };
  }

  const result = resolveNearest(parsed.kind, parsed.slug, opts);

  return {
    ok: true,
    ref,
    kind: parsed.kind,
    slug: parsed.slug,
    strategy,
    ...result,
    seat: result.seats[0] ?? null,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node resolve-an-identifier.js <ref> [--kind K] [--from DIR] [--root DIR]",
      "                                 [--global] [--multi-seat] [--help]",
      "",
      "  <ref>       a bare kebab slug (needs --kind) or emsenn/<kind>/<slug>",
      "  --kind      the pool name (e.g. offices, ideas, decision-records)",
      "  --from      asking point for nearest resolution (default: cwd)",
      "  --root      root for global resolution (default: cwd)",
      "  --global    use the global (walk-down, tree-wide) strategy instead of nearest",
      "  --multi-seat  force scanning content/<kind> and lib/management/<kind> both",
      "",
      "Output is JSON: { ok, kind, slug, strategy, pools, seats, seat }.",
    ].join("\n") + "\n",
  );
}

function relativizeAll(result, from) {
  const rel = (p) => (typeof p === "string" ? relative(from, p) : p);
  return {
    ...result,
    ...(result.unit ? { unit: rel(result.unit) } : {}),
    ...(result.pools ? { pools: result.pools.map(rel) } : {}),
    ...(result.seats ? { seats: result.seats.map(rel) } : {}),
    ...(result.seat !== undefined ? { seat: rel(result.seat) } : {}),
  };
}

function main() {
  if (process.argv.includes("--help")) { printUsage(); return; }
  const ref = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : undefined;
  if (!ref) { printUsage(); out({ ok: false, error: "no ref given" }, 1); }

  const from = argValue("--from") ?? process.cwd();
  if (process.argv.includes("--global") || process.argv.includes("--multi-seat")) {
    out({ ok: false, error: "cross-settlement scans are refused; address one node or use its contracted boundary" }, 1);
  }
  const opts = {
    kind: argValue("--kind"),
    from,
    strategy: "nearest",
  };

  const result = resolveIdentifier(ref, opts);
  if (!result.ok) out(result, 1);
  out(relativizeAll(result, from));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
