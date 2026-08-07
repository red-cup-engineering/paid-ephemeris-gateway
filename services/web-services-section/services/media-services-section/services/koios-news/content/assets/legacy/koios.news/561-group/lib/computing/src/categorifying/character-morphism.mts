/**
 * Characters as morphisms — the concrete tie from `@emsenn/animating` to the
 * executable category.
 *
 * `@emsenn/gaming` `Character` records an agent's handedness partitioned by the
 * Player/Opponent duality: `recv`/`observe` are Opponent-side on the input arena
 * $A$; `send`/`actuate` are Player-side on the output arena $B$. The corpus
 * theorem *embodied-handedness-is-player-opponent-duality* then reads a character
 * AS a morphism $A \to B$ — a strategy on $A^\perp \| B$ (`concurrent-game-system.md:154,167`).
 * This module realizes that reading: it builds the two arenas from the present
 * coordinates and the morphism the character names.
 *
 * The arenas are the *coordinate arenas*: each present coordinate (capacity not
 * `absurd` — the agent actually has it) contributes one Player event to its
 * arena. A symmetric peer (`recv = send`, `observe = actuate`) then has $A$ and
 * $B$ arena-equal, and the morphism it names is the **copycat** on that arena —
 * the degenerate identity, recorded not imposed (`:379`). The generic asymmetric
 * character names the receptive "forward the inputs, commit the outputs"
 * strategy on $A^\perp \| B$.
 */
import {
  type Arena,
  type Character,
  arena,
  characterIsSymmetricPeer,
  event,
  eventStructure,
  play,
  polarity,
  sides,
  strategy,
} from "@emsenn/gaming";
import { type Morphism, compoundArena, enumeratePlays, morphism } from "./morphism.mjs";

/** The input arena $A$ of a character — one Player event per present Opponent-side coordinate. */
export function inputArena(c: Character): Arena {
  const events = sides(c)
    .input.filter((face) => face.capacity !== "absurd")
    .map((face) => event(face.coordinate.name, polarity("positive")));
  return arena(eventStructure(events, [], []));
}

/** The output arena $B$ of a character — one Player event per present Player-side coordinate. */
export function outputArena(c: Character): Arena {
  const events = sides(c)
    .output.filter((face) => face.capacity !== "absurd")
    .map((face) => event(face.coordinate.name, polarity("positive")));
  return arena(eventStructure(events, [], []));
}

/**
 * The handedness pairing that turns a symmetric peer into copycat: each output
 * coordinate waits for its dual input coordinate — `send` copies `recv`,
 * `actuate` copies `observe` (`dualHandedness`: recv↔send, observe↔actuate).
 */
const PAIRED_INPUT: Readonly<Record<string, string>> = Object.freeze({ send: "recv", actuate: "observe" });

/**
 * The morphism $A \to B$ a character names. For a symmetric peer ($A$ and $B$
 * isomorphic under recv↔send, observe↔actuate) this is the **copycat** identity
 * *up to that pairing*: each Player output `R|send` / `R|actuate` waits for its
 * Opponent input `L|recv` / `L|observe`. Otherwise it is the receptive total
 * strategy on $A^\perp \| B$ — every Opponent input admitted (receptivity),
 * every Player output committed once configuration-enabled.
 */
export function morphismOf(c: Character): Morphism {
  const a = inputArena(c);
  const b = outputArena(c);
  const compound = compoundArena(a, b);
  if (characterIsSymmetricPeer(c)) {
    const admitPlayer = (history: ReturnType<typeof play>, move: string): boolean => {
      const pairedInput = PAIRED_INPUT[move.slice(2)];
      return pairedInput !== undefined && history.moves.includes(`L|${pairedInput}`);
    };
    return morphism(a, b, strategy(compound, enumeratePlays(compound, admitPlayer)));
  }
  return morphism(a, b, strategy(compound, enumeratePlays(compound, () => true)));
}
