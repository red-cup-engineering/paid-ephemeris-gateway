/**
 * codecs/xml/escape — XML-safe text/attribute escaping and name validation.
 *
 * The syntactic floor of the XML serialization branch: the five predefined XML
 * entities and the `Name` production, nothing relational. SVG, RSS, Atom, and
 * any other XML vocabulary restrict this node; they inherit its escaping rather
 * than re-deriving it. (This supersedes the ad-hoc `xmlEscape` that the
 * downstream diagramming codec used to carry.)
 */

/** Escape a string for XML *text* content: the three text-significant
 *  characters `&`, `<`, `>` become their predefined entities. */
export function escapeXmlText(value: string): string {
  return value.replace(/[&<>]/g, (character) =>
    character === "&" ? "&amp;" : character === "<" ? "&lt;" : "&gt;");
}

/** Escape a string for a double-quoted XML *attribute* value: the text
 *  entities plus `"` and `'`. */
export function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replace(/["']/g, (character) =>
    character === '"' ? "&quot;" : "&#39;");
}

// The XML `Name` production, conservatively restricted to the ASCII range the
// codecs actually emit (element/attribute names are ours, never user text).
const XML_NAME = /^[A-Za-z_:][A-Za-z0-9._:-]*$/;

/** Whether a string is a well-formed XML name (element or attribute). */
export function isXmlName(name: string): boolean {
  return XML_NAME.test(name);
}

/** Return a name unchanged when it is a well-formed XML name, else throw. The
 *  codecs build names from literals, so a failure here is a programming error,
 *  not bad input. */
export function requireXmlName(name: string): string {
  if (!isXmlName(name)) throw new TypeError(`xml: ${JSON.stringify(name)} is not a well-formed XML name`);
  return name;
}
