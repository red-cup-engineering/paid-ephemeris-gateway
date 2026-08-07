/**
 * The Cartesian product of the Kleisli CCC — the additive conjunction
 * $A \mathbin{\&} B$ and the terminal object.
 *
 * By the Girard decomposition (`concurrent-game-system.md` § "Girard
 * decomposition"), the product of $\mathcal{K}\ell(!)$ is the additive
 * conjunction $\mathbin{\&}$ of the ambient $*$-autonomous category. On arenas,
 * $A \mathbin{\&} B$ is the game where Player commits to *one* component:
 * the disjoint union of $A$ and $B$ with full cross-conflict (every $A$-event
 * conflicts with every $B$-event), so a configuration lives entirely in one
 * component. The terminal object is the empty arena (the unit). The two
 * projections $\pi_1, \pi_2$ are copycat onto the chosen component; together with
 * pairing they give the universal property.
 */
import { type Arena, type Event, type EventPair, arena, eventStructure, strategy } from "@emsenn/gaming";
import { type Morphism, compoundArena, enumeratePlays, morphism } from "../categorifying/morphism.mjs";
import { tensor, unit } from "../categorifying/object.mjs";

const LEFT = "L|";
const RIGHT = "R|";

/**
 * The additive product $A \mathbin{\&} B$: the tensor's disjoint union with full
 * cross-conflict added, so every configuration commits to a single component.
 * Left events are `L|…`, right events `R|…` (inherited from `tensor`).
 */
export function with2(a: Arena, b: Arena): Arena {
  const t = tensor(a, b);
  const leftIds = t.structure.events.filter((e: Event) => e.id.startsWith(LEFT)).map((e: Event) => e.id);
  const rightIds = t.structure.events.filter((e: Event) => e.id.startsWith(RIGHT)).map((e: Event) => e.id);
  const cross: EventPair[] = [];
  for (const l of leftIds) for (const r of rightIds) cross.push(Object.freeze([l, r] as const));
  const structure = eventStructure(t.structure.events, t.structure.causality, [...t.structure.conflict, ...cross]);
  return arena(structure, t.symmetry);
}

/** The terminal object $\top$ of the CCC — the empty arena (the unit). */
export const terminal = (): Arena => unit();

/**
 * The left projection $\pi_1 : A \mathbin{\&} B \to A$ — copycat onto the left
 * component. In $({A \mathbin{\&} B})^\perp \| A$ the left component's events are
 * `L|L|…` (Opponent) and $A$'s are `R|…` (Player); each `R|id` copies `L|L|id`.
 */
export function leftProjection(a: Arena, b: Arena): Morphism {
  const source = with2(a, b);
  const compound = compoundArena(source, a);
  const admit = (history: { readonly moves: readonly string[] }, move: string): boolean =>
    history.moves.includes(`${LEFT}${LEFT}${move.slice(2)}`);
  return morphism(source, a, strategy(compound, enumeratePlays(compound, admit)));
}

/** The right projection $\pi_2 : A \mathbin{\&} B \to B$ — copycat onto the right component. */
export function rightProjection(a: Arena, b: Arena): Morphism {
  const source = with2(a, b);
  const compound = compoundArena(source, b);
  const admit = (history: { readonly moves: readonly string[] }, move: string): boolean =>
    history.moves.includes(`${LEFT}${RIGHT}${move.slice(2)}`);
  return morphism(source, b, strategy(compound, enumeratePlays(compound, admit)));
}
