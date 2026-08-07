/**
 * writing/calm - CALM reads federation coordination through monotonicity.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVITYSTREAMS_CONTEXT,
  federateActivities,
  readCalmActivities,
  readCalmCovers,
  readCalmFederation,
} from "../dist/index.mjs";

const create = (actor, content) => ({
  "@context": ACTIVITYSTREAMS_CONTEXT,
  type: "Create",
  actor,
  object: { content },
});

test("an agreement-only federation reads coordination-free by CALM", () => {
  const reading = readCalmActivities([
    [create("mara", "treaty|signed")],
    [create("mara", "treaty|signed")],
  ]);

  assert.equal(reading.kind, "organizing.writing.calm.reading");
  assert.equal(reading.theorem, "CALM");
  assert.equal(reading.operation, "federate");
  assert.equal(reading.monotone, true);
  assert.equal(reading.coordination, "coordination-free");
  assert.deepEqual(reading.witness, {
    shared: 1,
    contested: 0,
    federationOnly: 0,
  });

  const coverReading = readCalmCovers([
    { socializing: "mara|treaty-signed" },
    { socializing: "mara|treaty-signed" },
  ]);
  assert.equal(coverReading.monotone, true);
  assert.equal(coverReading.coordination, "coordination-free");
});

test("a top-introducing federation witness reads consensus-required by CALM", () => {
  const agreementOnly = federateActivities([
    [create("mara", "treaty|signed")],
    [create("mara", "treaty|signed")],
  ]);
  const federation = {
    ...agreementOnly,
    shared: 0,
    contested: 1,
    federationOnly: 1,
    glued: false,
    coordination: "consensus-required",
  };
  const reading = readCalmFederation(federation);

  assert.equal(reading.monotone, false);
  assert.equal(reading.coordination, "consensus-required");
  assert.deepEqual(reading.witness, {
    shared: 0,
    contested: 1,
    federationOnly: 1,
  });
});
