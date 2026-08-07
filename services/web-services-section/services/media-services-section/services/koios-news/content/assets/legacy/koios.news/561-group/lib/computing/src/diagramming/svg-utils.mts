import type { LayoutGeometry } from "./layout.mjs";
import { escapeXmlAttr } from "@emsenn/relating/codecs/xml";

/** XML escaping for SVG strings. Delegates to relating's XML codec — the single
 *  source of truth for escaping — using the attribute-safe variant (all five
 *  predefined entities), which is a correct superset for text contexts too. */
export const xmlEscape = escapeXmlAttr;

export function fitSvgLabel(name: string, nodeWidth: number, padding = 12): string {
  const max = Math.floor((nodeWidth - padding) / 7);
  return name.length <= max ? name : name.slice(0, max - 1) + "...";
}

export function layoutGeometryFrom(
  options: Partial<LayoutGeometry>,
  defaults: LayoutGeometry,
): LayoutGeometry {
  return {
    nodeWidth: options.nodeWidth ?? defaults.nodeWidth,
    nodeHeight: options.nodeHeight ?? defaults.nodeHeight,
    hGap: options.hGap ?? defaults.hGap,
    vGap: options.vGap ?? defaults.vGap,
    margin: options.margin ?? defaults.margin,
    sweeps: options.sweeps ?? defaults.sweeps,
  };
}
