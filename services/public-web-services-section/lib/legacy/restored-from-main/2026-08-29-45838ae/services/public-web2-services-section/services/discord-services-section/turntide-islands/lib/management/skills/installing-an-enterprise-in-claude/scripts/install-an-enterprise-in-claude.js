#!/usr/bin/env node
/**
 * @skill installing-an-enterprise-in-claude
 * @verb-phrase installing an enterprise in claude
 * @closure-kind process
 * @description Installs a whole enterprise into a node: every office seated in the enterprise's offices/ roster is installed as a subagent by calling installing-claude-as-an-agent once per office, and a generated standing block is spliced into <node>/CLAUDE.md between its markers so a fresh session at that node knows, with no other context, to delegate work to those offices and to run the obligation loop. Refuses an enterprise path holding no offices/ directory, an empty roster, a root that does not contain the enterprise, a torn marker pair, a roster record that yields no description, and a cited instrument that seats nowhere; a sibling installer's failure kills the install with its stderr shown and the offices already installed recorded in the manifest, so no partial success is reported as success and --clean can sweep the residue. Use to stand a node up as an enterprise's dispatcher; use the two sibling installers to seat one office; never edit the block by hand — CLAUDE.md between the markers is output, regenerated on the next install.
 *
 * @precondition the enterprise path holds an offices/ directory — its absence is an absence, not an empty enterprise
 * @precondition the repo root (--root, defaulting to the working directory) contains the enterprise, so every path the block cites renders true
 * @precondition --authority-root explicitly names the git worktree whose operated scope contains both the source enterprise and target node without crossing a checked-out submodule boundary
 * @precondition the roster seats at least one office, each id in exactly one of the three record shapes
 * @precondition the node exists and is a directory
 * @precondition the sibling installer seats beside this script, or in the lib/management/skills pool of a unit at or above a projected copy
 * @precondition every instrument the block cites seats in the enterprise's skills pool
 * @precondition every roster record yields a first sentence for its roster line
 * @precondition the node's CLAUDE.md, when present, holds both markers or neither — a torn pair is refused
 * @postcondition every roster office is installed as an agent at the node by the sibling installer, under its manifest discipline
 * @postcondition the node's CLAUDE.md holds the generated block between the markers, byte-identical to the projection, read back and checked
 * @postcondition the rest of the node's CLAUDE.md outside the markers is byte-identical to what was there before, and clean restores it byte-identically, guided by the splice mode the manifest records
 * @postcondition the node's enterprise manifest records each office as it installs, and the block's splice mode, so clean is exact even after a mid-roster failure
 * @witness each office installed, in the sibling installer's own witness lines, uncensored
 * @witness the block spliced and the file it landed in, and on dry run, what would be done rather than a claim that it was
 * @witness on refusal, the unmet precondition, named, and on a mid-roster failure, that the manifest holds what installed so clean can sweep it
 *
 * An enterprise install is the third relation between an office and a node.
 * installing-claude-as-an-office seats one office as the identity a node's
 * sessions step into; installing-claude-as-an-agent seats one office as a
 * colleague a session hands work to. This skill seats the WHOLE ROSTER as
 * colleagues, and teaches the node's own sessions what to do with them: the
 * session at an enterprise node holds no office itself — it is the
 * dispatcher, and the standing block in its CLAUDE.md is the whole of its
 * standing instruction.
 *
 * The block is a deterministic projection of the enterprise's pools — same
 * enterprise, same root, same block, from any working directory, because
 * every path it cites renders relative to a root that is checked to contain
 * the enterprise. It fabricates no roster fact: the office that attestation
 * belongs to is read from the roster (the bearer of attesting-a-work-product),
 * and an enterprise that seats no such office is told exactly that — the
 * operator is the witness. The instruments it cites are cited with the
 * enterprise's own pools passed explicitly, so the commands are true for a
 * non-default enterprise, not only for the one this repository grew first.
 *
 * The agents are not installed here; they are installed by the sibling,
 * called once per office and never copied — found beside this script in the
 * flat pool, or by walking up to the lib/management/skills pool of the unit
 * a projected copy seats under. Its refusals are this skill's refusals,
 * propagated uncensored, and a mid-roster failure stops the install with
 * everything already installed recorded in the enterprise manifest, so
 * --clean sweeps the residue rather than stranding it.
 *
 * ## One block, both markers
 *
 * The block lands in <node>/CLAUDE.md between
 * `<!-- installing-an-enterprise-in-claude: begin -->` and its end marker.
 * A file that does not exist is created holding only the block; a file
 * holding both markers has the block replaced in place, byte-exact, the
 * rest untouched; a file holding neither gets the block appended after one
 * separator newline. Which of the three happened is recorded in the
 * manifest as the block's splice mode, and clean undoes exactly that —
 * the separator is removed only when the splice added it, a created file
 * left holding nothing is removed, and a block spliced between pre-existing
 * markers is excised without touching a byte on either side. A file holding
 * ONE marker is a torn block — a contradiction to name, not a thing to
 * repair silently — and is refused.
 *
 * ## Run it
 *
 * ```sh
 * node .../install-an-enterprise-in-claude.js [<enterprise>] [<node>] --root <repo-root> --authority-root <git-worktree-root>
 * node .../install-an-enterprise-in-claude.js <enterprise> <node> --list --root <repo-root> --authority-root <git-worktree-root>
 * node .../install-an-enterprise-in-claude.js <enterprise> <node> --dry-run --root <repo-root> --authority-root <git-worktree-root>
 * node .../install-an-enterprise-in-claude.js <enterprise> <node> --clean --root <repo-root> --authority-root <git-worktree-root>
 * node .../install-an-enterprise-in-claude.js <enterprise> <node> --reinstall --root <repo-root> --authority-root <git-worktree-root>
 * ```
 * Every form also requires `--authority-root <git-worktree-root>`; it is
 * deliberately not defaulted from `--root`, because omission is not consent.
 *
 * <enterprise> is the enterprise's management library — a directory holding
 * an offices/ pool, with duties/, works/ and skills/ expected beside it —
 * defaulting to <node>/lib/management. <node> is the directory whose
 * sessions receive the enterprise, defaulting to the working directory.
 * Installs are recorded in <node>/.claude/.claude-enterprise-manifest, each
 * office as it installs, so that --clean is exact: it removes the block by
 * the recorded splice mode (the rest of the file byte-identical), delegates
 * --clean per manifest office to the sibling — or, for an office whose
 * record no longer seats in the roster, performs the sibling's exact
 * inverse here and says so, since the sibling refuses to resolve a record
 * that is gone — and removes the manifest. A manifest-less clean reports
 * that there is nothing to clean, which is a report, not an error; a dry
 * run of clean says what it would do, never that it did.
 *
 * Known limit, stated rather than hidden: a manifest written before the
 * splice mode was recorded carries a bare `CLAUDE.md` line, and clean
 * degrades it to in-place — the non-destructive default, which touches no
 * byte outside the markers. An old separator-mode install cleaned through
 * such a manifest therefore leaves its one separator newline behind rather
 * than risk eating a byte that was never this mechanism's.
 *
 * ## What it refuses, and why that is the skill
 *
 * - **No offices/ at the enterprise path** — refused. That is an absence,
 *   not an empty enterprise; installing from it would invent a roster.
 * - **A root that does not contain the enterprise** — refused. The block's
 *   cited paths render relative to the root, and a root that does not hold
 *   the enterprise would bake lies into the node's standing instruction.
 * - **An empty roster** — refused. An enterprise with no offices installs
 *   nothing, and an install that does nothing must say so rather than
 *   succeed.
 * - **A torn marker pair** — refused. One marker without the other is a
 *   contradiction in the node's own record of itself.
 * - **A sibling installer failure** — fatal, stderr shown, the offices
 *   already installed left recorded so clean can sweep them. No partial
 *   success is reported as success.
 * - **A roster record yielding no sentence; a cited instrument seating
 *   nowhere** — refused. The block is a projection, and a projection that
 *   fabricates or cites what does not exist is a lie in the node's
 *   standing instruction.
 *
 * The question is always asked of the enterprise's pools, never of the
 * seated files: CLAUDE.md between the markers and .claude/agents/ are
 * output. Hand-editing them cannot provoke a refusal — reinstalling over
 * the edit is the correction, which is why the edit belongs in the record.
 *
 * ## When NOT to use
 *
 * - Not for seating one office — that is installing-claude-as-an-office
 *   (the identity a session steps into) or installing-claude-as-an-agent
 *   (one colleague a session delegates to).
 * - Not for authoring offices, duties, or skills — this installs what
 *   already exists.
 * - Not for editing the standing block. It is output: change the
 *   enterprise's records and reinstall.
 */

