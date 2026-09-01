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

test("the page is a real tiling workspace: four panes, splitters, and the island palette", () => {
  const html = renderFarstonePage();
  assert.match(html, /class="tufte-grid tufte-workspace"/);
  assert.match(html, /data-tufte-workspace="/);
  const splitters = html.match(/role="separator"/g) ?? [];
  assert.equal(splitters.length, 3);
  assert.match(html, /id="room"/);
  assert.match(html, /Surroundings/);
  assert.match(html, /--tufte-accent: #33586b/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.doesNotMatch(html, /backdrop-filter|radial-gradient/);
});

test("the surroundings tile shows the place, its people, and clickable exits while playing", () => {
  const options = farstoneRoomOptions(
    { tick: 7, place: { name: "Harbor Quay", description: "Granite and tar.", exits: ["north", "quay"] }, occupants: [{ name: "Bett" }] },
    { connection: "playing", name: "Kip", transcript: [] },
  );
  const room = options.trailingTiles.find(({ id }) => id === "room");
  assert.match(room.html, /Harbor Quay/);
  assert.match(room.html, /Granite and tar\./);
  assert.match(room.html, /Also here: Bett\./);
  assert.match(room.html, /data-farstone-command="go north"/);
  assert.equal(options.workspace.split, "row");
});
