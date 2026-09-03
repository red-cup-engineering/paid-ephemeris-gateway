/**
 * `cards` — gate card generation, DESIGN.md §3. Five rules in priority order, all rule-based
 * (no LLM generation, per DESIGN.md §6's no-dark-pattern list): verbatim exercise extraction,
 * dependency cards from a door's own rationale text, definition cloze, reversed cloze, and a
 * `teaches` fallback used only to pad a room that produced fewer than two cards.
 */
import type { CardKind, Door, ReviewCard, Room } from './types.mts';
import { asList } from './frontmatter-values.mts';

const NEW_CARD_STABILITY = 0; // seeded properly by srs.reviewCard on the gate-pass; placeholder pre-first-review
const NEW_CARD_DIFFICULTY = 5; // neutral placeholder, overwritten on first review

function blankCard(roomId: string, kind: CardKind, index: number, front: string, back: string): ReviewCard {
  return {
    id: `${roomId}#${kind}#${index}`,
    roomId,
    kind,
    front,
    back,
    stability: NEW_CARD_STABILITY,
    difficulty: NEW_CARD_DIFFICULTY,
  };
}

// ---- Rule 1: verbatim exercise extraction ------------------------------------------------

interface ExerciseMatch {
  question: string;
  answer: string;
}

/** Find every `1. question text` immediately followed (allowing blank lines) by
 * `<details><summary>Answer</summary>...</details>`, and extract both verbatim. */
export function extractExercises(body: string): ExerciseMatch[] {
  const lines = body.split('\n');
  const out: ExerciseMatch[] = [];
  const questionRe = /^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const qm = questionRe.exec(line);
    if (!qm) continue;
    const question = (qm[1] ?? '').trim();
    if (question.length === 0) continue;

    // Look ahead (skipping blank lines) for <details><summary>Answer</summary>.
    let j = i + 1;
    while (j < lines.length && (lines[j] ?? '').trim() === '') j++;
    if (j >= lines.length || (lines[j] ?? '').trim() !== '<details>') continue;
    j++;
    while (j < lines.length && (lines[j] ?? '').trim() === '') j++;
    if (j >= lines.length || !/^<summary>\s*Answer\s*<\/summary>$/i.test((lines[j] ?? '').trim())) continue;
    j++;

    const answerLines: string[] = [];
    while (j < lines.length && (lines[j] ?? '').trim() !== '</details>') {
      answerLines.push(lines[j] ?? '');
      j++;
    }
    const answer = answerLines.join('\n').trim();
    if (answer.length === 0) continue;
    out.push({ question, answer });
  }
  return out;
}

// ---- Rule 3/4: definition cloze + reversed cloze -----------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface AliasSpan {
  start: number;
  end: number;
  matched: string;
}

/** Longest-match, case-insensitive, word-boundary search for any of `aliases` inside `text`. */
export function findAliasSpan(text: string, aliases: readonly string[]): AliasSpan | null {
  const candidates = [...aliases].filter((a) => a.length > 0).sort((a, b) => b.length - a.length);
  for (const alias of candidates) {
    const re = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');
    const m = re.exec(text);
    if (m) return { start: m.index, end: m.index + m[0].length, matched: m[0] };
  }
  return null;
}

function firstParagraph(body: string): string {
  const trimmed = body.trim();
  const idx = trimmed.indexOf('\n\n');
  return (idx === -1 ? trimmed : trimmed.slice(0, idx)).trim();
}

// ---- Orchestration -------------------------------------------------------------------------

/** Generate every gate card for one room. `dependencyDoors` are the hard (incl. promoted-hard)
 * doors where `to === room.id`, in the order they should be presented. */
export function generateCardsForRoom(room: Room, dependencyDoors: readonly Door[], roomTitleOf: (id: string) => string): ReviewCard[] {
  const cards: ReviewCard[] = [];
  let idx = 0;

  // Rule 1: exercises (highest priority, verbatim, zero synthesis).
  for (const ex of extractExercises(room.body)) {
    cards.push(blankCard(room.id, 'exercise', idx++, ex.question, ex.answer));
  }

  // Rule 2: dependency cards from each retained door rationale.
  for (const door of dependencyDoors) {
    const targetTitle = roomTitleOf(door.from);
    const front = `Why does ${room.title} depend on ${targetTitle}?`;
    cards.push(blankCard(room.id, 'dependency', idx++, front, door.reason));
  }

  // Rule 3/4: definition cloze + reversed cloze, from `description` or the body's first
  // paragraph, blanking the room's own longest alias/title match.
  const definitionSource = room.description ?? firstParagraph(room.body);
  const aliasCandidates = [room.title, ...room.aliases];
  const span = definitionSource.length > 0 ? findAliasSpan(definitionSource, aliasCandidates) : null;
  if (span) {
    const blanked = definitionSource.slice(0, span.start) + '___' + definitionSource.slice(span.end);
    cards.push(blankCard(room.id, 'cloze', idx++, blanked, room.title));
    cards.push(blankCard(room.id, 'term-from-def', idx++, `${definitionSource} Which term is this?`, room.title));
  }

  // Rule 5: `teaches` recognition, lowest priority, only pads rooms under 2 cards.
  if (cards.length < 2) {
    const teaches = asList(room.frontmatter['teaches']);
    const taught = teaches[0] ?? room.title;
    cards.push(blankCard(room.id, 'teaches', idx++, `Name one thing taught by ${room.title}.`, taught));
  }

  return cards;
}
