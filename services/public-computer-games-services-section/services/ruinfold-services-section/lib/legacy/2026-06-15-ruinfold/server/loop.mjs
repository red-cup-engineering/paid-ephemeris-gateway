import { runTick } from "#engine/tick.mjs";
import { subjects } from "#substrate";
import { numOf, valOf, view } from "#engine/_world.mjs";

export async function startLoop({ root, hub, snapshot, queue, players, intervalMs = 200, heartbeatMs = 15000 }) {
  let tick = numOf(await view(root, "ruinfold"), "tick", 0);
  for (const subject of await subjects(root)) if (valOf(await view(root, subject), "kind") === "player") players.add(subject);
  await snapshot.bootstrap(tick);
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const next = tick + 1;
      const { dirty, chats } = await runTick(root, next, queue.drain(), players);
      tick = next;
      const delta = await snapshot.resettle(dirty, tick);
      if (delta.entities.length || delta.removed.length) hub.broadcast(delta);
      for (const chat of chats ?? []) hub.broadcast({ type: "chat", tick, from: chat.from, zone: chat.zone, text: chat.text });
    } catch (error) { console.error("[ruinfold] tick error:", error); }
    finally { running = false; }
  }, intervalMs);
  const heartbeat = setInterval(() => hub.heartbeat(), heartbeatMs);
  return { stop() { clearInterval(timer); clearInterval(heartbeat); }, tickNow: () => tick };
}
