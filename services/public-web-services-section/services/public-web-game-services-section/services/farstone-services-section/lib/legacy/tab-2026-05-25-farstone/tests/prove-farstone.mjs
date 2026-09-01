// prove-farstone — the Farstone dev world. Build it on a temp disk, verify the exit graph is fully
// connected and consistent, then walk it with a player (look / go / take / inventory).

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildFarstone, FARSTONE_ROOMS, FARSTONE_START } from '../articulating/doing/changing/growing/library/paracosm/library/world/library/farstone/build-farstone.mjs';
import { makeCommanding } from '#commanding';
import changing from '#changing';
import { look } from '#observing';

const root = await mkdtemp(join(tmpdir(), 'tab-farstone-'));
const text = (r) => r.lines.join('\n');

try {
  const rooms = await buildFarstone(root);
  assert.equal(rooms.length, 11);

  // === connectivity: BFS from the start reaches every room; every exit lands on a real room ===
  const all = new Set(FARSTONE_ROOMS);
  const seen = new Set([FARSTONE_START]);
  const queue = [FARSTONE_START];
  while (queue.length) {
    const here = queue.shift();
    const v = await look({ root, observer: 'dev', subject: here });
    for (const [dir, dest] of Object.entries(v.exits)) {
      assert.ok(all.has(dest), `exit ${here}:${dir} → unknown room ${dest}`);
      if (!seen.has(dest)) { seen.add(dest); queue.push(dest); }
    }
  }
  assert.equal(seen.size, 11, `only reached ${seen.size}/11 rooms: ${[...seen].join(',')}`);

  // === walk it as a player ===
  const C = makeCommanding(root);
  C.registerPlayer('dev', 'Dev');
  await changing({ root, subject: 'dev', predicate: 'located-in', object: FARSTONE_START, t: C.now() });

  assert.match(text(await C.command('dev', 'look')), /Downtown Farston/);
  assert.match(text(await C.command('dev', 'up')), /The Ridge/);
  assert.match(text(await C.command('dev', 'up')), /Mt Farstone/);
  assert.match(text(await C.command('dev', 'north')), /North Shore/);
  assert.match(text(await C.command('dev', 'east')), /The Marsh/);
  assert.match(text(await C.command('dev', 'look')), /You see: a clam rake\./);
  assert.match(text(await C.command('dev', 'take rake')), /You take a clam rake\./);
  assert.match(text(await C.command('dev', 'i')), /a clam rake/);
  assert.match(text(await C.command('dev', 'examine rake')), /silvered by salt/);

  console.log('tab farstone witness: 11-room island built on disk, fully connected, walked by a player. passed.');
  console.log('  rooms:', rooms.join(', '));
} finally {
  await rm(root, { recursive: true, force: true });
}
