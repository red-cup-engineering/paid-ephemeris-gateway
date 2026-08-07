/**
 * graph-svg — any labelled, typed graph as a self-describing, clickable SVG.
 *
 * The general categorical-diagram renderer. It owns the *layout* (the shared
 * Sugiyama `layoutGraph`) and nothing else about the markup: each laid-out node
 * and edge is handed to the relating SVG codec (`@emsenn/relating/codecs/svg`),
 * which projects the placed, charged graph into a rich relational SVG — `class`
 * names the node's morphism, `data-e/a/v` + bilattice charge attributes carry its
 * relational identity, the shape/colour come from a morphism registry, and an
 * `href` becomes a clickable `<a>`. This module is the single place a graph
 * becomes a picture; the dependency DAG, the symbol graph, and the research
 * relational map are all thin callers.
 */
import { layoutGraph, LAYOUT_DEFAULTS, type LayoutGeometry } from "./layout.mjs";
import { fitSvgLabel, layoutGeometryFrom } from "./svg-utils.mjs";
import {
  projectSvg,
  affirmedCharge,
  shapeMorphismRegistry,
  type Box,
  type EdgeMorphism,
  type PlacedCell,
  type PlacedEdge,
  type ShapeMorphism,
  type SvgDataform,
} from "@emsenn/relating/codecs/svg";

/** One node to draw. `id` must be unique; everything else is presentation. */
export interface DiagramNode {
  readonly id: string;
  /** Visible box label; defaults to `id`. May carry `\n` for multi-line. */
  readonly label?: string;
  /** Palette key (a stratum, a phase, a regime…); selects shape/fill/stroke. */
  readonly group?: string;
  /** Click target; the box becomes an `<a href>` when present. */
  readonly href?: string;
  /** `<title>` hover/scan text; defaults to `label`/`id`. */
  readonly title?: string;
  /** Bright outline + `data-focus`, for an ego/neighbourhood diagram. */
  readonly focus?: boolean;
  /** Extra `data-*` attributes (numbers and strings), e.g. a degree count. */
  readonly data?: Readonly<Record<string, string | number>>;
}

/** One directed edge. `kind` is emitted as `data-kind` and selects a stroke
 *  style; `href` makes the edge itself clickable (e.g. to a "what relates these"
 *  page). */
export interface DiagramEdge {
  readonly from: string;
  readonly to: string;
  readonly kind?: string;
  readonly href?: string;
}

export interface DiagramGraph {
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
}

export interface DiagramPaletteEntry {
  readonly fill: string;
  readonly stroke: string;
  /** The node shape for this group; defaults to a rounded box. */
  readonly shape?: ShapeMorphism["shape"];
  /** SVG `stroke-dasharray` for an abstract/dashed outline. */
  readonly dash?: string;
}

export interface GraphDiagramOptions extends Partial<LayoutGeometry> {
  /** SVG `<title>`. */
  readonly title?: string;
  /** SVG `<desc>`; a count summary is appended when omitted. */
  readonly description?: string;
  /** group → colours/shape. Missing groups fall back to `defaultColor`. */
  readonly palette?: Readonly<Record<string, DiagramPaletteEntry>>;
  readonly defaultColor?: DiagramPaletteEntry;
  readonly background?: string;
  /** Text colour for labels. */
  readonly textColor?: string;
  /** Edge stroke colour. */
  readonly edgeColor?: string;
  /** Per-`kind` edge styling, so distinct relations render distinctly. */
  readonly edgeStyles?: Readonly<Record<string, EdgeStyle>>;
}

export interface EdgeStyle {
  readonly stroke?: string;
  /** SVG `stroke-dasharray` (e.g. "5 4" for a dashed reference edge). */
  readonly dash?: string;
  /** The id of a `<marker>` to terminate the edge with. */
  readonly marker?: string;
}

const DEFAULT_COLOR: DiagramPaletteEntry = { fill: "#1b3a4b", stroke: "#3f7d9c" };

function paletteEntryToShape(entry: DiagramPaletteEntry): ShapeMorphism {
  return {
    shape: entry.shape ?? "rounded",
    fill: entry.fill,
    stroke: entry.stroke,
    ...(entry.dash === undefined ? {} : { dash: entry.dash }),
  };
}

