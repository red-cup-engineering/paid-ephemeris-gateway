// session.mjs — the client-side run session: the SAME engine, driven live instead of replayed
// after the fact. Every accumulated `moves` entry is byte-identical in shape to what POST /runs
// expects and to what #engine/run.mts's replay() independently recomputes from a bare seed — this
// file introduces no new intent shape and no second trust boundary; every player-constructed
// intent is passed through #engine/intents.mts's OWN validate(), the same gate the server's
// replay() calls, before it is ever handed to runTick(). "One trust boundary regardless of input
// device" (design §6.3) includes the device being "this session's own UI code," not just network
// input — a malformed intent here is a client bug, and validate() is what catches it instead of
// silently corrupting local state.
//
// NEVER uses Date.now()/Math.random(): `tick` is a plain incrementing counter, advanced once per
// act()/idle() call. idle() ticks are not written to `moves` at all — #engine/run.mts's own
// replay() already fills any tick with no logged intent as an empty-array runTick() call, so a
// client that ticks the world forward locally without logging anything reconstructs identically
// server-side, as long as the tick COUNTER (not the log) keeps pace. That is the entire reason
// idle-ticking (monsters keep acting while the player pauses) is safe here.

import { buildDaily } from "#engine/dungeon.mts";
import { runTick } from "#engine/tick.mts";
import { validate } from "#engine/intents.mts";
import { replay } from "#engine/run.mts";

export class GameSession {
  constructor(seed, date, actorId) {
    this.seed = seed >>> 0;
    this.date = date;
    this.actorId = actorId;
    this.world = buildDaily(this.seed);
    this.tick = 0;
    this.moves = [];
    this.ended = null; // { reason: "mortal-death"|"voided"|"cleared", tick } once terminal
    this._seqAtTick = new Map();
    this._join();
  }

  get player() {
    return this.world.entities.get(this.actorId);
  }

  _join() {
    this._applyLogged({ kind: "join", actor: this.actorId });
  }

  // idle — advance one tick with no player intent: monster AI, effect DoT/HoT, and hazard checks
  // all still run (tick.mts's own phase order), nothing is appended to `moves`.
  idle() {
    if (this.ended) return null;
    const result = runTick(this.world, this.tick, [], this.actorId);
    this.tick += 1;
    return this._settle(result);
  }

  // act — apply one player-originated intent (WITHOUT `actor`; this session fills its own) at the
  // current tick, log it, advance the tick. Returns null (a no-op, nothing recorded or ticked) if
  // the intent doesn't validate — that is a client bug, not a legal "impossible move" (those are
  // valid shapes the engine itself no-ops, e.g. an out-of-range attack; see #engine/intents.mts).
  act(intentWithoutActor) {
    if (this.ended) return null;
    return this._applyLogged({ ...intentWithoutActor, actor: this.actorId });
  }

  _applyLogged(rawIntent) {
    const intent = validate(rawIntent);
    if (!intent) return null;
    const seq = this._seqAtTick.get(this.tick) ?? 0;
    this._seqAtTick.set(this.tick, seq + 1);
    this.moves.push({ tick: this.tick, seq, intent });
    const result = runTick(this.world, this.tick, [intent], this.actorId);
    this.tick += 1;
    return this._settle(result);
  }

  _settle(result) {
    if (!this.ended) {
      const p = this.player;
      if (p?.status === "ghost") this.ended = { reason: "mortal-death", tick: this.tick - 1 };
      else if (p?.status === "voided") this.ended = { reason: "voided", tick: this.tick - 1 };
      else if (result?.clearedBoss) this.ended = { reason: "cleared", tick: this.tick - 1 };
    }
    return { ...result, ended: this.ended };
  }

  toRunLog(mode) {
    return { schema: "ruinfold-run/1", date: this.date, seed: this.seed, actor: this.actorId, mode, moves: this.moves };
  }

  // localReplay — re-derive the run from scratch through the SAME replay() the server calls, for
  // an advisory clientClaimedScore (design §2.1) shown next to the server's authoritative answer.
  // Never trusted by anything but this session's own summary screen.
  localReplay(mode) {
    return replay(this.seed, this.toRunLog(mode));
  }
}
