import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, tell } from "@red-cup-engineering/feltos/world";
import { decideAction, normalizeAction, validateStrategy } from "./strategy.mts";
import { composeStrategy } from "./progression.mts";

test("a composed strategy decides attack while a monster stands", () => {
  const w = tell(createWorld({ functionalPredicates: ["floor-hp", "hp", "max-hp"] }), [
    { subject: "p", predicate: "floor-hp", object: 10 }, { subject: "p", predicate: "hp", object: 20 }, { subject: "p", predicate: "max-hp", object: 20 },
  ]);
  const program = composeStrategy(new Set(["auto-attack", "auto-descend"]));
  assert.equal(decideAction(program, w, "p").action, "attack");
});

test("it decides descend once the floor is cleared", () => {
  const w = tell(createWorld({ functionalPredicates: ["floor-hp", "hp", "max-hp"] }), [
    { subject: "p", predicate: "floor-hp", object: 0 }, { subject: "p", predicate: "hp", object: 20 }, { subject: "p", predicate: "max-hp", object: 20 },
  ]);
  const program = composeStrategy(new Set(["auto-attack", "auto-descend"]));
  assert.equal(decideAction(program, w, "p").action, "descend");
});

test("auto-retreat takes priority when health is low", () => {
  const w = tell(createWorld({ functionalPredicates: ["floor-hp", "hp", "max-hp"] }), [
    { subject: "p", predicate: "floor-hp", object: 10 }, { subject: "p", predicate: "hp", object: 3 }, { subject: "p", predicate: "max-hp", object: 20 },
  ]);
  const program = composeStrategy(new Set(["auto-attack", "auto-descend", "auto-retreat"]));
  assert.equal(decideAction(program, w, "p").action, "retreat");
});

test("auto-rekindle fires when stuck beyond patience", () => {
  const w = tell(createWorld({ functionalPredicates: ["floor-hp", "hp", "max-hp", "stuck", "patience"] }), [
    { subject: "p", predicate: "floor-hp", object: 10 }, { subject: "p", predicate: "hp", object: 20 }, { subject: "p", predicate: "max-hp", object: 20 },
    { subject: "p", predicate: "stuck", object: 200 }, { subject: "p", predicate: "patience", object: 90 },
  ]);
  const program = composeStrategy(new Set(["auto-attack", "auto-rekindle"]));
  assert.equal(decideAction(program, w, "p").action, "rekindle");
});

test("unknown / malicious program output collapses to wait (sandboxed)", () => {
  const w = tell(createWorld({ functionalPredicates: ["essence"] }), { subject: "p", predicate: "essence", object: 0 });
  // A program that tries to cheat: set essence huge, then return something off-whitelist.
  const evil = "(do (set self essence 999999999) (quote grant-me-everything))";
  assert.equal(decideAction(evil, w, "p").action, "wait");
  // And the real world is untouched — decideAction discards the threaded world.
});

test("normalizeAction whitelists", () => {
  assert.equal(normalizeAction("attack"), "attack");
  assert.equal(normalizeAction("nonsense"), "wait");
  assert.equal(normalizeAction(null), "wait");
});

test("validateStrategy reports parse errors and previews", () => {
  const w = createWorld();
  assert.equal(validateStrategy("(if", w).ok, false);
  const good = validateStrategy("(quote attack)", w);
  assert.equal(good.ok, true);
  assert.equal(good.preview, "attack");
});
