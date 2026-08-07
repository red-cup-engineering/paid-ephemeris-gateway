import { test } from "node:test";
import assert from "node:assert/strict";

import { canonical, mark, utterance } from "@emsenn/relating";
import {
  CLOUDEVENTS_DATA_CONTENT_TYPE,
  CLOUDEVENTS_JSON_CONTENT_TYPE,
  CLOUDEVENTS_SPECVERSION,
  cloudEventFromUtterance,
  cloudEventIllocutionaryForce,
  utteranceFromCloudEvent,
} from "../dist/index.mjs";
import {
  activityFromUtterance,
  illocutionOf,
} from "../../animating/dist/writing/activitypub/index.mjs";

test("CloudEvents structured JSON round-trips one membrane utterance losslessly", () => {
  const source = "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex";
  const force = "directive";
  const time = "2026-06-26T02:45:00Z";
  const claim = Object.freeze({
    relation: "opens",
    object: "across-envelope",
    evidence: ["CloudEvents structured JSON"],
  });
  const carrier = utterance(mark(source), mark(claim));

  const event = cloudEventFromUtterance(carrier, force, time, {
    id: "urn:uuid:cloudevents-law",
  });

  assert.equal(CLOUDEVENTS_JSON_CONTENT_TYPE, "application/cloudevents+json");
  assert.equal(event.specversion, CLOUDEVENTS_SPECVERSION);
  assert.equal(event.specversion, "1.0");
  assert.equal(event.id, "urn:uuid:cloudevents-law");
  assert.equal(event.source, source, "source is the utterance token");
  assert.equal(event.type, force, "type is the illocutionary force");
  assert.equal(event.time, time, "time is T");
  assert.equal(event.datacontenttype, CLOUDEVENTS_DATA_CONTENT_TYPE);
  assert.equal(canonical(event.data), canonical(claim), "data is the utterance claim");

  const opened = utteranceFromCloudEvent(event);
  assert.equal(canonical(opened), canonical(carrier));

  const closedAgain = cloudEventFromUtterance(opened, cloudEventIllocutionaryForce(event), event.time, {
    id: event.id,
  });
  assert.equal(canonical(closedAgain), canonical(event));
});

test("CloudEvents type is the same Searle force read by the ActivityPub codec", () => {
  const carrier = utterance(mark("did:web:dev.bare-cedar-fog.emsenn.net:agents:codex"), mark("state the shared force law"));
  const cases = [
    ["Create", "assertive"],
    ["Question", "directive"],
    ["Accept", "commissive"],
    ["Like", "expressive"],
    ["Undo", "declaration"],
  ];

  for (const [activityType, force] of cases) {
    const activity = activityFromUtterance(carrier, { type: activityType });
    const event = cloudEventFromUtterance(carrier, force, "2026-06-26T02:50:00Z", {
      id: `urn:uuid:cloudevents-${activityType.toLowerCase()}`,
    });
    assert.equal(cloudEventIllocutionaryForce(event), illocutionOf(activity), activityType);
  }
});
