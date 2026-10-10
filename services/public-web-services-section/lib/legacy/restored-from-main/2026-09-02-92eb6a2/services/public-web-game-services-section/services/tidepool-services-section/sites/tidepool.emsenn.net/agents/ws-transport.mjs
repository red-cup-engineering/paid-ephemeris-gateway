// ws-transport — a real bug found while running the live-deploy mixed session, worked around
// HERE (this tidepool-owned file), never inside qwzspace's own tree (house rule: consume
// qwzspace only from Verdaccio/node_modules, never edit its tree).
//
// THE BUG: `@red-cup-engineering/qwzspace/client-node`'s `NodeWebSocket` (the transport
// `connectRoom()` hardcodes) only ever does `import http from "node:http"` and issues a plain
// `http.request(...)` upgrade — for a `wss://` URL it still opens a PLAINTEXT TCP socket to
// port 443 and performs a plaintext HTTP Upgrade handshake, which every real TLS-terminating
// endpoint (Cloud Run included — the deploy runbook's whole fleet is HTTPS/WSS-only, there is no
// plaintext origin) simply cannot answer. The connection hangs at "CONNECTING" forever: no
// `onopen`, no `onerror`, no `onclose` — client-node.mjs's own documented reconnect-on-close
// contract never even fires, so a script built on `connectRoom()` alone gives no visible signal
// that anything is wrong; it just silently never plays. Confirmed live: `agents/reference-bot.mjs`
// unmodified against `wss://tidepool.561.group/` never printed a single "connection state ->"
// transition, while the identical script against a local plaintext `ws://` origin worked
// immediately. This means the reference client, exactly as shipped, cannot demonstrate the
// "how a real LLM agent connects" story against any actually-deployed (TLS-only) Tidepool — a
// real gap, reported honestly in the deploy report's thinness list.
//
// THE FIX, scoped to tidepool's own agent/tool scripts only: Node 22+'s BUILT-IN global
// `WebSocket` (backed by undici) is a real RFC 6455 client that handles TLS correctly for
// `wss://` (and plain `ws://`) with zero extra dependency — it already satisfies exactly the
// "WebSocketLike surface: readyState/send/close/on*" contract `createRealtimeClient` (client.mjs)
// documents itself as accepting. So: reuse qwzspace's own `createRealtimeClient`/`createWorldView`
// (the real protocol/state-machine code, untouched) with the platform's own WebSocket as the
// transport, instead of `connectRoom()`'s hardcoded `NodeWebSocket`.

import { createRealtimeClient, createWorldView } from "@red-cup-engineering/qwzspace/client";

export function connectRoomOverAnyScheme(url, { name = "wanderer", onState = null, policyOptions = {}, localId = "me" } = {}) {
  const view = createWorldView(localId);
  return createRealtimeClient({
    connect: () => new WebSocket(url),
    view,
    name,
    onState,
    policyOptions,
  });
}
