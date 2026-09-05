/**
 * `kind-design` — an executable test of the kind-retention rule ("no energy walls, no
 * ads-to-continue, no streak shaming"), specialized to the genre's classic dark pattern: a
 * resource that refills only by waiting on the real clock, paired with a purchase that shortens
 * the wait. If that shape ever gets added to this codebase, this file fails loudly.
 *
 * Three independent checks, because a single one is gameable (someone could rename the field, or
 * write the wall-clock read in a way one particular grep misses):
 *
 *   1. STATIC SCAN — no domain `.mts` file (excluding tests and this file itself) contains a
 *      wall-clock or timer primitive at all. This is broader than "no energy field": it is the
 *      literal mechanism every energy-wall implementation needs somewhere (`Date.now()` to know
 *      how much time has passed, `setTimeout`/`setInterval` to run a countdown), and this codebase
 *      structurally has none of it.
 *   2. STATIC SCAN OF THE REAL REDUCER — `applyStokeIntent`'s own `switch (intent.kind)` in
 *      `intents.mts` is parsed for its literal `case "..."` labels, and that extracted set is
 *      asserted to be exactly `build`/`connect`/`upgrade`/`prestige`/`tick`: no "buy-energy",
 *      "skip-wait", "spend-currency-for-instant-tick", or similarly-shaped intent has a real
 *      handler wired up anywhere in the one function that actually executes player intents. The
 *      scan reads the actual source text of the reducer and the type declaration, not a fixture
 *      that could drift out of sync with either.
 *   3. BEHAVIORAL PROOF — the only function in this codebase that turns elapsed real time into
 *      elapsed game ticks, `tick.mts::ticksBetween`, takes `(fromTs, toTs)` and nothing else: no
 *      state, no player, no purchase history. Its type signature makes it structurally impossible
 *      for any purchase to change how fast time passes. This test proves the runtime behavior
 *      matches the structural claim: two calls with identical `(fromTs, toTs)` but under wildly
 *      different simulated "purchase history" (global mutation attempts) return the identical
 *      tick count.
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

/** Strips `/* ... *\/` block comments and `// ...` line comments before scanning, so this file's
 *  own doc comments (and other modules' comments *documenting* the absence of wall-clock reads,
 *  e.g. `tick.mts`'s header sentence "This module never calls \`Date.now()\`.") do not trip the
 *  scan themselves — only actual executable code is checked. Deliberately naive about string
 *  literals containing `//`; none of the files this runs over have any. */
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

const ALLOWED_INTENT_KINDS = ["build", "connect", "upgrade", "prestige", "tick"] as const;

/** Extract every literal `case "...":` label from `applyStokeIntent`'s own `switch (intent.kind)`
 *  block in `intents.mts` — the real reducer, not a copy or a description of it. Scoped
 *  specifically to that one switch (found by its literal `switch (intent.kind) {` opener and its
 *  matching close-brace via depth counting) so a `case` string appearing elsewhere in the file
 *  (a test fixture, an unrelated switch) can't accidentally feed into this check. */
