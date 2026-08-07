import test from "node:test";
import assert from "node:assert/strict";

import {
  grantWasiCapability,
  preopenWasiCapability,
  attenuateWasiCapability,
  invokeWasiCapability,
  canInvokeWasiCapability,
  cutWasiInvocation,
  isWasiAttenuation,
  wasiPreopenCarrier,
  wasiInvocationCarrier,
  wasiCutCarrier,
} from "../dist/index.mjs";

test("WASI preopens are capability views, not a second authority ontology", () => {
  const cap = grantWasiCapability("agent:sol", "fs:/work|*", { id: "urn:cap:wasi:root" });
  const preopen = preopenWasiCapability(cap, {
    handle: 4,
    path: "fs:/work",
    rights: ["path-open", "fd-read", "fd-read"],
  });

  assert.equal(preopen.kind, "playing.wasi.preopen");
  assert.equal(preopen.handle, 4);
  assert.equal(preopen.capability.id, cap.id);
  assert.equal(preopen.capability.grants, cap.grants);
  assert.deepEqual(preopen.rights, ["fd-read", "path-open"]);
  assert.equal(wasiPreopenCarrier.validate(preopen), true);
});

test("canInvoke soundness: a WASI capability is exercisable iff its granted move is held", () => {
  const held = grantWasiCapability("agent:sol", "fs:/work/read", { id: "urn:cap:wasi:read" });
  const unheld = grantWasiCapability("agent:sol", "fs:/work/write", { id: "urn:cap:wasi:write" });
  const affordances = ["fs:/work/read", "clock:monotonic"];

  assert.equal(canInvokeWasiCapability(affordances, held), true);
  assert.equal(canInvokeWasiCapability(affordances, unheld), false);

  const ok = cutWasiInvocation(affordances, preopenWasiCapability(held), "fd-read");
  const denied = cutWasiInvocation(affordances, preopenWasiCapability(unheld), "fd-write");
  assert.equal(ok.converged, true);
  assert.deepEqual(ok.daimonLoci, [[]]);
  assert.equal(denied.converged, false);
  assert.equal(wasiInvocationCarrier.validate(invokeWasiCapability(held, "fd-read")), true);
  assert.equal(wasiCutCarrier.validate(ok), true);
});

test("attenuation narrows authority monotonically and records provenance", () => {
  const root = preopenWasiCapability(
    grantWasiCapability("agent:sol", "fs:/work|*", { id: "urn:cap:wasi:root" }),
    { handle: 5, rights: ["fd-read", "fd-write", "path-open"] },
  );
  const narrowed = attenuateWasiCapability(root, "fs:/work/project", {
    id: "urn:cap:wasi:project",
    rights: ["fd-read"],
  });

  assert.equal(narrowed.capability.parent, "urn:cap:wasi:root");
  assert.deepEqual(narrowed.rights, ["fd-read"]);
  assert.equal(isWasiAttenuation(root, narrowed), true);
  assert.throws(
    () => attenuateWasiCapability(root, "fs:/vault", { rights: ["fd-read"] }),
    /widens/,
  );
  assert.throws(
    () => attenuateWasiCapability(narrowed, "fs:/work/project/private", { rights: ["fd-read", "fd-write"] }),
    /rights widen/,
  );
});
