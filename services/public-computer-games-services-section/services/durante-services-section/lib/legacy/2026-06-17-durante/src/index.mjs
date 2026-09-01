// durante — a QUAKE-like FPS on @561-group/abrash (software 3D over the daleske pixel terminal). The
// barrel re-export so a caller can `import { game, tick, shoot, spawn, mergeArena } from
// "@561-group/durante"`.
//
// The three twists, by module (each pure unless noted):
//   arena   — THE LEVEL IS A MERGE OF TRACES: a deathmatch arena is the federated union ∥ of every
//             player's wall-trace; a wall two peers disagree about folds to ⊤ — a CONTESTED wall that
//             shivers AND is a PHASE GATE (walkable, because nobody agrees it is solid).
//   demon   — THE ENEMY IS HELD ⊤: a demon's vitality is the FOLD of an append-only trace — affirmed
//             alive by its spawn, denied alive by each wound — so between first blood and the kill it is
//             alive-AND-dead, a held contradiction, until enough deny-evidence SETTLES it to f (dead).
//   combat  — A WEAPON'S EFFECT IS EVIDENCE: a shot is a hitscan ray; a landing shot does not subtract a
//             hit-point, it APPENDS deny(demon,'alive') — a wound is a witness kept (evidence linear).
//   game    — the tick loop tying them over abrash's engine: move (contested walls phase-walkable), fire
//             (fold wounds), demon chase (a melee demon CONTESTS your tile to ⊤), re-grid, project.

export {
  arenaRows, arenaWorld, mergeArena, arenaGrid, contestedWalls, census,
} from "./arena.mjs";

export {
  spawn, wound, move as demonMove, vitalityOf, positionOf, speedOf, chaseStep,
  woundsOf, demonKey, VITAL,
} from "./demon.mjs";

export { hitDemon, shoot } from "./combat.mjs";

export {
  game, spawnDemon, liveDemons, tick, status, run, audit,
} from "./game.mjs";
