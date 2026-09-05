/**
 * `extract` -- Equivo's exercise-extraction rule, the theme-supplied `ExerciseExtractor` the
 * platform compiler (`src/compile.mts`) takes as a callback (self-education-platform-design.md
 * §2's own generalization: "the compiler is exactly as corpus-agnostic about EXERCISE RULES as
 * it already was about door field names"). Implements equivo-design.md §4's extraction rule
 * literally: a fenced ```equivo-exercise ``` block in a room's body is parsed as strict JSON --
 * one `ExerciseSpec` object, or a JSON array of them -- with a `prompt` field traveling alongside
 * `spec` in the same block rather than being synthesized (design's own Rule-1 argument: "pre-
 * authored Q/A is strictly better than generated Q/A").
 *
 * Deliberately fails LOUD, not soft: a malformed block (bad JSON, missing/wrong-shaped required
 * fields, an unknown `kind`) throws during compilation rather than being silently dropped. This
 * is the platform's "wrong content cannot ship" discipline applied to the compiler's own
 * extraction step -- a broken exercise block is a build failure, not a warning some UI happens
 * to hide. A room with zero ```equivo-exercise``` blocks produces zero exercises, per design §4:
 * it still participates in the concept graph.
 */
import type { CompiledExercise, Room } from '@red-cup-engineering/education-platform-service/types';
import { exerciseId } from '@red-cup-engineering/education-platform-service/checker';

const FENCE_RE = /```equivo-exercise\s*\n([\s\S]*?)```/g;

const KNOWN_KINDS = new Set(['distinguish', 'relate', 'measure', 'settle', 'observe', 'repair']);

interface RawSpec {
  kind?: unknown;
  prompt?: unknown;
  [key: string]: unknown;
}

function assertShape(roomId: string, blockIndex: number, specIndex: number, raw: RawSpec): void {
  const where = `${roomId} (block ${blockIndex}, spec ${specIndex})`;
  if (typeof raw.kind !== 'string' || !KNOWN_KINDS.has(raw.kind)) {
    throw new Error(`extract.mts: ${where}: missing or unknown "kind" (got ${JSON.stringify(raw.kind)})`);
  }
  if (typeof raw.prompt !== 'string' || raw.prompt.trim().length === 0) {
    throw new Error(`extract.mts: ${where}: "kind":"${raw.kind}" has no non-empty "prompt"`);
  }
  const k = raw.kind;
  if (k === 'distinguish' || k === 'relate' || k === 'measure') {
    const u = raw['utterance'];
    if (!Array.isArray(u) || u.length !== 2) {
      throw new Error(`extract.mts: ${where}: "kind":"${k}" requires a 2-element "utterance" array`);
    }
  } else if (k === 'settle' || k === 'repair') {
    const cells = raw['cells'];
    if (!Array.isArray(cells) || cells.length === 0) {
      throw new Error(`extract.mts: ${where}: "kind":"${k}" requires a non-empty "cells" array`);
    }
    for (const c of cells) {
      if (typeof c !== 'object' || c === null || !('subject' in c) || !('predicate' in c) || !('object' in c)) {
        throw new Error(`extract.mts: ${where}: every cell needs subject/predicate/object, got ${JSON.stringify(c)}`);
      }
    }
  } else if (k === 'observe') {
    const stages = raw['stages'];
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error(`extract.mts: ${where}: "kind":"observe" requires a non-empty "stages" array`);
    }
    for (const s of stages) {
      if (typeof s !== 'object' || s === null || !Array.isArray((s as { designated?: unknown }).designated)) {
        throw new Error(`extract.mts: ${where}: every stage needs a "designated" array, got ${JSON.stringify(s)}`);
      }
    }
  }
}

/** Parse one fenced block's text as either a single spec object or a JSON array of specs. Throws
 * with the room id in the message on invalid JSON -- a build-time failure, never a runtime one. */
function parseBlock(roomId: string, blockIndex: number, text: string): RawSpec[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`extract.mts: ${roomId} (block ${blockIndex}): invalid JSON in equivo-exercise fence: ${err instanceof Error ? err.message : String(err)}`);
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  list.forEach((raw, i) => assertShape(roomId, blockIndex, i, raw as RawSpec));
  return list as RawSpec[];
}

/** The theme's `ExerciseExtractor` (compile.mts's callback type). Pure, synchronous. */
export function extractEquivoExercises(room: Room): CompiledExercise[] {
  const out: CompiledExercise[] = [];
  const perKindIndex: Record<string, number> = {};
  let blockIndex = 0;

  FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCE_RE.exec(room.body))) {
    const specs = parseBlock(room.id, blockIndex, match[1] ?? '');
    for (const raw of specs) {
      const kind = raw.kind as string;
      const prompt = raw.prompt as string;
      const index = perKindIndex[kind] ?? 0;
      perKindIndex[kind] = index + 1;
      const { kind: _k, prompt: _p, ...spec } = raw;
      out.push({
        id: exerciseId(room.id, kind, index),
        roomId: room.id,
        kind,
        spec,
        prompt,
      });
    }
    blockIndex++;
  }
  return out;
}
