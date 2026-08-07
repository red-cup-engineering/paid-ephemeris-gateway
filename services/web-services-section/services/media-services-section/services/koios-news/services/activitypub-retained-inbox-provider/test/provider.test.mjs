import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { generateActorKeyMaterial } from "@red-cup-engineering/activitypub-provider-service/keys";
import { createRetainedInbox } from "../src/retained-inbox.mjs";
import { serveKoiosActivityPubProvider } from "../src/server.mjs";

async function freePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const selected = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return selected;
}

test("the Koios actor exposes, retains, pages, and refuses through its local receiver", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "koios-activitypub-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const keyPath = path.join(directory, "keys.json");
  await writeFile(keyPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const token = "koios-local-test-token-with-at-least-32-characters";
  const inbox = createRetainedInbox(path.join(directory, "retained.jsonl"));
  const port = await freePort();
  const service = await serveKoiosActivityPubProvider({ hostname: "127.0.0.1", port, keyPath, bearerToken: token, inbox, testOnlyInProcess: true });
  t.after(() => service.close());
  if (!service.server.listening) await new Promise((resolve) => service.server.once("listening", resolve));
  const local = "https://bare-cedar-fog.561.group";
  const request = (pathname, init) => service.provider.fetch(new Request(`${local}${pathname}`, init));

  const actor = await request("/actors/koios-news", { headers: { accept: "application/activity+json" } });
  assert.equal(actor.status, 200);
  assert.equal((await actor.json()).id, "https://bare-cedar-fog.561.group/actors/koios-news");

  const activity = { "@context": "https://www.w3.org/ns/activitystreams", id: "https://sender.example/activities/1", type: "Create", actor: "https://sender.example/actor", object: { type: "Note", content: "retained" }, to: "https://bare-cedar-fog.561.group/actors/koios-news" };
  const refusedPost = await request("/actors/koios-news/inbox", { method: "POST", headers: { "content-type": "application/activity+json" }, body: JSON.stringify(activity) });
  assert.equal(refusedPost.status, 401);

  await inbox.retain({ jsonLd: activity });
  const refusedPull = await request("/actors/koios-news/inbox", { headers: { accept: "application/activity+json" } });
  assert.equal(refusedPull.status, 401);
  const root = await request("/actors/koios-news/inbox", { headers: { accept: "application/activity+json", authorization: `Bearer ${token}` } });
  assert.equal(root.status, 200);
  const first = new URL((await root.json()).first);
  const page = await request(`${first.pathname}${first.search}`, { headers: { accept: "application/activity+json", authorization: `Bearer ${token}` } });
  assert.deepEqual((await page.json()).orderedItems, [activity]);
});
