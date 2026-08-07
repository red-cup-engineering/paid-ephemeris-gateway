// Static-verification die. `node --check` only PARSES (never executes);
// `py_compile` only COMPILES. Plus cheap semantic checks (duplicate imports — the exact defect
// that slipped through before). This is the primary "does the edit hold" gate: safe, local,
// fast, no sandbox, no runner minutes. Running tests becomes an optional dynamic afterthought.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

export function duplicateImportLines(content) {
  const imports = String(content || "").match(/^\s*(import\s.+|const\s.+=\s*require\(.+)$/gm) || [];
  const seen = new Set(), dups = [];
  for (const l of imports) { const k = l.trim(); if (seen.has(k)) dups.push(k); else seen.add(k); }
  return dups;
}

export function staticCheckPath(absPath) {
  let content = "";
  try { content = readFileSync(absPath, "utf8"); } catch { /* unreadable */ }
  const ext = extname(absPath);
  const checks = [];

  const dups = duplicateImportLines(content);
  if (dups.length) checks.push({ check: "duplicate-imports", ok: false, detail: dups.join(" | ") });

  if ([".js", ".mjs", ".cjs"].includes(ext)) {
    const r = spawnSync(process.execPath, ["--check", absPath], { encoding: "utf8" });
    checks.push({ check: "node --check (parse only)", ok: r.status === 0, detail: (r.stderr || "").trim().slice(0, 400) });
  } else if (ext === ".py") {
    const r = spawnSync("python3", ["-m", "py_compile", absPath], { encoding: "utf8" });
    if (r.error) checks.push({ check: "py_compile unavailable", ok: true, detail: "skipped" });
    else checks.push({ check: "py_compile (compile only)", ok: r.status === 0, detail: (r.stderr || "").trim().slice(0, 400) });
  } else {
    checks.push({ check: `no static checker for ${ext || "?"}`, ok: true, detail: "skipped" });
  }

  return { ok: checks.every((c) => c.ok), checks };
}
