/**
 * codecs/xml — the XML serialization branch: a well-formed-by-construction XML
 * writer (the syntactic floor) plus its holography projector. SVG restricts this
 * node (see ./svg); other XML vocabularies may too.
 *
 *   - escape    — XML-safe text/attribute escaping + Name validation
 *   - markup    — the XmlNode tree, `element`/`text`/`comment`, `serialize`, `document`
 *   - projector — XML as a holography Projector<XmlNode>
 */
export { escapeXmlText, escapeXmlAttr, isXmlName, requireXmlName } from "./escape.mjs";
export {
  element,
  text,
  comment,
  serialize,
  document,
  type XmlNode,
  type XmlElement,
  type XmlText,
  type XmlComment,
  type XmlAttributes,
  type XmlAttrValue,
  type DocumentOptions,
} from "./markup.mjs";
export { xmlProjector } from "./projector.mjs";

export * as svg from "./svg/index.mjs";
