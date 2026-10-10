import { contentsOf, settledWorld, value } from "./world.mjs";
import { FOUR, fourNamed, joinKnowledge } from "./four.mjs";

export function childrenOf(world, subject) {
  const located = contentsOf(world, subject);
  const parts = settledWorld(world).filter(({ predicate, object, evidence }) => predicate === "part-of" && object === subject && evidence.positiveEvidence).map(({ subject }) => subject);
  return Object.freeze([...new Set([...located, ...parts])].sort());
}

export function subtree(world, root) {
  const result = [];
  const queue = [root];
  const seen = new Set();
  while (queue.length > 0) {
    const subject = queue.shift();
    if (seen.has(subject)) continue;
    seen.add(subject);
    result.push(subject);
    queue.push(...childrenOf(world, subject));
  }
  return Object.freeze(result);
}

export function aggregateNumber(world, root, predicate) {
  return subtree(world, root).reduce((total, subject) => total + Number(value(world, subject, predicate) ?? 0), 0);
}

export function aggregateCharge(world, root, predicate) {
  return subtree(world, root).reduce((charge, subject) => {
    const name = value(world, subject, predicate);
    return typeof name === "string" && name in FOUR ? joinKnowledge(charge, fourNamed(name)) : charge;
  }, FOUR.neither);
}
