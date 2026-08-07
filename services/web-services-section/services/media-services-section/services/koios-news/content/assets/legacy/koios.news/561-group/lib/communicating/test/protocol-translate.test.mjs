import { test } from "node:test";
import assert from "node:assert/strict";

import { canonical } from "@emsenn/relating";
import { mediaTypeCorner } from "@emsenn/relating/writing/http/negotiation";
import {
  ACTIVITYPUB_C2S_CONTENT_TYPE,
  CLOUDEVENTS_JSON_CONTENT_TYPE,
  DIDCOMM_PLAINTEXT_CONTENT_TYPE,
  DIDCOMM_ENCRYPTED_TYP,
  activityPubC2sProjector,
  cloudEventsProjector,
  didcommProjector,
  negateProtocolUtterance,
  protocolTranslate,
  readProtocolUtterances,
  socializingAcrossFaceLift,
  writeProtocolUtterances,
} from "../dist/index.mjs";

const actor = "https://dev.bare-cedar-fog.emsenn.net/actors/codex";
const followers = `${actor}/followers`;
const time = "2026-06-27T03:45:00.000Z";

const json = (value) => canonical(value);
const parse = (content) => JSON.parse(content);
const canonicalDocument = (content) => canonical(parse(content));

function activity(type, content, fields = {}) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    type,
    actor,
    object: { type: "Note", content },
    published: time,
    ...fields,
  };
}

test("across-face protocols are assertion projectors over one carried utterance type", () => {
  assert.equal(activityPubC2sProjector.corner, "assertion");
  assert.equal(cloudEventsProjector.corner, "assertion");
  assert.equal(didcommProjector.corner, "assertion");

  assert.equal(mediaTypeCorner(ACTIVITYPUB_C2S_CONTENT_TYPE), "assertion");
  assert.equal(mediaTypeCorner(CLOUDEVENTS_JSON_CONTENT_TYPE), "assertion");
  assert.equal(mediaTypeCorner(DIDCOMM_PLAINTEXT_CONTENT_TYPE), "assertion");
  assert.equal(mediaTypeCorner(DIDCOMM_ENCRYPTED_TYP), "data");
});

test("ActivityPub Undo transcodes to a CloudEvents retraction and back", () => {
  const source = json(activity("Undo", "deploy", { cc: [followers] }));
  const cloud = protocolTranslate("activitypub-c2s", "cloudevents", source);
  const event = parse(cloud);

  assert.equal(event.type, "declaration");
  assert.equal(event.data, "not deploy");
  assert.equal(event.emsenntruthcharge, "active");

  const back = parse(protocolTranslate("cloudevents", "activitypub-c2s", cloud));
  assert.equal(back.type, "Undo");
  assert.equal(back.object.content, "deploy");
  assert.deepEqual(back.cc, [followers]);

  assert.equal(readProtocolUtterances("activitypub-c2s", json(back))[0].truthCharge, "active");
});

test("protocolTranslate commutes with negate across ActivityPub C2S and CloudEvents", () => {
  const source = json(activity("Create", "deploy", { to: [followers] }));

  const translateAfterNegate = writeProtocolUtterances(
    "cloudevents",
    readProtocolUtterances("activitypub-c2s", source).map(negateProtocolUtterance),
  );
  const negateAfterTranslate = writeProtocolUtterances(
    "cloudevents",
    readProtocolUtterances("cloudevents", protocolTranslate("activitypub-c2s", "cloudevents", source)).map(negateProtocolUtterance),
  );

  assert.equal(canonicalDocument(translateAfterNegate), canonicalDocument(negateAfterTranslate));
  const event = parse(translateAfterNegate);
  assert.equal(event.type, "declaration");
  assert.equal(event.data, "not deploy");
  assert.equal(event.emsenntruthcharge, "active");
});

test("top and bottom truth charges stay fixed across ActivityPub C2S and CloudEvents", () => {
  const cases = [
    ["stable", activity("Create", "two-witnesses", { to: ["https://www.w3.org/ns/activitystreams#Public"], cc: [followers] })],
    ["absurd", activity("Create", "unknown", { to: [] })],
  ];

  for (const [charge, sourceActivity] of cases) {
    const source = json(sourceActivity);
    const cloud = protocolTranslate("activitypub-c2s", "cloudevents", source);
    assert.equal(parse(cloud).emsenntruthcharge, charge);

    const back = protocolTranslate("cloudevents", "activitypub-c2s", cloud);
    assert.equal(readProtocolUtterances("activitypub-c2s", back)[0].truthCharge, charge);
  }
});

test("DIDComm plaintext is the same utterance factor, not a per-pair adapter", () => {
  const source = json({
    "@context": ["https://didcomm.org/messaging/2.0", "https://www.w3.org/ns/did/v1"],
    id: "urn:uuid:didcomm-factor",
    type: "directive",
    from: "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex",
    to: ["did:web:ops.561.group:agents:vesper"],
    body: "open-channel",
    created_time: 1_782_521_100,
    truth_charge: "stable",
  });

  const event = parse(protocolTranslate("didcomm", "cloudevents", source));
  assert.equal(event.source, "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex");
  assert.equal(event.type, "directive");
  assert.equal(event.data, "open-channel");
  assert.equal(event.emsenntruthcharge, "stable");
});

test("translation refuses to fabricate illocutionary force missing from a source wire", () => {
  const source = json(activity("LocallyInventedActivity", "claim", { to: [followers] }));

  assert.throws(
    () => protocolTranslate("activitypub-c2s", "cloudevents", source),
    /cannot fabricate illocutionary force/,
  );
});

test("scale-2 socializing lift is named but not folded into communicating", () => {
  assert.deepEqual(socializingAcrossFaceLift, {
    package: "@emsenn/socializing",
    scale: "scale-2",
    wires: ["Matrix state-resolution", "ActivityPub S2S"],
    law: "same-projector-transcode-factor",
    status: "Roadmap",
  });
});
