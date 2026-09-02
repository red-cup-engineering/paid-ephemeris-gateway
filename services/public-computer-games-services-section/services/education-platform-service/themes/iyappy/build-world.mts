import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileWing } from '../../src/compile.mts';
import { extractIyappyExercises } from './extract.mts';

const CORPUS_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'corpus');

/** Compile iYappy's finite, source-bounded course through the shared platform compiler. */
export function buildIyappyWorld() {
  return compileWing(CORPUS_ROOT, { id: 'iyappy' }, extractIyappyExercises);
}
