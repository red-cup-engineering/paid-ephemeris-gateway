
import type { SectionSpec, SectionCell, ClauseSpec } from "./types.mjs";
import type { CompiledBundle } from "@emsenn/communicating/speaking/listening/algebra";
import { bottom, charge as relateCharge, chargeValue } from "@emsenn/relating-experimental";
import { lemma, conjugate } from "@emsenn/communicating/speaking/listening/algebra";
import { admitCommunication, articulateCommunication } from "@emsenn/communicating/speaking/listening/parsing";
import { parse } from "@emsenn/communicating/speaking/listening/parsing";
import { roles, polarity, temporal } from "@emsenn/communicating/speaking/listening/understanding";
import english from "../compiled.mjs";

const TRUE = relateCharge(chargeValue("potential"));
const FALSE = relateCharge(chargeValue("active"));
const TOP = relateCharge(chargeValue("stable"));
const BOTTOM = bottom;

function chargeFor(value: string) {
  if (value === "potential") return TRUE;
  if (value === "active") return FALSE;
  if (value === "stable") return TOP;
  return BOTTOM;
}

function firstSentence(text: string, bundle: CompiledBundle) {
  const base = articulateCommunication(admitCommunication(text), bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return { base, sentence };
}

function predicateBase(
  word: string,
  tags: readonly string[],
  tense: ClauseSpec["tense"],
  bundle: CompiledBundle,
): string {
  const [candidate = word.toLowerCase()] = lemma(word, tags, bundle);
  if (!tags.includes("verb") || tense !== "past") return candidate;

  const lower = word.toLowerCase();
  const regularCandidates = lower.endsWith("ed")
    ? [lower.slice(0, -1), lower.slice(0, -2)].filter((item) => item.length > 0)
    : [];
  return regularCandidates.find((item) => conjugate(item, { tense: "past" }, bundle) === lower)
    ?? candidate;
}

/** Parse prose with the listening layer and lift its role/polarity/tense reading into a settled section. */
export function sectionFromText(text: string, bundle: CompiledBundle = english): SectionSpec {
  const { base, sentence } = firstSentence(text, bundle);
  const parsed = parse(sentence, base, bundle);
  const roleFrames = roles(parsed);
  const polarityFrames = polarity(parsed);
  const temporalFrames = temporal(parsed);

  const roleByVerb = new Map(roleFrames.map((r) => [r.verb, r]));
  const tenseByVerb = new Map(temporalFrames.map((t) => [t.verb, t]));

  const cells: SectionCell[] = polarityFrames.map((pol, index) => {
    const role = roleByVerb.get(pol.verb) ?? roleFrames[index];
    const tense = tenseByVerb.get(pol.verb)?.tense;
    const verbWord = parsed.words.find((w) => w.text === pol.verb);
    const clauseTense: ClauseSpec["tense"] = tense === "future" ? "future" : tense ?? "present";
    const predicate = predicateBase(pol.verb, verbWord?.tags ?? ["verb"], clauseTense, bundle);
    const obliques = [
      ...(role?.instrument ? [{ prep: "with", object: role.instrument }] : []),
      ...(role?.recipient ? [{ prep: "to", object: role.recipient }] : []),
      ...(role?.location ? [{ prep: "in", object: role.location }] : []),
    ];
    return {
      predicate,
      object: role?.patient ?? null,
      charge: chargeFor(pol.asserted),
      tense: clauseTense,
      ...(obliques.length > 0 ? { obliques } : {}),
    };
  });

  return {
    subject: roleFrames[0]?.agent ?? null,
    cells,
    source: { text, base, sentence, parsed },
  };
}

export default sectionFromText;
