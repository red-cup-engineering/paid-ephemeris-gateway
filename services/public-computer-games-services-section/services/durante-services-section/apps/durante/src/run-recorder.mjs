// run-recorder — the thin shared recorder both faces (web/main.mjs's render() loop and bin/durante-
// terminal.mjs's paint() loop) and the headless reference entrant (agents/reference-entrant.mjs) call
// alongside their existing tick() call. NEW, but not inventing an envelope: cartridge.mjs's own
// buildIntentLog already assembles the house `{seq, intent:{kind:"move", move}}[]` shape from an array
// of `{forward,strafe,turn,fire}` moves via `@red-cup-engineering/cartridge/intent-log`'s `appendEntry` — the gap
// this module closes is that neither face ever called it per-frame; they only ever called `tick()`
// directly (see this module's spec, §2.3: "the shape both faces already produce IS exactly cartridge.
// mjs's intent.move payload... the actual gap [is] a small shared recorder both faces call instead of
// just calling tick() directly").

import { appendEntry } from "@red-cup-engineering/cartridge/intent-log";

// recordMove(log, move) — append one tick's move to a run log, pure (returns a NEW array). `move` is
// the exact `{forward,strafe,turn,fire}` object already passed to `tick()` this same frame — recording
// is append-only and orthogonal to rendering, so this changes neither face's play feel.
export function recordMove(log, move) {
  return appendEntry(log, { kind: "move", move: move ?? {} });
}

// encodeRun({ date, actor, entrantKind, mode, intentLog, seed }) — the POST /runs request body, per
// spec §2.4's run format. `seed` is OPTIONAL (the server always re-derives its own canonical seed from
// `date` and only checks a claimed one for a match — see run.mjs/server.mjs's own header) — a caller
// that already knows today's seed (e.g. from GET /daily) may include it as a client-side sanity check,
// but nothing downstream trusts it.
export function encodeRun({ date, actor, entrantKind, mode, intentLog, seed }) {
  if (typeof date !== "string" || date.length === 0) {
    throw new TypeError("encodeRun: date must be a non-empty YYYY-MM-DD string");
  }
  if (typeof actor !== "string" || actor.length === 0) {
    throw new TypeError("encodeRun: actor must be a non-empty string");
  }
  if (entrantKind !== "human" && entrantKind !== "agent") {
    throw new TypeError(`encodeRun: entrantKind must be "human" or "agent" (got ${JSON.stringify(entrantKind)})`);
  }
  if (mode !== "scored" && mode !== "practice") {
    throw new TypeError(`encodeRun: mode must be "scored" or "practice" (got ${JSON.stringify(mode)})`);
  }
  if (!Array.isArray(intentLog)) {
    throw new TypeError("encodeRun: intentLog must be an array");
  }
  const body = { schema: "durante-run/1", date, actor, entrantKind, mode, intentLog };
  if (seed !== undefined) body.seed = seed;
  return body;
}
