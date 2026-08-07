import { stableJson } from "./json.mjs";
import type { AssertionTrace, WorldInput } from "./types.mjs";
import { allAssertions } from "./world.mjs";

// Path composition over the relational graph, local to this read: edges
// compose across a shared object — (a,p,b)·(b,q,c) ↦ (a,[p,q],c) — and the
// residue is the composite label sequence each composition accumulated.
type PathEdge = Readonly<{ subject: unknown; predicate: unknown; object: unknown }>;

const pathLabels = (edge: PathEdge): readonly unknown[] =>
  Array.isArray(edge.predicate) ? edge.predicate : [edge.predicate];

function pathResidueFromEdges(input: { readonly edges: readonly PathEdge[] }): { residue: readonly (readonly unknown[])[] } {
  const composites: PathEdge[] = [];
  const edges = input.edges;
  for (let i = 0; i < edges.length; i++) {
    for (let j = 0; j < edges.length; j++) {
      if (i === j) continue;
      const leftEdge = edges[i]!;
      const rightEdge = edges[j]!;
      if (stableJson(leftEdge.object) === stableJson(rightEdge.subject)) {
        composites.push({ subject: leftEdge.subject, predicate: [...pathLabels(leftEdge), ...pathLabels(rightEdge)], object: rightEdge.object });
      }
    }
  }
  return { residue: composites.filter((edge) => pathLabels(edge).length > 1).map(pathLabels) };
}

// Contrariety claims relate predicate names, not entities; they are schema
// for the read layer, not edges of the entity graph.
const NON_RELATIONAL = new Set(["contrary-to"]);

/**
 * A cost-graph summary of a federated world: builds the relational entity graph
 * from assertions (edges are subject-predicate-object triples, contrary-to
 * claims excluded as non-relational), then returns structural dimensions
 * (subject/edge/component counts), the graph itself (central vertices, relation
 * counts, cut-vertices, bridge-edges, and path residue), the bottleneck
 * vertices and edges whose removal increases the component count, and a stable
 * contentKey over the dimensions and bottlenecks.
 */
export function costGraphSummary(input: WorldInput | AssertionTrace): Readonly<{
  kind: "animating.federation.cost.graph";
  dimensions: Readonly<Record<string, number>>;
  graph: Readonly<Record<string, unknown>>;
  bottlenecks: readonly string[];
  contentKey: string;
}> {
  const assertions = Array.isArray(input) ? input : allAssertions(input as WorldInput);
  const vertices = new Map<string, { id: string; kind: string; inDegree: number; outDegree: number }>();
  const edges: Array<{ from: string; to: string; relation: string }> = [];
  let relationalAssertions = 0;
  let nonRelationalAssertions = 0;

  for (const assertion of assertions) {
    if (!assertion || typeof assertion !== "object") continue;
    if (NON_RELATIONAL.has(assertion.a)) { nonRelationalAssertions += 1; continue; }
    addVertex(vertices, assertion.e);
    if (typeof assertion.v === "string" && assertion.v && assertion.v !== assertion.e) {
      addEdge(vertices, edges, assertion.e, assertion.v, assertion.a);
      relationalAssertions += 1;
    } else {
      nonRelationalAssertions += 1;
    }
  }

  const sensitivity = removalSensitivity(vertices, edges);
  const dimensions = Object.freeze({
    subjects: vertices.size,
    relationalAssertions,
    nonRelationalAssertions,
    edges: edges.length,
    components: sensitivity.baseComponentCount,
    cutVertices: sensitivity.cutVertices.length,
    bridgeEdges: sensitivity.bridgeEdges.length,
  });
  const bottlenecks = Object.freeze([
    ...sensitivity.cutVertices.map((v) => `cut-vertex ${v.id}: removal splits into +${v.componentIncrease} component(s)`),
    ...sensitivity.bridgeEdges.map((e) => `bridge-edge ${e.from} --${e.relation}--> ${e.to}: removal splits into +${e.componentIncrease} component(s)`),
  ]);
  const apex: PathEdge[] = edges.map((edge) => ({ subject: edge.from, predicate: edge.relation, object: edge.to }));
  const pathResidue = pathResidueFromEdges({ edges: apex }).residue;
  const paths = Object.freeze({
    residue: Object.freeze(pathResidue.map((sequence) => Object.freeze([...sequence]))),
    evidence: "the federated relational graph read as a void cone over the edge apex; residue carries unsaturable composite relation-label sequences.",
  });

  return Object.freeze({
    kind: "animating.federation.cost.graph",
    dimensions,
    graph: Object.freeze({
      vertexCount: vertices.size,
      edgeCount: edges.length,
      componentCount: sensitivity.baseComponentCount,
      centralVertices: Object.freeze(centralVertices(vertices)),
      relationCounts: Object.freeze(relationCounts(edges)),
      cutVertices: Object.freeze(sensitivity.cutVertices),
      bridgeEdges: Object.freeze(sensitivity.bridgeEdges),
      paths,
    }),
    bottlenecks,
    contentKey: stableJson([dimensions, bottlenecks]),
  });
}

