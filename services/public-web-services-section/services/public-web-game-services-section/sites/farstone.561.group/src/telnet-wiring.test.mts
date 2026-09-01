// telnet-wiring.test — a real telnet TCP client (node:net, no telnet library) against the EXACT
// wiring serve.mts ships (telnet-wiring.mts), alongside the existing JSON API and WS transport on
// the SAME live MudServer (farstone-room.mts's own single-source-of-truth design — ws-wiring.test
// proves the HTTP/WS pairing; this file proves telnet joins that same one world, ticked from the
// SAME `runtime.preRequestCatchUp()` path, never a second independent setInterval).

import assert from "node:assert/strict";
import { test } from "node:test";
import { createConnection } from "node:net";
import type { AddressInfo } from "node:net";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { closeMudHttpServer, listenMudHttpServer } from "@red-cup-engineering/feltos/http";
import { IAC, SB, SE } from "@red-cup-engineering/feltos/telnet";
import { FARSTONE_GAME } from "./farstone-game.mts";
import { createFarstoneRoom } from "./farstone-room.mts";
import { createWorldRuntime } from "./world-runtime.mts";
import { createFarstoneHttpServer } from "./http-wiring.mts";
import { listenFarstoneTelnet, pushFarstoneTelnetUpdates } from "./telnet-wiring.mts";
import type { FarstoneTelnetServer } from "./telnet-wiring.mts";

const TICK_MS = 20;

/** Drop IAC WILL/WONT/DO/DONT triplets and IAC SB...IAC SE blocks, leaving the plain CRLF text a
 *  bare `nc` session actually reads as scrollback. Test-only byte filter — a real client answers
 *  negotiation instead of ignoring it; that answering is telnet.mjs's own tested vocabulary. */
function stripTelnetControl(buf: Buffer): string {
  const out: number[] = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === IAC) {
      if (buf[i + 1] === SB) {
        i += 2;
        while (i < buf.length && !(buf[i] === IAC && buf[i + 1] === SE)) i++;
        i += 2;
      } else {
        i += 3; // IAC <verb> <option>
      }
      continue;
    }
    out.push(buf[i] as number);
    i++;
  }
  return Buffer.from(out).toString("utf8");
}

interface TelnetClient {
  text: () => string;
  send: (line: string) => void;
  close: () => void;
}

function connectOnce(port: number): Promise<TelnetClient> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port }, () => {
      let text = "";
      socket.on("data", (chunk: Buffer) => { text += stripTelnetControl(chunk); });
      resolve({ text: () => text, send: (line) => socket.write(`${line}\r\n`), close: () => socket.destroy() });
    });
    socket.once("error", reject);
  });
}

