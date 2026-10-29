import { test } from "node:test";
import assert from "node:assert/strict";
import { createSandboxActuator } from "../src/worker.mjs";

const endpoint = "https://software-sandbox-execution.actions.561.group";
const invoke = (body) => new Request(`${endpoint}/invoke`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
const request = {operation: "execute-software-in-sandbox", repo: "acme/widgets", patch: "diff --git a/a b/a"};

test("publishes an ActivityPub actor and standing offer", async () => {
  const act = createSandboxActuator();
  const actor = await act(new Request(`${endpoint}/actor`));
  assert.equal(actor.status, 200); assert.equal((await actor.json()).id, "urn:ame:software-sandbox-execution-service");
  const offer = await act(new Request(`${endpoint}/offers/current`));
  assert.equal((await offer.json()).object.operation, "execute-software-in-sandbox");
});

test("refuses public invocation without deployment-bound remote runner authority", async () => {
  const response = await createSandboxActuator()(invoke(request), {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).reason, /remote-runner-authority-unconfigured/u);
});

test("dispatches only a bounded patch through the configured remote runner", async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({url, init});
    if (url.endsWith("/gists")) return new Response(JSON.stringify({id: "g1", files: {"patch.diff": {raw_url: "https://gist.github.com/raw/patch.diff"}}}), {status: 201});
    if (url.includes("/dispatches")) return new Response(null, {status: 204});
    throw new Error(`unexpected ${url}`);
  };
  const response = await createSandboxActuator({fetchImpl: fakeFetch, uuid: () => "c1"})(invoke(request), {GITHUB_RUNNER_REPO: "union/runner", GITHUB_ACTIONS_TOKEN: "secret"});
  assert.equal(response.status, 202);
  assert.equal((await response.json()).correlationId, "c1");
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /repos\/union\/runner\/actions\/workflows\/solve-and-test\.yml\/dispatches/u);
  assert.equal(JSON.parse(calls[1].init.body).inputs.target_repo, "acme/widgets");
});
