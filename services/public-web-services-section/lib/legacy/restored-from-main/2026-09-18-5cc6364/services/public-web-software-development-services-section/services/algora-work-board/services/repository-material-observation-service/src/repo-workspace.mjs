import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  readSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { githubApi } from "@red-cup-engineering/github-services-section";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
const RECORD_KIND = "repository-material-observation.record";
const semanticId = (value) => identifyJsonSemanticContent({ objectKind: RECORD_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).id;

export const ACTOR = "urn:ame:repository-material-observation-service";
export const inputSchema = Object.freeze(JSON.parse(readFileSync(new URL("../content/schemas/input.schema.json", import.meta.url), "utf8")));
export const outputSchema = Object.freeze(JSON.parse(readFileSync(new URL("../content/schemas/output.schema.json", import.meta.url), "utf8")));
export const refusalSchema = Object.freeze(JSON.parse(readFileSync(new URL("../content/schemas/refusal.schema.json", import.meta.url), "utf8")));

const SERVICE_ROOT = new URL("..", import.meta.url).pathname;
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const exactId = (body) => semanticId(body);
const record = (body) => Object.freeze({ id: exactId(body), ...body });
const portable = (path) => path.split(sep).join("/");

function refusal(reason, details = {}, recordedAt = new Date().toISOString()) {
  return record({
    type: refusalSchema.properties.type.const,
    provider: ACTOR,
    reason,
    details,
    customerMutation: false,
    recordedAt,
  });
}

function validateWords(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new TypeError(`${label} must be an array of nonempty strings`);
  }
  return [...new Set(value)].sort();
}

function validateRequest(request) {
  if (!plain(request)) throw new TypeError("repository material observation request must be an object");
  for (const key of inputSchema.required) if (!Object.hasOwn(request, key)) throw new TypeError(`${key} is required`);
  if (request.type !== inputSchema.properties.type.const) throw new TypeError(`type must be ${inputSchema.properties.type.const}`);
  if (!plain(request.source) || !["local-directory", "github-tarball"].includes(request.source.kind)) throw new TypeError("source.kind must be local-directory or github-tarball");
  if (!plain(request.projection) || !["manifest", "matching-lines", "file"].includes(request.projection.kind)) throw new TypeError("projection.kind must be manifest, matching-lines, or file");
  if (!["inline", "artifact"].includes(request.projection.carrier)) throw new TypeError("projection.carrier must be inline or artifact");
  if (request.projection.kind === "file" && request.projection.carrier !== "inline") throw new TypeError("exact file projection currently requires the inline carrier");
  if (!plain(request.traversalPolicy)) throw new TypeError("traversalPolicy must be an object");
  const excludedDirectoryNames = validateWords(request.traversalPolicy.excludedDirectoryNames, "traversalPolicy.excludedDirectoryNames");
  if (request.source.kind === "local-directory" && (typeof request.source.root !== "string" || !request.source.root.startsWith("/"))) throw new TypeError("local source root must be absolute");
  if (request.source.kind === "github-tarball") {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(request.source.repository ?? "")) throw new TypeError("GitHub repository must be owner/name");
    if (!plain(request.source.acquisitionPolicy) || !Number.isSafeInteger(request.source.acquisitionPolicy.maximumBytes) || request.source.acquisitionPolicy.maximumBytes < 1) {
      throw new TypeError("remote acquisition requires an explicit positive maximumBytes counterparty policy");
    }
  }
  if (request.projection.kind === "matching-lines") {
    if (typeof request.projection.pattern !== "string" || request.projection.pattern.length === 0) throw new TypeError("matching-lines projection requires pattern");
    if (!['literal', 'regular-expression'].includes(request.projection.patternKind)) throw new TypeError("patternKind must be literal or regular-expression");
    if (typeof request.projection.pathPattern !== "string" || request.projection.pathPattern.length === 0) throw new TypeError("matching-lines projection requires an explicit pathPattern denominator");
    new RegExp(request.projection.pathPattern, "u");
  }
  if (request.projection.kind === "file" && (typeof request.projection.path !== "string" || request.projection.path.length === 0)) throw new TypeError("file projection requires path");
  return { ...request, traversalPolicy: { excludedDirectoryNames } };
}

function canonicalDirectory(path) {
  const lexical = resolve(path), canonical = realpathSync(lexical), stat = lstatSync(lexical);
  if (canonical !== lexical || stat.isSymbolicLink() || !stat.isDirectory()) throw new TypeError("source root must be an existing canonical non-symlink directory");
  return canonical;
}

function safeFile(root, requested) {
  const path = resolve(root, requested);
  if (path !== root && !path.startsWith(`${root}${sep}`)) throw new TypeError("requested file escapes observed source");
  return path;
}

