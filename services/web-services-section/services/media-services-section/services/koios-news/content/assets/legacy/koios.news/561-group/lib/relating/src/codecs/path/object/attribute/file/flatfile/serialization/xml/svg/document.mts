/**
 * codecs/svg/document — SVG element builders over the XML writer.
 *
 * Thin constructors that return `XmlElement`s in the SVG namespace: the document
 * root, the shape vocabulary (sharp/rounded box, parallelogram, stadium), edges,
 * multi-line text, groups, anchors, and arrow markers. They own the SVG *syntax*
 * — no relational meaning, no layout — so `project.mts` can assemble a charged
 * dataform into a document without touching raw strings, and every renderer in
 * the ecosystem draws the same well-formed shapes.
 */
import { element, type XmlElement, type XmlNode } from "../markup.mjs";
import type { NodeShape } from "./morphism.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const fixed = (value: number): string => value.toFixed(1);

/** Box geometry: a centre and a size. The codec is layout-agnostic — the centre
 *  is supplied by whatever laid the graph out. */
export interface Box {
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly h: number;
}

export interface SvgRootOptions {
  readonly width: number;
  readonly height: number;
  readonly title?: string;
  readonly desc?: string;
  readonly fontFamily?: string;
}

/** The `<svg>` root: namespaced, with a `viewBox`, an accessible `role`, and an
 *  optional `<title>`/`<desc>` pair (the human/LLM-readable summary). */
export function svgRoot(options: SvgRootOptions, children: readonly XmlNode[]): XmlElement {
  const head: XmlNode[] = [];
  if (options.title !== undefined) head.push(element("title", {}, [options.title]));
  if (options.desc !== undefined) head.push(element("desc", {}, [options.desc]));
  return element(
    "svg",
    {
      xmlns: SVG_NS,
      viewBox: `0 0 ${options.width} ${options.height}`,
      width: options.width,
      height: options.height,
      "font-family": options.fontFamily ?? "ui-monospace,Menlo,monospace",
      role: "img",
    },
    [...head, ...children],
  );
}

export interface ShapeStyle {
  readonly fill: string;
  readonly stroke: string;
  readonly dash?: string;
  readonly strokeWidth?: number;
}

/** A node shape for a kind, sized to a box. Sharp rect = a plain object; rounded
 *  = a soft box; parallelogram = a (type) alias; stadium = a (function) morphism. */
export function nodeShape(shape: NodeShape, box: Box, style: ShapeStyle): XmlElement {
  const x = box.cx - box.w / 2;
  const y = box.cy - box.h / 2;
  const base = {
    fill: style.fill,
    stroke: style.stroke,
    "stroke-width": style.strokeWidth ?? 1.5,
    "stroke-dasharray": style.dash ?? null,
  };
  switch (shape) {
    case "rect":
      return element("rect", { x: fixed(x), y: fixed(y), width: fixed(box.w), height: fixed(box.h), ...base });
    case "rounded":
      return element("rect", { x: fixed(x), y: fixed(y), width: fixed(box.w), height: fixed(box.h), rx: 4, ...base });
    case "stadium":
      return element("rect", { x: fixed(x), y: fixed(y), width: fixed(box.w), height: fixed(box.h), rx: fixed(box.h / 2), ...base });
    case "parallelogram": {
      const slant = Math.min(12, box.w / 4);
      const points = `${fixed(x + slant)},${fixed(y)} ${fixed(x + box.w)},${fixed(y)} ${fixed(x + box.w - slant)},${fixed(y + box.h)} ${fixed(x)},${fixed(y + box.h)}`;
      return element("polygon", { points, ...base });
    }
  }
}

/** A curved edge from the bottom of one box to the top of another, with an
 *  arrow marker. `dataAttrs` carry the relational `from`/`to`/`kind`. */
export function edgePath(
  from: Box,
  to: Box,
  style: { readonly stroke?: string; readonly dash?: string; readonly marker: string },
  dataAttrs: Record<string, string | number | null | undefined>,
): XmlElement {
  const x1 = from.cx;
  const y1 = from.cy + from.h / 2;
  const x2 = to.cx;
  const y2 = to.cy - to.h / 2;
  const my = (y1 + y2) / 2;
  const d = `M${fixed(x1)},${fixed(y1)} C${fixed(x1)},${fixed(my)} ${fixed(x2)},${fixed(my)} ${fixed(x2)},${fixed(y2)}`;
  return element("path", {
    d,
    fill: "none",
    stroke: style.stroke ?? null,
    "stroke-dasharray": style.dash ?? null,
    "marker-end": `url(#${style.marker})`,
    ...dataAttrs,
  });
}

/** Multi-line centred text: a `label` (split on `\n`) becomes vertically-centred
 *  `<tspan>`s. A single line renders as one centred line. Lines are drawn as
 *  given — truncation/fitting is the caller's geometry concern. */
export function textLines(label: string, cx: number, cy: number, fill: string, fontSize = 12): XmlElement {
  const lines = label.split("\n");
  const lineHeight = 13;
  const top = cy - ((lines.length - 1) * lineHeight) / 2 + 4;
  const tspans = lines.map((line, index) =>
    element("tspan", { x: fixed(cx), y: fixed(top + index * lineHeight) }, [line]));
  return element("text", { "text-anchor": "middle", "font-size": fontSize, fill }, tspans);
}

/** A `<g>` group with arbitrary attributes. */
export function group(attributes: Record<string, string | number | null | undefined>, children: readonly XmlNode[]): XmlElement {
  return element("g", attributes, children);
}

/** Wrap a node in a top-targeting `<a href>` (interactive profiles only). */
export function anchor(href: string, child: XmlNode): XmlElement {
  return element("a", { href, target: "_top" }, [child]);
}

/** A `<rect>` background filling the document. */
export function background(width: number, height: number, fill: string): XmlElement {
  return element("rect", { x: 0, y: 0, width, height, fill });
}

/** An arrow-head `<marker>` definition. */
export function arrowMarker(id: string, fill: string): XmlElement {
  return element(
    "marker",
    { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
    [element("path", { d: "M0,0 L10,5 L0,10 z", fill })],
  );
}

/** A hollow-triangle `<marker>` (UML generalization / "extends"). */
export function hollowTriangleMarker(id: string, fill: string, stroke: string): XmlElement {
  return element(
    "marker",
    { id, viewBox: "0 0 12 12", refX: 11, refY: 6, markerWidth: 11, markerHeight: 11, orient: "auto-start-reverse" },
    [element("path", { d: "M0,0 L12,6 L0,12 z", fill, stroke, "stroke-width": 1 })],
  );
}

/** A `<defs>` block. */
export function defs(children: readonly XmlNode[]): XmlElement {
  return element("defs", {}, children);
}
