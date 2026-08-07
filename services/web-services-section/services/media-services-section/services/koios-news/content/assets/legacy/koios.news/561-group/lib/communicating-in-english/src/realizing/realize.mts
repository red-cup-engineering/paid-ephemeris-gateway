


import type { ClauseSpec, RealizationResult, ObliquePP, RoleFrame } from "./types.mjs";
import { conjugate } from "@emsenn/communicating/speaking/listening/algebra";
import { load } from "@emsenn/communicating/speaking/listening/algebra";
import { rawBundle } from "../bundle.mjs";

const bundle = load(rawBundle);

/** Determine if a subject is plural (heuristic: pronoun lookup or plural form). */
function isPlural(subject: string): boolean {
  const lower = subject.toLowerCase();
  const pf = bundle.pronounFeatures(lower);
  if (pf?.number === "pl") return true;
  if (pf?.number === "sg") return false;
  
  return /s$/.test(lower) && !/(ss|us|is|ous)$/.test(lower);
}

/** Realize a noun phrase: add "the" if bare noun, keep pronouns/proper nouns. */
function realizeNP(noun: string): string {
  if (noun.trim() === "") return "";
  const lower = noun.toLowerCase();
  
  if (bundle.isPronoun(lower)) return noun;
  
  if (/^[A-Z]/.test(noun)) return noun;
  
  return `the ${noun}`;
}

/** Realize a single clause from a ClauseSpec. */
export function realizeClause(spec: ClauseSpec): RealizationResult {
  const tense = spec.tense ?? "present";
  const plural = isPlural(spec.subject);
  const tokens: string[] = [];

  const subject = realizeNP(spec.subject);
  if (subject !== "") tokens.push(subject);

  if (spec.negated) {
    const doForm = tense === "past"
      ? "did"
      : plural ? "do" : "does";
    tokens.push(`${doForm} not`);
    const baseVerb = bundle.raw.morphology.irregularVerbs?.[spec.verb.toLowerCase()]
      ? spec.verb.toLowerCase()
      : spec.verb.toLowerCase();
    tokens.push(baseVerb);
  } else {
    const conjugOpts = plural
      ? { tense, number: "pl" as const }
      : { tense, person: 3 as const, number: "sg" as const };
    tokens.push(conjugate(spec.verb, conjugOpts, bundle));
  }

  if (spec.object !== undefined) {
    tokens.push(realizeNP(spec.object));
  }

  for (const obl of spec.obliques ?? []) {
    tokens.push(obl.prep);
    tokens.push(realizeNP(obl.object));
  }

  const text = tokens.join(" ");

  return { text, tokens, ...(spec.charge !== undefined ? { charge: spec.charge } : {}) };
}

/** Realize a role frame into a ClauseSpec. */
export function frameToClause(frame: RoleFrame, opts?: { tense?: ClauseSpec["tense"]; negated?: boolean }): ClauseSpec {
  const obliques: ObliquePP[] = [];
  if (frame.instrument) obliques.push({ prep: "with", object: frame.instrument });
  if (frame.recipient) obliques.push({ prep: "to", object: frame.recipient });
  if (frame.location) obliques.push({ prep: "in", object: frame.location });

  return {
    subject: frame.agent ?? "someone",
    verb: frame.verb,
    ...(frame.patient !== undefined ? { object: frame.patient } : {}),
    ...(opts?.tense !== undefined ? { tense: opts.tense } : {}),
    ...(opts?.negated !== undefined ? { negated: opts.negated } : {}),
    ...(obliques.length > 0 ? { obliques } : {}),
  };
}
