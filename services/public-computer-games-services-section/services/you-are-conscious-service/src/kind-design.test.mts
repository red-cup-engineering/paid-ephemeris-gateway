/**
 * `kind-design` — this game's own version of Stoke's dark-pattern proof, expanded to cover this
 * game's larger intent vocabulary (per DESIGN.md: "a new intent is not exempt from the scan
 * because it's about cognition instead of currency"). Same three independent checks:
 *
 *   1. STATIC SCAN — no domain `.mts` file (excluding tests and this file itself) contains a
 *      wall-clock or timer primitive at all.
 *   2. STATIC SCAN OF THE REAL REDUCER — `applyConsciousIntent`'s own `switch (intent.kind)` in
 *      `intents.mts` is parsed for its literal `case "..."` labels, asserted to be EXACTLY this
 *      game's full, disclosed 19-verb vocabulary — no "buy-insight," "skip-crossing,"
 *      "speed-up-tick," or similarly energy-wall-shaped intent has a real handler anywhere.
 *   3. BEHAVIORAL PROOF — `tick.mts::ticksBetween` is a pure function of `(fromTs, toTs)` alone;
 *      no purchase or state can change how fast time passes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ticksBetween } from "./tick.mts";

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

const FORBIDDEN = [
  { pattern: /\bDate\s*\.\s*now\s*\(/, name: "Date.now()" },
  { pattern: /\bnew\s+Date\s*\(/, name: "new Date()" },
  { pattern: /\bsetTimeout\s*\(/, name: "setTimeout()" },
  { pattern: /\bsetInterval\s*\(/, name: "setInterval()" },
  { pattern: /\bperformance\s*\.\s*now\s*\(/, name: "performance.now()" },
];

function domainSourceFiles(): string[] {
  return readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".mts") && !f.endsWith(".test.mts"))
    .map((f) => path.join(SRC_DIR, f));
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test("static scan: no domain module's CODE (comments excluded) reads the wall clock or schedules a timer — the mechanism every energy wall needs is structurally absent", () => {
  const violations: string[] = [];
  for (const file of domainSourceFiles()) {
    const code = stripComments(readFileSync(file, "utf8"));
    for (const { pattern, name } of FORBIDDEN) {
      if (pattern.test(code)) violations.push(`${path.basename(file)}: contains ${name}`);
    }
  }
  assert.deepEqual(violations, [], `wall-clock/timer usage found in domain code:\n${violations.join("\n")}`);
});

/** This game's full, disclosed intent vocabulary — DESIGN.md §6's five inherited verbs plus the
 *  nine cognition-ladder verbs it names plus this build's own `click` (tier 1's baseline, which
 *  Stoke never needed because Stoke never has a pre-graph tier) and `resolveGoodhartBranch` (see
 *  `intents.mts`'s own module header for why that one addition is justified: Repair and Persist
 *  are each "a real intent" per DESIGN.md §3, and neither is any of the other members), plus
 *  `feedback` — the one scripted tier-1 intent that closes the widget graph's very first cycle
 *  (see `intents.mts`'s "tier 1's own scripted intent" section for why this exists: without it, a
 *  fresh save's acyclic starter graph plus tier 2's build/connect gate plus reflect's own
 *  cycle-required rule was a real, unescapable deadlock — not an energy wall, a genuine bugfix,
 *  which is exactly why it's one narrow, disclosed exception rather than a second `connect`). */
const ALLOWED_INTENT_KINDS = [
  "click", "feedback", "build", "connect", "upgrade", "prestige", "tick",
  "unlockTier", "answerCrossing", "allocateAttention", "sampleProcess",
  "recordPolicy", "runPolicy", "ablate", "predict", "setObjective",
  "resolveGoodhartBranch", "spawnChild", "writeMargin",
] as const;

const FORBIDDEN_INTENT_SHAPES = ["buy-insight", "buy-energy", "skip-crossing", "skip-wait", "refill", "speed-up", "watch-ad", "pay-to-skip"];

