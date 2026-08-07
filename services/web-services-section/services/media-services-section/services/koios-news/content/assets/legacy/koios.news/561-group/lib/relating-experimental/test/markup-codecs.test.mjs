/**
 * markup-codecs — differential laws for the presentation/markup codec lattice.
 *
 * @emsenn/relating ships no tests, so its built `dist/` is the correctness
 * oracle: every markup codec ported onto the new base must produce output
 * byte-identical to the reference. The one admitted divergence is reference
 * identity — rehydrated `Mark` instances belong to each package's own class, so
 * markup roundtrips are compared structurally (by canonical JSON), never by
 * `deepStrictEqual` over prototypes.
 */
import test from "node:test";
import assert from "node:assert/strict";

// The reference package ships no tests; its built dist is the oracle. Resolved
// by relative path because @emsenn/relating is the differential oracle, not a
// declared runtime dependency of this greenfield package.
const OLD = await import("../../relating/dist/codecs/index.mjs");
const NEW = await import("../dist/codecs/index.mjs");

const struct = (value) => JSON.parse(JSON.stringify(value));

test("schema: unfold/fold/project byte-identical to reference", () => {
  const doc = { type: "object", properties: { name: { type: "string" }, tags: { type: "array" } }, required: ["name"] };
  const oA = OLD.unfoldSchema(doc, { t: "tx-1" });
  const nA = NEW.unfoldSchema(doc, { t: "tx-1" });
  assert.deepStrictEqual(nA, oA);
  assert.deepStrictEqual(NEW.schema.foldSchema(nA), OLD.jsonSchema.foldSchema(oA));
  assert.deepStrictEqual(NEW.projectSchemaAssertions(nA, { id: "x" }), OLD.projectSchemaAssertions(oA, { id: "x" }));
  assert.deepStrictEqual(NEW.resolveJsonPointer(doc, "/properties/name"), OLD.resolveJsonPointer(doc, "/properties/name"));
});

test("eavt: unfoldJson/foldJson roundtrip byte-identical to reference", () => {
  const doc = { a: 1, b: { c: [10, 20] } };
  assert.deepStrictEqual(NEW.unfoldJson(doc, { t: "t" }), OLD.eavt.unfoldJson(doc, { t: "t" }));
  assert.deepStrictEqual(
    NEW.foldJson(NEW.unfoldJson(doc, { t: "t" })),
    OLD.eavt.foldJson(OLD.eavt.unfoldJson(doc, { t: "t" })),
  );
});

test("markdown: dataform + document-type assertions byte-identical to reference", () => {
  const md = "---\nname: Foo\ndescription: a thing\ntags:\n  - x\n  - y\n---\n# Body\n\ntext\n";
  assert.deepStrictEqual(struct(NEW.markdownDataform(md, { witness: "w" })), struct(OLD.markdownDataform(md, { witness: "w" })));
  assert.deepStrictEqual(NEW.allDocumentTypeAssertions({ t: "z" }), OLD.allDocumentTypeAssertions({ t: "z" }));
});

test("html: project / markup / lint byte-identical to reference", () => {
  const section = {
    affirmed: [{ predicate: "is", object: "ok", citation: ["src1"] }],
    contradicted: [{ predicate: "maybe", affirmedBy: ["a"], deniedBy: ["b"] }],
  };
  const oHtml = OLD.html.project(OLD.html.fromSection(section, { subject: "S", mode: "audit" }));
  const nHtml = NEW.html.project(NEW.html.fromSection(section, { subject: "S", mode: "audit" }));
  assert.equal(nHtml, oHtml);
  assert.deepStrictEqual(struct(NEW.html.markup(nHtml)), struct(OLD.html.markup(oHtml)));
  assert.deepStrictEqual(NEW.html.lint(nHtml), OLD.html.lint(oHtml));
  assert.equal(NEW.escapeAttr('a"b<c'), OLD.escapeAttr('a"b<c'));
});

