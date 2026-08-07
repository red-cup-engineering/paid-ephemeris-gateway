// Stage 2 of the diviner cycle: synthesis under gates.
//
// Reads the day's indicators and brief, asks the synthesis writer for the
// Routine Read in Cassia's voice, judges it against the diviner deontics
// (gates.ts), and projects it into the content store: content/<date>.md on
// publish, backstage/withheld/<date>.md on withhold — either way with the
// gate report at backstage/gate-reports/<date>.json.
//
// Writers, chosen by CASSIA_WRITER:
//   "claude" (default) — the claude CLI in print mode with the configured
//     synthesis model (an Opus-class writer, per the publish-gate ruling);
//   "file" — read the draft from CASSIA_DRAFT_FILE (or --draft <path>),
//     for in-session synthesis and for iterating on gate behavior.
//
// Dry-run mechanics: every raw draft is saved to backstage/drafts/<date>.md
// the moment the writer returns. A saved draft is REUSED on later runs —
// regating is free; the writer is only invoked again with --rewrite. With
// --dry-run the gate report is printed and nothing is written anywhere.
//
// Run: pnpm run divine:read [-- YYYY-MM-DD [--draft path] [--rewrite] [--dry-run]]

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { decodeDailyIndicators } from "@lenticule-science/divining/divination/codecs";
import type { DailyIndicatorsRecord } from "@lenticule-science/divining/divination/codecs";
import { encodeFrontMatterDocument, frontMatterDocument } from "./frontmatter.ts";
import { dateArgument, loadDivinerConfig, PROPERTY_ROOT, type DivinerConfig } from "./config.ts";
import { judgeRead, type GateReport } from "./gates.ts";

export function synthesisPrompt(indicators: DailyIndicatorsRecord, brief: string, config: DivinerConfig): string {
  const persona = readFileSync(join(PROPERTY_ROOT, "persona", "cassia-lorne.md"), "utf8");
  return [
    "You are writing today's Routine Read as Cassia Lorne. Her voice document:",
    "",
    persona,
    "",
    "Today's indicators, witnessed by the pipeline (these are your only symbols — weave in EVERY required one, named plainly: the Moon's phase and sign, the featured motion with both bodies or the ingress, the tarot card by name and orientation, and the numerological value):",
    "",
    brief,
    "",
    `Write the Routine Read for ${indicators.date}: ${config.minWords}–${config.maxWords} words of flowing short paragraphs. No headers, no lists, no section labels, no title. Never tell the reader what will happen ("you will", "there will") and never prescribe ("you should", "you must"); reflect in possibility ("may", "might", "what's being offered"). End with a note of reciprocity — an invitation, never an instruction.`,
    "",
    "Reply with the read's body text alone.",
  ].join("\n");
}

function writeDraft(
  prompt: string,
  config: DivinerConfig,
  argv: readonly string[],
  dateIso: string,
): Readonly<{ body: string; source: string }> {
  const writer = process.env.CASSIA_WRITER ?? "claude";
  const draftFlag = argv.indexOf("--draft");
  const draftPath = draftFlag !== -1 ? argv[draftFlag + 1] : process.env.CASSIA_DRAFT_FILE;
  if (writer === "file" || draftPath) {
    if (!draftPath) throw new TypeError("CASSIA_WRITER=file needs CASSIA_DRAFT_FILE or --draft <path>");
    return { body: readFileSync(draftPath, "utf8").trim(), source: draftPath };
  }
  const savedPath = join(PROPERTY_ROOT, "backstage", "drafts", `${dateIso}.md`);
  if (!argv.includes("--rewrite") && existsSync(savedPath)) {
    return { body: readFileSync(savedPath, "utf8").trim(), source: `${savedPath} (saved; --rewrite for a fresh synthesis)` };
  }
  const body = execFileSync("claude", ["-p", "--model", config.synthesisModel], {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout: 600_000,
  }).trim();
  mkdirSync(join(PROPERTY_ROOT, "backstage", "drafts"), { recursive: true });
  writeFileSync(savedPath, `${body}\n`);
  return { body, source: `${config.synthesisModel} (fresh; saved to ${savedPath})` };
}

