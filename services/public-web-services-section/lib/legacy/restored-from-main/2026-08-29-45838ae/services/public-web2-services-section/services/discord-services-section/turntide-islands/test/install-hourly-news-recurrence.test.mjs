import assert from "node:assert/strict";
import test from "node:test";
import { BEGIN_MARKER, RETIRED_BEGIN_MARKER, recurrenceAdmission, recurrenceBlock, spliceRecurrence, stripRecurrence } from "../lib/management/install-hourly-news-recurrence.mjs";

test("retires the old Union-only recurrence while preserving unrelated jobs", () => {
  const old = `0 * * * * daily\n\n${RETIRED_BEGIN_MARKER}\n*/5 * * * * old\n# END TTI STATE OF HARMONIOUS UNION HOURLY REPORTING\n`;
  const next = spliceRecurrence(old, { ttiRoot: "/tmp/tti", nodePath: "/usr/bin/node" });
  assert.match(next, /0 \* \* \* \* daily/u); assert.match(next, new RegExp(BEGIN_MARKER, "u")); assert.doesNotMatch(next, new RegExp(RETIRED_BEGIN_MARKER, "u"));
  assert.equal(next.split(recurrenceBlock({ ttiRoot: "/tmp/tti", nodePath: "/usr/bin/node" })).length - 1, 1);
});

test("requires one successful live receipt for each edition", () => {
  const row = (edition) => ({ type: "TTIDiscordPublicationReceipt", status: "succeeded", atomicMultipart: true, edition });
  assert.match(recurrenceAdmission([row("union")]).type, /Refusal/u); assert.match(recurrenceAdmission([row("union"), row("colonial")]).type, /Admission/u);
});

test("suspends only the thin contracted news recurrence", () => {
  const source = `0 * * * * daily\n\n${BEGIN_MARKER}\n*/5 * * * * thin\n# END TTI CONTRACTED HOURLY NEWS\n`;
  const stripped = stripRecurrence(source);
  assert.equal(stripped, "0 * * * * daily\n"); assert.doesNotMatch(stripped, new RegExp(BEGIN_MARKER, "u"));
});
