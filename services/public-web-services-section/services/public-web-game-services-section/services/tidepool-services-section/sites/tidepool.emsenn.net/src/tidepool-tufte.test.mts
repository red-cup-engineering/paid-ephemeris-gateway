import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTidepoolPage } from "./tidepool-tufte.mts";
import { tidepoolRoomOptions } from "./web/tidepool-view.mjs";

test("Tidepool has a conventional MUD transcript and command prompt", () => {
  const html = renderTidepoolPage();
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /QwzSpace · TUFTE/);
  assert.match(html, /id="tidepool-connect"/);
  assert.match(html, /id="tidepool-transcript"/);
  assert.match(html, /role="log"/);
  assert.match(html, /id="tidepool-command-text"/);
  assert.match(html, /placeholder="look"/);
  assert.match(html, /\/assets\/tidepool-client\.mjs/);
});

test("the terminal renders escaped transcript lines and an enabled prompt while playing", () => {
  const options = tidepoolRoomOptions({ tick: 7, place: { name: "Tidal Flat" } }, {
    connection: "playing",
    name: "Kip",
    transcript: [{ kind: "command", text: "> look <north>" }],
  });
  const terminal = options.leadingTiles.find(({ id }) => id === "terminal");
  assert.match(terminal.html, /role="log"/);
  assert.match(terminal.html, /&gt; look &lt;north&gt;/);
  assert.doesNotMatch(options.trailingTiles[0].html, /disabled/);
});

test("the page is a real tiling workspace: four panes, splitters, and the shore palette", () => {
  const html = renderTidepoolPage();
  assert.match(html, /class="tufte-grid tufte-workspace"/);
  assert.match(html, /data-tufte-workspace="/);
  const splitters = html.match(/role="separator"/g) ?? [];
  assert.equal(splitters.length, 3);
  assert.match(html, /id="room"/);
  assert.match(html, /Surroundings/);
  assert.match(html, /--tufte-accent: #0d6b5e/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.doesNotMatch(html, /backdrop-filter|radial-gradient/);
});

test("the surroundings tile shows the place, its people, the clock, clickable exits, and affordances while playing", () => {
  const options = tidepoolRoomOptions(
    {
      tick: 7,
      place: { id: "tide-pool", name: "Tidal Flat", description: "Wet stone and salt air.", exits: ["north", "market"] },
      occupants: [{ name: "Bett" }],
      subjects: [{ id: "tide-pool", affordances: ["look", "harvest"] }],
      clock: { phase: "afternoon", season: "spring", tide: "rising", weather: "clear", dryStreak: 0 },
    },
    { connection: "playing", name: "Kip", transcript: [] },
  );
  const room = options.trailingTiles.find(({ id }) => id === "room");
  assert.match(room.html, /Tidal Flat/);
  assert.match(room.html, /Wet stone and salt air\./);
  assert.match(room.html, /Also here: Bett\./);
  assert.match(room.html, /data-tidepool-command="go north"/);
  assert.match(room.html, /data-tidepool-command="harvest"/);
  assert.match(room.html, /tide rising/);
  assert.equal(options.workspace.split, "row");
});
