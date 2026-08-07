// desk.mts — the Koios.News editorial desk: withheld mill candidates become
// work items on the 561 swarm hub's fable board, where the nightly editorial
// routine finds them. One story, one work item; the slug is the identity.
//
// Judgments are pure (posts in, work items out); the shell deposits over
// HTTP. Time is a parameter — the desk runs when the farm calls it.

import process from "node:process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { editorialWorkItem, type EditorialOffice, type EditorialWorkItem } from "@emsenn/content-production/content-farm";

import { DEFAULT_CONTENT_DIR } from "./config.mjs";
import { loadPosts, type KoiosPost } from "./content.mjs";

const KOIOS_DESK_OFFICE: EditorialOffice = Object.freeze({ name: "koios.news", gateModel: "fable" });

export type DeskWorkItem = EditorialWorkItem;

export type DeskWitness = Readonly<{
  kind: "koios.desk:witness";
  at: string;
  candidates: readonly DeskWorkItem[];
  deposited: number;
  skipped: number;
}>;

export type DeskObstruction = Readonly<{
  kind: "koios.desk:obstruction";
  at: "hub-read" | "hub-deposit";
  reason: string;
}>;

/** The judgment: every withheld post is a candidate for the night's review. */
export function deskWorkItems(posts: readonly KoiosPost[]): readonly DeskWorkItem[] {
  return Object.freeze(posts
    .filter((post) => post.document.frontMatter["draft"] === true)
    .map((post): DeskWorkItem => editorialWorkItem(KOIOS_DESK_OFFICE, {
      slug: post.slug,
      title: String(post.document.frontMatter["title"] ?? post.slug),
      summary: String(post.document.frontMatter["summary"] ?? ""),
    })));
}

type FetchLike = (url: string, init?: { headers?: Record<string, string>; method?: string; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export type EnqueueOptions = Readonly<{
  hubBase: string;
  hubToken: string;
  at: string;
  contentDir?: string;
  fetchImpl?: FetchLike;
}>;

/** Deposit every withheld candidate the hub does not already hold open. */
export async function enqueueCandidates(options: EnqueueOptions): Promise<DeskWitness | DeskObstruction> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const base = options.hubBase.replace(/\/$/, "");
  const candidates = deskWorkItems(loadPosts(options.contentDir ?? DEFAULT_CONTENT_DIR));
  const board = KOIOS_DESK_OFFICE.gateModel ?? "fable";

  let open: ReadonlyArray<{ workId: string }>;
  try {
    const response = await fetchImpl(`${base}/work-board/${encodeURIComponent(board)}/open`, {
      headers: { Authorization: `Bearer ${options.hubToken}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { open?: ReadonlyArray<{ workId: string }> };
    open = Array.isArray(body.open) ? body.open : [];
  } catch (error) {
    return { kind: "koios.desk:obstruction", at: "hub-read", reason: message(error) };
  }

  const held = new Set(open.map((item) => item.workId));
  let deposited = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    if (held.has(candidate.workId)) {
      skipped += 1;
      continue;
    }
    try {
      const response = await fetchImpl(`${base}/work-board/${encodeURIComponent(candidate.fields.requiredSkill)}/deposit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${options.hubToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
        workId: candidate.workId,
        fields: candidate.fields,
        options: { by: "koios.news-desk", at: options.at },
      }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      deposited += 1;
    } catch (error) {
      return { kind: "koios.desk:obstruction", at: "hub-deposit", reason: message(error) };
    }
  }
  return { kind: "koios.desk:witness", at: options.at, candidates, deposited, skipped };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMain(): boolean {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMain()) {
  const hubBase = process.env["SWARM_561_HUB"] ?? "http://127.0.0.1:18805";
  const tokenFile = process.env["KOIOS_DESK_TOKEN_FILE"];
  if (tokenFile === undefined) {
    console.error("KOIOS_DESK_TOKEN_FILE is required");
    process.exit(2);
  }
  readFile(tokenFile, "utf8")
    .then((token) => enqueueCandidates({ hubBase, hubToken: token.trim(), at: new Date().toISOString() }))
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.kind === "koios.desk:obstruction") process.exitCode = 1;
    })
    .catch((error: unknown) => {
      console.error(message(error));
      process.exitCode = 1;
    });
}
