import {
  dependencyGraphCarrier,
  type DependencyGraph,
} from "./host-neutral-carriers.mjs";

type DependencyEdge = DependencyGraph["edges"][number];
type LeanDeclarationProofStatus = "proved" | "assumed" | "admitted" | "unknown";
type LeanDeclarationLike = Readonly<{
  kind: string;
  name: string;
  line?: number;
  proofStatus?: LeanDeclarationProofStatus;
}>;

type LeanModuleLike = Readonly<{
  id: string;
  imports: readonly string[];
  declarations: readonly LeanDeclarationLike[];
}>;

export type LeanTheoremSpineEntry = Readonly<{
  module: string;
  name: string;
  kind: "theorem" | "lemma";
  line?: number;
  proofStatus?: LeanDeclarationProofStatus;
}>;

export type LeanTheoremSpine = Readonly<{
  kind: "organizing.lean.theorem-spine";
  rootModule: string;
  entries: readonly LeanTheoremSpineEntry[];
  admitted: readonly string[];
}>;

export type LeanTheoremSpineCoverage = Readonly<{
  kind: "organizing.lean.theorem-spine-coverage";
  declared: number;
  present: number;
  missing: readonly string[];
  extra: readonly string[];
  admitted: readonly string[];
}>;

export function leanDependencyGraphFromModules(modules: readonly LeanModuleLike[]): DependencyGraph {
  const ids = new Set(modules.map((module) => module.id));
  for (const module of modules) for (const imported of module.imports) ids.add(imported);
  const nodes = [...ids].sort((left, right) => left.localeCompare(right)).map((id) => Object.freeze({
    id,
    manifest: id,
    workspaceMember: modules.some((module) => module.id === id),
  }));
  const edges = modules.flatMap((module) => module.imports.map((imported) => Object.freeze({
    from: module.id,
    to: imported,
    relationship: "build" as const,
    resolvedBy: "lean-import",
  })));
  return dependencyGraphCarrier.assert({
    kind: "organizing.dependency-graph",
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))),
    cycles: dependencyCycles(nodes.map((node) => node.id), edges),
  }, "Lean dependency graph") as DependencyGraph;
}

export function topologicalSortLeanModules(graph: DependencyGraph): readonly (readonly string[])[] {
  const names = graph.nodes.map((node) => node.id);
  const outstanding = new Map(names.map((name) => [name, 0]));
  const dependents = new Map(names.map((name) => [name, [] as string[]]));
  for (const edge of graph.edges) {
    if (!outstanding.has(edge.from) || !outstanding.has(edge.to)) continue;
    outstanding.set(edge.from, (outstanding.get(edge.from) ?? 0) + 1);
    dependents.get(edge.to)?.push(edge.from);
  }
  const tiers: string[][] = [];
  let frontier = names.filter((name) => (outstanding.get(name) ?? 0) === 0).sort((left, right) => left.localeCompare(right));
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
    frontier = next.sort((left, right) => left.localeCompare(right));
  }
  return Object.freeze(tiers.map((tier) => Object.freeze(tier)));
}

export function leanDependencyGraphH1(graph: DependencyGraph): number {
  const components = componentCount(graph);
  return Math.max(0, graph.edges.length - graph.nodes.length + components);
}

export function leanTheoremSpine(
  modules: readonly LeanModuleLike[],
  rootModule = "RelMath",
  names?: readonly string[],
): LeanTheoremSpine {
  const wanted = names === undefined ? undefined : new Set(names);
  const entries = modules.flatMap((module) => module.declarations
    .filter((decl) => decl.kind === "theorem" || decl.kind === "lemma")
    .filter((decl) => wanted === undefined || wanted.has(decl.name))
    .map((decl) => Object.freeze({
      module: module.id,
      name: decl.name,
      kind: decl.kind as "theorem" | "lemma",
      ...(decl.line === undefined ? {} : { line: decl.line }),
      ...(decl.proofStatus === undefined ? {} : { proofStatus: decl.proofStatus }),
    })));
  return Object.freeze({
    kind: "organizing.lean.theorem-spine" as const,
    rootModule,
    entries: Object.freeze(entries.sort((left, right) => left.module.localeCompare(right.module) || left.name.localeCompare(right.name))),
    admitted: Object.freeze(entries.filter((entry) => entry.proofStatus === "admitted").map((entry) => entry.name).sort((left, right) => left.localeCompare(right))),
  });
}

export function leanTheoremSpineCoverage(
  spine: LeanTheoremSpine,
  declarationIndex: Readonly<{ declarations: readonly string[] }>,
): LeanTheoremSpineCoverage {
  const declared = new Set(declarationIndex.declarations);
  const present = new Set(spine.entries.map((entry) => entry.name));
  return Object.freeze({
    kind: "organizing.lean.theorem-spine-coverage" as const,
    declared: declared.size,
    present: [...declared].filter((name) => present.has(name)).length,
    missing: Object.freeze([...declared].filter((name) => !present.has(name)).sort((left, right) => left.localeCompare(right))),
    extra: Object.freeze([...present].filter((name) => !declared.has(name)).sort((left, right) => left.localeCompare(right))),
    admitted: spine.admitted,
  });
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

function dependencyCycles(nodes: readonly string[], edges: readonly DependencyEdge[]): readonly (readonly string[])[] {
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
  return Object.freeze(cycles.map((cycle) => Object.freeze(cycle)).sort((left, right) => right.length - left.length || (left[0] ?? "").localeCompare(right[0] ?? "")));
}
