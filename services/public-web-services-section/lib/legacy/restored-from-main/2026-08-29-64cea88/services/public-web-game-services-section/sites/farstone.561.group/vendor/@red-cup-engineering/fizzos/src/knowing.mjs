import { fourName, fourNamed, joinKnowledge } from "./four.mjs";

const keyOf = ({ subject, predicate, object }) => JSON.stringify([subject, predicate, object]);

export function createKnowledge() {
  return Object.freeze({ kind: "fizzos.knowledge.v1", cells: Object.freeze({}), questions: Object.freeze([]) });
}

export function absorb(knowledge, claims) {
  const cells = { ...knowledge.cells };
  for (const claim of Array.isArray(claims) ? claims : [claims]) {
    const key = keyOf(claim);
    const prior = cells[key];
    cells[key] = Object.freeze({
      subject: claim.subject,
      predicate: claim.predicate,
      object: claim.object,
      charge: prior === undefined ? claim.charge : fourName(joinKnowledge(fourNamed(prior.charge), fourNamed(claim.charge))),
    });
  }
  return Object.freeze({ ...knowledge, cells: Object.freeze(cells) });
}

export function cognize(knowledge, claim) { return knowledge.cells[keyOf(claim)]?.charge ?? "neither"; }

export function doubt(knowledge, claim) {
  const key = keyOf(claim);
  if (!(key in knowledge.cells)) return knowledge;
  const cells = { ...knowledge.cells, [key]: Object.freeze({ ...knowledge.cells[key], charge: "neither" }) };
  return Object.freeze({ ...knowledge, cells: Object.freeze(cells) });
}

export function forget(knowledge, claim) {
  const cells = { ...knowledge.cells };
  delete cells[keyOf(claim)];
  return Object.freeze({ ...knowledge, cells: Object.freeze(cells) });
}

export function ask(knowledge, question) {
  return Object.freeze({ ...knowledge, questions: Object.freeze([...new Set([...knowledge.questions, question])].sort()) });
}

export function uncertainty(knowledge) {
  return Object.freeze(Object.values(knowledge.cells).filter(({ charge }) => charge === "neither" || charge === "both"));
}
