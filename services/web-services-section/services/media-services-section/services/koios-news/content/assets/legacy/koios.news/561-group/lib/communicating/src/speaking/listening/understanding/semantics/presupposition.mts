


import type { ParseResult } from "../../parsing/index.mjs";
import type { ChargeValue } from "../../parsing/index.mjs";

export type TriggerKind = "definite-description" | "factive" | "aspectual" | "cleft";

export interface PresuppositionTrigger {
  readonly kind: TriggerKind;
  readonly text: string;
}

export interface Presupposition {
  readonly trigger: PresuppositionTrigger;
  readonly presupposed: string;
  readonly projectsUnderNegation: true;
  readonly status: ChargeValue;
}

const FACTIVE_VERBS = new Set(["know", "realize", "regret", "discover", "recognize", "see", "hear"]);
const ASPECTUAL_VERBS = new Set(["stop", "continue", "start", "begin", "finish", "resume", "quit"]);

/** Detect presupposition triggers in a parse result. */
export function presuppositions(result: ParseResult): readonly Presupposition[] {
  const result_list: Presupposition[] = [];

  for (const w of result.words) {
    const lower = w.text.toLowerCase();

    
    if (lower === "the") {
      const detArc = result.arcs.find((a) => a.dependent === `word@${w.i}` && a.rel === "det");
      if (detArc) {
        const headWord = result.words.find((hw) => `word@${hw.i}` === detArc.head);
        if (headWord) {
          result_list.push({
            trigger: { kind: "definite-description", text: `the ${headWord.text}` },
            presupposed: `∃x: ${headWord.text.toLowerCase()}(x)`,
            projectsUnderNegation: true,
            status: "absurd",
          });
        }
      }
    }

    if (FACTIVE_VERBS.has(lower) && w.tags.includes("verb")) {
      result_list.push({
        trigger: { kind: "factive", text: w.text },
        presupposed: `complement of "${w.text}" holds`,
        projectsUnderNegation: true,
        status: "absurd",
      });
    }

    if (ASPECTUAL_VERBS.has(lower) && w.tags.includes("verb")) {
      result_list.push({
        trigger: { kind: "aspectual", text: w.text },
        presupposed: `prior activity before "${w.text}"`,
        projectsUnderNegation: true,
        status: "absurd",
      });
    }
  }

  const itIdx = result.words.findIndex((w) => w.text.toLowerCase() === "it");
  const whoIdx = result.words.findIndex((w) => w.text.toLowerCase() === "who");
  if (itIdx !== -1 && whoIdx !== -1 && whoIdx > itIdx + 1) {
    const focus = result.words
      .slice(itIdx + 1, whoIdx)
      .map((w) => w.text)
      .join(" ");
    result_list.push({
      trigger: { kind: "cleft", text: `it was ${focus} who` },
      presupposed: `someone did the action`,
      projectsUnderNegation: true,
      status: "absurd",
    });
  }

  return result_list;
}
