import { test } from "node:test";
import assert from "node:assert/strict";
import { DelveScene } from "./scene.mts";

/** Safely play an actor until they hold at least `target` essence (or we give up). */
function grind(s: DelveScene, actor: string, target: number, maxSteps = 4000): void {
  if (s.stateFrame(actor).onSurface) s.command(actor, "delve");
  for (let i = 0; i < maxSteps && s.stateFrame(actor).essence < target; i++) {
    const f = s.stateFrame(actor);
    if (f.onSurface) { s.command(actor, "delve"); continue; }
    const floor = f.floor;
    if (floor === null) { s.command(actor, "delve"); continue; }
    if (floor.monsterHp <= 0) {
      // cleared — only descend while it's still safe, else retreat to stop dying
      if (f.depth < 3) s.command(actor, "descend"); else s.command(actor, "retreat");
      continue;
    }
    s.command(actor, "attack");
  }
}

test("a new delver joins on the surface and can delve in", () => {
  const s = new DelveScene();
  s.join("p1");
  const f0 = s.stateFrame("p1");
  assert.equal(f0.onSurface, true);
  s.command("p1", "delve");
  const f1 = s.stateFrame("p1");
  assert.equal(f1.onSurface, false);
  assert.equal(f1.depth, 1);
  assert.ok(f1.floor !== null);
});

test("attacking clears a floor and yields essence; descend goes deeper", () => {
  const s = new DelveScene();
  s.join("p1");
  s.command("p1", "delve");
  for (let i = 0; i < 50 && (s.stateFrame("p1").floor?.monsterHp ?? 0) > 0; i++) s.command("p1", "attack");
  const cleared = s.stateFrame("p1");
  assert.equal(cleared.floor!.monsterHp, 0);
  assert.ok(cleared.essence > 0, "essence rewarded");
  s.command("p1", "descend");
  assert.equal(s.stateFrame("p1").depth, 2);
});

test("buying a torchbearer makes essence accrue on tick", () => {
  const s = new DelveScene();
  s.join("p1");
  grind(s, "p1", 15);
  assert.ok(s.stateFrame("p1").essence >= 10, "earned enough to hire");
  const r = s.command("p1", "buy torchbearer");
  assert.ok(r && r.includes("Torchbearer"), r ?? "");
  const e0 = s.stateFrame("p1").essence;
  s.runTick([]);
  const e1 = s.stateFrame("p1").essence;
  assert.ok(e1 > e0, "idle production accrued");
});

test("automation with no rungs learned is inert through the tick", () => {
  const s = new DelveScene();
  s.join("p1");
  s.command("p1", "auto on");
  const d0 = s.stateFrame("p1");
  s.runTick([]);
  const d1 = s.stateFrame("p1");
  assert.equal(d1.depth, d0.depth);
});

test("rekindle is gated by minimum depth", () => {
  const s = new DelveScene();
  s.join("p1");
  const r = s.command("p1", "ascend");
  assert.ok(r && r.includes("not ready"), r ?? "");
});

test("snapshot/restore round-trips a player's progress", () => {
  const s = new DelveScene();
  s.join("p1");
  grind(s, "p1", 20);
  const snap = s.snapshot();
  const essence = s.stateFrame("p1").essence;
  const s2 = new DelveScene(undefined, snap);
  assert.equal(Math.round(s2.stateFrame("p1").essence), Math.round(essence));
});

test("federation: a guest's progress migrates into an account id", () => {
  const s = new DelveScene();
  s.join("guest-abc");
  grind(s, "guest-abc", 20);
  const guestEssence = s.stateFrame("guest-abc").essence;
  const packet = s.exportActor("guest-abc");
  s.importActor(packet, "player-morgan");
  assert.equal(Math.round(s.stateFrame("player-morgan").essence), Math.round(guestEssence));
});

test("combat investment raises attack/health and is exposed in the frame", () => {
  const s = new DelveScene();
  s.join("p1");
  grind(s, "p1", 200);
  const before = s.stateFrame("p1");
  const r = s.command("p1", "buy whetstone");
  assert.ok(r && r.includes("Whetstone"), r ?? "");
  const after = s.stateFrame("p1");
  assert.ok(after.atk > before.atk, "attack rose");
  assert.ok(after.combat.find((c) => c.id === "whetstone")!.owned >= 1);
  // the combat panel is in the frame with escalating cost
  assert.ok(after.combat.find((c) => c.id === "tallow-ward")!.cost > 0);
});

test("rekindle grants echoes that permanently raise combat power (the cross-run loop)", () => {
  const s = new DelveScene();
  s.join("p1");
  // dive deep enough to rekindle by buying combat power and descending
  for (let step = 0; step < 6000 && s.stateFrame("p1").maxDepth < 8; step++) {
    const f = s.stateFrame("p1");
    if (f.essence > 300 && f.combat[0] && f.essence > f.combat[0].cost) { s.command("p1", "buy " + f.combat[0].id); continue; }
    if (f.onSurface) { s.command("p1", "delve"); continue; }
    if (f.floor && f.floor.monsterHp > 0) { if (f.hp > f.maxHp * 0.3) s.command("p1", "attack"); else s.command("p1", "retreat"); continue; }
    if (f.floor && f.floor.monsterHp <= 0) { s.command("p1", "descend"); continue; }
    s.runTick([]);
  }
  assert.ok(s.stateFrame("p1").canRekindle, "reached the rekindle gate");
  const atkBefore = s.stateFrame("p1").atk;
  const r = s.command("p1", "ascend");
  assert.ok(r && r.includes("echo"), r ?? "");
  const after = s.stateFrame("p1");
  assert.ok(after.echoes > 0, "echoes granted");
  assert.equal(after.depth, 0, "run reset to surface");
  // base atk after reset (combat wiped) is higher than the pre-rekindle BASE because echoes add atk
  assert.ok(after.atk >= 4 + after.echoes, "echoes raise base attack");
});

test("learning an automation engages auto and folds the manual action away", () => {
  const s = new DelveScene();
  s.join("p1");
  grind(s, "p1", 2000);
  const r = s.command("p1", "automate auto-attack");
  assert.ok(r && r.includes("Killing Instinct"), r ?? "");
  const f = s.stateFrame("p1");
  assert.equal(f.auto, true);
  assert.ok(f.automations.find((a) => a.id === "auto-attack")?.owned, "owned");
});
