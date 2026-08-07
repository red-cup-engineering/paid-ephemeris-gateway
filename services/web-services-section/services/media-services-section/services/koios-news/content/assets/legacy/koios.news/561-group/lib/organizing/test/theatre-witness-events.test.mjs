import assert from "node:assert/strict";
import test from "node:test";

import {
  organizingTheatreAgentEventsFromWitnessRows,
  organizingTheatreInstanceProfile,
} from "../dist/index.mjs";

test("organizing theatre reads canonical ICK witness rows as agent events", () => {
  const profile = organizingTheatreInstanceProfile({
    namespace: "dev.bare-cedar-fog.emsenn.net",
    baseUrl: "https://dev.bare-cedar-fog.emsenn.net",
  });
  const events = organizingTheatreAgentEventsFromWitnessRows([
    {
      e: { program: "information-coherence-kernel" },
      a: { verb: "admit-hook-event" },
      v: {
        kind: "information-coherence-kernel.hook.admission",
        session: "session-a",
        harness: "codex",
        hookEventName: "PreToolUse",
        payload: {
          session_id: "session-a",
          harness: "codex",
          hook_event_name: "PreToolUse",
          tool_name: "apply_patch",
        },
      },
      t: "2026-06-26T17:00:00.000Z",
    },
    {
      e: { program: "dev-runtime" },
      a: { verb: "record-dev-event" },
      v: {
        kind: "dev.bare-cedar-fog.emsenn.net.agent-event",
        id: "dev-event-a",
        at: "2026-06-26T17:01:00.000Z",
        source: "dev.bare-cedar-fog.emsenn.net.inject-cockpit",
        cockpit: "dev.bare-cedar-fog.emsenn.net",
        session: "session-b",
        harness: "claude",
        hookEventName: "PostToolUse",
        payload: { session_id: "session-b", harness: "claude" },
      },
      t: "2026-06-26T17:01:00.000Z",
    },
  ], profile.service, {
    ...profile.eventActivity,
    kind: "dev.bare-cedar-fog.emsenn.net.agent-event",
    cockpit: "dev.bare-cedar-fog.emsenn.net",
    recordedEventKind: "dev.bare-cedar-fog.emsenn.net.agent-event",
    root: "sites/dev.bare-cedar-fog.emsenn.net",
    namespace: "root",
  });

  assert.equal(events.length, 2);
  assert.deepEqual(events.map((event) => event.session), ["session-a", "session-b"]);
  assert.deepEqual(events.map((event) => event.hookEventName), ["PreToolUse", "PostToolUse"]);
  assert.equal(events[0].source, "information-coherence-kernel.admit-hook-event");
  assert.equal(events[0].ickWitness.root, "sites/dev.bare-cedar-fog.emsenn.net");
  assert.equal(events[0].activity.type, "Create");
  assert.match(events[0].activity.id, /\/activities\/ick-hook-event%3A/u);
  assert.equal(events[1].activity.object.source, "dev.bare-cedar-fog.emsenn.net.inject-cockpit");
});
