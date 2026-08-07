/**
 * codecs/svg/project — the projection (write) direction: a placed, charged
 * `SvgDataform` → a finite, self-describing SVG document. Deterministic for a
 * fixed dataform + morphism registry + profile.
 *
 * Each node becomes a `<g>` whose `class` names its morphism (the SVG analog of
 * the SHP `<span>`'s class), carrying `data-e/a/v` coordinates and the bilattice
 * charge attributes, drawn as the shape/colour its morphism prescribes, wrapped
 * in an interactive `<a>` when the profile permits and an href is present. Each
 * edge becomes a charged `<path>` with `data-from/to/kind`. The result is a
 * vector document a browser renders, a human clicks, and an LLM reads as graph
 * text — as rich as the semantic HTML packet.
 */
import { document, serialize, element, type XmlElement, type XmlNode } from "../markup.mjs";
import {
  svgRoot,
  background,
  defs,
  arrowMarker,
  hollowTriangleMarker,
  nodeShape,
  edgePath,
  textLines,
  group,
  anchor,
} from "./document.mjs";
import { chargeAttributes, type PlacedCell, type PlacedEdge, type SvgDataform } from "./normalize.mjs";
import { defaultShapeMorphisms, type ShapeMorphismRegistry } from "./morphism.mjs";
import { svgInteractiveProfile, type Profile } from "./profiles.mjs";

const ARROW = "svg-arrow";
const EXTENDS = "svg-extends";

type AttrBag = Record<string, string | number | null | undefined>;

function nodeDataAttributes(node: PlacedCell, profile: Profile): AttrBag {
  const attrs: AttrBag = { class: node.group, "data-e": node.e };
  if (node.a !== undefined) attrs["data-a"] = node.a;
  if (node.v !== undefined) attrs["data-v"] = node.v;
  if (node.focus) attrs["data-focus"] = "true";
  if (!profile.permitsDataAttributes) return attrs;
  for (const [key, value] of Object.entries(node.data ?? {})) attrs[`data-${key}`] = value;
  Object.assign(attrs, chargeAttributes(node.charge));
  return attrs;
}

function renderNode(node: PlacedCell, registry: ShapeMorphismRegistry, profile: Profile, textColor: string): XmlNode {
  const morphism = registry.shape(node.group);
  const shape = nodeShape(morphism.shape, node.box, {
    fill: morphism.fill,
    stroke: node.focus ? "#f0f6fc" : morphism.stroke,
    ...(node.focus ? { strokeWidth: 3 } : morphism.strokeWidth === undefined ? {} : { strokeWidth: morphism.strokeWidth }),
    ...(morphism.dash === undefined ? {} : { dash: morphism.dash }),
  });
  const title = element("title", {}, [node.title ?? node.label.replace(/\n/g, " ")]);
  const text = textLines(node.label, node.box.cx, node.box.cy, textColor);
  const box = group(nodeDataAttributes(node, profile), [title, shape, text]);
  return node.href !== undefined && profile.permitsAnchors ? anchor(node.href, box) : box;
}

function renderEdge(edge: PlacedEdge, registry: ShapeMorphismRegistry, profile: Profile, edgeColor: string): XmlNode {
  const morphism = registry.edge(edge.kind ?? "");
  const dataAttrs: AttrBag = { "data-from": edge.from, "data-to": edge.to };
  if (edge.kind !== undefined) dataAttrs["data-kind"] = edge.kind;
  if (profile.permitsDataAttributes) Object.assign(dataAttrs, chargeAttributes(edge.charge));
  const path = edgePath(
    edge.fromBox,
    edge.toBox,
    {
      stroke: morphism.stroke ?? edgeColor,
      marker: morphism.marker ?? ARROW,
      ...(morphism.dash === undefined ? {} : { dash: morphism.dash }),
    },
    dataAttrs,
  );
  return edge.href !== undefined && profile.permitsAnchors ? anchor(edge.href, path) : path;
}

function describe(dataform: SvgDataform): string {
  const byGroup = dataform.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.group] = (acc[node.group] ?? 0) + 1;
    return acc;
  }, {});
  const groups = Object.entries(byGroup).map(([group, count]) => `${group} ${count}`).join(", ");
  return `${dataform.nodes.length} nodes, ${dataform.edges.length} edges. By group: ${groups}.`;
}

export interface ProjectSvgOptions {
  readonly registry?: ShapeMorphismRegistry;
  readonly profile?: Profile;
  /** Emit a leading `<?xml?>` declaration (off by default — an inline figure
   *  wants none; a standalone `.svg` resource may set it). */
  readonly declaration?: boolean;
}

/** Project a placed, charged dataform into a self-describing SVG string. */
export function projectSvg(dataform: SvgDataform, options: ProjectSvgOptions = {}): string {
  const registry = options.registry ?? defaultShapeMorphisms();
  const profile = options.profile ?? svgInteractiveProfile;
  const edgeColor = dataform.edgeColor ?? "#3a4452";
  const textColor = dataform.textColor ?? "#e6edf3";
  const backgroundColor = dataform.background ?? "#0d1117";

  const markers = defs([arrowMarker(ARROW, edgeColor), hollowTriangleMarker(EXTENDS, backgroundColor, "#8b949e")]);
  const edgeGroup = group(
    { stroke: edgeColor, "stroke-width": 1, fill: "none", opacity: 0.55 },
    dataform.edges.map((edge) => renderEdge(edge, registry, profile, edgeColor)),
  );
  const nodeGroup = group(
    {},
    dataform.nodes.map((node) => renderNode(node, registry, profile, textColor)),
  );

  const root: XmlElement = svgRoot(
    {
      width: dataform.width,
      height: dataform.height,
      title: dataform.title ?? "relational diagram",
      desc: dataform.desc ?? describe(dataform),
    },
    [background(dataform.width, dataform.height, backgroundColor), markers, edgeGroup, nodeGroup],
  );

  return document(root, { ...(options.declaration ? { declaration: true } : {}) }).trimEnd();
}

export { serialize };
