async function request(origin, path, { method = "GET", body } = {}) {
  const response = await fetch(new URL(path, origin), {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `FeltOS request failed: ${response.status}`);
  return result;
}

export function createMudClient(origin) {
  return Object.freeze({
    health: () => request(origin, "/health"),
    metrics: () => request(origin, "/metrics"),
    connect: (name) => request(origin, "/connect", { method: "POST", body: { name } }),
    command: (actor, command) => request(origin, "/command", { method: "POST", body: { actor, command } }),
    tick: () => request(origin, "/tick", { method: "POST" }),
    events: (actor) => request(origin, `/events?actor=${encodeURIComponent(actor)}`),
  });
}
