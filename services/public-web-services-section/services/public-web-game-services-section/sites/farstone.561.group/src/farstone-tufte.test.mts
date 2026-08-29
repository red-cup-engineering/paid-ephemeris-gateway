import { test } from "node:test";
import assert from "node:assert/strict";
import { renderFarstonePage } from "./farstone-tufte.mts";
import { farstoneRoomOptions } from "./web/farstone-view.mjs";

test("Farstone has a conventional MUD transcript and command prompt", () => {
  const html = renderFarstonePage();
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /QwzSpace · TUFTE/);
  assert.match(html, /id="farstone-connect"/);
  assert.match(html, /id="farstone-transcript"/);
  assert.match(html, /role="log"/);
  assert.match(html, /id="farstone-command-text"/);
  assert.match(html, /placeholder="help"/);
  assert.match(html, /\/assets\/farstone-client\.mjs/);
});

test("the terminal renders escaped transcript lines and an enabled prompt while playing", () => {
  const options = farstoneRoomOptions({ tick: 7, place: { name: "Harbor Quay" } }, {
    connection: "playing",
    name: "Kip",
    transcript: [{ kind: "command", text: "> look <north>" }],
  });
  const terminal = options.leadingTiles.find(({ id }) => id === "terminal");
  assert.match(terminal.html, /role="log"/);
  assert.match(terminal.html, /&gt; look &lt;north&gt;/);
  assert.doesNotMatch(options.trailingTiles[0].html, /disabled/);
});