test("xml: serialize + document byte-identical to reference", () => {
  const node = (M) => M.xml.element("g", { id: "1" }, [M.xml.element("rect", { x: 1 }), "txt&<"]);
  assert.equal(NEW.xml.serialize(node(NEW)), OLD.xml.serialize(node(OLD)));
  assert.equal(NEW.xml.document(node(NEW), { declaration: true }), OLD.xml.document(node(OLD), { declaration: true }));
});

test("path: term addressing + path points byte-identical to reference", () => {
  const root = "/var/log";
  assert.equal(NEW.address(root, "@emsenn/x", "jsonl"), OLD.address(root, "@emsenn/x", "jsonl"));
  assert.equal(NEW.logPath(root, ["a", "b/c", { k: 1 }]), OLD.logPath(root, ["a", "b/c", { k: 1 }]));
  assert.equal(NEW.termKey({ z: 1, a: [2, 3] }), OLD.termKey({ z: 1, a: [2, 3] }));
  assert.equal(NEW.sanitizeSegment("a/b ünî..x"), OLD.sanitizeSegment("a/b ünî..x"));
  assert.equal(NEW.desanitizeSegment(NEW.sanitizeSegment("a/b ünî..x")), OLD.desanitizeSegment(OLD.sanitizeSegment("a/b ünî..x")));
  assert.equal(NEW.composeTerm("ns", ["p", "q"]), OLD.composeTerm("ns", ["p", "q"]));
  assert.deepStrictEqual(NEW.decomposeTerm(NEW.composeTerm("ns", ["p", "q"])), OLD.decomposeTerm(OLD.composeTerm("ns", ["p", "q"])));
  assert.deepStrictEqual(NEW.eavtLogPaths(root, { e: "E", a: "A", v: 1, t: "T" }), OLD.eavtLogPaths(root, { e: "E", a: "A", v: 1, t: "T" }));
  assert.equal(NEW.normalizePath("/a/./b/../c"), OLD.normalizePath("/a/./b/../c"));
  assert.equal(NEW.pathParent("/a/b/c"), OLD.pathParent("/a/b/c"));
  assert.equal(NEW.pathPoint("/a/./b"), OLD.pathPoint("/a/./b"));
  assert.equal(NEW.path.POSIX_PATHNAME_PATTERN.source, OLD.path.POSIX_PATHNAME_PATTERN.source);
});

test("path: utterance dehydrate/rehydrate roundtrip byte-identical (fresh marks)", () => {
  const u = [{ token: "t1", claim: "c1" }, { token: { n: 1 }, claim: [2, 3] }];
  const log = { kind: "meme-topology.utteranceLog", utterances: u };
  assert.deepStrictEqual(
    NEW.dehydrateUtterances(NEW.rehydrateUtterances(log)),
    OLD.dehydrateUtterances(OLD.rehydrateUtterances(log)),
  );
});

test("spectral: polyFromInts/polyToInts byte-identical to reference", () => {
  assert.deepStrictEqual(
    NEW.spectral.polyToInts(NEW.spectral.polyFromInts([1, 2, 0, 3])),
    OLD.spectral.polyToInts(OLD.spectral.polyFromInts([1, 2, 0, 3])),
  );
});

test("svg: projectSvg + chargeAttributes byte-identical to reference", () => {
  const box = { cx: 50, cy: 50, w: 80, h: 30 };
  const box2 = { cx: 50, cy: 150, w: 80, h: 30 };
  const form = (M, c) => ({
    width: 200, height: 200,
    nodes: [
      { e: "n1", group: "type", label: "N1", charge: c, box },
      { e: "n2", group: "fn", label: "N2", charge: c, box: box2 },
    ],
    edges: [{ from: "n1", to: "n2", kind: "calls", charge: c, fromBox: box, toBox: box2 }],
  });
  assert.equal(NEW.svg.projectSvg(form(NEW, NEW.svg.affirmedCharge())), OLD.svg.projectSvg(form(OLD, OLD.svg.affirmedCharge())));
  assert.deepStrictEqual(NEW.svg.chargeAttributes(NEW.svg.affirmedCharge()), OLD.svg.chargeAttributes(OLD.svg.affirmedCharge()));
});
