import type { CompiledExercise, Room } from '../../src/types.mts';
import { exerciseId } from '../../src/checker.mts';

const FENCE_RE = /```iyappy-exercise\s*\n([\s\S]*?)```/g;
const KNOWN_KINDS = new Set(['person-recognition', 'form-recall']);

interface RawExercise {
  kind?: unknown;
  prompt?: unknown;
  formId?: unknown;
  choices?: unknown;
}

function assertExercise(roomId: string, index: number, value: unknown): asserts value is RawExercise {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`iYappy exercise ${roomId}#${index} must be an object`);
  }
  const exercise = value as RawExercise;
  if (typeof exercise.kind !== 'string' || !KNOWN_KINDS.has(exercise.kind)) {
    throw new Error(`iYappy exercise ${roomId}#${index} has an unknown kind`);
  }
  if (typeof exercise.prompt !== 'string' || exercise.prompt.trim() === '') {
    throw new Error(`iYappy exercise ${roomId}#${index} needs a prompt`);
  }
  if (typeof exercise.formId !== 'string' || exercise.formId.trim() === '') {
    throw new Error(`iYappy exercise ${roomId}#${index} needs a formId`);
  }
  if (exercise.kind === 'person-recognition'
    && (!Array.isArray(exercise.choices) || !exercise.choices.every((choice) => typeof choice === 'string'))) {
    throw new Error(`iYappy exercise ${roomId}#${index} recognition needs string choices`);
  }
}

/** Extract strict JSON exercise blocks without adding language analysis or generated forms. */
export function extractIyappyExercises(room: Room): CompiledExercise[] {
  const exercises: CompiledExercise[] = [];
  const perKindIndex: Record<string, number> = {};
  FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let blockIndex = 0;
  while ((match = FENCE_RE.exec(room.body))) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1] ?? '');
    } catch (error) {
      throw new Error(`iYappy exercise ${room.id} block ${blockIndex} is not JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    const block = Array.isArray(parsed) ? parsed : [parsed];
    for (const raw of block) {
      assertExercise(room.id, blockIndex, raw);
      const index = perKindIndex[raw.kind] ?? 0;
      perKindIndex[raw.kind] = index + 1;
      const { kind, prompt, ...spec } = raw;
      exercises.push({ id: exerciseId(room.id, kind, index), roomId: room.id, kind, prompt, spec });
    }
    blockIndex++;
  }
  return exercises;
}
