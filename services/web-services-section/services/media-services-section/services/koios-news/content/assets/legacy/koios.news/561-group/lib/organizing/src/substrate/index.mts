import path from "node:path";

import { agent, admitSeed, type Agent } from "@emsenn/animating";
import { directoryEntries, fileExists, readTextFileSync } from "@emsenn/computing/admission";
import {
  carrierFrom,
  cell,
  jsonResource,
  predicateOfClaim,
  claim,
  mark,
  token,
  type FromSchema,
  type JsonValue,
  type UtteranceCarrier,
} from "@emsenn/relating";
import { readContentTree, readJsonl, readWitnessLog, type WitnessStore } from "@emsenn/relating/ledger";
import { unfoldJson, type EAVTRecord } from "@emsenn/relating/writing";

import { assemble, type Constituent, type Organization, type OrganizationOptions } from "../organizing.mjs";
import {
  workItem,
  workTask,
  workTerm,
  predicate,
  type WorkItem,
} from "../work.mjs";

export const SubstratePackageSchema = {
  $id: "organizing/substrate/package",
  title: "OrganizingSubstratePackage",
  type: "object",
  additionalProperties: false,
  required: ["kind", "name", "utterances", "exports", "bins", "scripts", "dependencies"],
  properties: {
    kind: { const: "organizing.substrate.package" },
    name: { type: "string", minLength: 1 },
    term: { type: "string", minLength: 1 },
    layer: { type: "string", minLength: 1 },
    utterances: { type: "array", items: { type: "object" } },
    exports: { type: "array", items: { type: "string" } },
    bins: { type: "array", items: { type: "string" } },
    scripts: { type: "array", items: { type: "string" } },
    dependencies: { type: "array", items: { type: "string" } },
  },
} as const;

export const SubstrateChronicleSchema = {
  $id: "organizing/substrate/chronicle",
  title: "OrganizingSubstrateChronicle",
  type: "object",
  additionalProperties: false,
  required: ["kind", "feed", "path", "witnesses", "sessions"],
  properties: {
    kind: { const: "organizing.substrate.chronicle" },
    feed: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
    witnesses: { type: "array", items: { type: "object" } },
    sessions: { type: "array", items: { type: "string" } },
  },
} as const;

export const SubstrateContentSchema = {
  $id: "organizing/substrate/content",
  title: "OrganizingSubstrateContent",
  type: "object",
  additionalProperties: false,
  required: ["kind", "root", "resources"],
  properties: {
    kind: { const: "organizing.substrate.content" },
    root: { type: "string", minLength: 1 },
    resources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "bytes"],
        properties: {
          path: { type: "string", minLength: 1 },
          bytes: { type: "integer", minimum: 0 },
        },
      },
    },
  },
} as const;

export const DirectorySubstrateSchema = {
  $id: "organizing/substrate/directory",
  title: "OrganizingDirectorySubstrate",
  description: "A frozen organizing intake reading of a directory as governed substrate.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "root", "readAt", "packages", "chronicles", "content", "constituents", "workItems"],
  properties: {
    kind: { const: "organizing.substrate.directory" },
    root: { type: "string", minLength: 1 },
    readAt: { type: "string", minLength: 1 },
    packages: { type: "array", items: SubstratePackageSchema },
    chronicles: { type: "array", items: SubstrateChronicleSchema },
    content: SubstrateContentSchema,
    constituents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "utteranceCount"],
        properties: {
          name: { type: "string", minLength: 1 },
          utteranceCount: { type: "integer", minimum: 0 },
        },
      },
    },
    workItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "title", "status"],
        properties: {
          term: {},
          title: { type: "string", minLength: 1 },
          status: { type: "string", minLength: 1 },
        },
      },
    },
  },
} as const;

export type SubstratePackage = FromSchema<typeof SubstratePackageSchema>;
export type SubstrateChronicle = FromSchema<typeof SubstrateChronicleSchema>;
export type SubstrateContent = FromSchema<typeof SubstrateContentSchema>;
export type DirectorySubstrate = FromSchema<typeof DirectorySubstrateSchema> & {
  readonly organizationInput: {
    readonly constituents: readonly Constituent[];
    readonly agents: readonly Agent[];
    readonly workItems: readonly WorkItem[];
  };
};

