#!/usr/bin/env node

import path from "node:path";
import { InProcessMessageQueue, MemoryKvStore } from "@red-cup-engineering/activitypub-provider-service/runtime-adapters";
import { serveActivityPubProvider } from "@red-cup-engineering/activitypub-provider-service/server";
import { createRetainedInbox } from "./retained-inbox.mjs";

export async function serveKoiosActivityPubProvider(options = {}) {
  const inbox = options.inbox ?? createRetainedInbox(options.inboxPath ?? process.env.ACTIVITYPUB_RETAINED_INBOX_PATH ?? path.join(process.cwd(), "data", "retained-inbox.jsonl"));
  return serveActivityPubProvider({
    origin: "https://bare-cedar-fog.561.group",
    identifier: "koios-news",
    actorName: "Koios News",
    summary: "Koios News retained ActivityPub ingress.",
    ...options,
    inbox,
    inboxIndex: inbox,
    kv: options.kv ?? new MemoryKvStore(),
    ...(options.testOnlyInProcess === true ? {} : { queue: options.queue ?? new InProcessMessageQueue() }),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) await serveKoiosActivityPubProvider();
