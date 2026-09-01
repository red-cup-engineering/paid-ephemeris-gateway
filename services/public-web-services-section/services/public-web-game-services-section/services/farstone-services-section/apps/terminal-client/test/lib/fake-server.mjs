// fake-server — a tiny, scripted node:http server matching Farstone's real route surface
// (`@red-cup-engineering/fizzos/http`'s vendored route table: POST /connect, POST /command,
// GET /events?actor=) exactly, serving RECORDED fixture responses instead of a live world. This is
// through a real HTTP round trip with scripted content and no live network.

import { createServer } from "node:http";

// startFakeFarstoneServer({ connectResponse, eventsSequence }) -> { base, port, commands, close() }
// connectResponse is returned verbatim from POST /connect. eventsSequence is consumed in order, one
// entry per GET /events request; the last entry repeats once exhausted (a quiet, settled world).
// commands accumulates every POST /command body received, in order, so a test can assert exactly
// what was sent to the world.
export function startFakeFarstoneServer({ connectResponse, eventsSequence } = {}) {
  let eventsIndex = 0;
  const commands = [];

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://fixture.invalid");
    const send = (status, body) => {
      const text = `${JSON.stringify(body)}\n`;
      response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
      response.end(text);
    };
    const bodyOf = async () => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      return raw ? JSON.parse(raw) : {};
    };

    if (request.method === "POST" && url.pathname === "/connect") {
      return send(201, connectResponse);
    }
    if (request.method === "POST" && url.pathname === "/command") {
      const body = await bodyOf();
      commands.push(body);
      return send(202, { accepted: true });
    }
    if (request.method === "GET" && url.pathname === "/events") {
      const seq = eventsSequence || [];
      const body = seq[Math.min(eventsIndex, seq.length - 1)] ?? { events: [] };
      eventsIndex++;
      return send(200, body);
    }
    return send(404, { error: "not-found" });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        port,
        base: `http://127.0.0.1:${port}`,
        commands,
        pollCount: () => eventsIndex,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
