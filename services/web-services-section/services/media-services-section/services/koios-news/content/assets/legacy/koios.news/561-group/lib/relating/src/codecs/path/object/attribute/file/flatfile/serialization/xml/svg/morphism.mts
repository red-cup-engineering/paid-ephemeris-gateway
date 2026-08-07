/**
 * codecs/svg/morphism — the shape-as-morphism registry: the SVG analog of the
 * HTML codec's class-as-morphism. In a relational SVG a node's *group* (its
 * predicate / kind identity) names a morphism whose visual form is a shape,
 * fill, stroke, and dash; an edge's *kind* names a morphism whose form is a
 * stroke, dash, and arrow marker. The registry is the correspondence between a
 * relational identity and the form that identity is *natively* drawn as — so
 * any well-formed relational datum lands as the right shape and colour without
 * the caller re-deciding per diagram.
 *
 * This generalises what every bespoke renderer used to hard-code: the symbol
 * graph's "rectangle = class, pill = function", the dependency graph's per-
 * stratum palette, the relational map's edge styles. One registry, many
 * vocabularies.
 */

/** The shape a node morphism is drawn as. Covers the full vocabulary the
 *  downstream renderers carried: sharp box, rounded box, parallelogram (a type
 *  alias), stadium/pill (a function — a morphism). */
export type NodeShape = "rect" | "rounded" | "parallelogram" | "stadium";

/** The visual form of a node morphism. */
export interface ShapeMorphism {
  readonly shape: NodeShape;
  readonly fill: string;
  readonly stroke: string;
  /** SVG `stroke-dasharray` (e.g. "5 3" for an abstract/interface outline). */
  readonly dash?: string;
  readonly strokeWidth?: number;
}

/** The visual form of an edge morphism. */
export interface EdgeMorphism {
  readonly stroke?: string;
  readonly dash?: string;
  /** The id of a `<marker>` to terminate the edge with (e.g. a hollow triangle
   *  for a generalization edge). Defaults to the document's arrow marker. */
  readonly marker?: string;
}

/** Resolve a node group / edge kind to its visual form. */
export interface ShapeMorphismRegistry {
  /** The shape morphism for a node group; the fallback when unregistered. */
  shape(group: string): ShapeMorphism;
  /** The edge morphism for an edge kind; an empty form when unregistered. */
  edge(kind: string): EdgeMorphism;
}

/** The neutral fallback node form: a rounded slate box. */
export const DEFAULT_SHAPE: ShapeMorphism = Object.freeze({
  shape: "rounded",
  fill: "#1b3a4b",
  stroke: "#3f7d9c",
});

export interface ShapeMorphismSpec {
  readonly shapes?: Readonly<Record<string, ShapeMorphism>>;
  readonly edges?: Readonly<Record<string, EdgeMorphism>>;
  readonly fallback?: ShapeMorphism;
}

/** Build a registry over an explicit shape/edge vocabulary. Groups and kinds
 *  not listed fall back to `fallback` (a rounded slate box by default) and an
 *  empty edge form. */
export function shapeMorphismRegistry(spec: ShapeMorphismSpec = {}): ShapeMorphismRegistry {
  const shapes = spec.shapes ?? {};
  const edges = spec.edges ?? {};
  const fallback = spec.fallback ?? DEFAULT_SHAPE;
  return {
    shape: (group) => shapes[group] ?? fallback,
    edge: (kind) => edges[kind] ?? {},
  };
}

/** A reasonable default registry: every group is a rounded slate box, every
 *  edge a plain arrow. Callers that care about shape/colour supply their own. */
export function defaultShapeMorphisms(): ShapeMorphismRegistry {
  return shapeMorphismRegistry();
}
