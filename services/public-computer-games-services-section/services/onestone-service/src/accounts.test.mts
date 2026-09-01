import { test } from "node:test";
import assert from "node:assert/strict";
import { Accounts, tokenActorId } from "./accounts.mts";

test("tokenActorId is a deterministic, sanitized slug of the client key", () => {
  assert.equal(tokenActorId("AbC 123"), "tess-abc-123");
  assert.equal(tokenActorId("AbC 123"), tokenActorId("abc   123"));
  // control/path characters never survive into the account id (ledger/filesystem safety)
  assert.equal(tokenActorId("../../etc/passwd"), "tess-etc-passwd");
  assert.equal(tokenActorId(""), "tess-anon");
  assert.equal(tokenActorId("   "), "tess-anon");
});

test("tokenActorId truncates very long keys to a bounded id", () => {
  const long = "x".repeat(500);
  const id = tokenActorId(long);
  assert.ok(id.length <= 48 + "tess-".length);
});

test("login mints a fresh bearer token per call but the same account for the same key", () => {
  const accounts = new Accounts();
  const first = accounts.login("morgan");
  const second = accounts.login("morgan");
  assert.equal(first.account, "tess-morgan");
  assert.equal(second.account, "tess-morgan");
  assert.notEqual(first.token, second.token, "repeated logins mint distinct session tokens");
  assert.equal(accounts.sessionCount, 2, "both sessions remain live until revoked");
});

test("resolve maps a live bearer token back to its account; unknown tokens resolve to undefined", () => {
  const accounts = new Accounts();
  const { token, account } = accounts.login("avery");
  assert.equal(accounts.resolve(token), account);
  assert.equal(accounts.resolve("not-a-real-token"), undefined);
});

test("revoke ends a session; the token no longer resolves", () => {
  const accounts = new Accounts();
  const { token } = accounts.login("avery");
  assert.equal(accounts.sessionCount, 1);
  accounts.revoke(token);
  assert.equal(accounts.resolve(token), undefined);
  assert.equal(accounts.sessionCount, 0);
});

test("bearer tokens are unpredictable (CSPRNG, not guessable/enumerable)", () => {
  const accounts = new Accounts();
  const tokens = new Set<string>();
  for (let i = 0; i < 50; i++) tokens.add(accounts.login("stress").token);
  assert.equal(tokens.size, 50, "no collisions across 50 mints");
  for (const t of tokens) {
    assert.match(t, /^[0-9a-f]{64}$/, "256-bit hex token");
  }
});

test("logging back in after losing a session token recovers the same account (no password to lose)", () => {
  const accounts = new Accounts();
  const first = accounts.login("river");
  accounts.revoke(first.token);
  const relogin = accounts.login("river");
  assert.equal(relogin.account, first.account);
});