function reducerCaseLabels(): string[] {
  const intentsPath = path.join(SRC_DIR, "intents.mts");
  const code = stripComments(readFileSync(intentsPath, "utf8"));
  const switchStart = code.indexOf("switch (intent.kind) {");
  assert.ok(switchStart >= 0, "applyStokeIntent's switch (intent.kind) statement must exist in intents.mts for this check to scope itself correctly");
  let depth = 0;
  let end = -1;
  for (let i = switchStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  assert.ok(end > switchStart, "could not find the matching closing brace of applyStokeIntent's switch — scan is broken, not the code");
  const switchBody = code.slice(switchStart, end);
  return [...switchBody.matchAll(/case\s+"([^"]+)"\s*:/g)].map((m) => m[1]!);
}

test("static scan of the real reducer: applyStokeIntent's switch has a case for exactly build/connect/upgrade/prestige/tick — no energy-purchase or wait-skip intent has a real handler", () => {
  const found = reducerCaseLabels();
  assert.deepEqual([...found].sort(), [...ALLOWED_INTENT_KINDS].sort(), `intents.mts's applyStokeIntent switch has case labels ${JSON.stringify(found)}, expected exactly ${JSON.stringify(ALLOWED_INTENT_KINDS)}`);
  for (const forbidden of ["buy-energy", "skip-wait", "refill", "speed-up", "watch-ad"]) {
    assert.equal(found.includes(forbidden), false, `a real case for forbidden intent kind "${forbidden}" was found wired up in applyStokeIntent`);
  }
});

test("StokeIntent's declared kind union (the type-level shape) has no forbidden member spelled out in intents.mts's own source, as a second, independent check on the type declaration text itself", () => {
  const intentsPath = path.join(SRC_DIR, "intents.mts");
  const code = stripComments(readFileSync(intentsPath, "utf8"));
  const unionStart = code.indexOf("export type StokeIntent =");
  assert.ok(unionStart >= 0);
  // The union's own members are object-literal types using `;` as a PROPERTY separator (e.g.
  // `{ readonly kind: "build"; readonly id: string; ... }`), so the statement's real terminating
  // `;` is the first one found OUTSIDE any `{...}` grouping, not just the first `;` at all —
  // depth-counted, same technique as reducerCaseLabels's brace matching above.
  let depth = 0;
  let unionEnd = -1;
  for (let i = unionStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") depth--;
    else if (code[i] === ";" && depth === 0) { unionEnd = i; break; }
  }
  assert.ok(unionEnd > unionStart, "could not find StokeIntent's terminating semicolon at brace-depth 0 — scan is broken, not the code");
  const unionText = code.slice(unionStart, unionEnd);
  const kindsInUnion = [...unionText.matchAll(/kind:\s*"([^"]+)"/g)].map((m) => m[1]!);
  assert.deepEqual([...kindsInUnion].sort(), [...ALLOWED_INTENT_KINDS].sort(), `StokeIntent's declared union has kinds ${JSON.stringify(kindsInUnion)}, expected exactly ${JSON.stringify(ALLOWED_INTENT_KINDS)}`);
});

test("behavioral proof: ticksBetween is a pure function of (fromTs, toTs) alone — no purchase or state can change how fast time passes", () => {
  // ticksBetween's own TS signature — (fromTs: number, toTs: number): number — already makes this
  // structurally true (there is no third parameter for a "speed multiplier" to arrive through).
  // This test is the runtime half of that claim: simulate a hostile caller that mutates every
  // piece of ambient global state it can reach between two calls, and confirm the result is
  // identical regardless, because ticksBetween never reads any of it.
  const fromTs = 1_000;
  const toTs = 9_000_000;
  const before = ticksBetween(fromTs, toTs);

  // Simulate "purchased a speed-up" by mutating global, ambient state a hidden accelerator
  // mechanism might have tried to read — a global counter and a monkey-patched Date, both
  // restored afterward so this test doesn't leak state to any other test file.
  const g = globalThis as Record<string, unknown>;
  g["__stoke_test_purchased_speedups__"] = 999_999;
  const RealDate = globalThis.Date;
  class SpedUpDate extends RealDate {
    static override now(): number {
      return RealDate.now() + 1_000_000_000; // if anything reads Date.now(), this would corrupt it
    }
  }
  // @ts-expect-error — deliberately monkey-patching the global for this probe only.
  globalThis.Date = SpedUpDate;
  let after: number;
  try {
    after = ticksBetween(fromTs, toTs);
  } finally {
    globalThis.Date = RealDate;
    delete g["__stoke_test_purchased_speedups__"];
  }
  assert.equal(after, before, "ticksBetween must ignore ambient/global state entirely — a purchase cannot make time pass faster because nothing in this function can even see a purchase");
});
