import { fourName, fourNamed, joinKnowledge } from "./four.mjs";

export function action({ address, polarity, move, daimon = false }) {
  if (typeof address !== "string" || !["positive", "negative"].includes(polarity) || typeof move !== "string") throw new TypeError("invalid ludics action");
  return Object.freeze({ address, polarity, move, daimon });
}

export function chronicle(actions) {
  const valid = actions.every((entry, index) => index === 0 || entry.polarity !== actions[index - 1].polarity);
  return Object.freeze({ kind: "feltos.chronicle.v1", actions: Object.freeze([...actions]), valid });
}

export function design(id, chronicles, charge = "neither") {
  fourNamed(charge);
  if (chronicles.some(({ valid }) => !valid)) throw new Error("design contains a non-alternating chronicle");
  return Object.freeze({ kind: "feltos.design.v1", id, chronicles: Object.freeze([...chronicles]), charge });
}

function terminalMoves(source) {
  return source.chronicles.map(({ actions }) => actions.at(-1)).filter(Boolean);
}

export function orthogonal(left, right) {
  for (const a of terminalMoves(left)) for (const b of terminalMoves(right)) {
    if (a.address === b.address && a.polarity !== b.polarity && (a.daimon || b.daimon)) return true;
  }
  return false;
}

export function cutPlayingDesign(left, right) {
  return Object.freeze({
    kind: "feltos.cut.v1",
    left: left.id,
    right: right.id,
    converges: orthogonal(left, right),
    charge: fourName(joinKnowledge(fourNamed(left.charge), fourNamed(right.charge))),
  });
}

export function dualizePlayingDesign(source) {
  return design(`dual:${source.id}`, source.chronicles.map(({ actions }) => chronicle(actions.map((entry) => action({ ...entry, polarity: entry.polarity === "positive" ? "negative" : "positive" })))), source.charge);
}

export function behavior(generators, universe) {
  const closure = universe.filter((candidate) => generators.every((generator) => orthogonal(generator, candidate)));
  const biorthogonal = universe.filter((candidate) => closure.every((opponent) => orthogonal(candidate, opponent)));
  return Object.freeze({ generators: Object.freeze([...generators]), orthogonal: Object.freeze(closure), biorthogonal: Object.freeze(biorthogonal) });
}
