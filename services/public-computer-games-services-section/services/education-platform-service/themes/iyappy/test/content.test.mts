import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hydrateExercises } from '../../../src/checker.mts';
import { buildIyappyWorld } from '../build-world.mts';
import { iyappyCheckers } from '../registry.mts';

test('the finite iYappy course compiles into its two rooms and separate exercise evidence', () => {
  const world = buildIyappyWorld();
  const { exercises, unregisteredKinds } = hydrateExercises(world.exercises, iyappyCheckers);
  assert.deepEqual(world.warnings, []);
  assert.equal(world.rooms.length, 3);
  assert.equal(exercises.length, 12);
  assert.deepEqual(unregisteredKinds, []);
  assert.equal(new Set(exercises.filter((exercise) => exercise.kind === 'person-recognition').map((exercise) => exercise.id)).size, 6);
  assert.equal(new Set(exercises.filter((exercise) => exercise.kind === 'form-recall').map((exercise) => exercise.id)).size, 6);
  assert.equal(world.doors.filter((door) => door.weight === 'hard').length, 2);
});
