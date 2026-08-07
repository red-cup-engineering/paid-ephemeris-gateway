import { test } from "node:test";
import assert from "node:assert/strict";

import { canonical, valueOf } from "@emsenn/relating";
import {
  crdtCell,
  crdtState,
  mergeCrdtStates,
  mvRegister,
  mergeMultiValueRegisters,
  multiValueRegisterStanding,
  joinCrdtStanding,
} from "../dist/index.mjs";

const sameState = (left, right) => assert.equal(canonical(left), canonical(right));

test("state-CRDT merge is idempotent, commutative, and associative on three replicas", () => {
  const a = crdtState([crdtCell("topic", "potential", "alice-w")]);
  const b = crdtState([crdtCell("topic", "active", "bob-w")]);
  const c = crdtState([crdtCell("other", "potential", "carol-w")]);

  sameState(mergeCrdtStates(a, a), a);
  sameState(mergeCrdtStates(a, b), mergeCrdtStates(b, a));
  sameState(
    mergeCrdtStates(mergeCrdtStates(a, b), c),
    mergeCrdtStates(a, mergeCrdtStates(b, c)),
  );

  const joined = mergeCrdtStates(a, b).cells.find((cell) => cell.key === "topic");
  assert.equal(valueOf(joined.charge).name, "stable", "opposing knowledge joins to top");
  assert.equal(joinCrdtStanding("potential", "active"), "stable");
});

test("MV-register keeps concurrent conflicting writes as top with both witnesses", () => {
  const left = mvRegister("meeting.place", "alice", "library", {
    witness: "alice-saw-library",
  });
  const right = mvRegister("meeting.place", "bob", "cafe", {
    witness: "bob-saw-cafe",
  });

  const merged = mergeMultiValueRegisters(left, right);

  assert.equal(multiValueRegisterStanding(merged), "stable");
  assert.deepEqual(merged.writes.map((write) => write.value).sort(), ["cafe", "library"]);
  assert.deepEqual(merged.writes.map((write) => write.witness).sort(), ["alice-saw-library", "bob-saw-cafe"]);
  assert.deepEqual(
    merged.charge.evidence.flat().map((witness) => witness.value).sort(),
    ["alice-saw-library", "bob-saw-cafe"],
  );
});
