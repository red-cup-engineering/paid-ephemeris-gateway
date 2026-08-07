/**
 * codecs/svg/normalize — the `SvgDataform` the projector renders, and the charge
 * naming it reads.
 *
 * A relational SVG is a *placed* charged graph: each node is a charged cell
 * (entity / attribute / value over the bilattice, exactly the SHP cell shape)
 * carrying a box centre, and each edge a charged relation carrying its endpoint
 * boxes. Geometry is supplied by the caller (the layout lives downstream in the
 * diagramming codec); this module only settles the relational + charge content.
 *
 * The charge → name mapping is relating's own four-valued naming, read straight
 * from `valueOf`/`chargeValueName` in articulating — not re-derived here, the
 * same discipline the HTML codec's escape module follows.
 */
import {
  charge,
  chargeValue,
  valueOf,
  chargeValueName,
  type ChargeCarrier,
  type ChargeValueName,
} from "../../../../../../../../../articulating/carriers.mjs";
import type { Box } from "./document.mjs";

/** A node of the relational SVG: a charged cell (e/a/v) with a box, a morphism
 *  group, a label, and optional title/href/focus/extra-data. */
export interface PlacedCell {
  /** entity coordinate — the node's identity. */
  readonly e: string;
  /** attribute/predicate coordinate (optional). */
  readonly a?: string;
  /** value coordinate (optional). */
  readonly v?: string;
  /** the morphism key selecting shape + colour. */
  readonly group: string;
  /** visible label; may carry `\n` for multi-line. */
  readonly label: string;
  readonly title?: string;
  readonly href?: string;
  readonly focus?: boolean;
  readonly data?: Readonly<Record<string, string | number>>;
  readonly charge: ChargeCarrier;
  readonly box: Box;
}

/** An edge of the relational SVG: a charged relation from one node to another. */
export interface PlacedEdge {
  readonly from: string;
  readonly to: string;
  readonly kind?: string;
  readonly href?: string;
  readonly charge: ChargeCarrier;
  readonly fromBox: Box;
  readonly toBox: Box;
}

/** The normalized form the projector renders. */
export interface SvgDataform {
  readonly width: number;
  readonly height: number;
  readonly title?: string;
  readonly desc?: string;
  readonly nodes: readonly PlacedCell[];
  readonly edges: readonly PlacedEdge[];
  readonly background?: string;
  readonly textColor?: string;
  readonly edgeColor?: string;
}

/** The default charge for a plainly-asserted datum: affirmed (truth-only /
 *  `potential`), no recorded witnesses. Affirming is the only admission. */
export function affirmedCharge(): ChargeCarrier {
  return charge(chargeValue("potential"), [[], []]);
}

const present = (c: ChargeCarrier, side: 0 | 1): boolean => c.value[side].name === "present";

/** The bilattice value-name of a charge (potential | active | stable | absurd). */
export const chargeValueOf = (c: ChargeCarrier): ChargeValueName => chargeValueName(valueOf(c));

/** A compact charge glyph: ⊤ both, ⊥ neither, t truth-only, f falsity-only. */
export function chargeMark(c: ChargeCarrier): "t" | "f" | "⊥" | "⊤" {
  const value = chargeValueOf(c);
  if (value === "stable") return "⊤";
  if (value === "absurd") return "⊥";
  return value === "potential" ? "t" : "f";
}

/** A contested (stable) charge projected to one side; otherwise the value itself. */
export function calmChargeOf(c: ChargeCarrier, projection: "supported" | "negated" = "supported"): ChargeValueName {
  const value = chargeValueOf(c);
  if (value !== "stable") return value;
  return projection === "negated" ? "active" : "potential";
}

/** The bilattice charge attributes for a cell or edge, mirroring the SHP codec's
 *  `data-positive/negative/value/calm/mark`. Returned as a plain attribute bag
 *  the document builders can spread. */
export function chargeAttributes(c: ChargeCarrier): Record<string, string> {
  return {
    "data-positive": String(present(c, 0)),
    "data-negative": String(present(c, 1)),
    "data-value": chargeValueOf(c),
    "data-calm": calmChargeOf(c),
    "data-mark": chargeMark(c),
  };
}
