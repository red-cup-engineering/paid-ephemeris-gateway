


import type { DetectResult, Diagnostic, Verdict } from "./types.mjs";
import { valueOf } from "@emsenn/relating-experimental";

/** Convert a DetectResult into Diagnostics (violations and conflicts only). */
export function report(result: DetectResult): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const cell of result.cells) {
    const v = valueOf(cell.charge).name;
    if (v !== "active" && v !== "stable") continue;

    diagnostics.push({
      severity: v === "stable" ? "conflict" : cell.severity,
      ruleId: cell.ruleId,
      message: cell.message,
      start: cell.start,
      end: cell.end,
      text: result.source.slice(cell.start, cell.end),
      ...(cell.suggest !== undefined ? { suggest: cell.suggest } : {}),
    });
  }

  
  diagnostics.sort((a, b) => a.start - b.start);
  return diagnostics;
}

/** Run detect + report, compute pass/fail verdict.
 * A document fails if it has any warning or error diagnostics (suggestions are OK). */
export function verdict(result: DetectResult): Verdict {
  const diagnostics = report(result);
  const pass = !diagnostics.some((d) => d.severity === "warning" || d.severity === "error");
  return { pass, diagnostics };
}
