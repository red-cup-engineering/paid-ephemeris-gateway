
import type { KnowledgeBaseEntity, LinkResult } from "./types.mjs";
import { bottom, charge as relateCharge, chargeValue, valueOf } from "@emsenn/relating-experimental";
import { descend } from "../parsing/descending.mjs";

const BOTTOM = bottom;
const TRUE = relateCharge(chargeValue("potential"));
const FALSE = relateCharge(chargeValue("active"));

const defaultKb: readonly KnowledgeBaseEntity[] = [
  { id: "apple-co", name: "Apple Inc.", type: "ORG", aliases: ["Apple"] },
  { id: "apple-fruit", name: "apple", type: "FOOD", aliases: ["Apple", "apple"] },
  { id: "washington-dc", name: "Washington", type: "GPE", aliases: ["Washington"] },
  { id: "washington-person", name: "George Washington", type: "PERSON", aliases: ["Washington"] },
  { id: "paris-fr", name: "Paris", type: "GPE", aliases: ["Paris"] },
  { id: "paris-person", name: "Paris", type: "PERSON", aliases: ["Paris"] },
];

function lookup(
  surface: string,
  type?: string,
  kb: readonly KnowledgeBaseEntity[] = defaultKb,
): readonly KnowledgeBaseEntity[] {
  const needle = surface.toLowerCase();
  return kb.filter((entity) => {
    const answers = entity.name.toLowerCase() === needle
      || entity.aliases.some((alias) => alias.toLowerCase() === needle);
    return answers && (type === undefined || entity.type === type);
  });
}

export function linkEntity(
  surface: string,
  type?: string,
): LinkResult {
  const candidates = lookup(surface, type);
  const ids = candidates.map((candidate) => candidate.id);
  const subject = `mention:${surface}`;

  if (candidates.length === 0) {
    const settled = descend([{ subject, predicate: "link-unique", charge: BOTTOM }]);
    return { status: "nil", entity: null, candidates: ids, charge: settled.settledCharge(subject, "link-unique") };
  }

  if (candidates.length === 1) {
    const settled = descend([{ subject, predicate: "link-unique", charge: TRUE }]);
    const charge = settled.settledCharge(subject, "link-unique");
    const chargeValueName = valueOf(charge).name;
    return {
      status: chargeValueName === "potential" ? "linked" : "ambiguous",
      entity: chargeValueName === "potential" ? ids[0]! : null,
      candidates: ids,
      charge,
    };
  }

  const settled = descend(
    [
      { subject, predicate: "link-candidate-a", charge: TRUE },
      { subject, predicate: "link-candidate-b", charge: FALSE },
      { subject, predicate: "link-unique", charge: BOTTOM },
    ],
    [
      { source: "link-candidate-a", target: "link-unique" },
      { source: "link-candidate-b", target: "link-unique" },
    ],
  );
  const charge = settled.settledCharge(subject, "link-unique");
  return { status: valueOf(charge).name === "stable" ? "ambiguous" : "linked", entity: null, candidates: ids, charge };
}