function reducerCaseLabels(): string[] {
  const intentsPath = path.join(SRC_DIR, "intents.mts");
  const code = stripComments(readFileSync(intentsPath, "utf8"));
  const switchStart = code.indexOf("switch (intent.kind) {");
  assert.ok(switchStart >= 0, "applyConsciousIntent's switch (intent.kind) statement must exist in intents.mts for this check to scope itself correctly");
  let depth = 0;
  let end = -1;
  for (let i = switchStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  assert.ok(end > switchStart, "could not find the matching closing brace of applyConsciousIntent's switch — scan is broken, not the code");
  const switchBody = code.slice(switchStart, end);
  return [...switchBody.matchAll(/case\s+"([^"]+)"\s*:/g)].map((m) => m[1]!);
}

test("static scan of the real reducer: applyConsciousIntent's switch has a case for exactly this game's disclosed 19-verb vocabulary — no energy-purchase or wait-skip intent has a real handler", () => {
  const found = reducerCaseLabels();
  assert.deepEqual([...found].sort(), [...ALLOWED_INTENT_KINDS].sort(), `intents.mts's applyConsciousIntent switch has case labels ${JSON.stringify(found)}, expected exactly ${JSON.stringify(ALLOWED_INTENT_KINDS)}`);
  for (const forbidden of FORBIDDEN_INTENT_SHAPES) {
    assert.equal(found.includes(forbidden), false, `a real case for forbidden intent kind "${forbidden}" was found wired up in applyConsciousIntent`);
  }
});

test("ConsciousIntent's declared kind union (the type-level shape) has no forbidden member spelled out in intents.mts's own source, as a second, independent check on the type declaration text itself", () => {
  const intentsPath = path.join(SRC_DIR, "intents.mts");
  const code = stripComments(readFileSync(intentsPath, "utf8"));
  const unionStart = code.indexOf("export type ConsciousIntent =");
  assert.ok(unionStart >= 0);
  let depth = 0;
  let unionEnd = -1;
  for (let i = unionStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") depth--;
    else if (code[i] === ";" && depth === 0) { unionEnd = i; break; }
  }
  assert.ok(unionEnd > unionStart, "could not find ConsciousIntent's terminating semicolon at brace-depth 0 — scan is broken, not the code");
  const unionText = code.slice(unionStart, unionEnd);
  const kindsInUnion = [...unionText.matchAll(/kind:\s*"([^"]+)"/g)].map((m) => m[1]!);
  assert.deepEqual([...kindsInUnion].sort(), [...ALLOWED_INTENT_KINDS].sort(), `ConsciousIntent's declared union has kinds ${JSON.stringify(kindsInUnion)}, expected exactly ${JSON.stringify(ALLOWED_INTENT_KINDS)}`);
});

test("no tier-gate refusal reason anywhere in intents.mts is shaped like a pay-to-skip mechanism — every 'tier-N-not-unlocked' refusal is a real prerequisite, not an energy wall with a purchase around it", () => {
  const intentsPath = path.join(SRC_DIR, "intents.mts");
  const code = stripComments(readFileSync(intentsPath, "utf8"));
  for (const forbidden of FORBIDDEN_INTENT_SHAPES) {
    assert.equal(code.includes(`"${forbidden}"`), false, `forbidden shape "${forbidden}" appears literally in intents.mts`);
  }
});

test("behavioral proof: ticksBetween is a pure function of (fromTs, toTs) alone — no purchase or state can change how fast time passes", () => {
  const fromTs = 1_000;
  const toTs = 9_000_000;
  const before = ticksBetween(fromTs, toTs);

  const g = globalThis as Record<string, unknown>;
  g["__yac_test_purchased_speedups__"] = 999_999;
  const RealDate = globalThis.Date;
  class SpedUpDate extends RealDate {
    static override now(): number {
      return RealDate.now() + 1_000_000_000;
    }
  }
  // @ts-expect-error — deliberately monkey-patching the global for this probe only.
  globalThis.Date = SpedUpDate;
  let after: number;
  try {
    after = ticksBetween(fromTs, toTs);
  } finally {
    globalThis.Date = RealDate;
    delete g["__yac_test_purchased_speedups__"];
  }
  assert.equal(after, before, "ticksBetween must ignore ambient/global state entirely — a purchase cannot make time pass faster because nothing in this function can even see a purchase");
});