function addVertex(vertices: Map<string, { id: string; kind: string; inDegree: number; outDegree: number }>, id: string): void {
  if (!id || vertices.has(id)) return;
  vertices.set(id, { id, kind: "subject", inDegree: 0, outDegree: 0 });
}

function addEdge(vertices: Map<string, { id: string; kind: string; inDegree: number; outDegree: number }>, edges: Array<{ from: string; to: string; relation: string }>, from: string, to: string, relation: string): void {
  addVertex(vertices, from);
  addVertex(vertices, to);
  edges.push({ from, to, relation });
  vertices.get(from)!.outDegree += 1;
  vertices.get(to)!.inDegree += 1;
}

function componentCountWith(
  vertices: Map<string, { id: string }>,
  edges: Array<{ from: string; to: string }>,
  removedVertex = "",
  removedEdgeIndex = -1,
): number {
  const neighbors = new Map([...vertices.keys()].filter((id) => id !== removedVertex).map((id) => [id, new Set<string>()]));
  for (const [index, edge] of edges.entries()) {
    if (index === removedEdgeIndex) continue;
    if (edge.from === removedVertex || edge.to === removedVertex) continue;
    neighbors.get(edge.from)?.add(edge.to);
    neighbors.get(edge.to)?.add(edge.from);
  }
  let count = 0;
  const seen = new Set<string>();
  for (const id of neighbors.keys()) {
    if (seen.has(id)) continue;
    count += 1;
    const stack = [id];
    seen.add(id);
    while (stack.length) {
      const current = stack.pop()!;
      for (const next of neighbors.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return count;
}

function removalSensitivity(vertices: Map<string, { id: string; kind: string; inDegree: number; outDegree: number }>, edges: Array<{ from: string; to: string; relation: string }>, limit = 5) {
  const base = componentCountWith(vertices, edges);
  const cutVertices = [...vertices.values()]
    .map((vertex) => ({ ...vertex, componentIncrease: componentCountWith(vertices, edges, vertex.id) - base }))
    .filter((vertex) => vertex.componentIncrease > 0)
    .sort((a, b) => b.componentIncrease - a.componentIncrease || (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree) || a.id.localeCompare(b.id))
    .slice(0, limit);
  const bridgeEdges = edges
    .map((edge, index) => ({ ...edge, componentIncrease: componentCountWith(vertices, edges, "", index) - base }))
    .filter((edge) => edge.componentIncrease > 0)
    .sort((a, b) => b.componentIncrease - a.componentIncrease || a.relation.localeCompare(b.relation))
    .slice(0, limit);
  return { baseComponentCount: base, cutVertices, bridgeEdges };
}

function centralVertices(vertices: Map<string, { id: string; kind: string; inDegree: number; outDegree: number }>, limit = 5) {
  return [...vertices.values()]
    .map((vertex) => ({ ...vertex, degree: vertex.inDegree + vertex.outDegree }))
    .filter((vertex) => vertex.degree > 0)
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function relationCounts(edges: Array<{ relation: string }>) {
  const counts = new Map<string, number>();
  for (const edge of edges) counts.set(edge.relation, (counts.get(edge.relation) ?? 0) + 1);
  return [...counts.entries()]
    .map(([relation, count]) => ({ relation, count }))
    .sort((a, b) => b.count - a.count || a.relation.localeCompare(b.relation));
}
