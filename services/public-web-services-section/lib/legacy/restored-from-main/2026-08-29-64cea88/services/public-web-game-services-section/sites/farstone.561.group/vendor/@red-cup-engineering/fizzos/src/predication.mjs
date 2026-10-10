import { contentsOf, declareFunctional, move, perceive, placeOf, settledWorld, tell, value } from "./world.mjs";

export function affordances(world, actor, target) {
  if (!perceive(world, actor).subjects.includes(target)) return Object.freeze([]);
  const result = ["examine"];
  const kind = value(world, target, "kind");
  if (kind === "thing" && placeOf(world, target) === placeOf(world, actor)) result.push("take");
  if (kind === "thing" && placeOf(world, target) === actor) result.push("drop");
  if (kind === "actor") result.push("say");
  return Object.freeze(result.sort());
}

export function inhabit(world, actor, body) {
  if (!perceive(world, actor).subjects.includes(body)) throw new Error("body is outside the actor's perception");
  return tell(declareFunctional(world, ["playing-as"]), { subject: actor, predicate: "playing-as", object: body }, { source: "fizzos.predication.inhabit" });
}

export function bodyOf(world, actor) { return value(world, actor, "playing-as") ?? actor; }

export function release(world, actor) {
  return tell(declareFunctional(world, ["playing-as"]), { subject: actor, predicate: "playing-as", object: actor }, { source: "fizzos.predication.release" });
}

export function entangle(world, left, right, relation = "encountered") {
  return tell(world, [
    { subject: left, predicate: `entangled:${relation}`, object: right },
    { subject: right, predicate: `entangled:${relation}`, object: left },
  ], { source: "fizzos.predication.entangle" });
}

export function entanglements(world, subject, relation = "encountered") {
  return Object.freeze(settledWorld(world).filter((cell) => cell.subject === subject && cell.predicate === `entangled:${relation}` && cell.evidence.positiveEvidence).map(({ object }) => object));
}

function matches(world, pattern) {
  return settledWorld(world).some(({ subject, predicate, object, evidence }) =>
    evidence.positiveEvidence
    && (pattern.subject === "*" || pattern.subject === subject)
    && pattern.predicate === predicate
    && pattern.object === object);
}

export function closeWorld(world, rules, { fuel = 100 } = {}) {
  let fired = 0;
  const seen = new Set();
  while (fired < fuel) {
    let changed = false;
    for (const [index, rule] of rules.entries()) {
      const key = `${index}:${JSON.stringify(rule.when)}`;
      if (seen.has(key) || !matches(world, rule.when)) continue;
      seen.add(key);
      world = tell(world, rule.then, { source: "fizzos.predication.rule" });
      fired += 1;
      changed = true;
    }
    if (!changed) return Object.freeze({ world, fired, settled: true });
  }
  return Object.freeze({ world, fired, settled: false });
}

export function isSettledDead(world, subject) {
  return value(world, subject, "condition") === "dead" || Number(value(world, subject, "health") ?? 1) <= 0;
}

export function foldWord(world, left, right, witnesses) {
  if (!Array.isArray(witnesses) || witnesses.length === 0) return Object.freeze({ world, word: null });
  const word = `word:${world.sequence + 1}`;
  world = tell(world, [
    { subject: word, predicate: "kind", object: "word" },
    { subject: word, predicate: "from", object: left },
    { subject: word, predicate: "from", object: right },
    ...witnesses.map((witness) => ({ subject: word, predicate: "witness", object: witness })),
  ], { source: "fizzos.predication.fold" });
  world = move(world, word, left, { source: "fizzos.predication.fold" });
  return Object.freeze({ world: entangle(world, left, right, "folded"), word });
}

export function unfoldWord(world, word, actor) {
  if (value(world, word, "kind") !== "word") throw new Error("only a word can unfold");
  const being = `unfolded:${word}:${world.sequence + 1}`;
  world = tell(world, [
    { subject: being, predicate: "kind", object: "thing" },
    { subject: being, predicate: "name", object: `an echo of ${word}` },
    { subject: being, predicate: "from-word", object: word },
  ], { source: "fizzos.predication.unfold" });
  return Object.freeze({ world: move(world, being, placeOf(world, actor) ?? actor), being });
}
