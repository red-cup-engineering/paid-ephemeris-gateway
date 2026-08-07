



import type { Word, Arc } from "./types.mjs";
import type { CompiledBundle } from "./types.mjs";

/** A proposed arc with the source rule that licensed it. */
export interface Proposal {
  readonly arc: Arc;
  readonly rule: string;
}



function nearestNominal(words: readonly Word[], start: number, dir: -1 | 1): Word | null {
  for (let j = start + dir; j >= 0 && j < words.length; j += dir) {
    const cand = words[j];
    if (!cand) continue;
    if (cand.tags.includes("noun") || cand.tags.includes("pron")) return cand;
  }
  return null;
}

function det(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("det")) continue;
    const dir = bundle.attachment.determiner === "left" ? 1 : -1;
    const head = nearestNominal(words, i, dir);
    if (head) {
      proposals.push({ arc: { head: head.id, rel: "det", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "det" });
    }
  }
  return proposals;
}

function amod(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("adj")) continue;
    const dir = bundle.attachment.adjective === "left" ? 1 : -1;
    const head = nearestNominal(words, i, dir);
    if (head?.tags.includes("noun")) {
      proposals.push({ arc: { head: head.id, rel: "amod", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "amod" });
    }
  }
  return proposals;
}

function advmod(words: readonly Word[]): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("adv")) continue;
    
    let closest: Word | null = null;
    let closestDist = Infinity;
    for (let j = 0; j < words.length; j++) {
      const head = words[j];
      if (!head) continue;
      if (!head.tags.includes("verb")) continue;
      const dist = Math.abs(j - i);
      if (dist < closestDist) { closestDist = dist; closest = head; }
    }
    if (closest) proposals.push({ arc: { head: closest.id, rel: "advmod", dependent: w.id, headSpan: closest.span, depSpan: w.span }, rule: "advmod" });
  }
  return proposals;
}

function nsubj(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  const verbs = words.filter((w) => w.tags.includes("verb") || w.tags.includes("aux"));
  for (const verb of verbs) {
    const vi = words.indexOf(verb);
    if (bundle.roleBy === "case") {
      const subject = words.find((w) => w.feats.includes("case:nom"));
      if (subject) proposals.push({ arc: { head: verb.id, rel: "nsubj", dependent: subject.id, headSpan: verb.span, depSpan: subject.span }, rule: "nsubj-case" });
      continue;
    }
    const dir = bundle.attachment.subject === "left" ? -1 : 1;
    for (let j = vi + dir; j >= 0 && j < words.length; j += dir) {
      const cand = words[j];
      if (!cand) continue;
      if (cand.tags.includes("noun") || cand.tags.includes("pron")) {
        proposals.push({ arc: { head: verb.id, rel: "nsubj", dependent: cand.id, headSpan: verb.span, depSpan: cand.span }, rule: "nsubj" });
        break;
      }
      if (cand.tags.includes("verb")) break;
    }
  }
  return proposals;
}

function dobj(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  const verbs = words.filter((w) => w.tags.includes("verb") || w.tags.includes("aux"));
  for (const verb of verbs) {
    const vi = words.indexOf(verb);
    if (bundle.roleBy === "case") {
      const object = words.find((w) => w.feats.includes("case:acc"));
      if (object) proposals.push({ arc: { head: verb.id, rel: "dobj", dependent: object.id, headSpan: verb.span, depSpan: object.span }, rule: "dobj-case" });
      continue;
    }
    const dir = bundle.attachment.object === "left" ? -1 : 1;
    for (let j = vi + dir; j >= 0 && j < words.length; j += dir) {
      const cand = words[j];
      if (!cand) continue;
      if (cand.tags.includes("noun") || cand.tags.includes("pron")) {
        proposals.push({ arc: { head: verb.id, rel: "dobj", dependent: cand.id, headSpan: verb.span, depSpan: cand.span }, rule: "dobj" });
        break;
      }
      if (cand.tags.includes("prep")) break;
    }
  }
  return proposals;
}

function prep(words: readonly Word[]): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("prep")) continue;
    
    for (let j = i - 1; j >= 0; j--) {
      const head = words[j];
      if (!head) continue;
      if (head.tags.includes("verb") || head.tags.includes("noun")) {
        proposals.push({ arc: { head: head.id, rel: "prep", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "prep" });
        
        if (head.tags.includes("verb")) break; 
      }
    }
  }
  return proposals;
}

function pobj(words: readonly Word[]): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("prep")) continue;
    
    for (let j = i + 1; j < words.length; j++) {
      const cand = words[j];
      if (!cand) continue;
      if (cand.tags.includes("noun") || cand.tags.includes("pron")) {
        proposals.push({ arc: { head: w.id, rel: "pobj", dependent: cand.id, headSpan: w.span, depSpan: cand.span }, rule: "pobj" });
        break;
      }
    }
  }
  return proposals;
}



/** Run all attachment rules and return all proposed arcs. */
export function relate(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  return [
    ...det(words, bundle),
    ...amod(words, bundle),
    ...advmod(words),
    ...nsubj(words, bundle),
    ...dobj(words, bundle),
    ...prep(words),
    ...pobj(words),
  ];
}
