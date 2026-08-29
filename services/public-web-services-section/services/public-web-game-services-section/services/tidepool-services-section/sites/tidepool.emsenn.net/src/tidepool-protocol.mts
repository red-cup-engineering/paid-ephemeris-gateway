// tidepool-protocol — versioned `tidepool.protocol.v1` (design §2). Wire-identical to
// qwzspace's own intent envelope (protocol.mjs's `intent(seq, body)` — `{k:"intent", seq, kind,
// args}`), with exactly ONE Tidepool-defined kind: `{ kind: "command", args: { command } }`.
//
// `gameValidate(raw, actorId)` is the trust boundary room.mjs calls before anything reaches the
// queue (room.mjs's own header: "`validate` is still the game's own trust boundary for
// `kind`/`args` shape"). It shape-checks `args.command` as non-empty text <= 256 chars; nothing
// more — verb parsing, affordance checking, and effects all happen inside feltos's own
// `execute()`/capability handlers, which already refuse unknown verbs and impossible actions
// with a `message()` back to the actor (engine.mjs). One command string, one grammar,
// human-typeable and program-emittable identically (design §2.3's own framing).

export const PROTOCOL_VERSION = "tidepool.protocol.v1";
export const MAX_COMMAND_LENGTH = 256;

export interface CommandIntent {
  kind: "command";
  args: { command: string };
}

/** The room's own `validate: (raw) => intent | null` shape (intent-queue.mjs). `raw` here is
 *  qwzspace room.mjs's ALREADY-SHAPED `{k, seq, ...body}` at the intent branch — see
 *  `wireConnection`'s call `gameValidate(raw, actorId)`. */
export function gameValidate(raw: unknown, _actorId: string): CommandIntent | null {
  if (raw === null || typeof raw !== "object") return null;
  const body = raw as { kind?: unknown; args?: unknown };
  if (body.kind !== "command") return null;
  const args = body.args;
  if (args === null || typeof args !== "object") return null;
  const command = (args as { command?: unknown }).command;
  if (typeof command !== "string") return null;
  const trimmed = command.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COMMAND_LENGTH) return null;
  return { kind: "command", args: { command: trimmed } };
}
