/**
 * codecs/svg/projector — SVG bound into the holography kernel as a restriction
 * of the XML projector: `svg.xml ⊢ xml`. An SVG is recognized by carrying an
 * `<svg>` element; recognition entails the parent's (you cannot be an SVG
 * without being XML), and the write direction (serialize an `XmlNode`) is
 * inherited from the XML projector unchanged.
 */
import { restrict, type Projector } from "../../../../../../../../../holography/index.mjs";
import type { XmlNode } from "../markup.mjs";
import { xmlProjector } from "../projector.mjs";

/** The SVG vocabulary as a holography projector restricting XML. */
export const svgProjector: Projector<XmlNode> = restrict<XmlNode>(xmlProjector, {
  type: "svg.xml",
  recognize: (resource) => /<svg[\s>]/.test(resource.content),
});
