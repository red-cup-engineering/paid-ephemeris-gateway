


import type { TextPlan, ClauseSpec, RoleFrame } from "./types.mjs";

/** Plan a sequence of clauses from a sequence of role frames.
 * Introduces pronouns for repeated agents after the first mention. */
export function plan(
  frames: readonly RoleFrame[],
  opts?: { tense?: ClauseSpec["tense"] },
): TextPlan {
  const tense = opts?.tense ?? "present";
  const seen = new Set<string>();
  const clauses: ClauseSpec[] = [];

  for (const frame of frames) {
    const agent = frame.agent ?? "someone";
    
    const subject = seen.has(agent.toLowerCase()) ? pronominalize(agent) : agent;
    seen.add(agent.toLowerCase());

    const obliques = [];
    if (frame.instrument) obliques.push({ prep: "with", object: frame.instrument });
    if (frame.recipient) obliques.push({ prep: "to", object: frame.recipient });
    if (frame.location) obliques.push({ prep: "in", object: frame.location });

    clauses.push({
      subject,
      verb: frame.verb,
      ...(frame.patient !== undefined ? { object: frame.patient } : {}),
      tense,
      ...(obliques.length > 0 ? { obliques } : {}),
    });
  }

  
  const connectives: Record<number, string> = {};
  for (let i = 1; i < clauses.length; i++) {
    const prev = clauses[i - 1];
    const curr = clauses[i];
    if (prev && curr && prev.subject.toLowerCase() === curr.subject.toLowerCase()) {
      connectives[i] = "and";
    }
  }

  return { clauses, connectives };
}

/** Pronominalize an agent name to the appropriate 3rd person pronoun.
 * Defaults to "they" (gender-neutral singular they). */
function pronominalize(_name: string): string {
  return "they";
}

/** Realize a TextPlan as a prose string. */
export function planToText(plan: TextPlan, realize: (spec: ClauseSpec) => string): string {
  const sentences: string[] = [];
  let i = 0;
  while (i < plan.clauses.length) {
    const parts: string[] = [];
    parts.push(realize(plan.clauses[i]!));
    
    while (plan.connectives?.[i + 1] === "and" && i + 1 < plan.clauses.length) {
      i++;
      const nextClause = plan.clauses[i]!;
      
      const chainedSpec = { ...nextClause, subject: "" };
      const chainedText = realize(chainedSpec).trim();
      parts.push(`and ${chainedText}`);
    }
    sentences.push(capitalize(parts.join(", ")) + ".");
    i++;
  }
  return sentences.join(" ");
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
