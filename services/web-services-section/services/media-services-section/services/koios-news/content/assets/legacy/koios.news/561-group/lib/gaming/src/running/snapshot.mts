/**
 * snapshot / restore — the codec bridge for persistence.
 *
 * Persists a running game without knowing its internals.  Per
 * `@emsenn/gaming/encoding`, "every carrier of the theory of computing has an
 * `encodeX(x): Json` and a `decodeX(json): X` such that decode round-trips
 * encode up to structural equality", reusing the algebra's own constructors so
 * a decoded carrier is a *real* frozen carrier, not a look-alike literal.
 *
 * `snapshot(game)` encodes the whole running game — id, arena, every enrolled
 * `{id, design}`, the current play, and every history entry — to `Json`.
 * `restore(json)` rebuilds it through the matching decoders.  History entries
 * have no prebuilt codec, so we compose them from `encodeInteractionReport`,
 * `encodePlay`, and primitives; the interaction/settle entries carry the report
 * and the boolean convergence verdict (the report already carries `daimonLoci`).
 */
import type { Json } from "../encoding/index.mjs";
import {
  encodeArena,
  decodeArena,
  encodeDesign,
  decodeDesign,
  encodePlay,
  decodePlay,
  encodeInteractionReport,
  decodeInteractionReport,
  asObject,
  asArray,
  asString,
  asBoolean,
  field,
} from "../encoding/index.mjs";
import type { Game, GameDesign, HistoryEntry, MoveEntry, InteractionEntry, SettleEntry } from "./game.mjs";
import { game } from "./game.mjs";

function encodeGameDesign(d: GameDesign): Json {
  return { id: d.id, design: encodeDesign(d.design) };
}

function decodeGameDesign(json: unknown): GameDesign {
  const o = asObject(json, "game design");
  return Object.freeze({
    kind: "game.computer.design",
    id: asString(field(o, "id", "game design id"), "game design id"),
    design: decodeDesign(field(o, "design", "game design")),
  } as const);
}

function encodeHistoryEntry(e: HistoryEntry): Json {
  switch (e.kind) {
    case "game.computer.move":
      return { kind: e.kind, move: e.move, play: encodePlay(e.play) };
    case "game.computer.interaction":
    case "game.computer.settle":
      return {
        kind: e.kind,
        designIdA: e.designIdA,
        designIdB: e.designIdB,
        report: encodeInteractionReport(e.report),
        converged: e.converged,
      };
  }
}

function decodeHistoryEntry(json: unknown): HistoryEntry {
  const o = asObject(json, "history entry");
  const kind = asString(field(o, "kind", "history entry kind"), "history entry kind");
  if (kind === "game.computer.move") {
    const entry: MoveEntry = Object.freeze({
      kind: "game.computer.move",
      move: asString(field(o, "move", "move"), "move"),
      play: decodePlay(field(o, "play", "move play")),
    });
    return entry;
  }
  if (kind === "game.computer.interaction" || kind === "game.computer.settle") {
    const designIdA = asString(field(o, "designIdA", "designIdA"), "designIdA");
    const designIdB = asString(field(o, "designIdB", "designIdB"), "designIdB");
    const report = decodeInteractionReport(field(o, "report", "interaction report"));
    const converged = asBoolean(field(o, "converged", "converged"), "converged");
    if (kind === "game.computer.interaction") {
      const entry: InteractionEntry = Object.freeze({
        kind: "game.computer.interaction",
        designIdA,
        designIdB,
        report,
        converged,
      });
      return entry;
    }
    const entry: SettleEntry = Object.freeze({
      kind: "game.computer.settle",
      designIdA,
      designIdB,
      report,
      converged,
    });
    return entry;
  }
  throw new TypeError(`unknown history entry kind: ${kind}`);
}

/** Encode a running game to `Json` for persistence. */
export function snapshot(g: Game): Json {
  return {
    kind: "game.computer.game",
    id: g.id,
    arena: encodeArena(g.arena),
    designs: g.designs.map(encodeGameDesign),
    play: encodePlay(g.play),
    history: g.history.map(encodeHistoryEntry),
  };
}

/** Restore a running game from `Json`, rebuilding real frozen carriers via the decoders. */
export function restore(json: unknown): Game {
  const o = asObject(json, "game");
  const id = asString(field(o, "id", "game id"), "game id");
  const arena = decodeArena(field(o, "arena", "game arena"));
  const designs = asArray(field(o, "designs", "game designs"), "game designs").map(decodeGameDesign);
  const play = decodePlay(field(o, "play", "game play"));
  const history = asArray(field(o, "history", "game history"), "game history").map(decodeHistoryEntry);
  return game(id, arena, designs, play, history);
}
