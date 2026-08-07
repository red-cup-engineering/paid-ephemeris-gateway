import type { ManifestCarrier } from "@emsenn/computing";

import {
  dependencyGraphCarrier,
  resolutionCarrier,
  workspaceCarrier,
  type DependencyGraph,
  type Resolution,
  type WorkspaceCarrier,
} from "./host-neutral-carriers.mjs";

export type WorkspaceManifest = Readonly<{
  locator: string;
  manifest: ManifestCarrier;
}>;

type WorkspaceDependencyEdge = DependencyGraph["edges"][number];

function yamlScalar(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/^["']|["']$/gu, "");
}

export function decodePnpmWorkspace(text: string, manifests: readonly WorkspaceManifest[] = [], id = "workspace"): WorkspaceCarrier {
  const packages = new Set<string>();
  const lines = text.split(/\r?\n/u);
  let inPackages = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/u, "");
    if (/^\s*packages\s*:\s*$/u.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/u.test(line)) inPackages = false;
    if (!inPackages) continue;
    const match = /^\s*-\s*(.+?)\s*$/u.exec(line);
    if (match?.[1] !== undefined) packages.add(yamlScalar(match[1]));
  }
  const members = manifests.map((entry) => ({
    name: entry.manifest.name,
    manifest: entry.manifest.name,
    locator: entry.locator,
    packageManager: "pnpm" as const,
  }));
  return workspaceCarrier.assert({
    kind: "organizing.workspace-carrier",
    id,
    packageManager: "pnpm",
    members: Object.freeze(members.sort((a, b) => a.name.localeCompare(b.name))),
    mediaType: "application/vnd.pnpm.workspace+yaml",
    ...(packages.size === 0 ? {} : { name: [...packages].sort().join(";") }),
  }, "pnpm-workspace.yaml");
}

export function encodePnpmWorkspace(workspace: WorkspaceCarrier): string {
  const locators = workspace.members.map((member) => member.locator).filter((value): value is string => value !== undefined);
  const patterns = locators.length === 0 ? workspace.members.map((member) => member.name) : locators;
  return `packages:\n${[...new Set(patterns)].sort((a, b) => a.localeCompare(b)).map((pattern) => `  - ${JSON.stringify(pattern)}`).join("\n")}\n`;
}

export function decodePnpmLock(text: string, manifests: readonly ManifestCarrier[] = []): Resolution {
  const workspaceNames = new Set(manifests.map((manifest) => manifest.name));
  const decisions: Resolution["decisions"] = Object.freeze(manifests.flatMap((manifest) =>
    manifest.dependencies.map((dep) => ({
      requester: manifest.name,
      dependency: dep.name,
      selected: dep.protocol === "workspace" || workspaceNames.has(dep.name) ? dep.name : `${dep.name}@${dep.range ?? "unresolved"}`,
      ...(dep.range === undefined ? {} : { range: dep.range }),
      reason: dep.protocol === "workspace" || workspaceNames.has(dep.name)
        ? "workspace" as const
        : lockMentions(text, dep.name, dep.range) ? "lockfile" as const : "unresolved" as const,
    }))));
  const unresolved = decisions.filter((decision) => decision.reason === "unresolved").map((decision) => `${decision.requester}:${decision.dependency}`);
  const conflicts = dependencyConflicts(decisions);
  return resolutionCarrier.assert({
    kind: "organizing.resolution",
    decisions,
    unresolved: Object.freeze(unresolved.sort((a, b) => a.localeCompare(b))),
    conflicts,
    h1: conflicts.length,
  }, "pnpm-lock.yaml resolution");
}

export function encodePnpmLockResolution(resolution: Resolution): string {
  return `${JSON.stringify({
    kind: resolution.kind,
    decisions: resolution.decisions,
    unresolved: resolution.unresolved,
    conflicts: resolution.conflicts,
    h1: resolution.h1,
  }, null, 2)}\n`;
}

