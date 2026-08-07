/**
 * codecs/xml — the XML serialization branch: a well-formed-by-construction XML
 * writer (the syntactic floor) plus its holography projector. SVG restricts this
 * node (see ./svg); other XML vocabularies may too. The whole subtree (escape,
 * markup, projector) is consolidated here, flat on the new base.
 */
import { define, type Projector } from "../holography/index.mjs";

/* ── escape ─────────────────────────────────────────────────────────────── */

/** Escape a string for XML text content (`&`, `<`, `>`). */
export function escapeXmlText(value: string): string {
  return value.replace(/[&<>]/g, (character) =>
    character === "&" ? "&amp;" : character === "<" ? "&lt;" : "&gt;");
}

/** Escape a string for a double-quoted XML attribute value (text plus `"`/`'`). */
export function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replace(/["']/g, (character) =>
    character === '"' ? "&quot;" : "&#39;");
}

const XML_NAME = /^[A-Za-z_:][A-Za-z0-9._:-]*$/;

/** Whether a string is a well-formed XML name (element or attribute). */
export function isXmlName(name: string): boolean {
  return XML_NAME.test(name);
}

/** Return a name unchanged when it is a well-formed XML name, else throw. */
export function requireXmlName(name: string): string {
  if (!isXmlName(name)) throw new TypeError(`xml: ${JSON.stringify(name)} is not a well-formed XML name`);
  return name;
}

/* ── markup ─────────────────────────────────────────────────────────────── */

/** A single attribute value; `null`/`undefined` attributes are dropped. */
export type XmlAttrValue = string | number | null | undefined;

/** An attribute bag: name → value, dropped where the value is null/undefined. */
export type XmlAttributes = Readonly<Record<string, XmlAttrValue>>;

/** An element node: a validated name, its attributes, and its children. */
export interface XmlElement {
  readonly kind: "element";
  readonly name: string;
  readonly attributes: XmlAttributes;
  readonly children: readonly XmlNode[];
}

/** A text node; its value is escaped on serialization. */
export interface XmlText {
  readonly kind: "text";
  readonly value: string;
}

/** A comment node; `--` is forbidden inside an XML comment. */
export interface XmlComment {
  readonly kind: "comment";
  readonly value: string;
}

export type XmlNode = XmlElement | XmlText | XmlComment;

/** Build an element node, lifting bare strings to text and dropping nullish children. */
export function element(
  name: string,
  attributes: XmlAttributes = {},
  children: ReadonlyArray<XmlNode | string | null | undefined | false> = [],
): XmlElement {
  const kids: XmlNode[] = [];
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    kids.push(typeof child === "string" ? text(child) : child);
  }
  return { kind: "element", name: requireXmlName(name), attributes, children: kids };
}

/** Build a text node. */
export function text(value: string): XmlText {
  return { kind: "text", value };
}

/** Build a comment node. */
export function comment(value: string): XmlComment {
  if (value.includes("--")) throw new TypeError("xml: a comment may not contain '--'");
  return { kind: "comment", value };
}

function serializeAttributes(attributes: XmlAttributes): string {
  let out = "";
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue;
    out += ` ${requireXmlName(name)}="${escapeXmlAttr(String(value))}"`;
  }
  return out;
}

/** Serialize a node to a well-formed XML string (empty elements self-close). */
export function serialize(node: XmlNode): string {
  switch (node.kind) {
    case "text":
      return escapeXmlText(node.value);
    case "comment":
      return `<!--${node.value}-->`;
    case "element": {
      const attrs = serializeAttributes(node.attributes);
      if (node.children.length === 0) return `<${node.name}${attrs}/>`;
      return `<${node.name}${attrs}>${node.children.map(serialize).join("")}</${node.name}>`;
    }
  }
}

/** Options for a complete XML document. */
export interface DocumentOptions {
  readonly declaration?: boolean;
  readonly doctype?: string;
}

/** Render a complete XML document: optional declaration/doctype then the root. */
export function document(root: XmlElement, options: DocumentOptions = {}): string {
  const declaration = options.declaration ? `<?xml version="1.0" encoding="UTF-8"?>\n` : "";
  const doctype = options.doctype ? `${options.doctype}\n` : "";
  return `${declaration}${doctype}${serialize(root)}\n`;
}

/* ── projector ──────────────────────────────────────────────────────────── */

function recognizesXml(content: string): boolean {
  const head = content.trimStart();
  return head.startsWith("<?xml") || /^<[A-Za-z_:]/.test(head);
}

/** The XML serialization as a holography projector over `XmlNode`. */
export const xmlProjector: Projector<XmlNode> = define<XmlNode>({
  type: "xml",
  recognize: (resource) => recognizesXml(resource.content),
  write: (nodes) => nodes.map(serialize).join(""),
});
