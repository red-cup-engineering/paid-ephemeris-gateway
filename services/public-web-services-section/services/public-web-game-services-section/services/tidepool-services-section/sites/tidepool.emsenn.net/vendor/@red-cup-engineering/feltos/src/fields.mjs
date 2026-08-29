import { settledWorld, value } from "./world.mjs";

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function fail(message) {
  throw new TypeError(message);
}

export function worldGraph(world) {
  const rooms = settledWorld(world)
    .filter(({ predicate, object, evidence }) => predicate === "kind" && object === "room" && evidence.positiveEvidence)
    .map(({ subject }) => subject)
    .sort(compareText);
  const roomSet = new Set(rooms);
  const adjacency = {};
  for (const room of rooms) adjacency[room] = [];
  for (const cell of settledWorld(world)) {
    if (!roomSet.has(cell.subject)
      || !cell.predicate.startsWith("exit:")
      || typeof cell.object !== "string"
      || !roomSet.has(cell.object)
      || !cell.evidence.positiveEvidence) continue;
    adjacency[cell.subject].push(cell.object);
    adjacency[cell.object].push(cell.subject);
  }
  for (const room of rooms) adjacency[room] = Object.freeze([...new Set(adjacency[room])].sort(compareText));
  return Object.freeze({ kind: "feltos.world-graph.v1", nodes: Object.freeze(rooms), adjacency: Object.freeze(adjacency) });
}

function fieldValue(field, node) {
  const value = field instanceof Map ? field.get(node) : field[node];
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`field at ${node} must be finite`);
  return value;
}

/** One conservative graph-Laplacian diffusion step. */
export function diffuse(graph, field, { rate = 0.25 } = {}) {
  if (graph?.kind !== "feltos.world-graph.v1") fail("diffuse requires a world graph");
  if (typeof rate !== "number" || rate < 0 || rate > 1) fail("diffusion rate must lie in [0,1]");
  const next = Object.fromEntries(graph.nodes.map((node) => [node, fieldValue(field, node) * (1 - (graph.adjacency[node].length > 0 ? rate : 0))]));
  for (const node of graph.nodes) {
    const neighbors = graph.adjacency[node];
    if (neighbors.length === 0) continue;
    const share = fieldValue(field, node) * rate / neighbors.length;
    for (const neighbor of neighbors) next[neighbor] += share;
  }
  return Object.freeze(next);
}

export function fieldMass(graph, field) {
  return graph.nodes.reduce((total, node) => total + fieldValue(field, node), 0);
}

export function graphComponents(graph) {
  if (graph?.kind !== "feltos.world-graph.v1") fail("graphComponents requires a world graph");
  const unseen = new Set(graph.nodes);
  const components = [];
  while (unseen.size > 0) {
    const start = [...unseen].sort(compareText)[0];
    const queue = [start];
    const component = [];
    unseen.delete(start);
    while (queue.length > 0) {
      const node = queue.shift();
      component.push(node);
      for (const neighbor of graph.adjacency[node]) {
        if (!unseen.delete(neighbor)) continue;
        queue.push(neighbor);
      }
    }
    components.push(Object.freeze(component.sort(compareText)));
  }
  return Object.freeze(components);
}

export function graphSpectrum(graph) {
  const components = graphComponents(graph);
  const degrees = graph.nodes.map((node) => graph.adjacency[node].length);
  return Object.freeze({
    components: components.length,
    connected: graph.nodes.length > 0 && components.length === 1,
    isolated: degrees.filter((degree) => degree === 0).length,
    minimumDegree: degrees.length === 0 ? 0 : Math.min(...degrees),
    maximumDegree: degrees.length === 0 ? 0 : Math.max(...degrees),
  });
}

export function predicateField(world, predicate) {
  const graph = worldGraph(world);
  return Object.freeze(Object.fromEntries(graph.nodes.map((node) => [node, Number(value(world, node, predicate) ?? 0)])));
}
