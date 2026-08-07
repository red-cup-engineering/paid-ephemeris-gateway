import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { entry } from "@red-cup-engineering/witness-journal-entry-service";
import { appendEntries, readJsonLinesAtPath } from "@red-cup-engineering/witness-journal-log-service";

export const ACTOR = "https://koios-news-service-section.invalid/activitypub/actor";
export const CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ENTERPRISE = "urn:ame:koios-news-service-section";
export const ACCOUNT = "eip155:31337:0x55397286728b70d86a139fe8263c2d63c5d6770c";
export const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const FEED = "koios-news";

export function digest(value, objectKind = "koios-news.record") {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}

export function niSuffix(value) {
  if (!/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(value ?? "")) throw new Error("semantic identity must be an RFC 6920 SHA-256 ni URI");
  return value.slice("ni:///sha-256;".length);
}

function dataRoot() {
  return resolve(process.env.KOIOS_NEWS_DATA_ROOT ?? ROOT);
}

export function records(category, root = dataRoot()) {
  const base = join(resolve(root), "data", "logs"), files = [];
  try {
    const visit = (directory) => {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, item.name);
        if (item.isDirectory()) visit(path);
        else if (item.isFile() && item.name === `${FEED}.jsonl`) files.push(path);
      }
    };
    visit(base);
  } catch { return []; }
  return files.sort().flatMap(readJsonLinesAtPath).filter((row) => row.a === `record:${category}`).map((row) => row.v);
}

export function record(category, recordedAt, value, root = dataRoot()) {
  const documentId = digest(value, "koios-news.journal-record");
  return appendEntries(resolve(root), FEED,
    [entry(documentId, `record:${category}`, value, recordedAt)], recordedAt);
}
