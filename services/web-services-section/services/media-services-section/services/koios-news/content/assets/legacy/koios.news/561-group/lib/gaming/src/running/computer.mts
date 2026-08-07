/**
 * GameComputer — the thin orchestrator over the pure transitions.
 *
 * It holds an immutable registry (a `Map`) of running games keyed by id and
 * exposes create/get/list/apply, each delegating to the pure transitions of
 * `game.mjs` and returning a *new* immutable snapshot of the computer — never
 * mutating in place.  No I/O: persistence is `store.mjs` / the server's job (via
 * `snapshot`/`restore`).  Per the corpus, each game in the registry IS a
 * concurrent game system; the computer is merely the registry around them.
 */
import type { Arena, Design } from "../index.mjs";
import type {
  Game,
  AddDesignObstruction,
  PlayMoveObstruction,
  InteractionObstruction,
  SettleObstruction,
} from "./game.mjs";
import { createGame, addDesign, playMove, runInteraction, settle, isGame } from "./game.mjs";

/** An operation applied to a named game in the registry. */
export type GameOp =
  | { readonly kind: "addDesign"; readonly designId: string; readonly design: Design }
  | { readonly kind: "playMove"; readonly move: string }
  | { readonly kind: "runInteraction"; readonly designIdA: string; readonly designIdB: string }
  | { readonly kind: "settle" };

/** The obstruction returned when an op targets a game id absent from the registry. */
export interface UnknownGameObstruction {
  readonly kind: "game.computer.unknown-game-obstruction";
  readonly id: string;
}

/** The result of `apply`: the updated computer plus the new game state or an obstruction. */
export type ApplyResult =
  | {
      readonly kind: "game.computer.apply:witness";
      readonly computer: GameComputer;
      readonly game: Game;
    }
  | {
      readonly kind: "game.computer.apply-obstruction";
      readonly obstruction:
        | UnknownGameObstruction
        | AddDesignObstruction
        | PlayMoveObstruction
        | InteractionObstruction
        | SettleObstruction;
    };

function transition(g: Game, op: GameOp): Game | AddDesignObstruction | PlayMoveObstruction | InteractionObstruction | SettleObstruction {
  switch (op.kind) {
    case "addDesign":
      return addDesign(g, op.designId, op.design);
    case "playMove":
      return playMove(g, op.move);
    case "runInteraction":
      return runInteraction(g, op.designIdA, op.designIdB);
    case "settle":
      return settle(g);
  }
}

/** A thin, immutable registry of running games. */
export class GameComputer {
  readonly #games: ReadonlyMap<string, Game>;

  constructor(games?: ReadonlyMap<string, Game>) {
    this.#games = new Map(games ?? []);
  }

  /** Create a fresh game over an arena and return the new computer plus that game. */
  create(id: string, arena: Arena): { readonly computer: GameComputer; readonly game: Game } {
    const g = createGame(id, arena);
    return { computer: this.#with(g), game: g };
  }

  /** The game registered under `id`, or `undefined`. */
  get(id: string): Game | undefined {
    return this.#games.get(id);
  }

  /** All registered games, in insertion order. */
  list(): readonly Game[] {
    return Object.freeze([...this.#games.values()]);
  }

  /** Apply an op to a named game via the pure transitions, returning a new computer or an obstruction. */
  apply(id: string, op: GameOp): ApplyResult {
    const current = this.#games.get(id);
    if (current === undefined) {
      return {
        kind: "game.computer.apply-obstruction",
        obstruction: { kind: "game.computer.unknown-game-obstruction", id },
      };
    }
    const next = transition(current, op);
    if (!isGame(next)) {
      return { kind: "game.computer.apply-obstruction", obstruction: next };
    }
    return { kind: "game.computer.apply:witness", computer: this.#with(next), game: next };
  }

  #with(g: Game): GameComputer {
    const next = new Map(this.#games);
    next.set(g.id, g);
    return new GameComputer(next);
  }
}
