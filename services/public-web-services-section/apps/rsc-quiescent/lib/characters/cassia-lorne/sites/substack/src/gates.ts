// The publish gates: the diviner office's deontic profile, as code.
//
// must: cite-sources-of-symbols → every required indicator is named in the
// prose. must: distinguish-reflection-from-prediction and must-not:
// claim-foreknowledge → no foreknowledge claims aimed at the reader or the
// world ("you will", "there will", "is going to") outside quotation.
// must-not: present-divination-as-decision → no prescriptions ("you
// should", "you must", "you need to"). Plus the form gates: her word range,
// and flowing paragraphs (no headers, no lists).
//
// A gate verdict is "clear" or "blocked" with evidence — the koios.news
// pattern: gates judge form; whether a piece is publishable under the
// byline is the synthesis model's burden, witnessed upstream.

import type { DailyIndicatorsRecord } from "@lenticule-science/divining/divination/codecs";

export type GateVerdict = Readonly<{
  gate: string;
  verdict: "clear" | "blocked";
  evidence: readonly string[];
}>;

export type GateReport = Readonly<{
  date: string;
  verdicts: readonly GateVerdict[];
  outcome: "publish" | "withhold";
}>;

const NUMBER_WORDS: Readonly<Record<number, string>> = Object.freeze({
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  11: "eleven",
  22: "twenty-two",
  33: "thirty-three",
});

function verdict(gate: string, blockedEvidence: readonly string[]): GateVerdict {
  return Object.freeze({
    gate,
    verdict: blockedEvidence.length === 0 ? "clear" : "blocked",
    evidence: Object.freeze(blockedEvidence),
  });
}

function withoutQuotedSpans(text: string): string {
  return text.replace(/“[^”]*”/g, " ").replace(/"[^"]*"/g, " ");
}

function missing(text: string, needle: string): boolean {
  return !text.toLowerCase().includes(needle.toLowerCase());
}

export function judgeRead(
  body: string,
  indicators: DailyIndicatorsRecord,
  range: Readonly<{ minWords: number; maxWords: number }>,
): GateReport {
  const verdicts: GateVerdict[] = [];

  const words = body.split(/\s+/).filter(Boolean).length;
  verdicts.push(
    verdict(
      "word-range",
      words >= range.minWords && words <= range.maxWords
        ? []
        : [`${words} words; the form is ${range.minWords}–${range.maxWords}`],
    ),
  );

  const formViolations = body
    .split("\n")
    .filter((line) => /^\s*(#{1,6}\s|[-*]\s|\d+\.\s)/.test(line))
    .map((line) => `header or list line: ${line.trim().slice(0, 60)}`);
  verdicts.push(verdict("flowing-paragraphs", formViolations));

  const citations: string[] = [];
  const requireMention = (label: string, needle: string): void => {
    if (missing(body, needle)) citations.push(`${label} not named: ${needle}`);
  };
  for (const word of indicators.moon.lunation.phase.split(" ")) requireMention("moon phase", word);
  requireMention("moon sign", indicators.moon.placement.sign.name);
  const position = indicators.tarot.positions[0];
  if (position) requireMention("tarot card", position.card.name);
  const numberValue = indicators.numerology.value;
  const numberWord = NUMBER_WORDS[numberValue];
  if (missing(body, String(numberValue)) && (numberWord === undefined || missing(body, numberWord))) {
    citations.push(`numerological value not named: ${numberValue}`);
  }
  if (indicators.motion.kind === "aspect") {
    requireMention("aspect body", indicators.motion.aspect.bodyA);
    requireMention("aspect body", indicators.motion.aspect.bodyB);
    requireMention("aspect", indicators.motion.aspect.aspect.name);
  } else {
    requireMention("ingress body", indicators.motion.ingress.body);
    requireMention("ingress sign", indicators.motion.ingress.signTo.name);
  }
  verdicts.push(verdict("cite-sources-of-symbols", citations));

  const unquoted = withoutQuotedSpans(body);
  const foreknowledge = [
    ...unquoted.matchAll(/\b(?:you|there)\s+(?:will|won't|shall)\b[^.!?]*/gi),
    ...unquoted.matchAll(/\bis going to\b[^.!?]*/gi),
  ].map((match) => `foreknowledge claim: “${match[0].trim().slice(0, 80)}”`);
  verdicts.push(verdict("no-claim-of-foreknowledge", foreknowledge));

  const prescriptions = [...unquoted.matchAll(/\byou\s+(?:should|must|need to|have to|ought to)\b[^.!?]*/gi)].map(
    (match) => `prescription: “${match[0].trim().slice(0, 80)}”`,
  );
  verdicts.push(verdict("no-prescription", prescriptions));

  return Object.freeze({
    date: indicators.date,
    verdicts: Object.freeze(verdicts),
    outcome: verdicts.every((entry) => entry.verdict === "clear") ? "publish" : "withhold",
  });
}
