import { placeOf, settleSubject, tell } from "./world.mjs";

function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }

export function createFederation(shards, ownership) {
  const names = Object.keys(shards).sort(compareText);
  if (names.length === 0) throw new TypeError("federation requires shards");
  for (const [room, shard] of Object.entries(ownership)) if (!(shard in shards)) throw new Error(`room ${room} names unknown shard ${shard}`);
  return Object.freeze({ kind: "fizzos.federation.v1", shards: Object.freeze({ ...shards }), ownership: Object.freeze({ ...ownership }), tick: 0 });
}

export function shardForActor(federation, actor) {
  for (const [name, world] of Object.entries(federation.shards)) {
    const room = placeOf(world, actor);
    if (room !== null && federation.ownership[room] === name) return name;
  }
  return null;
}

export function migrateActor(federation, actor, destination) {
  const from = shardForActor(federation, actor);
  const to = federation.ownership[destination];
  if (from === null || to === undefined) throw new Error("migration boundary is unknown");
  if (from === to) return federation;
  let source = federation.shards[from];
  let target = federation.shards[to];
  const carried = new Set([actor]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const subject of source.assertions.map(({ subject }) => subject)) {
      if (carried.has(subject)) continue;
      if (carried.has(placeOf(source, subject))) { carried.add(subject); changed = true; }
    }
  }
  const claims = [...carried].flatMap((subject) => settleSubject(source, subject).filter(({ evidence }) => evidence.positiveEvidence).map((cell) => ({ subject, predicate: cell.predicate, object: cell.object, evidence: cell.evidence })));
  claims.push({ subject: actor, predicate: "located-in", object: destination });
  target = tell(target, claims, { source: `fizzos.federation:${from}` });
  for (const subject of carried) source = tell(source, { subject, predicate: "located-in", object: "fizzos:migrated" }, { source: `fizzos.federation:${to}` });
  return Object.freeze({ ...federation, shards: Object.freeze({ ...federation.shards, [from]: source, [to]: target }) });
}

export function tickFederation(federation, reducers = {}) {
  const shards = {};
  for (const [name, world] of Object.entries(federation.shards)) shards[name] = reducers[name]?.(world, federation.tick + 1) ?? world;
  return Object.freeze({ ...federation, tick: federation.tick + 1, shards: Object.freeze(shards) });
}