function frontMatter(indicators: DailyIndicatorsRecord, report: GateReport, body: string): string {
  const position = indicators.tarot.positions[0];
  const motion =
    indicators.motion.kind === "aspect"
      ? `${indicators.motion.aspect.bodyA} ${indicators.motion.aspect.aspect.name} ${indicators.motion.aspect.bodyB}`
      : `${indicators.motion.ingress.body} enters ${indicators.motion.ingress.signTo.name}`;
  return encodeFrontMatterDocument(frontMatterDocument({
    frontMatter: {
      title: `Routine Read — ${indicators.date}`,
      date: `${indicators.date}T09:00:00-04:00`,
      author: "Cassia Lorne",
      draft: report.outcome !== "publish",
      read: {
        moon: `${indicators.moon.lunation.phase} in ${indicators.moon.placement.sign.name}`,
        motion,
        card: position ? `${position.card.name}, ${position.orientation}` : "",
        number: indicators.numerology.value,
      },
    },
    body: `\n${body}\n`,
  }));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dateIso = dateArgument(argv);
  const config = loadDivinerConfig();
  const indicators = decodeDailyIndicators(
    readFileSync(join(PROPERTY_ROOT, "backstage", "indicators", `${dateIso}.json`), "utf8"),
  );
  const brief = readFileSync(join(PROPERTY_ROOT, "backstage", "briefs", `${dateIso}.md`), "utf8");

  const prompt = synthesisPrompt(indicators, brief, config);
  const draft = writeDraft(prompt, config, argv, dateIso);
  console.log(`draft: ${draft.source}`);
  let body = draft.body;
  let report = judgeRead(body, indicators, config);

  // The koios precedent: one revision pass when gates fail, keeping the
  // evidence. Explicit (--revise) so a dry iteration never spends a call.
  if (report.outcome === "withhold" && argv.includes("--revise") && !argv.includes("--dry-run")) {
    const blocked = report.verdicts.filter((entry) => entry.verdict === "blocked");
    const revisionPrompt = [
      prompt,
      "",
      "Your previous draft follows. The publish gates withheld it for the listed reasons. Revise it MINIMALLY — keep everything that works, change only what the gates name. Reply with the full revised body text alone.",
      "",
      "GATE EVIDENCE:",
      JSON.stringify(blocked, null, 2),
      "",
      "PREVIOUS DRAFT:",
      body,
    ].join("\n");
    body = execFileSync("claude", ["-p", "--model", config.synthesisModel], {
      input: revisionPrompt,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 600_000,
    }).trim();
    writeFileSync(join(PROPERTY_ROOT, "backstage", "drafts", `${dateIso}.md`), `${body}\n`);
    console.log("revised once against gate evidence");
    report = judgeRead(body, indicators, config);
  }

  if (argv.includes("--dry-run")) {
    console.log(`dry run — outcome would be: ${report.outcome}`);
    console.log(JSON.stringify(report.verdicts, null, 2));
    return;
  }

  mkdirSync(join(PROPERTY_ROOT, "backstage", "gate-reports"), { recursive: true });
  writeFileSync(
    join(PROPERTY_ROOT, "backstage", "gate-reports", `${dateIso}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  const document = frontMatter(indicators, report, body);
  if (report.outcome === "publish") {
    mkdirSync(join(PROPERTY_ROOT, "content"), { recursive: true });
    const path = join(PROPERTY_ROOT, "content", `${dateIso}.md`);
    writeFileSync(path, document);
    console.log(`published → ${path}`);
  } else {
    mkdirSync(join(PROPERTY_ROOT, "backstage", "withheld"), { recursive: true });
    const path = join(PROPERTY_ROOT, "backstage", "withheld", `${dateIso}.md`);
    writeFileSync(path, document);
    console.log(`withheld → ${path}`);
    for (const entry of report.verdicts.filter((candidate) => candidate.verdict === "blocked")) {
      console.log(`  ${entry.gate}:`);
      for (const evidence of entry.evidence) console.log(`    - ${evidence}`);
    }
  }
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop() as string);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
