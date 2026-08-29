// server-port — regression coverage for the Cloud Run PORT convention (deploy task item 1: "check
// server.mts reads it; one-line fix with regression test if not"). Before this fix, server.mts's
// entrypoint read only RUINFOLD_PORT, so a Cloud Run container — which injects PORT and health-checks
// exactly that port — would silently listen on the wrong port (8787) while Cloud Run polled the PORT
// it set, and the deploy would never become healthy. resolvePort() takes `env` as a parameter so this
// is provable without ever mutating the real process.env.

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolvePort } from "../server.mts";

test("PORT (Cloud Run's injected env var) is honored when set", () => {
  assert.equal(resolvePort({ PORT: "8080" } as NodeJS.ProcessEnv), 8080);
});

test("RUINFOLD_PORT still works as a local-dev override when PORT is unset", () => {
  assert.equal(resolvePort({ RUINFOLD_PORT: "9999" } as NodeJS.ProcessEnv), 9999);
});

test("PORT takes precedence over RUINFOLD_PORT when both are set", () => {
  assert.equal(resolvePort({ PORT: "8080", RUINFOLD_PORT: "9999" } as NodeJS.ProcessEnv), 8080);
});

test("defaults to 8787 when neither is set", () => {
  assert.equal(resolvePort({} as NodeJS.ProcessEnv), 8787);
});
