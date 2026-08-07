import { test } from "node:test";
import assert from "node:assert/strict";

import { canonical, mark, utterance } from "@emsenn/relating";
import {
  DIDCOMM_PRIVATE_VISIBILITY,
  didcommVisibility,
  openDIDCommMessage,
  openDIDCommUtterance,
  sealDIDCommUtterance,
} from "../dist/index.mjs";

test("DIDComm seal/open round-trips one communicating utterance losslessly", () => {
  const sender = "did:web:dev.bare-cedar-fog.emsenn.net:agents:sol";
  const recipient = "did:web:ops.561.group:agents:vesper";
  const force = "directive";
  const body = "open the across-channel";
  const channelKey = "communicating didcomm law fixture";
  const source = utterance(mark(sender), mark(body));

  const sealed = sealDIDCommUtterance(source, recipient, force, channelKey, {
    id: "urn:uuid:didcomm-law",
    createdTime: 1_782_432_000,
    iv: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
  });

  assert.equal(didcommVisibility(sealed), DIDCOMM_PRIVATE_VISIBILITY);
  assert.equal(DIDCOMM_PRIVATE_VISIBILITY, "absurd", "sealed DIDComm reads at FOUR bottom on reach");

  const openedMessage = openDIDCommMessage(sealed, channelKey);
  assert.equal(openedMessage.from, sender);
  assert.deepEqual(openedMessage.to, [recipient]);
  assert.equal(openedMessage.type, force, "message type is the illocutionary force");
  assert.equal(openedMessage.body, body);

  const openedUtterance = openDIDCommUtterance(sealed, channelKey);
  assert.equal(canonical(openedUtterance), canonical(source));
});
