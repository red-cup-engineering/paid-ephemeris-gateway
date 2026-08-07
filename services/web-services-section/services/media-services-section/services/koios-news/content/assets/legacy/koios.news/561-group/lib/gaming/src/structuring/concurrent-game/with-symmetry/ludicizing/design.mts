/**
 * Designs — Girard's dialogical objects, realized as charge valuations.
 *
 * The ludics correspondence theorem (corpus, "A Girard design corresponds to a
 * partial valuation $v_\mathfrak{D} : E \times E \dashrightarrow \mathbf{L}^\bowtie$")
 * states that a design IS a partial valuation from loci into the bilattice
 * charge.  The four polarity-states of a locus map bijectively onto the four
 * charge values of meme-algebra:
 *
 *   - Proponent acts (positive)      ↦ `potential` = $t = (1,0)$
 *   - Opponent acts (negative)       ↦ `active`    = $f = (0,1)$
 *   - Daimon $\dagger$ (give up)      ↦ `stable`    = $\top = (1,1)$  (designated)
 *   - no action (undefined region)   ↦ `absurd`    = $\bot = (0,0)$  (the default)
 *
 * A design is therefore not a new datatype — it is a configuration of the meme
 * apex: a finite charge labelling of the locus tree.  Loci outside the support
 * carry $\bot$.
 */
import {
  type ChargeValue,
  type ChargeValueName,
  chargeValue,
  sameChargeValue,
} from "@emsenn/relating";
import { type Locus, type Locus as LocusType, locusKey, locusFromKey, root } from "./locus.mjs";

export type DesignAct = "proponent" | "opponent" | "daimon" | "none";

const ACT_TO_CHARGE: Record<DesignAct, ChargeValueName> = {
  proponent: "potential",
  opponent: "active",
  daimon: "stable",
  none: "absurd",
};

export interface DesignEntry {
  readonly kind: "game.design.entry";
  readonly locusKey: string;
  readonly charge: ChargeValue;
}

export interface Design {
  readonly kind: "game.design";
  /** Charge labelling of loci; entries with `absurd` ($\bot$) are dropped — that is the default. */
  readonly entries: readonly DesignEntry[];
}

const isAbsurd = (value: ChargeValue): boolean => sameChargeValue(value, chargeValue("absurd"));

export function design(labelling: ReadonlyMap<string, ChargeValue> | readonly DesignEntry[] = []): Design {
  const map = new Map<string, ChargeValue>();
  const source = Array.isArray(labelling)
    ? (labelling as readonly DesignEntry[]).map((e) => [e.locusKey, e.charge] as const)
    : [...(labelling as ReadonlyMap<string, ChargeValue>).entries()];
  for (const [key, value] of source) {
    if (!isAbsurd(value)) map.set(key, value);
  }
  const entries = [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, value]) => Object.freeze({ kind: "game.design.entry" as const, locusKey: key, charge: value }));
  return Object.freeze({ kind: "game.design" as const, entries: Object.freeze(entries) });
}

export const emptyDesign = (): Design => design([]);

/** The act committed at a locus → its charge value. */
export const actCharge = (act: DesignAct): ChargeValue => chargeValue(ACT_TO_CHARGE[act]);

/** Build a design from an act labelling of loci. */
export function designFromActs(acts: ReadonlyMap<string, DesignAct>): Design {
  const map = new Map<string, ChargeValue>();
  for (const [key, act] of acts) map.set(key, actCharge(act));
  return design(map);
}

/** The Daimon design at a single locus — "give up by asserting and denying", charge $\top$. */
export const daimon = (xi: LocusType = root()): Design =>
  design(new Map([[locusKey(xi), chargeValue("stable")]]));

/** The charge a design assigns to a locus; loci outside the support carry $\bot$ (`absurd`). */
export function designCharge(d: Design, xi: Locus): ChargeValue {
  const key = locusKey(xi);
  return d.entries.find((e) => e.locusKey === key)?.charge ?? chargeValue("absurd");
}

export function designAct(d: Design, xi: Locus): DesignAct {
  const value = designCharge(d, xi);
  if (sameChargeValue(value, chargeValue("potential"))) return "proponent";
  if (sameChargeValue(value, chargeValue("active"))) return "opponent";
  if (sameChargeValue(value, chargeValue("stable"))) return "daimon";
  return "none";
}

/** The loci a design actually commits at (its support — the non-$\bot$ region). */
export const support = (d: Design): readonly Locus[] =>
  Object.freeze(d.entries.map((e) => locusFromKey(e.locusKey)));

export const supportKeys = (d: Design): readonly string[] =>
  Object.freeze(d.entries.map((e) => e.locusKey));

export function isDesign(value: unknown): value is Design {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Design>;
  return candidate.kind === "game.design" && Array.isArray(candidate.entries);
}
