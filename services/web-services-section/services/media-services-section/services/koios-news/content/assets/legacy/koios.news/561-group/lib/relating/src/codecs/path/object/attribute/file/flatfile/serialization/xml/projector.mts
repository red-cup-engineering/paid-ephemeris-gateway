/**
 * codecs/xml/projector — the XML serialization bound into the holography kernel
 * as a `Projector<XmlNode>`: it recognizes XML resources and writes carried
 * nodes back to a string. This is the parent the SVG vocabulary restricts (an
 * SVG is an XML, in the Curry–Howard direction the holography lattice records),
 * so `svg.xml ⊢ xml`.
 *
 * The XML node is the syntactic carrier; read (parse) is absent — this branch is
 * a *projection* (write) surface, mirroring how a carrier-free holography node
 * may carry one direction only.
 */
import { define, type Projector } from "../../../../../../../../holography/index.mjs";
import { serialize, type XmlNode } from "./markup.mjs";

/** Recognize a resource as XML: an XML declaration or a leading element tag. */
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
