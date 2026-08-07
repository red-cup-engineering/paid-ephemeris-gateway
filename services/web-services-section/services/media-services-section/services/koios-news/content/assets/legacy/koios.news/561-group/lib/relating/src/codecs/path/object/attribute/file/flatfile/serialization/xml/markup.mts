/**
 * codecs/xml/markup — a pure, well-formed-by-construction XML writer.
 *
 * An `XmlNode` is a tiny tree (element / text / comment); `serialize` renders it
 * to a string that is well-formed XML by construction — names are validated,
 * text and attributes are escaped, empty elements self-close, and attribute
 * order is the insertion order the caller chose (so output is deterministic for
 * a fixed input). No DOM, no parser, no I/O. This is the syntactic substrate the
 * SVG vocabulary (and any future XML vocabulary) builds on; it carries no
 * relational meaning of its own.
 */
import { escapeXmlAttr, escapeXmlText, requireXmlName } from "./escape.mjs";

/** A single attribute value. `null`/`undefined` attributes are dropped, so a
 *  builder can offer optional attributes without conditional spreads. */
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

/** Build an element node. Children that are bare strings are lifted to text
 *  nodes; `null`/`undefined`/`false` children are dropped (so optional children
 *  need no conditional spread). */
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

/** Serialize a node to a well-formed XML string. Elements with no children
 *  self-close; otherwise children are serialized in order between open and close
 *  tags. */
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

/** Options for a complete XML document: an optional XML declaration and an
 *  optional doctype line, both off by default (an inline SVG fragment wants
 *  neither). */
export interface DocumentOptions {
  readonly declaration?: boolean;
  readonly doctype?: string;
}

/** Render a complete XML document: optional declaration, optional doctype, then
 *  the serialized root, newline-terminated. */
export function document(root: XmlElement, options: DocumentOptions = {}): string {
  const declaration = options.declaration ? `<?xml version="1.0" encoding="UTF-8"?>\n` : "";
  const doctype = options.doctype ? `${options.doctype}\n` : "";
  return `${declaration}${doctype}${serialize(root)}\n`;
}
