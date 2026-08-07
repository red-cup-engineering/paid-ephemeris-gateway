import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { mark, utterance } from "@emsenn/relating";
import {
  assembleDirectorySubstrate,
  directorySubstrateCarrier,
  directorySubstrateResource,
  readDirectorySubstrate,
} from "../dist/index.mjs";

function fixtureRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "organizing-substrate-"));
  mkdirSync(path.join(root, "data", "logs"), { recursive: true });
  mkdirSync(path.join(root, "content", "frontier"), { recursive: true });
  writeFileSync(
    path.join(root, "data", "logs", "agent-events.jsonl"),
    `${JSON.stringify({
      kind: "dev.bare-cedar-fog.emsenn.net.agent-event",
      at: "2026-06-26T00:00:00.000Z",
      id: "dev-agent-event:test",
      source: "fixture",
      cockpit: "dev.bare-cedar-fog.emsenn.net",
      harness: "codex",
      session: "session-fixture",
      hookEventName: "PostToolUse",
      payload: { cwd: root, tool_name: "Read" },
    })}\n`,
    "utf8",
  );
  writeFileSync(path.join(root, "content", "frontier", "frontier.md"), "# Frontier\n\nA governed note.\n", "utf8");
  return root;
}

function workspaceFixture(root) {
  return {
    root,
    packages: [
      {
        name: "@fixture/core",
        term: "jsnode.package.@fixture/core",
        layer: "lib",
        exports: ["."],
        dependencies: [],
        manifest: { bins: ["fixture-core"], scripts: ["build"] },
        utterances: [
          utterance(mark({ subject: "jsnode.package.@fixture/core", object: "jsnode.layer.lib" }), mark("jsnode.in-layer")),
          utterance(mark({ subject: "jsnode.package.@fixture/core", object: "jsnode.export.@fixture/core:." }), mark("jsnode.has-export")),
        ],
      },
    ],
  };
}

test("directory substrate reads packages, RWIL/EAVT chronicles, content, constituents, and work items", () => {
  const root = fixtureRoot();
  const reading = readDirectorySubstrate(root, {
    dataRoot: "data",
    contentRoot: "content",
    readAt: "2026-06-26T00:00:00.000Z",
    workspace: workspaceFixture(root),
  });
  const carrier = directorySubstrateResource(reading);

  assert.equal(directorySubstrateCarrier.validate(carrier), true);
  assert.equal(carrier.packages.length, 1);
  assert.equal(carrier.packages[0].bins[0], "fixture-core");
  assert.equal(carrier.chronicles[0].feed, "agent-events");
  assert.ok(carrier.chronicles[0].witnesses.length > 0, "agent events unfold into EAVT witnesses");
  assert.deepEqual(carrier.chronicles[0].sessions, ["session-fixture"]);
  assert.equal(carrier.content.resources[0].path, "frontier/frontier.md");
  assert.ok(carrier.constituents.some((constituent) => constituent.name === "package:@fixture/core"));
  assert.ok(carrier.constituents.some((constituent) => constituent.name.startsWith("content:frontier/frontier.md")));
  assert.ok(carrier.workItems.length >= 3);
});

test("directory substrate composes with assemble through its admitted agents", () => {
  const root = fixtureRoot();
  const reading = readDirectorySubstrate(root, {
    dataRoot: "data",
    contentRoot: "content",
    readAt: "2026-06-26T00:00:00.000Z",
    workspace: workspaceFixture(root),
  });
  const organization = assembleDirectorySubstrate(reading, { identity: "fixture-substrate" });

  assert.equal(organization.kind, "organizing.organization");
  assert.equal(organization.identity, "fixture-substrate");
  assert.equal(organization.members, reading.organizationInput.agents.length);
  assert.ok(organization.members >= 3);
});
