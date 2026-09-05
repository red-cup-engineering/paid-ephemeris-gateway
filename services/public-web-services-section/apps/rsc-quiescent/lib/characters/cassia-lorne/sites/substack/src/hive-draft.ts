// Stage 3 of the diviner cycle: a Hive draft, never a broadcast.
//
// Aagaard (the Hive wallet-fleet enterprise) presently locks posting
// categorically -- its own Hive write boundary implements only voting,
// trading, liquidity, savings, and incentive actions, by design (see
// hiveWrite.adapter.ts's IncentiveActionKind exclusion of "comment"/"post").
// This is not a missing credential; it is a capability aagaard has not
// grown yet. Extending aagaard's own scope is a decision for that
// settlement, not this script.
//
// So: this stage produces a waggle-shaped post payload
// (@561-group/waggle's `post({ title, body, tags, permlink })`) and writes
// it to backstage/hive-drafts/<date>.json as a plain, inert record. It
// broadcasts nothing. A human reviews the file and either runs waggle's own
// CLI/library against it once ready, or asks for the broadcast path to be
// wired properly first. This is the "scheduled or draft post I can
// manually flip" surface asked for -- never an auto-post.
//
// Known gap, stated rather than hidden: Hive does not carry inline image
// bytes. A post's image must be uploaded to an image host (conventionally
// https://images.hive.blog) and referenced by URL; that upload is not
// wired here, so the draft's body references the local image path with a
// TODO marker instead of a live URL.
//
// Run: pnpm run divine:hive-draft [-- YYYY-MM-DD]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { decodeFrontMatterDocument } from "./frontmatter.ts";
import { dateArgument, PROPERTY_ROOT } from "./config.ts";

export type HiveDraftPayload = Readonly<{
  status: "awaiting-manual-approval";
  account: "cassia-lorne";
  title: string;
  body: string;
  tags: readonly string[];
  permlink: string;
  imagePath?: string;
  imageUploadRequired: boolean;
}>;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildHiveDraft(dateIso: string, documentText: string, imagePath: string | undefined): HiveDraftPayload {
  const doc = decodeFrontMatterDocument(documentText);
  const title = String(doc.frontMatter.title ?? `Routine Read — ${dateIso}`);
  const titleSlug = slugify(title);
  const permlink = titleSlug.endsWith(dateIso) ? titleSlug : `${titleSlug}-${dateIso}`;
  const imageNote = imagePath
    ? `\n\n![today's illustration](TODO: upload ${imagePath} to https://images.hive.blog and paste the returned URL here)\n`
    : "";
  return Object.freeze({
    status: "awaiting-manual-approval" as const,
    account: "cassia-lorne" as const,
    title,
    body: `${imageNote}${doc.body.trim()}\n`,
    tags: ["divination", "tarot", "astrology", "hive"],
    permlink,
    ...(imagePath ? { imagePath } : {}),
    imageUploadRequired: Boolean(imagePath),
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dateIso = dateArgument(argv);

  const publishedPath = join(PROPERTY_ROOT, "content", `${dateIso}.md`);
  const withheldPath = join(PROPERTY_ROOT, "backstage", "withheld", `${dateIso}.md`);
  const documentPath = existsSync(publishedPath) ? publishedPath : withheldPath;
  if (!existsSync(documentPath)) {
    throw new Error(`no read found for ${dateIso} at ${publishedPath} or ${withheldPath} -- run divine:read first`);
  }
  if (documentPath === withheldPath) {
    console.error(`warning: ${dateIso}'s read was withheld by the publish gates; drafting from it anyway for review, not for posting as-is`);
  }

  const imagePath = join(PROPERTY_ROOT, "backstage", "images", `${dateIso}.png`);
  const draft = buildHiveDraft(dateIso, readFileSync(documentPath, "utf8"), existsSync(imagePath) ? imagePath : undefined);

  const draftPath = join(PROPERTY_ROOT, "backstage", "hive-drafts", `${dateIso}.json`);
  mkdirSync(join(PROPERTY_ROOT, "backstage", "hive-drafts"), { recursive: true });
  writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
  console.log(`hive draft (awaiting manual approval) → ${draftPath}`);
  if (draft.imageUploadRequired) {
    console.log(`  image still needs manual upload: ${draft.imagePath}`);
  }
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop() as string);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
