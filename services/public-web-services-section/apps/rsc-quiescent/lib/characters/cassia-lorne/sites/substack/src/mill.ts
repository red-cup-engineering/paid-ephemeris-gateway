import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  millFeeds,
  millItems,
  publicItems,
  type MillItem,
  type MillMasthead,
  type MillSource,
} from "@red-cup-engineering/organizing-a-content-mill";
import { decodeFrontMatterDocument } from "@red-cup-engineering/producing-content/codecs/frontmatter";
import {
  divinationIndicatorsClaimSet,
  divinationNewswireBundlesFromIndicatorsDir,
  subjectDate,
} from "@red-cup-engineering/producing-a-newswire";
import { PROPERTY_ROOT } from "./config.ts";

export const cassiaMasthead: MillMasthead = Object.freeze({
  title: "Cassia Lorne's Routine Read",
  siteUrl: "https://cassia-lorne.substack.com",
  feedUrl: "https://cassia-lorne.substack.com/feed",
  description: "Daily divination readings formed from astrology, tarot, numerology, and synthesized signals.",
  itemPath: "p",
  language: "en-US",
  author: Object.freeze({ name: "Cassia Lorne", url: "https://cassia-lorne.substack.com" }),
  publisher: Object.freeze({ name: "Cassia Lorne", url: "https://cassia-lorne.substack.com" }),
  publication: Object.freeze({ name: "Cassia Lorne's Routine Read", language: "en" }),
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphHtml(body: string): string {
  return body
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function markdownBodyHtml(dateIso: string): string | undefined {
  const path = join(PROPERTY_ROOT, "content", `${dateIso}.md`);
  if (!existsSync(path)) return undefined;
  const document = decodeFrontMatterDocument(readFileSync(path, "utf8"));
  return paragraphHtml(document.body);
}

export function cassiaDivinationSources(
  indicatorsDir = join(PROPERTY_ROOT, "backstage", "indicators"),
): readonly MillSource[] {
  return Object.freeze(divinationNewswireBundlesFromIndicatorsDir(indicatorsDir, {
    citationBase: "https://cassia-lorne.substack.com/p",
  }).map((routed): MillSource => {
    const dateIso = subjectDate(routed.bundle.subject);
    return Object.freeze({
      claimSet: divinationIndicatorsClaimSet(routed.bundle),
      slug: dateIso,
      bodyHtml: markdownBodyHtml(dateIso) ?? "",
    });
  }));
}

export function cassiaMillItems(
  indicatorsDir = join(PROPERTY_ROOT, "backstage", "indicators"),
  masthead: MillMasthead = cassiaMasthead,
): readonly MillItem[] {
  return millItems(cassiaDivinationSources(indicatorsDir), masthead);
}

export function cassiaPublicItems(
  indicatorsDir = join(PROPERTY_ROOT, "backstage", "indicators"),
  masthead: MillMasthead = cassiaMasthead,
): readonly MillItem[] {
  return publicItems(cassiaMillItems(indicatorsDir, masthead));
}

export function cassiaFeeds(
  indicatorsDir = join(PROPERTY_ROOT, "backstage", "indicators"),
  masthead: MillMasthead = cassiaMasthead,
): ReturnType<typeof millFeeds> {
  return millFeeds(masthead, cassiaMillItems(indicatorsDir, masthead));
}
