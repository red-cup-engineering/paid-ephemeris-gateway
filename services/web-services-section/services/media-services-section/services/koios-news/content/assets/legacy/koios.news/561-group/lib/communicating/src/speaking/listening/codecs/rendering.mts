

import type { ParseResult, ParsedArc } from "../parsing/index.mjs";

const GLYPH: Record<string, string> = {
  decided: "✓",
  ambiguous: "⊤",
  void: "⊥",
};

/** Format arc list for display. */
export function renderArcs(result: ParseResult): string {
  if (result.arcs.length === 0) return "  (no arcs)";
  return result.arcs
    .map((a: ParsedArc) => {
      const g = GLYPH[a.status] ?? "?";
      return `  ${a.rel.padEnd(8)} ${a.headText.padEnd(12)} → ${a.depText.padEnd(12)} ${g}`;
    })
    .join("\n");
}

/** Render the full parse diagram with all five sections. */
export default function render(result: ParseResult): string {
  const lines: string[] = [];

  lines.push("TOKENS");
  for (const w of result.words) {
    const tags = w.tags.join(",");
    const feats = w.feats.join(",");
    lines.push(`  ${w.text.padEnd(15)} [${tags}${feats ? ":" + feats : ""}]`);
  }

  lines.push("\nARCS");
  lines.push(renderArcs(result));

  lines.push("\nROLES");
  for (const w of result.words) {
    if (w.roles.length > 0) {
      lines.push(`  ${w.text.padEnd(15)} ${w.roles.join(", ")}`);
    }
  }
  if (result.words.every((w) => w.roles.length === 0)) lines.push("  (none)");

  lines.push("\nQUESTIONS");
  for (const a of result.answers) {
    if (a.question === "connectivity") continue;
    const g = GLYPH[a.status] ?? "?";
    lines.push(`  ${a.question.padEnd(24)} on "${a.on}" ${g}`);
  }
  if (result.answers.filter((a) => a.question !== "connectivity").length === 0) {
    lines.push("  (none)");
  }

  lines.push("\nTOWER");
  lines.push(`  folds: ${result.tower.folds}, fixedPoint: ${result.tower.fixedPoint}, sizes: [${result.tower.sizes.join(", ")}]`);

  if (result.conflicts.length > 0) {
    lines.push(`\nCONFLICTS (⊤): ${result.conflicts.length}`);
    for (const c of result.conflicts) lines.push(`  ${c.question} on "${c.on}"`);
  }
  if (result.voids.length > 0) {
    lines.push(`\nVOIDS (⊥): ${result.voids.length}`);
    for (const v of result.voids) lines.push(`  ${v.question} on "${v.on}"`);
  }

  return lines.join("\n");
}
