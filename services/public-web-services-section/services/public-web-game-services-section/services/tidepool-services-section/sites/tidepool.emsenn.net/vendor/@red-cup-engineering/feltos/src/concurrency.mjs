import { move, settledWorld } from "./world.mjs";

function fail(message) {
  throw new TypeError(message);
}

function normalizeOperation(source) {
  if (source?.kind !== "move"
    || typeof source.subject !== "string" || source.subject.length === 0
    || typeof source.destination !== "string" || source.destination.length === 0) {
    fail("concurrency operation must be a move with subject and destination");
  }
  return Object.freeze({ kind: "move", subject: source.subject, destination: source.destination });
}

export function applyOperation(world, source) {
  const operation = normalizeOperation(source);
  return move(world, operation.subject, operation.destination, { source: "feltos.concurrent-move" });
}

function semanticCells(world) {
  return settledWorld(world).map(({ subject, predicate, object, evidence }) => ({
    subject,
    predicate,
    object,
    evidence,
  }));
}

function semanticKey(cell) {
  return JSON.stringify(cell);
}

/**
 * Compute the H¹-style obstruction for two admitted world operations. A clean
 * square has equal settled boundaries in both orders; a dirty square returns
 * the exact cells witnessing non-confluence.
 */
export function analyzeConfluence(world, leftSource, rightSource) {
  const left = normalizeOperation(leftSource);
  const right = normalizeOperation(rightSource);
  const leftThenRight = applyOperation(applyOperation(world, left), right);
  const rightThenLeft = applyOperation(applyOperation(world, right), left);
  const a = semanticCells(leftThenRight);
  const b = semanticCells(rightThenLeft);
  const aKeys = new Set(a.map(semanticKey));
  const bKeys = new Set(b.map(semanticKey));
  const witness = [...a.filter((cell) => !bKeys.has(semanticKey(cell))), ...b.filter((cell) => !aKeys.has(semanticKey(cell)))];
  return Object.freeze({
    kind: "feltos.confluence-assay.v1",
    confluent: witness.length === 0,
    left,
    right,
    witness: Object.freeze(witness),
    leftThenRight,
    rightThenLeft,
  });
}