function edgeStyleToMorphism(style: EdgeStyle): EdgeMorphism {
  return {
    ...(style.stroke === undefined ? {} : { stroke: style.stroke }),
    ...(style.dash === undefined ? {} : { dash: style.dash }),
    ...(style.marker === undefined ? {} : { marker: style.marker }),
  };
}

/** Render a generic graph to a clickable, self-describing SVG string. */
export function graphDiagramSvg(graph: DiagramGraph, opts: GraphDiagramOptions = {}): string {
  const geom = layoutGeometryFrom(opts, LAYOUT_DEFAULTS);
  const { nodeWidth, nodeHeight } = geom;
  const layout = layoutGraph(graph.nodes.map((node) => node.id), graph.edges, geom);
  const pos = layout.points;
  const defaultColor = opts.defaultColor ?? DEFAULT_COLOR;
  const palette = opts.palette ?? {};

  // The morphism registry: a node's group → shape/colour, an edge's kind → style.
  const shapes: Record<string, ShapeMorphism> = {};
  for (const [group, entry] of Object.entries(palette)) shapes[group] = paletteEntryToShape(entry);
  const edges: Record<string, EdgeMorphism> = {};
  for (const [kind, style] of Object.entries(opts.edgeStyles ?? {})) edges[kind] = edgeStyleToMorphism(style);
  const registry = shapeMorphismRegistry({ shapes, edges, fallback: paletteEntryToShape(defaultColor) });

  const boxOf = (id: string): Box | undefined => {
    const point = pos.get(id);
    return point === undefined ? undefined : { cx: point.cx, cy: point.cy, w: nodeWidth, h: nodeHeight };
  };
  // Fit each label line to the box width; the codec lays out multi-line text but
  // truncation is a geometry concern that lives with the layout.
  const fitLabel = (label: string): string => label.split("\n").map((line) => fitSvgLabel(line, nodeWidth)).join("\n");

  // Canopy-on-top paint order: deepest rank first so rank-0 sources draw last.
  const placedNodes = [...graph.nodes]
    .map((node) => ({ node, point: pos.get(node.id) }))
    .filter((entry): entry is { node: DiagramNode; point: NonNullable<ReturnType<typeof pos.get>> } => entry.point !== undefined)
    .sort((a, b) => b.point.rank - a.point.rank);

  const nodes: PlacedCell[] = placedNodes.map(({ node, point }) => ({
    e: node.id,
    group: node.group ?? "node",
    label: fitLabel(node.label ?? node.id),
    charge: affirmedCharge(),
    box: { cx: point.cx, cy: point.cy, w: nodeWidth, h: nodeHeight },
    ...(node.title === undefined ? {} : { title: node.title }),
    ...(node.href === undefined ? {} : { href: node.href }),
    ...(node.focus ? { focus: true } : {}),
    ...(node.data === undefined ? {} : { data: node.data }),
  }));

  const placedEdges: PlacedEdge[] = [];
  for (const edge of graph.edges) {
    const fromBox = boxOf(edge.from);
    const toBox = boxOf(edge.to);
    if (fromBox === undefined || toBox === undefined) continue;
    placedEdges.push({
      from: edge.from,
      to: edge.to,
      charge: affirmedCharge(),
      fromBox,
      toBox,
      ...(edge.kind === undefined ? {} : { kind: edge.kind }),
      ...(edge.href === undefined ? {} : { href: edge.href }),
    });
  }

  const byGroup = graph.nodes.reduce<Record<string, number>>((acc, node) => {
    const key = node.group ?? "node";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const description = opts.description ??
    `${graph.nodes.length} nodes, ${graph.edges.length} edges, ${layout.maxRank + 1} ranks. By group: ` +
    Object.entries(byGroup).map(([group, count]) => `${group} ${count}`).join(", ") + ".";

  const dataform: SvgDataform = {
    width: layout.width,
    height: layout.height,
    title: opts.title ?? "graph diagram",
    desc: description,
    nodes,
    edges: placedEdges,
    ...(opts.background === undefined ? {} : { background: opts.background }),
    ...(opts.textColor === undefined ? {} : { textColor: opts.textColor }),
    ...(opts.edgeColor === undefined ? {} : { edgeColor: opts.edgeColor }),
  };

  return projectSvg(dataform, { registry });
}