export const substratePackageCarrier = carrierFrom(SubstratePackageSchema);
export const substrateChronicleCarrier = carrierFrom(SubstrateChronicleSchema);
export const substrateContentCarrier = carrierFrom(SubstrateContentSchema);
export const directorySubstrateCarrier = carrierFrom(DirectorySubstrateSchema);

export interface JSNodePackageSubstrate {
  readonly name: string;
  readonly term?: string;
  readonly layer?: string;
  readonly utterances: readonly UtteranceCarrier[];
  readonly exports?: readonly string[];
  readonly dependencies?: readonly string[];
  readonly manifest?: {
    readonly bins?: readonly string[];
    readonly scripts?: readonly string[];
  };
}

export interface JSNodeWorkspaceSubstrate {
  readonly root: string;
  readonly packages: readonly JSNodePackageSubstrate[];
}

export interface DirectorySubstrateOptions {
  readonly dataRoot?: string;
  readonly contentRoot?: string;
  readonly contentLimit?: number;
  readonly readAt?: string;
  readonly workspace?: JSNodeWorkspaceSubstrate;
  readonly readWorkspace?: (root: string) => JSNodeWorkspaceSubstrate;
}

export function readDirectorySubstrate(root: string, options: DirectorySubstrateOptions = {}): DirectorySubstrate {
  const resolvedRoot = path.resolve(root);
  const workspace = options.workspace ?? options.readWorkspace?.(resolvedRoot) ?? readWorkspaceSubstrate(resolvedRoot);
  const dataRoot = options.dataRoot === undefined ? defaultDataRoot(resolvedRoot) : path.resolve(resolvedRoot, options.dataRoot);
  const contentRoot = options.contentRoot === undefined ? path.join(resolvedRoot, "content") : path.resolve(resolvedRoot, options.contentRoot);
  const packages = workspace.packages.map(packageReading);
  const chronicles = [readAgentEventsChronicle(dataRoot)];
  const content = readGovernedContent(contentRoot, options.contentLimit ?? 64);
  const constituents = Object.freeze([
    ...workspace.packages.map(packageConstituent),
    ...chronicles.flatMap(chronicleConstituents),
    ...content.resources.map(contentConstituent),
  ]);
  const agents = Object.freeze(constituents.map((constituent) =>
    agent(`${constituent.name}|governed-substrate`, {
      identity: constituent.name,
      goal: { predicate: "governed-substrate" },
    })));
  const workItems = Object.freeze([
    ...packages.map((pkg) => substrateWorkItem(["package", pkg.name], `Package ${pkg.name}`)),
    ...chronicles.map((chronicle) => substrateWorkItem(["chronicle", chronicle.feed], `Chronicle ${chronicle.feed}`)),
    ...content.resources.map((resource) => substrateWorkItem(["content", resource.path], `Content ${resource.path}`)),
  ]);
  const reading = {
    kind: "organizing.substrate.directory" as const,
    root: resolvedRoot,
    readAt: options.readAt ?? new Date().toISOString(),
    packages,
    chronicles,
    content,
    constituents: constituents.map((constituent) => ({
      name: constituent.name,
      utteranceCount: constituent.utterances.length,
    })),
    workItems: workItems.map((item) => ({
      term: item.term.mark.value,
      title: workItemTitle(item),
      status: "active",
    })),
  };
  directorySubstrateCarrier.assert(jsonResource(reading), "directory substrate");
  return Object.freeze({
    ...reading,
    organizationInput: Object.freeze({ constituents, agents, workItems }),
  }) as DirectorySubstrate;
}

export function assembleDirectorySubstrate(
  reading: DirectorySubstrate,
  options: OrganizationOptions = {},
): Organization {
  return assemble(reading.organizationInput.agents, options);
}

