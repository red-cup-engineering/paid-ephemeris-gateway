// server-bucket-root — regression coverage for a real bug hit live during the Cloud Run deploy:
// createApp forwarded `dataRoot` (always a filesystem path — apps/ruinfold/data/ in production, a
// scratch temp dir in every test) straight into store-factory.mts's `openStoreAuto(root, ...)`.
// That's correct for the file-store branch (root really is a directory there), but store-factory's
// OTHER branch treats `root` as a GCS object-name PREFIX — so with the bucket backend selected, the
// container's own filesystem path leaked into every object name. Observed live, before this fix:
//
//   gs://five-six-one-ruinfold-daily//app/data/runs/2026-08-19.jsonl
//
// instead of the clean gs://five-six-one-ruinfold-daily/runs/2026-08-19.jsonl the bucket-store's own
// header documents. resolveStoreRoot() is the extracted decision point: dataRoot flows through only
// when the file-store backend will actually be used; the bucket branch always gets "" (no prefix —
// the bucket is already dedicated to this one app).

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveStoreRoot } from "../server.mts";

test("resolveStoreRoot drops the filesystem dataRoot when the bucket backend is selected", () => {
  // "/app/data/" is exactly what src/server.mts's own isMain block computes for `dataRoot` in
  // production (fileURLToPath(new URL("../data/", import.meta.url)) inside a Cloud Run container).
  const env = { RUINFOLD_BUCKET: "five-six-one-ruinfold-daily" } as NodeJS.ProcessEnv;
  assert.equal(resolveStoreRoot("/app/data/", env), "");
});

test("resolveStoreRoot passes dataRoot through unchanged when the file-store backend is selected", () => {
  const env = {} as NodeJS.ProcessEnv;
  assert.equal(resolveStoreRoot("/app/data/", env), "/app/data/");
});

test("resolveStoreRoot treats an empty-string RUINFOLD_BUCKET the same as unset (file-store)", () => {
  const env = { RUINFOLD_BUCKET: "" } as NodeJS.ProcessEnv;
  assert.equal(resolveStoreRoot("/some/scratch/dir", env), "/some/scratch/dir");
});