// This sandbox's loopback networking refuses the very FIRST connection attempt to a freshly
// bound ephemeral port (the same behavior http-wiring.test.mts's/ws-wiring.test.mts's own
// warmUpLocalPort works around for HTTP) — retry a few times before giving up.
async function connectTelnet(port: number): Promise<TelnetClient> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await connectOnce(port);
    } catch (error) {
      if (attempt >= 19) throw error;
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

async function waitForText(client: TelnetClient, predicate: (text: string) => boolean, timeoutMs = 3000): Promise<string> {
  const start = Date.now();
  for (;;) {
    const text = client.text();
    if (predicate(text)) return text;
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for telnet text; saw: ${JSON.stringify(text)}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

// warmUpLocalPort — mirrors http-wiring.test.mts's/ws-wiring.test.mts's own helper: this
// sandbox's loopback networking refuses the very first connection attempt to a freshly bound
// ephemeral port.
async function warmUpLocalPort(origin: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await fetch(`${origin}/does-not-exist-warmup-probe`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

async function withLiveServer(
  run: (args: { origin: string; telnet: FarstoneTelnetServer; mud: ReturnType<typeof createFarstoneRoom>["liveMud"] extends () => infer M ? M : never }) => Promise<void>,
): Promise<void> {
  const bootEngine = createEngine(FARSTONE_GAME);
  const { room, liveMud } = createFarstoneRoom(bootEngine, { intervalMs: TICK_MS });
  const mud = liveMud();
  let telnet: FarstoneTelnetServer | null = null;
  const runtime = createWorldRuntime(
    { tick: () => room.stepOnce(), engine: () => mud.engine() },
    {
      tickIntervalMs: TICK_MS,
      maxCatchUpTicksPerRequest: 50,
      lastTickAt: Date.now(),
      store: null,
      clockStore: null,
      onCatchUp: (info) => { if (info.ticksRun > 0 && telnet !== null) pushFarstoneTelnetUpdates(telnet); },
    },
  );
  await runtime.preRequestCatchUp();
  const httpServer = createFarstoneHttpServer(mud, runtime, { tickIntervalMs: TICK_MS, room });
  const { origin } = await listenMudHttpServer(httpServer, { host: "127.0.0.1", port: 0 });
  await warmUpLocalPort(origin);
  telnet = await listenFarstoneTelnet(mud, runtime, { host: "127.0.0.1", port: 0, catchUpIntervalMs: TICK_MS });
  try {
    await run({ origin, telnet, mud });
  } finally {
    await telnet.close();
    room.destroy();
    await closeMudHttpServer(httpServer);
  }
}

test("telnet listener comes up on the shared mud and greets a raw client anonymously (no Name: prompt)", async () => {
  await withLiveServer(async ({ telnet }) => {
    const port = (telnet.server.address() as AddressInfo).port;
    const client = await connectTelnet(port);
    try {
      // feltos joins every connecting socket as an anonymouse actor synchronously on TCP
      // accept (telnet.mjs's createMudTelnetServer) — there is no pre-join Name: phase left.
      await waitForText(client, (t) => t.includes("Welcome to FeltOS.") && t.includes("arrive anonymouse"));
      assert.equal(client.text().includes("Name: "), false, "the old pre-join Name: prompt must be gone");
    } finally {
      client.close();
    }
  });
});

test("a telnet session joins anonymously, registers for a voice, and sees room output, while an HTTP client sees the SAME world", async () => {
  await withLiveServer(async ({ origin, telnet }) => {
    const before = await (await fetch(`${origin}/metrics`)).json();
    assert.equal(before.actors, 0, "no actor connected yet on either transport");

    const port = (telnet.server.address() as AddressInfo).port;
    const client = await connectTelnet(port);
    try {
      // connectAnonymous() runs synchronously at TCP accept, so the actor is already joined —
      // no client input is needed to reach this state, unlike the retired Name:-prompt flow.
      await waitForText(client, (t) => t.includes("arrive anonymouse"));

      // telnet.mjs enqueues "look" right after connect and force-pushes state; the steady
      // catch-up interval (telnet-wiring.mts) is what actually RUNS that queued command — no
      // HTTP/WS request is made anywhere in this test, so this alone proves telnet's own
      // catch-up path is live, not borrowed from another transport.
      await waitForText(client, (t) => t.split("arrive anonymouse.")[1]?.trim().length > 0);

      const afterJoin = await (await fetch(`${origin}/metrics`)).json();
      assert.equal(afterJoin.actors, 1, "the SAME live mud the HTTP API reads sees the telnet-joined anonymouse actor");

      client.send("register harbor-wanderer");
      await waitForText(client, (t) => t.includes("Account 'harbor-wanderer' created."));
      assert.match(client.text(), /Your password \(shown once\): [0-9a-f]{16}/);
    } finally {
      client.close();
    }
  });
});

test("ticks advance for telnet-only sessions (no HTTP/WS request ever made after boot)", async () => {
  await withLiveServer(async ({ telnet, mud }) => {
    const tickBeforeConnect = (mud.engine() as { tick: number }).tick;
    await new Promise((r) => setTimeout(r, TICK_MS * 4));
    assert.equal(
      (mud.engine() as { tick: number }).tick,
      tickBeforeConnect,
      "gated correctly: nobody on telnet yet, so the steady catch-up interval must not have run",
    );

    const port = (telnet.server.address() as AddressInfo).port;
    const client = await connectTelnet(port);
    try {
      // Joining is synchronous on TCP accept in the anonymouse flow — no client input required.
      await waitForText(client, (t) => t.includes("arrive anonymouse"));

      const tickAfterJoin = (mud.engine() as { tick: number }).tick;
      await new Promise((r) => setTimeout(r, TICK_MS * 6));
      assert.ok(
        (mud.engine() as { tick: number }).tick > tickAfterJoin,
        `world time must keep advancing for a connected telnet client with no HTTP/WS traffic: was ${tickAfterJoin}, now ${(mud.engine() as { tick: number }).tick}`,
      );
    } finally {
      client.close();
    }
  });
});

test("who/chat/tell/quit work at the telnet layer, voice-gated on register", async () => {
  await withLiveServer(async ({ telnet }) => {
    const port = (telnet.server.address() as AddressInfo).port;
    const alice = await connectTelnet(port);
    const bob = await connectTelnet(port);
    try {
      await waitForText(alice, (t) => t.includes("arrive anonymouse"));
      await waitForText(bob, (t) => t.includes("arrive anonymouse"));

      alice.send("say hello");
      await waitForText(alice, (t) => t.includes("no voice yet"), 1000);

      alice.send("register alice");
      await waitForText(alice, (t) => t.includes("Account 'alice' created."));

      alice.send("who");
      await waitForText(alice, (t) => /anonymice|alice/.test(t.split("Account 'alice' created.")[1] ?? ""));

      bob.send("register bob");
      await waitForText(bob, (t) => t.includes("Account 'bob' created."));

      bob.send("tell alice hi there");
      await waitForText(alice, (t) => t.includes("hi there"));

      bob.send("chat hello everyone");
      await waitForText(bob, (t) => t.includes("hello everyone"));

      bob.send("quit");
      await waitForText(bob, (t) => t.includes("Goodbye."));
    } finally {
      alice.close();
      bob.close();
    }
  });
});

// 2026-09-01 web-transport verb-parity lot: telnet-wiring.mts's own TelnetMudLike shim did not
// pass whoami()/finger() through at all (mud-server.mjs gained them; this file's shim, a
// hand-picked slice of MudServer, did not) — so a real telnet client got "mudServer.whoami is not
// a function" even though the JSON API and MudServer itself already had it. This is the
// regression that fix closes.
test("whoami/finger work at the telnet layer too, not just the JSON API (the telnet-wiring shim gap this lot closed)", async () => {
  await withLiveServer(async ({ telnet }) => {
    const port = (telnet.server.address() as AddressInfo).port;
    const alice = await connectTelnet(port);
    const bob = await connectTelnet(port);
    try {
      await waitForText(alice, (t) => t.includes("arrive anonymouse"));
      await waitForText(bob, (t) => t.includes("arrive anonymouse"));

      alice.send("register alice");
      await waitForText(alice, (t) => t.includes("Account 'alice' created."));
      bob.send("register bob");
      await waitForText(bob, (t) => t.includes("Account 'bob' created."));

      alice.send("whoami");
      await waitForText(alice, (t) => t.includes("Your name is alice."));

      alice.send("finger bob");
      await waitForText(alice, (t) => /bob\s*\r?\nRole: registered/.test(t.split("Your name is alice.")[1] ?? ""));

      alice.send("finger nobody-here");
      await waitForText(alice, (t) => t.includes("No one by that name is connected."));
    } finally {
      alice.close();
      bob.close();
    }
  });
});
