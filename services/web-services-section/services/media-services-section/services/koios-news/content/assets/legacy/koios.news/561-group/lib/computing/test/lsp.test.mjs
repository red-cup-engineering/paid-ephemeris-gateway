import { test } from "node:test";
import assert from "node:assert/strict";

import { action, carrierFrom } from "@emsenn/relating";
import {
  LSP_JSONRPC_VERSION,
  LSP_METHODS,
  computingLspProjection,
  projectLsp,
} from "../dist/lsp.mjs";

const sourceCarrier = carrierFrom({
  $id: "test/lsp/source",
  title: "SourceCarrier",
  description: "A source carrier used as the codomain in the reflection graph.",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { const: "test.source" },
    name: { type: "string", minLength: 1 },
  },
});

const targetCarrier = carrierFrom({
  $id: "test/lsp/target",
  title: "TargetCarrier",
  description: "A target carrier whose declaration, type, uses, and validation failures are reflected.",
  type: "object",
  required: ["kind", "source"],
  additionalProperties: false,
  properties: {
    kind: { const: "test.target" },
    source: { $ref: "test/lsp/source" },
  },
});

const inspectAction = action({
  verb: "test-lsp-inspect",
  summary: "Inspect a target carrier.",
  description: "Uses the target carrier as its domain and the source carrier as its codomain.",
  domain: targetCarrier,
  codomain: sourceCarrier,
  run: (input) => input,
});

function positionAt(text, offset) {
  let line = 0;
  let character = 0;
  for (let i = 0; i < offset; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }
  return { line, character };
}

function positionInside(doc, text) {
  const needle = JSON.stringify(text);
  const offset = doc.text.indexOf(needle);
  assert.notEqual(offset, -1, `${text} should be present in ${doc.uri}`);
  return positionAt(doc.text, offset + 1);
}

test("computing LSP reflects carriers/actions: definition, hover, references, diagnostics", () => {
  const lsp = projectLsp({
    carriers: [sourceCarrier, targetCarrier],
    actions: [inspectAction],
  });
  const targetDoc = lsp.documents.find((doc) => doc.kind === "carrier" && doc.id === targetCarrier.id);
  assert.ok(targetDoc);
  const targetParams = {
    textDocument: { uri: targetDoc.uri },
    position: positionInside(targetDoc, targetCarrier.id),
  };

  const definition = lsp.definition(targetParams);
  assert.ok(definition);
  assert.equal(definition.uri, targetDoc.uri);
  assert.deepEqual(definition.range.start, positionAt(targetDoc.text, targetDoc.text.indexOf(JSON.stringify(targetCarrier.id))));

  const hover = lsp.hover(targetParams);
  assert.ok(hover);
  assert.match(hover.contents.value, /test\/lsp\/target/);
  assert.match(hover.contents.value, /FromSchema:/);
  assert.match(hover.contents.value, /kind: "test.target"/);
  assert.match(hover.contents.value, /validation failures are reflected/);

  const references = lsp.references({ ...targetParams, context: { includeDeclaration: false } });
  assert.equal(references.length, 1);
  assert.match(references[0].uri, /test-lsp-inspect/);

  const invalid = { kind: "test.target", source: { kind: "test.source" }, extra: true };
  const expectedErrors = targetCarrier.errors(invalid);
  assert.deepEqual(
    lsp.diagnostics({ carrierId: targetCarrier.id, value: invalid }).map((diagnostic) => diagnostic.message),
    expectedErrors,
  );

  const response = lsp.handle({
    jsonrpc: LSP_JSONRPC_VERSION,
    id: "hover-1",
    method: LSP_METHODS.hover,
    params: targetParams,
  });
  assert.equal(response.jsonrpc, LSP_JSONRPC_VERSION);
  assert.equal(response.id, "hover-1");
  assert.match(response.result.contents.value, /TargetCarrier/);
});

test("the default computing LSP projection reads the live action graph once per verb", () => {
  const verbs = computingLspProjection.actions.map((entry) => entry.verb);
  assert.deepEqual(verbs, [...new Set(verbs)]);
  assert.ok(verbs.includes("compute"));
});
