import { test } from "node:test";
import assert from "node:assert/strict";
import { DelveScene } from "./scene.mts";
import { Accounts, AuthError, guestActorId, accountActorId, isGuest, hashSecret } from "./accounts.mts";

test("id helpers and classification", () => {
  assert.equal(guestActorId("AbC 123"), "guest-abc-123");
  assert.equal(accountActorId("Morgan"), "delver-morgan");
  assert.equal(isGuest("guest-x"), true);
  assert.equal(isGuest("delver-x"), false);
  assert.notEqual(hashSecret("m", "a"), hashSecret("m", "b"));
});

test("guest logins need no secret; account first-login sets it, later logins must match", () => {
  const a = new Accounts(new DelveScene());
  assert.equal(a.authenticate({ name: "guest-abc", guest: true }), "guest-abc");
  // first login creates the secret
  const id = a.authenticate({ name: "morgan", secret: "thunder" });
  assert.equal(id, "delver-morgan");
  // correct secret re-admits
  assert.equal(a.authenticate({ name: "morgan", secret: "thunder" }), "delver-morgan");
  // wrong secret rejected
  assert.throws(() => a.authenticate({ name: "morgan", secret: "wrong" }), AuthError);
  // missing secret rejected
  assert.throws(() => a.authenticate({ name: "ravenna" }), AuthError);
});

test("a guest's progress migrates into a fresh account, but never clobbers one with progress", () => {
  const scene = new DelveScene();
  const a = new Accounts(scene);
  // build guest progress
  scene.join("guest-abc");
  scene.command("guest-abc", "delve");
  for (let i = 0; i < 40 && (scene.stateFrame("guest-abc").floor?.monsterHp ?? 0) > 0; i++) scene.command("guest-abc", "attack");
  const guestEssence = scene.stateFrame("guest-abc").essence;
  assert.ok(guestEssence > 0);

  const account = a.authenticate({ name: "morgan", secret: "thunder" });
  assert.equal(a.migrateGuest("guest-abc", account), true);
  assert.equal(Math.round(scene.stateFrame(account).essence), Math.round(guestEssence));

  // second migration refused — the account now has progress
  scene.join("guest-xyz");
  assert.equal(a.migrateGuest("guest-xyz", account), false);
});
