



import type { ParseResult } from "../../parsing/index.mjs";

export interface SemanticFrame {
  readonly verb: string;
  readonly agent: string | null;
  readonly patient: string | null;
  readonly instrument: string | null;
  readonly recipient: string | null;
  readonly location: string | null;
}

/** Extract semantic role frames from a parse result. */
export function roles(result: ParseResult): readonly SemanticFrame[] {
  const frames: SemanticFrame[] = [];

  
  const verbs = result.words.filter((w) => w.tags.includes("verb"));

  for (const verb of verbs) {
    
    const headArcs = result.arcs.filter((a) => a.head === verb.id);
    
    const depArcs = result.arcs.filter((a) => a.dependent === verb.id);

    let agent: string | null = null;
    let patient: string | null = null;
    let instrument: string | null = null;
    let recipient: string | null = null;
    let location: string | null = null;

    for (const arc of headArcs) {
      switch (arc.rel) {
        case "nsubj":
          
          agent = arc.depText;
          break;
        case "dobj":
          patient = arc.depText;
          break;
        case "prep": {
          
          const pobj = result.arcs.find((a) => a.head === arc.dependent && a.rel === "pobj");
          const prepWord = result.words.find((w) => w.id === arc.dependent);
          const prep = prepWord?.text.toLowerCase();
          if (pobj) {
            if (prep === "by") agent = pobj.depText;
            else if (prep === "with") instrument = pobj.depText;
            else if (prep === "to") recipient = pobj.depText;
            else if (prep === "in" || prep === "at" || prep === "on") location = pobj.depText;
          }
          break;
        }
      }
    }

    frames.push({ verb: verb.text, agent, patient, instrument, recipient, location });
  }

  return frames;
}
