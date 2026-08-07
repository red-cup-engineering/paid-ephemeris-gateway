/**
 * Characters — agents as concurrent-game participants, the bridge that roots
 * `@emsenn/gaming` in `@emsenn/animating`.
 *
 * The corpus claim *embodied-handedness-is-player-opponent-duality*
 * (`concurrent-game-system.md:363-381`) is a theorem: an embodied participant's
 * four-tuple handedness $h(p) = (\mathrm{recv}, \mathrm{send}, \mathrm{actuate},
 * \mathrm{observe})$ IS Player/Opponent duality $(-)^\perp$ in $\mathbf{CGS}$. A
 * morphism $A \to B$ is a strategy on $A^\perp \| B$, and the four coordinates
 * partition by which side of that duality they sit on:
 *
 *   - `recv`, `observe` — **Opponent-side** on the input arena $A$ (the
 *     environment dictates; the participant receives);
 *   - `send`, `actuate` — **Player-side** on the output arena $B$ (the
 *     participant commits; the environment receives).
 *
 * `@emsenn/animating` keeps `handedness` self-contained on the bilattice charge so
 * the agent substrate stays foundational; its own JSDoc records that the
 * *categorical home* of these coordinates — Player/Opponent polarity in a
 * concurrent game system — "is realized in game-algebra". This module is that
 * home. A **Character** is the substrate record of one participant's four
 * bounded coordinates, partitioned by side; `sides` exposes the $A^\perp \| B$
 * split so a reader sees the morphism shape, and a *symmetric peer* (the fixed
 * point of the dual: `recv = send`, `observe = actuate`) is recorded as the
 * degenerate **copycat** — recorded, never imposed (`concurrent-game-system.md:379`,
 * "asymmetry is recorded, not refused").
 *
 * This module owns no composition: a Character IS the *shape* of a morphism; the
 * composable 1-cell it realizes (copycat identity, interaction-plus-hiding) is
 * earned in `@emsenn/computing`, one layer up. Here we only record the shape and
 * its polarity partition, reusing the game's own `Polarity` carrier — no second
 * encoding of duality.
 */
import type { ChargeValueName } from "@emsenn/relating";
import {
  chargeAt,
  coordinateSide,
  type Handedness,
  type HandednessCoordinate,
  handednessCoordinates,
  isHandedness,
  isSymmetricPeer,
} from "@emsenn/animating";
import { type Polarity, polarityOfHandednessSide } from "../../../polarity.mjs";

/**
 * A character: one participant viewed as a concurrent-game morphism shape, named
 * by its agent handedness. It carries no algebra and no I/O — it is a pure
 * typing over a handedness, partitioned by the Player/Opponent duality.
 */
export interface Character {
  readonly kind: "game.character";
  /** A label for the participant (the empty string when unnamed). */
  readonly label: string;
  /** The agent's four-tuple capacity charges — the bridge's only admission. */
  readonly handedness: Handedness;
}

/** Build a character from an agent handedness and an optional label. */
export function character(handedness: Handedness, label = ""): Character {
  return Object.freeze({
    kind: "game.character" as const,
    label,
    handedness,
  });
}

/**
 * The game `Polarity` a handedness coordinate sits at, by the CGS theorem:
 * Player-side coordinates (`send`, `actuate`) commit output and are `positive`
 * (Player); Opponent-side coordinates (`recv`, `observe`) take input and are
 * `negative` (Opponent). We reuse the apex's `Polarity`, not a new encoding.
 */
export function coordinatePolarity(coordinate: HandednessCoordinate): Polarity {
  return polarityOfHandednessSide(coordinateSide(coordinate));
}

/**
 * One coordinate's face in the morphism shape: its handedness coordinate carrier
 * records the side of $(-)^\perp$ it sits on; the face adds the game polarity
 * that side commits and the capacity charge the participant carries there.
 */
export interface CoordinateFace {
  readonly kind: "game.character.face";
  readonly coordinate: HandednessCoordinate;
  readonly polarity: Polarity;
  readonly capacity: ChargeValueName;
}

function coordinateFace(handedness: Handedness, coordinate: HandednessCoordinate): CoordinateFace {
  return Object.freeze({
    kind: "game.character.face" as const,
    coordinate,
    polarity: coordinatePolarity(coordinate),
    capacity: chargeAt(handedness, coordinate),
  });
}

/**
 * The $A^\perp \| B$ partition of a character: the input side $A$ (the
 * Opponent-side coordinates `recv`, `observe`) and the output side $B$ (the
 * Player-side coordinates `send`, `actuate`). Exposing the split lets a reader
 * see the morphism shape without re-deriving the duality theorem.
 */
export interface CharacterSides {
  readonly kind: "game.character.sides";
  /** Input arena $A$ — the Opponent-side coordinates (`recv`, `observe`). */
  readonly input: readonly CoordinateFace[];
  /** Output arena $B$ — the Player-side coordinates (`send`, `actuate`). */
  readonly output: readonly CoordinateFace[];
}

/** Expose a character's $A^\perp \| B$ partition, grouped by duality side. */
export function sides(c: Character): CharacterSides {
  const faces = handednessCoordinates().map((coordinate) => coordinateFace(c.handedness, coordinate));
  return Object.freeze({
    kind: "game.character.sides" as const,
    input: Object.freeze(faces.filter((face) => face.coordinate.side === "opponent")),
    output: Object.freeze(faces.filter((face) => face.coordinate.side === "player")),
  });
}

/**
 * Whether a character is a *symmetric peer* — the fixed point of the dual
 * (`recv = send`, `observe = actuate`), which realizes as the degenerate copycat
 * morphism on the self-dual arena $A^\perp \| A$. Recorded from the handedness,
 * never imposed; the generic character is the asymmetric morphism.
 */
export const characterIsSymmetricPeer = (c: Character): boolean => isSymmetricPeer(c.handedness);

/** Type guard for `Character`: tagged `"game.character"` over a valid handedness. */
export function isCharacter(value: unknown): value is Character {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Character>;
  return candidate.kind === "game.character"
    && typeof candidate.label === "string"
    && isHandedness(candidate.handedness);
}
