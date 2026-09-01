export function createHub() {
  const clients = new Set();
  function drop(res) { clients.delete(res); }
  function add(res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");
    clients.add(res);
    return () => drop(res);
  }
  function write(res, line) {
    try { return res.write(line); }
    catch { drop(res); return false; }
  }
  return {
    add,
    send: (res, value) => write(res, `data: ${JSON.stringify(value)}\n\n`),
    broadcast(value) {
      const line = `data: ${JSON.stringify(value)}\n\n`;
      for (const res of clients) write(res, line);
    },
    heartbeat() { for (const res of clients) write(res, ": ping\n\n"); },
    size: () => clients.size,
  };
}
