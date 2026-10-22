// farstone-world — the REST/JSON carrier for Farstone, a LIVE deployed MUD whose wire surface is
// NOT telnet at all: `POST /connect {name} -> {actor}`, `POST /command {actor,command} -> {accepted}`
// (enqueue-only; takes effect at the next tick), `POST /tick`, and `GET /events?actor= -> {events}`
// (poll-and-drain, not push/SSE — there is no persistent connection and no server push). Confirmed
// live against `https://farstone.561.group`: `GET /health`, `GET /metrics`, and the four routes
// above are exactly what the vendored `@red-cup-engineering/fizzos/http` route table serves (see
// that tree's `src/http.mjs`) — there is no IAC byte on this wire for wheatstone's telnet stack to
// negotiate, and no GMCP/MSDP-equivalent structured-data channel: everything a player sees arrives
// as prose in a `fizzos.message.v1` event's `text` field.
//
// One wrinkle that matters for how this carrier polls: the LIVE server runs
// `preRequestCatchUp()` before EVERY request, not only `/tick` — so a plain poll loop hitting
// `GET /events` is simultaneously this actor's message drain AND the shared world's real-time
// heartbeat. No explicit `POST /tick` is needed for normal play; this carrier never calls it.
//
// farstoneWorld implements the SAME `World` interface telnetWorld/localWorld do (world.mjs), so
// wheatstone's TUI (app.mjs/render.mjs/commands.mjs/scrollback.mjs) needs NO changes to run over
// it — only `onLine` and `onStatus` ever actually fire here. `onGMCP` is provided as a NEVER-FIRING
// no-op, deliberately, for a subtle reason: `world.d.ts`'s `World` interface does not mark `onGMCP`
// optional, and `app.mjs`'s `wireWorld()` subscribes to it with NO `if (world.onGMCP)` guard (unlike
// `onPrompt`/`onMSDP`, which ARE guarded there) — so a carrier that simply omitted `onGMCP` would
// crash wheatstone's core on connect. Providing a no-op keeps wheatstone's core untouched by this
// carrier's addition, and stays honest: Farstone's wire has no GMCP-shaped data to synthesize, so
// the subscription is real (an unsubscribe function comes back) but nothing is ever hand-parsed out
// of room prose to fake a vitals panel that fills. The audit side panel simply stays empty over
// this carrier, which is the truth.

const DEFAULT_POLL_MS = 1000;

// farstoneWorld({ base, name, pollMs, fetchFn }) — base is the server origin (no trailing slash
// required), name is the player name POSTed to /connect. pollMs is the interval between
// GET /events drains (default 1000ms; 0 disables the automatic timer — a caller, or a test, then
// drives draining by calling the returned world's `_poll()` directly). fetchFn is injectable for
// tests (default the global `fetch`), the same seam telnetWorld's `createConnection` is.
export function farstoneWorld(opts = {}) {
  const base = String(opts.base || "").replace(/\/+$/, "");
  const name = opts.name || "player";
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const fetchFn = opts.fetchFn || fetch;

  let actor = null;
  let timer = null;
  const lineHandlers = new Set();
  const statusHandlers = new Set();
  const fan = (set, ...args) => { for (const cb of set) { try { cb(...args); } catch { /* a subscriber's own error never breaks the carrier */ } } };
  const emitStatus = (state, detail) => fan(statusHandlers, { state, detail });

  async function api(method, path, body) {
    const res = await fetchFn(`${base}${path}`, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch { /* a non-JSON or empty body is fine for e.g. a plain error */ }
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
    return data;
  }

  // poll() — drain this actor's pending events once. Exposed as `_poll` on the returned world (the
  // same convention telnetWorld exposes `_telnet` under) so a test or driver wanting DETERMINISTIC
  // control can invoke exactly one drain without waiting on wall-clock timers; the interval below
  // calls this same function on the real clock for interactive use.
  async function poll() {
    if (!actor) return;
    try {
      const { events } = await api("GET", `/events?actor=${encodeURIComponent(actor)}`);
      for (const ev of events || []) {
        if (ev && ev.kind === "fizzos.message.v1" && typeof ev.text === "string") {
          for (const line of ev.text.split("\n")) fan(lineHandlers, line);
        }
      }
    } catch (err) {
      emitStatus("error", { message: err?.message || String(err) });
    }
  }

  async function connect() {
    emitStatus("connecting", { base });
    const res = await api("POST", "/connect", { name });
    actor = res.actor;
    emitStatus("connected", { base, actor });
    if (pollMs > 0) timer = setInterval(() => { void poll(); }, pollMs);
  }

  // send(text) — enqueue one command. Farstone's /command only enqueues (takes effect at the next
  // tick, driven by the next poll's preRequestCatchUp), so there is no reply to wait on here; any
  // world reaction to the command arrives later through onLine, off a subsequent poll.
  function send(text) {
    if (!actor) { emitStatus("error", { message: "not connected" }); return; }
    api("POST", "/command", { actor, command: text }).catch((err) => {
      emitStatus("error", { message: err?.message || String(err) });
    });
  }

  function close() {
    if (timer) { clearInterval(timer); timer = null; }
    emitStatus("closed", { base });
  }

  return {
    kind: "farstone-rest",
    connect, send, close,
    onLine: (cb) => { lineHandlers.add(cb); return () => lineHandlers.delete(cb); },
    // never fires — see this module's header for exactly why this exists as a no-op rather than
    // being omitted.
    onGMCP: () => () => {},
    onStatus: (cb) => { statusHandlers.add(cb); return () => statusHandlers.delete(cb); },
    supports: {},
    get actor() { return actor; },
    _poll: poll,
  };
}