import { spawnSync as fsSpawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, mkdirSync as fsMkdirSync, rmSync as fsRmSync, statSync, writeFileSync as fsWriteFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(argValue("--root") ?? process.cwd());
const DRY_RUN = process.argv.includes("--dry-run");
const REINSTALL = process.argv.includes("--reinstall");

const BEGIN = "<!-- installing-an-enterprise-in-claude: begin -->";
const END = "<!-- installing-an-enterprise-in-claude: end -->";

// The duty whose bearer the block names as the attesting office. Read from
// the roster, never assumed: an enterprise that seats no bearer is told so.
const ATTESTING_DUTY = "attesting-a-work-product";

// The instruments the standing block cites, each expected in the
// enterprise's skills pool. A block citing an instrument that seats nowhere
// is a lie in the node's standing instruction, so their existence is a
// precondition, not a hope.
const INSTRUMENTS = [
  "project-a-skill.js",
  "write-a-schema.js",
  "write-an-office.js",
  "make-a-task.js",
  "dispatch-a-task.js",
  "list-open-obligations.js",
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function die(message) {
  console.error(`install-an-enterprise-in-claude: ${message}`);
  process.exit(1);
}

let revalidateMeshAuthority = () => {};

function meshRefusal(error) {
  const facts = error?.facts && Object.keys(error.facts).length ? `\n${JSON.stringify(error.facts)}` : "";
  die(`${error?.message ?? error}${facts}`);
}

function assertMeshAuthority() {
  try {
    revalidateMeshAuthority();
  } catch (error) {
    meshRefusal(error);
  }
}

// Every effect crosses this wrapper. The admission is installed before any
// wrapper can mutate the target, and is re-derived immediately beforehand.
function spawnSync(...args) { assertMeshAuthority(); return fsSpawnSync(...args); }
function mkdirSync(...args) { assertMeshAuthority(); return fsMkdirSync(...args); }
function rmSync(...args) { assertMeshAuthority(); return fsRmSync(...args); }
function writeFileSync(...args) { assertMeshAuthority(); return fsWriteFileSync(...args); }

function rel(p) {
  return relative(REPO_ROOT, p) || ".";
}

// Walk from the asking point UP, testing <D>/<shape> at each D — the same
// resolution as list-open-obligations.js's, because this script runs both
// flat in the pool and projected into a scripts/ directory two levels down.
function findUp(from, shape) {
  let d = from;
  for (;;) {
    const at = join(d, shape);
    if (existsSync(at)) return at;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

function resolveAuthorityGate() {
  const beside = join(HERE, "mesh-scope.js");
  if (existsSync(beside)) return beside;
  const projectedSibling = resolve(HERE, "../../enforcing-mesh-scope/scripts/mesh-scope.js");
  if (existsSync(projectedSibling)) return projectedSibling;
  let d = HERE;
  for (;;) {
    for (const shape of [
      "lib/management/skills/mesh-scope.js",
      "lib/management/skills/enforcing-mesh-scope/scripts/mesh-scope.js",
      "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/mesh-scope.js",
      "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/enforcing-mesh-scope/scripts/mesh-scope.js",
    ]) {
      const at = join(d, shape);
      if (existsSync(at)) return at;
    }
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  die("cannot find the shared mesh-scope authority gate — no enterprise install proceeds without the one firm-wide boundary rule");
}

async function admitMeshAuthority(enterprise, node, operation) {
  const authorityRoot = argValue("--authority-root");
  if (!authorityRoot || authorityRoot.startsWith("--")) {
    die("--authority-root is required; omission is not consent and no --force or free-text claim can replace target-local authority");
  }
  const gate = await import(pathToFileURL(resolveAuthorityGate()).href);
  try {
    const admission = gate.admitEnterpriseInstall({
      authorityRoot,
      sourceEnterprise: enterprise,
      targetNode: node,
      installer: "claude",
      operation,
      mode: DRY_RUN ? "dry-run" : "apply",
    });
    revalidateMeshAuthority = () => gate.revalidateEnterpriseInstall(admission);
    assertMeshAuthority();
    return admission.request;
  } catch (error) {
    meshRefusal(error);
  }
}

// --- the node and the enterprise --------------------------------------------------

function resolveNode(arg) {
  const dir = arg ? (isAbsolute(arg) ? arg : resolve(process.cwd(), arg)) : process.cwd();
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    die(`node '${arg}' is not a directory. The node is where the enterprise gets installed; it must already exist.`);
  }
  return dir;
}

function resolveEnterprise(arg, node) {
  const dir = arg ? (isAbsolute(arg) ? arg : resolve(REPO_ROOT, arg)) : join(node, "lib/management");
  if (!existsSync(rosterDirOf(dir)) || !statSync(rosterDirOf(dir)).isDirectory()) {
    die(
      `${rosterDirOf(dir)} does not exist — that is an absence, not an empty enterprise. ` +
        `An enterprise is a management library (<node>/lib/management) whose node seats its ` +
        `office instances in <node>/content/offices: classes and instruments in lib, instances in content.`,
    );
  }
  // Every path the block cites renders relative to the root; a root that
  // does not contain the enterprise would bake ../.. lies into the node's
  // standing instruction, differently from each working directory.
  const inside = relative(REPO_ROOT, dir);
  if (inside.startsWith("..") || isAbsolute(inside)) {
    die(
      `the root ${REPO_ROOT} does not contain the enterprise at ${dir} — the standing block cites paths ` +
        `relative to the root, and a root that does not hold the enterprise would bake lies into it. ` +
        `Pass --root as the repository root the enterprise seats under.`,
    );
  }
  return dir;
}

// --- the roster --------------------------------------------------------------------

// The enterprise is <node>/lib/management; its node's instances seat in
// <node>/content. The roster is content/offices — instances in content,
// classes and instruments in lib.
function rosterDirOf(enterprise) {
  return join(dirname(dirname(enterprise)), "content/offices");
}

// An office seats in the roster normatively as <id>.json — a plain instance
// of emsenn/schema/office. Legacy shapes (<id>.schema.json, <id>.md,
// <id>/<id>.md) are still read so a not-yet-normalized roster resolves. One
// id in two shapes is one name resolving to two records — refused, both named.
function roster(rosterDir) {
  const seats = new Map();
  const seat = (id, record) => {
    const prior = seats.get(id);
    if (prior) {
      die(`office '${id}' seats twice in ${rel(rosterDir)} — one name cannot resolve to two records:\n  ${rel(prior)}\n  ${rel(record)}`);
    }
    seats.set(id, record);
  };
  for (const entry of readdirSync(rosterDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const record = join(rosterDir, entry.name, `${entry.name}.md`);
      if (existsSync(record)) seat(entry.name, record);
      continue;
    }
    if (entry.name.endsWith(".schema.json")) seat(basename(entry.name, ".schema.json"), join(rosterDir, entry.name));
    else if (entry.name.endsWith(".json")) seat(basename(entry.name, ".json"), join(rosterDir, entry.name));
    else if (entry.name.endsWith(".md")) seat(basename(entry.name, ".md"), join(rosterDir, entry.name));
  }
  return [...seats.entries()].map(([id, record]) => ({ id, record })).sort((a, b) => a.id.localeCompare(b.id));
}

// --- reading the records, for the roster lines and the attesting office -------------

function readSpec(office) {
  if (office.spec) return office.spec;
  try {
    office.spec = JSON.parse(readFileSync(office.record, "utf8"));
  } catch (e) {
    die(`${rel(office.record)} is unreadable: ${e.message}`);
  }
  return office.spec;
}

function frontmatter(file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, "utf8"));
  return match ? match[1] : undefined;
}

// Reads `key: value` and the block-scalar forms (`key: >` / `key: |`), as
// the sibling installer reads them: frontmatter records are written by hand
// in both shapes, so both are read; folded lines join with spaces.
function frontmatterText(file, key) {
  const fm = frontmatter(file);
  if (!fm) return undefined;
  const block = new RegExp(`^${key}:[ \\t]*[>|][+-]?[ \\t]*\\r?\\n((?:[ \\t]+.*\\r?\\n?|[ \\t]*\\r?\\n)+)`, "m").exec(fm);
  if (block) {
    return block[1].split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  }
  const scalar = new RegExp(`^${key}:[ \\t]*(.+)$`, "m").exec(fm);
  return scalar ? scalar[1].trim() : undefined;
}

function frontmatterList(file, key) {
  const fm = frontmatter(file);
  if (!fm) return [];
  const inline = new RegExp(`^${key}:[ \\t]*\\[(.*)\\][ \\t]*$`, "m").exec(fm);
  if (inline) return inline[1].split(",").map((s) => s.trim()).filter(Boolean);
  const block = new RegExp(`^${key}:[ \\t]*\\r?\\n((?:[ \\t]*-[ \\t]*.+\\r?\\n?)+)`, "m").exec(fm);
  if (block) {
    return block[1]
      .split("\n")
      .map((l) => l.replace(/^[ \t]*-[ \t]*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function firstSentence(text) {
  const s = String(text ?? "").trim();
  return s ? s.split(/(?<=\.)\s/)[0] : "";
}

// The roster line's description: a canonical record's first sentence of
// normative-structure, or a frontmatter office's first sentence of
// description. A record that yields no sentence is refused — a roster line
// with no description delegates nothing.
function describe(office) {
  if (office.record.endsWith(".json")) {
    const spec = readSpec(office);
    if (spec.kind !== "office") {
      die(`${rel(office.record)} declares 'kind: ${spec.kind ?? "(nothing)"}' — refusing to install an enterprise around a non-office.`);
    }
    const sentence = firstSentence(spec["normative-structure"]);
    if (!sentence) die(`${rel(office.record)} yields no sentence — its normative-structure is empty, and a roster line with no description delegates nothing.`);
    return sentence;
  }
  const sentence = firstSentence(frontmatterText(office.record, "description"));
  if (!sentence) die(`${rel(office.record)} yields no sentence — it has no 'description:' in its frontmatter, and a roster line with no description delegates nothing.`);
  return sentence;
}

// A canonical office names its duties in bears-duty, each by full address;
// a frontmatter office names them bare in duties:. Same assignment
// mechanism, two spellings — the sibling installer's rule exactly.
function officeDuties(office) {
  if (office.record.endsWith(".json")) {
    const bears = readSpec(office)["bears-duty"];
    return (Array.isArray(bears) ? bears : []).map((a) => a.replace(/^emsenn\/duty\//, ""));
  }
  return frontmatterList(office.record, "duties");
}

// --- the standing block: a deterministic projection of the enterprise --------------

function renderBlock(enterprise, offices) {
  const skills = join(enterprise, "skills");
  for (const name of INSTRUMENTS) {
    if (!existsSync(join(skills, name))) {
      die(`the block cites ${rel(join(skills, name))}, which seats nowhere — a standing instruction citing a missing instrument is a lie.`);
    }
  }
  const instrument = (name) => rel(join(skills, name));
  // The attesting office is read from the roster, never assumed. An
  // enterprise that seats no bearer of the duty is told exactly that.
  const attesters = offices.filter((o) => officeDuties(o).includes(ATTESTING_DUTY)).map((o) => o.id);
  const content = join(dirname(dirname(enterprise)), "content");
  const verify = `node ${instrument("make-a-task.js")} --verify <task> --pool ${rel(join(content, "tasks"))} --root .`;
  const lines = [
    BEGIN,
    "# This node holds an enterprise",
    "",
    `The enterprise seats at \`${rel(enterprise)}\`. Every office on its roster is`,
    "installed at this node as a subagent — one file per office under `.claude/agents/` —",
    "and the session opened here holds NO office itself. It is the dispatcher: it decides",
    "where work goes, and it does not do the offices' work.",
    "",
    "## Classes and instances are never the same record",
    "",
    `A CLASS says what a kind of record must look like: one JSON Schema per type,`,
    `seated in \`${rel(join(dirname(dirname(enterprise)), "lib/schemas"))}/\` ($node/lib). An INSTANCE is a particular thing —`,
    `one office, one task, one dispatch — a plain \`<id>.json\` record seated in`,
    `\`${rel(content)}/<pool>/\` ($node/content), validated against its class and never`,
    "itself a schema. No record is ever both: an instance carries no `$schema` and",
    "no `$id`, and a class constrains records without being one. A term in the",
    "glossary is an instance too — a definition entry, not a schema.",
    "",
    "## The enterprise membrane",
    "",
    "Protocol scale is not interchangeable. A2A is the coordination face among offices",
    "and agents within this enterprise. ActivityPub is the messaging face between this",
    "sovereign enterprise and another one. Receiving an ActivityPub message may create",
    "local work only through this enterprise's own admission and authority; a sender",
    "never writes this enterprise's pools. No umbrella platform participates in this",
    "boundary; each required faculty is hired from its sovereign owner.",
    "",
    "## The delegation rule",
    "",
    "Work belongs to the office that owes it — delegate to the installed agent rather",
    "than doing an office's work at the root. And records are written by the",
    "enterprise's instruments, never by hand:",
    "",
    `- a skill is one flat script in \`${rel(skills)}/\`, projected by \`${instrument("project-a-skill.js")}\``,
    `- a class (schema) is written by \`${instrument("write-a-schema.js")}\``,
    `- an office by \`${instrument("write-an-office.js")}\``,
    `- a task by \`${instrument("make-a-task.js")}\``,
    `- a dispatch by \`${instrument("dispatch-a-task.js")}\``,
    "",
    "## The obligation loop",
    "",
    '"Fulfill the obligations of your office" resolves here with no other context:',
    "",
    "1. At session start, from the repository root, run",
    `   \`node ${instrument("list-open-obligations.js")} --pool ${rel(join(content, "dispatches"))} --root .\`.`,
    "   It reads the enterprise's dispatch board and derives which dispatches are",
    "   OPEN — a dispatch is open while its task's goal is unachieved, and achievement",
    "   is derived by re-running the goal, never read from any record.",
    "2. Work each open dispatch by delegating its task to the office named on the",
    "   dispatch.",
    ...(attesters.length
      ? [
          "3. The worker never verifies its own work. Attestation belongs to",
          `   ${attesters.join(", ")} (${ATTESTING_DUTY}), and`,
        ]
      : [
          "3. The worker never verifies its own work. This enterprise seats no office",
          `   bearing ${ATTESTING_DUTY} — the operator is the witness — and`,
        ]),
    `   \`${verify}\``,
    "   is the witness's instrument.",
    "",
    "## The roster",
    "",
    ...offices.map((office) => `- **${office.id}** — ${describe(office)}`),
    END,
  ];
  return lines.join("\n") + "\n";
}

// --- splicing the block into <node>/CLAUDE.md ---------------------------------------

function markerIndices(text, file) {
  const b = text.indexOf(BEGIN);
  const e = text.indexOf(END);
  if ((b === -1) !== (e === -1)) {
    die(`${rel(file)} holds one marker of the pair and not the other — a torn block is a contradiction to name, not a thing to repair silently.`);
  }
  if (b !== -1 && (text.indexOf(BEGIN, b + 1) !== -1 || text.indexOf(END, e + 1) !== -1)) {
    die(`${rel(file)} holds a marker of the pair more than once — one block, one pair; anything else is a contradiction to name.`);
  }
  if (b !== -1 && e < b) {
    die(`${rel(file)} holds its end marker before its begin marker — a torn block is a contradiction to name, not a thing to repair silently.`);
  }
  return { b, e };
}

// Three splice modes, and the mode is a fact the manifest records so that
// clean undoes exactly what the splice did: "created" (the file is the
// block), "separator" (one newline was added, then the block), "in-place"
// (the block replaced a block between markers that were already there, and
// no byte on either side is this mechanism's to touch).
function spliceBlock(file, block) {
  if (!existsSync(file)) return { next: block, mode: "created" };
  const text = readFileSync(file, "utf8");
  const { b, e } = markerIndices(text, file);
  if (b === -1) return { next: text + "\n" + block, mode: "separator" };
  let tail = e + END.length;
  if (text[tail] === "\n") tail++;
  return { next: text.slice(0, b) + block + text.slice(tail), mode: "in-place" };
}

// The inverse, by recorded mode. Returns null when no block is present.
function removeBlock(text, file, mode) {
  const { b, e } = markerIndices(text, file);
  if (b === -1) return null;
  let tail = e + END.length;
  if (text[tail] === "\n") tail++;
  let head = b;
  if (mode === "separator" && head > 0 && text[head - 1] === "\n") head--;
  return text.slice(0, head) + text.slice(tail);
}

// --- manifest: what this mechanism installed here, so clean is exact ----------------

function manifestPath(node) {
  return join(node, ".claude/.claude-enterprise-manifest");
}

function readManifest(node) {
  const file = manifestPath(node);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
}

function writeManifest(node, entries) {
  mkdirSync(dirname(manifestPath(node)), { recursive: true });
  writeFileSync(manifestPath(node), [...entries].sort().map((e) => `${e}\n`).join(""));
}

function isBlockEntry(entry) {
  return entry === "CLAUDE.md" || entry.startsWith("CLAUDE.md:");
}

// One entry recorded the moment its fact is true — each office AS it
// installs, the block AS it splices — so a mid-roster failure leaves a
// manifest that names exactly the residue, and clean can sweep it.
function recordInManifest(node, entry) {
  const entries = readManifest(node).filter((e) => (isBlockEntry(entry) ? !isBlockEntry(e) : e !== entry));
  writeManifest(node, [...entries, entry]);
}

// --- the sibling installer: called, never copied ------------------------------------

const SIBLING_SHAPE = "installing-claude-as-an-agent/scripts/install-claude-as-an-agent.js";

function resolveSibling() {
  const beside = join(HERE, SIBLING_SHAPE);
  if (existsSync(beside)) return beside;
  let d = HERE;
  for (;;) {
    for (const shape of [
      join("lib/management/skills", SIBLING_SHAPE),
      join("lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills", SIBLING_SHAPE),
    ]) {
      const pooled = join(d, shape);
      if (existsSync(pooled)) return pooled;
    }
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  die(
    `cannot find the sibling installer (${SIBLING_SHAPE}) beside this script or in the enterprise's ` +
      `lib/management/skills pool — this skill calls installing-claude-as-an-agent rather than copying it, ` +
      `including when the whole-enterprise entrypoint is installed under a harness skills directory.`,
  );
}

function spawnSibling(sibling, officeArg, node, flags, doing, motion) {
  const args = [sibling, officeArg, node, "--root", REPO_ROOT, ...flags];
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (r.status !== 0) {
    // The sweep sentence cites the manifest, and under a dry run nothing was
    // recorded — a witness must not cite a manifest that is not there.
    const sweep =
      motion === "install" && !DRY_RUN
        ? " Offices already installed are recorded in the enterprise manifest, so --clean can sweep them."
        : "";
    die(
      `the sibling installer exited ${r.status ?? `without a status (${r.error?.message ?? "spawn failed"})`} ${doing} — ` +
        `the ${motion} stops here; no partial success is reported as success.${sweep}`,
    );
  }
}

// --- the motions ---------------------------------------------------------------------

function agentTarget(node, id) {
  return join(node, ".claude/agents", `${id}.md`);
}

function doList(enterprise, node, offices) {
  for (const office of offices) {
    console.log(`agent\t${rel(office.record)}\t->\t${rel(agentTarget(node, office.id))}`);
  }
  console.log(`block\t${rel(enterprise)}\t->\t${rel(join(node, "CLAUDE.md"))}`);
}

function doInstall(enterprise, node, offices, sibling) {
  // Every local refusal fires before the first sibling spawn: a refused
  // install leaves the node untouched. A mid-roster sibling failure is the
  // one interruption after side effects begin, and the manifest — written
  // office by office below — is what keeps that sweepable.
  const block = renderBlock(enterprise, offices);
  const claudeMd = join(node, "CLAUDE.md");
  const { next, mode } = spliceBlock(claudeMd, block);

  const flags = [...(REINSTALL ? ["--reinstall"] : []), ...(DRY_RUN ? ["--dry-run"] : [])];
  for (const office of offices) {
    spawnSibling(sibling, office.record, node, flags, `installing office '${office.id}' into ${rel(node)}`, "install");
    if (!DRY_RUN) recordInManifest(node, office.id);
  }

  if (DRY_RUN) {
    console.log(
      `install-an-enterprise-in-claude: dry run — would splice the standing block into ${rel(claudeMd)} ` +
        `and record ${offices.length} offices in ${rel(manifestPath(node))}.`,
    );
    return;
  }

  writeFileSync(claudeMd, next);
  // A re-splice between markers a PRIOR install placed must keep the prior
  // splice's recorded mode: the separator fact belongs to the first splice,
  // and clean undoes the first splice, not the latest.
  const prior = readManifest(node).find(isBlockEntry);
  const recordedMode = mode === "in-place" && prior ? (prior.split(":")[1] ?? "in-place") : mode;
  recordInManifest(node, `CLAUDE.md:${recordedMode}`);
  console.log(`  spliced  ${rel(claudeMd)}  (${rel(enterprise)}, mode ${recordedMode})`);

  // Postcondition, checked rather than assumed: the block between the
  // markers is byte-identical to the projection, and every agent file exists.
  const readBack = readFileSync(claudeMd, "utf8");
  if (readBack.indexOf(block) === -1 || readBack.indexOf(block) !== readBack.lastIndexOf(block)) {
    die(`postcondition failed: the block in ${rel(claudeMd)} is not byte-identical to the projection of ${rel(enterprise)}.`);
  }
  for (const office of offices) {
    if (!existsSync(agentTarget(node, office.id))) {
      die(`postcondition failed: ${rel(agentTarget(node, office.id))} does not exist after install.`);
    }
  }

  console.log(
    `install-an-enterprise-in-claude: installed enterprise ${rel(enterprise)} into ${rel(node)} — ` +
      `${offices.length} offices, one standing block.`,
  );
}

// A directory this mechanism (or its sibling) created and then emptied by
// its own removals is removed too — an empty `agents/` or `.claude/` left
// behind is residue exactly like a stray file; a directory still holding
// something this mechanism did not put there is left untouched.
function removeIfEmptyDir(dir) {
  if (!existsSync(dir)) return;
  if (readdirSync(dir, { withFileTypes: true }).length === 0) rmSync(dir, { recursive: true, force: true });
}

// The sibling refuses to clean an office whose record seats nowhere — its
// resolver runs before its clean, and there is nothing left to resolve. Its
// install is exactly two facts at the node: the agent file, and the office's
// line in the sibling's manifest. The inverse is done here, and said so.
function cleanRetired(node, id, would) {
  const siblingManifest = join(node, ".claude/.claude-agent-manifest");
  if (!DRY_RUN) {
    rmSync(agentTarget(node, id), { force: true });
    if (existsSync(siblingManifest)) {
      const rest = readFileSync(siblingManifest, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((e) => e !== id);
      // A manifest holding no entries is removed rather than left behind as
      // a zero-byte witness — the same rule the sibling applies itself.
      if (rest.length) writeFileSync(siblingManifest, rest.sort().map((e) => `${e}\n`).join(""));
      else rmSync(siblingManifest, { force: true });
    }
    removeIfEmptyDir(join(node, ".claude/agents"));
  }
  console.log(
    `  ${would}  agents/${id}.md — office '${id}' seats nowhere in the roster any more, ` +
      `so the sibling's install is inverted here rather than through it.`,
  );
}

function doClean(enterprise, node, sibling) {
  if (!existsSync(manifestPath(node))) {
    console.log(`install-an-enterprise-in-claude: no enterprise manifest at ${rel(node)} — nothing to clean.`);
    return;
  }
  const entries = readManifest(node);
  const seated = new Map(roster(rosterDirOf(enterprise)).map((o) => [o.id, o.record]));
  const would = DRY_RUN ? "dry run — would remove" : "removed";

  const blockEntry = entries.find(isBlockEntry);
  const claudeMd = join(node, "CLAUDE.md");
  if (blockEntry && existsSync(claudeMd)) {
    const mode = blockEntry.split(":")[1] ?? "in-place";
    const remaining = removeBlock(readFileSync(claudeMd, "utf8"), claudeMd, mode);
    if (remaining === null) {
      console.log(`  the block is already absent from ${rel(claudeMd)} — nothing to remove there.`);
    } else {
      if (!DRY_RUN) {
        if (mode === "created" && remaining === "") rmSync(claudeMd);
        else writeFileSync(claudeMd, remaining);
      }
      console.log(`  ${would}  block from ${rel(claudeMd)}  (mode ${mode})`);
    }
  }

  const flags = ["--clean", ...(DRY_RUN ? ["--dry-run"] : [])];
  for (const id of entries.filter((e) => !isBlockEntry(e))) {
    if (seated.has(id)) {
      spawnSibling(sibling, seated.get(id), node, flags, `cleaning office '${id}' from ${rel(node)}`, "clean");
    } else {
      cleanRetired(node, id, would);
    }
  }

  if (!DRY_RUN) {
    rmSync(manifestPath(node), { force: true });
    // Residue check, not a fresh removal: every file this mechanism and its
    // sibling wrote is already gone by this point, so this only fires when
    // that leaves `.claude/agents` and `.claude` holding nothing of anyone
    // else's — a directory still holding a foreign entry is left alone.
    removeIfEmptyDir(join(node, ".claude/agents"));
    removeIfEmptyDir(join(node, ".claude"));
  }
  console.log(
    DRY_RUN
      ? `install-an-enterprise-in-claude: dry run — would clean enterprise ${rel(enterprise)} from ${rel(node)}.`
      : `install-an-enterprise-in-claude: cleaned enterprise ${rel(enterprise)} from ${rel(node)}.`,
  );
}

// --- main ------------------------------------------------------------------------------

const FLAGS_TAKING_VALUE = new Set(["--root", "--authority-root"]);
const BOOLEAN_FLAGS = new Set(["--list", "--dry-run", "--clean", "--reinstall"]);
const positionals = [];
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    if (FLAGS_TAKING_VALUE.has(arg)) {
      if (!process.argv[i + 1] || process.argv[i + 1].startsWith("--")) die(`${arg} requires a value`);
      i++;
    } else if (!BOOLEAN_FLAGS.has(arg)) {
      die(`unknown option '${arg}' — authority cannot be widened by an unruled flag`);
    }
    continue;
  }
  positionals.push(arg);
}

if (process.argv.filter((arg) => arg === "--authority-root").length !== 1) {
  die("--authority-root must be supplied exactly once");
}
for (const flag of FLAGS_TAKING_VALUE) {
  if (process.argv.filter((arg) => arg === flag).length > 1) die(`${flag} must not be supplied more than once`);
}
if (positionals.length > 2) die(`unexpected positional argument '${positionals[2]}' — free text is not an authority claim`);
if (process.argv.includes("--reinstall") && (process.argv.includes("--clean") || process.argv.includes("--list"))) {
  die("--reinstall cannot be combined with --clean or --list; one admission binds one exact operation");
}

let node = resolveNode(positionals[1]);
let enterprise = resolveEnterprise(positionals[0], node);
const operation = process.argv.includes("--clean")
  ? "clean"
  : process.argv.includes("--list")
    ? "list"
    : REINSTALL
      ? "reinstall"
      : "install";
const admittedRequest = await admitMeshAuthority(enterprise, node, operation);
enterprise = admittedRequest.sourceEnterprise;
node = admittedRequest.targetNode;
const sibling = resolveSibling();

if (process.argv.includes("--clean")) {
  doClean(enterprise, node, sibling);
} else {
  const offices = roster(rosterDirOf(enterprise));
  if (offices.length === 0) {
    die(
      `the roster at ${rel(rosterDirOf(enterprise))} is empty — an enterprise with no offices installs nothing, ` +
        `and an install that does nothing must say so rather than succeed.`,
    );
  }
  if (process.argv.includes("--list")) {
    doList(enterprise, node, offices);
  } else {
    doInstall(enterprise, node, offices, sibling);
  }
}
assertMeshAuthority();
