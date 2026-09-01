// replay-session.mjs — steps a STORED move-log through the engine one tick at a time, for
// watch.html's spectate/replay viewer (design §6's "replay viewer... watch it play out with speed
// controls"). This reuses the exact grouping + validate() discipline #engine/run.mts's replay()
// runs straight through to a final score; ReplaySession just exposes it one tick at a time so a
// UI loop can pace the playback and render in between steps.

import { buildDaily } from "#engine/dungeon.mts";
import { runTick } from "#engine/tick.mts";
import { validate } from "#engine/intents.mts";

export class ReplaySession {
  constructor(seed, actorId, moves) {
    this.seed = seed >>> 0;
    this.actorId = actorId;
    this.world = buildDaily(this.seed);
    this.tick = 0;
    this.maxTick = 0;
    this.byTick = new Map();
    for (const m of moves) {
      const intent = validate(m.intent);
      if (!intent) continue; // a stored record should always validate; skip defensively, never throw
      const bucket = this.byTick.get(m.tick);
      if (bucket) bucket.push(intent);
      else this.byTick.set(m.tick, [intent]);
      if (m.tick > this.maxTick) this.maxTick = m.tick;
    }
  }

  get done() {
    return this.tick > this.maxTick;
  }

  // step — advance exactly one tick (empty-array runTick() call if this tick has no logged
  // intent, exactly as #engine/run.mts's own replay loop does). Returns null once done.
  step() {
    if (this.done) return null;
    const result = runTick(this.world, this.tick, this.byTick.get(this.tick) ?? [], this.actorId);
    this.tick += 1;
    return result;
  }

  restart() {
    this.world = buildDaily(this.seed);
    this.tick = 0;
  }
}
