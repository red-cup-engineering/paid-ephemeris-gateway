/**
 * diagramming — generic graph geometry and a self-describing SVG codec.
 *
 * A layered (Sugiyama) layout over a minimal `(ids, edges)` interface and a
 * general renderer that turns any labelled, typed graph into a clickable,
 * LLM-readable SVG. Domain renderers (the jsnode dependency DAG, the research
 * library's relational map) are thin callers that map their own node types onto
 * `DiagramNode`/`DiagramEdge`; the geometry and markup live here once.
 */
export {
  layoutGraph,
  LAYOUT_DEFAULTS,
  type GraphGeometry,
  type LayoutEdge,
  type LayoutGeometry,
  type PlacedPoint,
} from "./layout.mjs";

export {
  fitSvgLabel,
  layoutGeometryFrom,
  xmlEscape,
} from "./svg-utils.mjs";

export {
  graphDiagramSvg,
  type DiagramEdge,
  type DiagramGraph,
  type DiagramNode,
  type DiagramPaletteEntry,
  type EdgeStyle,
  type GraphDiagramOptions,
} from "./graph-svg.mjs";
