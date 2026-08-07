/**
 * codecs/svg — the relational SVG codec: charged, placed relational data ⇄ a
 * self-describing SVG, the categorical-diagram analog of the Semantic Hypertext
 * Packet. SVG is a restriction of XML (see ../), so this codec inherits the XML
 * writer and adds the relational vocabulary:
 *
 *   - morphism  — shape/colour-as-morphism: a node group / edge kind → its form
 *   - document  — the SVG element builders (root, shapes, edges, text, markers)
 *   - normalize — the SvgDataform of placed charged cells + edges, and charge naming
 *   - project   — SvgDataform → SVG document (the projection morphism)
 *   - profiles  — inhabitant profiles (interactive default + RFC 7996 static)
 *   - projector — SVG as a holography Projector<XmlNode> restricting XML
 *
 * Layout is NOT here: a caller supplies each box's centre. Downstream the
 * diagramming codec lays a graph out and projects it through this codec, so
 * every diagram in the ecosystem is one relational SVG.
 */
export {
  type NodeShape,
  type ShapeMorphism,
  type EdgeMorphism,
  type ShapeMorphismRegistry,
  type ShapeMorphismSpec,
  shapeMorphismRegistry,
  defaultShapeMorphisms,
  DEFAULT_SHAPE,
} from "./morphism.mjs";

export {
  type Box,
  type SvgRootOptions,
  type ShapeStyle,
  svgRoot,
  nodeShape,
  edgePath,
  textLines,
  group,
  anchor,
  background,
  arrowMarker,
  hollowTriangleMarker,
  defs,
} from "./document.mjs";

export {
  type PlacedCell,
  type PlacedEdge,
  type SvgDataform,
  affirmedCharge,
  chargeValueOf,
  chargeMark,
  calmChargeOf,
  chargeAttributes,
} from "./normalize.mjs";

export { projectSvg, type ProjectSvgOptions } from "./project.mjs";

export {
  type Profile,
  type LintReport,
  type LintViolation,
  svgInteractiveProfile,
  rfc7996Profile,
} from "./profiles.mjs";

export { svgProjector } from "./projector.mjs";
