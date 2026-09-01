import { createServer } from "node:http";

function json(response, status, body) {
  const representation = `${JSON.stringify(body)}\n`;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(representation),
    "cache-control": "no-store",
  });
  response.end(representation);
}

async function bodyOf(request, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("request body too large"), { status: 413 });
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("request body is not valid JSON"), { status: 400 }); }
}

export function createMudHttpServer(mudServer) {
  if (typeof mudServer?.tick !== "function") throw new TypeError("HTTP service requires a MUD server");
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://feltos.invalid");
      if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { status: "ok" });
      if (request.method === "GET" && url.pathname === "/metrics") return json(response, 200, mudServer.metrics());
      if (request.method === "POST" && url.pathname === "/connect") {
        const body = await bodyOf(request);
        return json(response, 201, { actor: mudServer.connect(body.name) });
      }
      if (request.method === "POST" && url.pathname === "/command") {
        const body = await bodyOf(request);
        mudServer.enqueue(body.actor, body.command);
        return json(response, 202, { accepted: true });
      }
      if (request.method === "POST" && url.pathname === "/tick") return json(response, 200, mudServer.tick());
      if (request.method === "GET" && url.pathname === "/events") return json(response, 200, { events: mudServer.drain(url.searchParams.get("actor")) });
      return json(response, 404, { error: "not-found" });
    } catch (error) {
      return json(response, error.status ?? 400, { error: error.message });
    }
  });
}

export async function listenMudHttpServer(server, { host = "127.0.0.1", port = 0 } = {}) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return Object.freeze({ server, origin: `http://${address.address.includes(":") ? `[${address.address}]` : address.address}:${address.port}` });
}

export async function closeMudHttpServer(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