function artifactSink(dataRoot, kind) {
  const runtimeRoot = join(dataRoot, "runtime");
  mkdirSync(runtimeRoot, { recursive: true });
  const temporaryRoot = mkdtempSync(join(runtimeRoot, "material-artifact-"));
  const temporaryPath = join(temporaryRoot, `${kind}.jsonl`);
  writeFileSync(temporaryPath, "");
  const hash = createHash("sha256");
  let records = 0n, bytes = 0n;
  return {
    push(value) {
      const line = `${JSON.stringify(value)}\n`;
      appendFileSync(temporaryPath, line);
      hash.update(line);
      records += 1n;
      bytes += BigInt(Buffer.byteLength(line));
    },
    finish() {
      const hex = hash.digest("hex"), artifactDigest = `sha256:${hex}`;
      const directory = join(dataRoot, "material-artifacts", "sha256", hex.slice(0, 2));
      const path = join(directory, `${hex}.jsonl`);
      mkdirSync(directory, { recursive: true });
      if (existsSync(path)) rmSync(temporaryPath, { force: true });
      else renameSync(temporaryPath, path);
      rmSync(temporaryRoot, { recursive: true, force: true });
      return { digest: artifactDigest, mediaType: "application/x-ndjson", records: String(records), bytes: String(bytes), path };
    },
  };
}

function foldFile(path, lineMatcher = null) {
  const descriptor = openSync(path, "r"), buffer = Buffer.allocUnsafe(64 * 1024), hash = createHash("sha256");
  const decoder = lineMatcher ? new StringDecoder("utf8") : null;
  let textual = true, remainder = "", lineNumber = 0;
  const consume = (text, final = false) => {
    remainder += text;
    const lines = remainder.split("\n");
    remainder = final ? "" : lines.pop();
    for (const source of lines) {
      lineNumber += 1;
      lineMatcher(lineNumber, source.endsWith("\r") ? source.slice(0, -1) : source);
    }
    if (final && remainder.length > 0) {
      lineNumber += 1;
      lineMatcher(lineNumber, remainder.endsWith("\r") ? remainder.slice(0, -1) : remainder);
      remainder = "";
    }
  };
  try {
    for (;;) {
      const length = readSync(descriptor, buffer, 0, buffer.length, null);
      if (length === 0) break;
      const chunk = buffer.subarray(0, length);
      hash.update(chunk);
      if (chunk.includes(0)) textual = false;
      if (decoder) consume(decoder.write(chunk));
    }
    if (decoder) consume(decoder.end(), true);
  } finally {
    closeSync(descriptor);
  }
  return { digest: `sha256:${hash.digest("hex")}`, textual };
}

function traverse(root, policy, projection, dataRoot) {
  const files = [], links = [], special = [], excluded = [];
  const hits = [];
  const sink = projection.carrier === "artifact" ? artifactSink(dataRoot, projection.kind) : null;
  let selectedFile = null, directoriesObserved = 0n, filesObserved = 0n, symbolicLinksObserved = 0n, specialEntriesObserved = 0n, bytesObserved = 0n;
  const excludedNames = new Set(policy.excludedDirectoryNames);
  const requestedFile = projection.kind === "file" ? portable(relative(root, safeFile(root, projection.path))) : null;
  const admittedTextPath = projection.kind === "matching-lines" ? new RegExp(projection.pathPattern, "u") : null;
  const matcher = projection.kind !== "matching-lines" ? null : projection.patternKind === "literal"
    ? (line) => projection.caseSensitive === false ? line.toLocaleLowerCase().includes(projection.pattern.toLocaleLowerCase()) : line.includes(projection.pattern)
    : (() => { const expression = new RegExp(projection.pattern, projection.caseSensitive === false ? "iu" : "u"); return (line) => expression.test(line); })();
  function walk(at) {
    directoriesObserved += 1n;
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(at, entry.name), rel = portable(relative(root, path));
      if (entry.isDirectory() && excludedNames.has(entry.name)) {
        excluded.push({ path: rel, reason: "caller-supplied-directory-exclusion", name: entry.name });
        continue;
      }
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        symbolicLinksObserved += 1n;
        const link = { path: rel, kind: "symbolic-link", target: readlinkSync(path) };
        if (projection.kind === "manifest" && sink) sink.push({ recordType: "symbolic-link", ...link }); else links.push(link);
      } else if (stat.isDirectory()) {
        walk(path);
      } else if (stat.isFile()) {
        filesObserved += 1n;
        bytesObserved += BigInt(stat.size);
        const searchThisFile = projection.kind === "matching-lines" && admittedTextPath.test(rel);
        const folded = foldFile(path, searchThisFile ? (line, text) => {
          if (!matcher(text)) return;
          const hit = { path: rel, line, text };
          if (sink) sink.push({ recordType: "matching-line", ...hit }); else hits.push(hit);
        } : null);
        const file = {
          path: rel,
          kind: "file",
          digest: folded.digest,
          bytes: String(stat.size),
          mode: (stat.mode & 0o7777).toString(8).padStart(4, "0"),
          executable: (stat.mode & 0o111) !== 0,
          textual: folded.textual,
        };
        if (projection.kind === "manifest") {
          if (sink) sink.push({ recordType: "file", ...file }); else files.push(file);
        }
        else if (projection.kind === "file" && rel === requestedFile) selectedFile = { kind: "file", file, encoding: "base64", content: readFileSync(path).toString("base64") };
      } else {
        specialEntriesObserved += 1n;
        const value = { path: rel, kind: "special", mode: (stat.mode & 0o7777).toString(8).padStart(4, "0") };
        if (projection.kind === "manifest" && sink) sink.push({ recordType: "special", ...value }); else special.push(value);
      }
    }
  }
  walk(root);
  if (projection.kind === "file" && selectedFile === null) throw new TypeError(`observed file is absent: ${requestedFile}`);
  const artifact = sink?.finish();
  const projected = artifact ? { kind: projection.kind, carrier: "artifact", artifact, ...(projection.kind === "matching-lines" ? { pattern: projection.pattern, patternKind: projection.patternKind, pathPattern: projection.pathPattern, caseSensitive: projection.caseSensitive !== false } : {}) }
    : projection.kind === "manifest" ? { kind: "manifest", carrier: "inline", files, links, special }
    : projection.kind === "file" ? selectedFile
      : { kind: "matching-lines", carrier: "inline", pattern: projection.pattern, patternKind: projection.patternKind, pathPattern: projection.pathPattern, caseSensitive: projection.caseSensitive !== false, hits };
  return { links, special, excluded, directoriesObserved, filesObserved, symbolicLinksObserved, specialEntriesObserved, bytesObserved, projection: projected };
}