export function directorySubstrateResource(reading: DirectorySubstrate): FromSchema<typeof DirectorySubstrateSchema> {
  const { organizationInput: _organizationInput, ...resource } = reading;
  return directorySubstrateCarrier.assert(jsonResource(resource), "directory substrate resource");
}

function readWorkspaceSubstrate(root: string): JSNodeWorkspaceSubstrate {
  const packages = packageManifestFiles(root)
    .map((file) => packageSubstrateFromManifest(root, file))
    .filter((pkg): pkg is JSNodePackageSubstrate => pkg !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
  return Object.freeze({ root, packages: Object.freeze(packages) });
}

function packageManifestFiles(root: string): readonly string[] {
  const out: string[] = [];
  for (const stratum of ["apps", "lib", "services", "sites"]) {
    const dir = path.join(root, stratum);
    const entries = directoryEntries(dir);
    for (const entry of entries) {
      if (!entry.directory) continue;
      const manifest = path.join(dir, entry.name, "package.json");
      if (fileExists(manifest)) out.push(manifest);
    }
  }
  return Object.freeze(out.sort((a, b) => a.localeCompare(b)));
}

function packageSubstrateFromManifest(root: string, file: string): JSNodePackageSubstrate | undefined {
  const parsed = JSON.parse(readTextFileSync(file)) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const manifest = parsed as Readonly<Record<string, unknown>>;
  const name = typeof manifest.name === "string" ? manifest.name.trim() : "";
  if (name === "") return undefined;
  const dir = path.dirname(file);
  const layer = path.relative(root, dir).split(path.sep)[0] ?? "workspace";
  const exports = manifestExports(manifest.exports);
  const bins = manifestBins(manifest.bin, name);
  const scripts = Object.keys(recordValue(manifest.scripts)).sort();
  const dependencies = ["dependencies", "peerDependencies", "optionalDependencies"]
    .flatMap((field) => Object.keys(recordValue(manifest[field])))
    .sort((a, b) => a.localeCompare(b));
  const facts = [
    `${name}|layer:${layer}`,
    ...exports.map((item) => `${name}|exports:${item}`),
    ...bins.map((item) => `${name}|bin:${item}`),
    ...scripts.map((item) => `${name}|script:${item}`),
    ...dependencies.map((item) => `${name}|depends:${item}`),
  ];
  return Object.freeze({
    name,
    term: `package:${name}`,
    layer,
    utterances: admitSeed(facts.join("\n")),
    exports: Object.freeze(exports),
    dependencies: Object.freeze(dependencies),
    manifest: Object.freeze({
      bins: Object.freeze(bins),
      scripts: Object.freeze(scripts),
    }),
  });
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {};
}

function manifestExports(value: unknown): readonly string[] {
  if (typeof value === "string") return Object.freeze([value]);
  if (Array.isArray(value)) return Object.freeze(value.filter((item): item is string => typeof item === "string"));
  if (value !== null && typeof value === "object") return Object.freeze(Object.keys(value).sort());
  return Object.freeze([]);
}

function manifestBins(value: unknown, packageName: string): readonly string[] {
  if (typeof value === "string" && value.trim() !== "") return Object.freeze([packageName]);
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return Object.freeze(Object.keys(value).sort());
  return Object.freeze([]);
}

function defaultDataRoot(root: string): string {
  return path.join(root, "sites", "dev.bare-cedar-fog.emsenn.net", "data");
}

function packageReading(pkg: JSNodePackageSubstrate): SubstratePackage {
  return Object.freeze({
    kind: "organizing.substrate.package" as const,
    name: pkg.name,
    ...(pkg.term === undefined ? {} : { term: pkg.term }),
    ...(pkg.layer === undefined ? {} : { layer: pkg.layer }),
    utterances: jsonResource([...pkg.utterances], "substrate package utterances") as readonly Record<string, unknown>[],
    exports: Object.freeze([...(pkg.exports ?? [])]),
    bins: Object.freeze([...(pkg.manifest?.bins ?? [])]),
    scripts: Object.freeze([...(pkg.manifest?.scripts ?? [])]),
    dependencies: Object.freeze([...(pkg.dependencies ?? [])]),
  });
}

function packageConstituent(pkg: JSNodePackageSubstrate): Constituent {
  return Object.freeze({
    name: `package:${pkg.name}`,
    utterances: Object.freeze([...pkg.utterances]),
  });
}

function readAgentEventsChronicle(dataRoot: string): SubstrateChronicle {
  const store = witnessStore(dataRoot);
  const feed = "agent-events";
  const eavtRows = readWitnessLog(store, feed);
  const rows = eavtRows.length > 0 ? eavtRows : readJsonl<JsonValue>(path.join(store.logDir, `${feed}.jsonl`)).flatMap((row) =>
    unfoldJson(row, { base: feed, t: eventTime(row) }));
  return Object.freeze({
    kind: "organizing.substrate.chronicle" as const,
    feed,
    path: path.join(store.logDir, `${feed}.jsonl`),
    witnesses: Object.freeze(rows),
    sessions: Object.freeze(uniqueStrings(rows.map(sessionOfWitness).filter((value): value is string => value !== undefined))),
  });
}

function witnessStore(dataRoot: string): WitnessStore {
  return Object.freeze({
    logDir: path.join(dataRoot, "logs"),
    stateDir: path.join(dataRoot, "state"),
    recordDir: path.join(dataRoot, "records"),
    contentDir: path.join(dataRoot, "content"),
  });
}

function eventTime(row: JsonValue): JsonValue {
  if (row !== null && typeof row === "object" && !Array.isArray(row) && typeof row.at === "string") return row.at;
  return "unknown";
}

function sessionOfWitness(row: EAVTRecord): string | undefined {
  if (row.a !== "session") return undefined;
  return typeof row.v === "string" && row.v.trim() !== "" ? row.v : undefined;
}

function chronicleConstituents(chronicle: SubstrateChronicle): readonly Constituent[] {
  const bySession = new Map<string, EAVTRecord[]>();
  for (const witness of chronicle.witnesses as readonly EAVTRecord[]) {
    const session = typeof witness.e === "string" ? witness.e : "agent-events";
    const existing = bySession.get(session) ?? [];
    existing.push(witness);
    bySession.set(session, existing);
  }
  return Object.freeze([...bySession.entries()].map(([session, witnesses]) => Object.freeze({
    name: `chronicle:${session}`,
    utterances: admitSeed(witnesses.map((witness) =>
      `${session}|witnesses:${String(witness.a)}`).join("\n")),
  })));
}

function readGovernedContent(root: string, limit: number): SubstrateContent {
  const resources = readContentTree(root, "", { limit }).map((resource) => Object.freeze({
    path: resource.path,
    bytes: resource.content.length,
  }));
  return Object.freeze({
    kind: "organizing.substrate.content" as const,
    root,
    resources: Object.freeze(resources),
  });
}

function contentConstituent(resource: SubstrateContent["resources"][number]): Constituent {
  return Object.freeze({
    name: `content:${resource.path}`,
    utterances: admitSeed(`content:${resource.path}|governed-material\ncontent:${resource.path}|bytes:${resource.bytes}`),
  });
}

function substrateWorkItem(key: readonly (null | boolean | number | string)[], title: string): WorkItem {
  const term = workTerm(["substrate", ...key]);
  const goal = cell(term, predicateOfClaim(claim(mark("governed-substrate"))), token(mark(title)));
  const task = workTask({
    term: workTerm(["task", ...key]),
    goals: [goal],
    evidence: [workTerm(["title", title]), predicate("directory-substrate")],
  });
  return workItem({
    term,
    task,
    evidence: [workTerm(["title", title]), workTerm(["status", "active"])],
  });
}

function workItemTitle(item: WorkItem): string {
  for (const evidence of item.evidence ?? []) {
    if (typeof evidence === "object" && evidence !== null && "kind" in evidence && "mark" in evidence && evidence.kind === "utterance.token") {
      const value = evidence.mark.value;
      if (Array.isArray(value) && value[0] === "title" && typeof value[1] === "string") return value[1];
    }
  }
  return JSON.stringify(item.term.mark.value);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}