export function dependencyGraphFromManifests(manifests: readonly ManifestCarrier[], resolution?: Resolution): DependencyGraph {
  const workspaceNames = new Set(manifests.map((manifest) => manifest.name));
  const resolutionByRequest = new Map<string, string>();
  for (const decision of resolution?.decisions ?? []) {
    resolutionByRequest.set(`${decision.requester}\0${decision.dependency}`, decision.selected);
  }
  const nodes = manifests.map((manifest) => ({
    id: manifest.name,
    manifest: manifest.name,
    workspaceMember: true,
  }));
  const edges: WorkspaceDependencyEdge[] = [];
  for (const manifest of manifests) {
    for (const dep of manifest.dependencies) {
      if (!workspaceNames.has(dep.name)) continue;
      edges.push(Object.freeze({
        from: manifest.name,
        to: dep.name,
        relationship: dep.relationship,
        ...(dep.range === undefined ? {} : { range: dep.range }),
        ...(resolutionByRequest.has(`${manifest.name}\0${dep.name}`) ? { resolvedBy: resolutionByRequest.get(`${manifest.name}\0${dep.name}`)! } : {}),
      }));
    }
  }
  const graph = {
    kind: "organizing.dependency-graph" as const,
    nodes: Object.freeze(nodes.sort((a, b) => a.id.localeCompare(b.id))),
    edges: Object.freeze(edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))),
    cycles: dependencyCycles(nodes.map((node) => node.id), edges),
  };
  return dependencyGraphCarrier.assert(graph, "workspace dependency graph");
}

export function topologicalSortDependencyGraph(graph: DependencyGraph): readonly (readonly string[])[] {
  const names = graph.nodes.map((node) => node.id);
  const outstanding = new Map(names.map((name) => [name, 0]));
  const dependents = new Map(names.map((name) => [name, [] as string[]]));
  for (const edge of graph.edges) {
    if (!outstanding.has(edge.from) || !outstanding.has(edge.to)) continue;
    outstanding.set(edge.from, (outstanding.get(edge.from) ?? 0) + 1);
    dependents.get(edge.to)?.push(edge.from);
  }
  const tiers: string[][] = [];
  let frontier = names.filter((name) => (outstanding.get(name) ?? 0) === 0).sort((a, b) => a.localeCompare(b));
  while (frontier.length > 0) {
    tiers.push(frontier);
    const next: string[] = [];
    for (const provider of frontier) {
      for (const dependent of dependents.get(provider) ?? []) {
        const remaining = (outstanding.get(dependent) ?? 0) - 1;
        outstanding.set(dependent, remaining);
        if (remaining === 0) next.push(dependent);
      }
    }
    frontier = next.sort((a, b) => a.localeCompare(b));
  }
  return Object.freeze(tiers.map((tier) => Object.freeze(tier)));
}

export function dependencyGraphH1(graph: DependencyGraph): number {
  const components = componentCount(graph);
  return Math.max(0, graph.edges.length - graph.nodes.length + components);
}

function componentCount(graph: DependencyGraph): number {
  const parent = new Map(graph.nodes.map((node) => [node.id, node.id]));
  const find = (value: string): string => {
    const current = parent.get(value) ?? value;
    if (current === value) return current;
    const root = find(current);
    parent.set(value, root);
    return root;
  };
  const union = (left: string, right: string): void => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a, b);
  };
  for (const edge of graph.edges) union(edge.from, edge.to);
  return new Set(graph.nodes.map((node) => find(node.id))).size;
}

function dependencyConflicts(decisions: Resolution["decisions"]): Resolution["conflicts"] {
  const byDependency = new Map<string, Map<string, string[]>>();
  for (const decision of decisions) {
    const byCandidate = byDependency.get(decision.dependency) ?? new Map<string, string[]>();
    const requesters = byCandidate.get(decision.selected) ?? [];
    requesters.push(decision.requester);
    byCandidate.set(decision.selected, requesters);
    byDependency.set(decision.dependency, byCandidate);
  }
  return Object.freeze([...byDependency.entries()].flatMap(([dependency, candidates]) => {
    if (candidates.size <= 1) return [];
    return [{
      dependency,
      requesters: Object.freeze([...candidates.values()].flat().sort((a, b) => a.localeCompare(b))),
      candidates: Object.freeze([...candidates.keys()].sort((a, b) => a.localeCompare(b))),
    }];
  }).sort((a, b) => a.dependency.localeCompare(b.dependency)));
}

function dependencyCycles(nodes: readonly string[], edges: readonly WorkspaceDependencyEdge[]): readonly (readonly string[])[] {
  const out = new Map(nodes.map((node) => [node, [] as string[]]));
  for (const edge of edges) out.get(edge.from)?.push(edge.to);
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const visit = (node: string): void => {
    if (visiting.has(node)) {
      const offset = stack.indexOf(node);
      if (offset !== -1) cycles.push(stack.slice(offset));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of out.get(node) ?? []) visit(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of nodes) visit(node);
  return Object.freeze(cycles.map((cycle) => Object.freeze(cycle)).sort((a, b) => b.length - a.length || (a[0] ?? "").localeCompare(b[0] ?? "")));
}

function lockMentions(lockText: string, name: string, range: string | undefined): boolean {
  return lockText.includes(`${name}:`) || (range !== undefined && lockText.includes(`${name}@${range}`));
}