async function acquire(request, api) {
  if (request.source.kind === "local-directory") return { root: canonicalDirectory(request.source.root), dispose: false, identity: { kind: "local-directory", root: canonicalDirectory(request.source.root) } };
  const dir = mkdtempSync(join(tmpdir(), "repository-material-")), archive = join(dir, "repository.tgz");
  try {
    const bytes = await api.getRepositoryTarball(request.source.repository, request.source.ref, { maximumBytes: request.source.acquisitionPolicy.maximumBytes });
    writeFileSync(archive, bytes);
    const extracted = spawnSync("tar", ["-xzf", archive, "-C", dir, "--strip-components=1", "--no-same-owner", "--no-same-permissions"], { encoding: "utf8" });
    rmSync(archive, { force: true });
    if (extracted.status !== 0) throw new Error(`repository carrier extraction failed: ${extracted.stderr || "unknown tar refusal"}`);
    return { root: canonicalDirectory(dir), dispose: true, identity: { kind: "github-tarball", repository: request.source.repository, ref: request.source.ref ?? null, archiveDigest: digest(bytes) } };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

function appendReceipt(dataRoot, value) {
  const { id, ...body } = value;
  const successful = value.type === outputSchema.properties.type.const;
  const receipt = createSemanticRecordJournal({ root: dataRoot, objectKind: RECORD_KIND }).record({
    category: successful ? "repository-material-observation" : "repository-material-observation-refusal",
    record: body,
    recordedAt: value.recordedAt,
    charge: { support: successful, refutation: !successful },
    relation: {
      subject: value.provider,
      predicate: successful ? "observes" : "refuses-to-observe",
      object: value.source ?? value.details,
    },
  });
  if (receipt.id !== id) throw new Error("repository-material observation identity drifted at journal admission");
  return receipt;
}

export async function observeRepositoryMaterial(source, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString(), started = process.hrtime.bigint();
  let request;
  try { request = validateRequest(source); }
  catch (error) {
    const result = refusal("invalid-request", { message: error.message }, recordedAt);
    if (options.appendReceipt !== false) appendReceipt(options.dataRoot ?? join(SERVICE_ROOT, "data"), result);
    return result;
  }
  let acquired;
  try {
    acquired = await acquire(request, options.api ?? githubApi());
    const dataRoot = options.dataRoot ?? join(SERVICE_ROOT, "data");
    const observed = traverse(acquired.root, request.traversalPolicy, request.projection, dataRoot);
    const result = record({
      type: outputSchema.properties.type.const,
      provider: ACTOR,
      source: acquired.identity,
      traversalPolicy: request.traversalPolicy,
      denominator: {
        completeness: observed.excluded.length === 0 ? "whole-source" : "source-minus-declared-exclusions",
        excluded: observed.excluded,
      },
      projection: observed.projection,
      resourceObservation: {
        directoriesObserved: String(observed.directoriesObserved),
        filesObserved: String(observed.filesObserved),
        symbolicLinksObserved: String(observed.symbolicLinksObserved),
        specialEntriesObserved: String(observed.specialEntriesObserved),
        bytesObserved: String(observed.bytesObserved),
        wallNanoseconds: String(process.hrtime.bigint() - started),
        authority: "measured-resource-use-does-not-authorize-a-ceiling",
      },
      customerMutation: false,
      recordedAt,
    });
    if (options.appendReceipt !== false) appendReceipt(options.dataRoot ?? join(SERVICE_ROOT, "data"), result);
    return result;
  } catch (error) {
    const result = refusal("observation-obstructed", { message: error.message }, recordedAt);
    if (options.appendReceipt !== false) appendReceipt(options.dataRoot ?? join(SERVICE_ROOT, "data"), result);
    return result;
  } finally {
    if (acquired?.dispose) rmSync(acquired.root, { recursive: true, force: true });
  }
}
