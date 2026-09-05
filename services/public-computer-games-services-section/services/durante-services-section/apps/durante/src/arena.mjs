// arena — durante's LEVEL, and the first twist: the arena is not authored once, it is the FEDERATED
// MERGE of every player's trace. abrash already reads a voxel world as the fold of an append-only trace
// (a voxel two peers disagree about folds to ⊤ and renders shivering). durante leans on exactly that:
// a deathmatch arena is the union ∥ of the traces the peers brought to it. Two peers who lay the SAME
// wall agree (t, a settled wall). Two peers who disagree about a wall — one built it, one carved it —
// leave it ⊤: a CONTESTED wall that shivers AND, here, is a PHASE GATE you can walk through, precisely
// because nobody agrees it is solid (abrash's collision `passContested` honors this).
//
// This module is pure over abrash's world: it builds a starting arena trace, federates a peer's trace
// into it (no coordinator, no last-write-wins — the G-Set union the substrate provides), and reads the
// merged geometry back as a grid. It re-derives NOTHING about federation; it composes abrash's world.
//
// Ported from the legacy 2026-08-17-vps-561-group archive's apps/games/durante/src/arena.mjs. The ONLY
// change from the legacy source: the import now names the published @red-cup-engineering/abrash package
// (browser port's engine) instead of the unpublished workspace `@561-group/abrash`. Every function body
// is byte-identical to the legacy file.

import {
  worldFromRows, federate, grid, predicate, deny, cellKey, FOUR, disagreements,
} from "@red-cup-engineering/abrash/world";

// ── building an arena from a wall sketch ────────────────────────────────────────────────────────
// A sketch is a list of strings, one per z-row, '#' a solid wall, '.' open floor, '~' a CARVED voxel
// (a peer's deny — an explicitly opened wall, f, passable but evidenced). The sketch's row index is z,
// the column index is x. Each glyph becomes a row in the trace under its voxel subject. The OBJECT is the
// stable token `"wall"` (NOT tagged by peer): two peers must predicate the SAME (subject,object) for the
// substrate to see a contradiction — one's `solid wall` and the other's `not-solid wall` fold to ⊤ on
// the same cell. The two peers stay distinct as separate WITNESSES (distinct rows / evidence hashes),
// which the LAW keeps linearly; `by` only stamps the time-lane so the rows don't collide as duplicates.
export function arenaRows(sketch, by = "host", t = 1) {
  const rows = [];
  sketch.forEach((line, z) => {
    [...line].forEach((ch, x) => {
      if (ch === "#") rows.push(predicate(cellKey(x, z), "solid", "wall", t));
      else if (ch === "~") rows.push(deny(cellKey(x, z), "solid", "wall", t));
      // '.' and anything else: open floor — no solidity evidence at all, ⊥ fog you can walk.
    });
  });
  return rows;
}

// arenaWorld(sketch, by) — a fresh abrash world holding one peer's arena trace.
export function arenaWorld(sketch, by = "host", t = 1) {
  return worldFromRows(arenaRows(sketch, by));
}

// mergeArena(a, b) — THE TWIST, in one call: the deathmatch arena is the FEDERATED MERGE of two
// players' worlds. federate is the G-Set union ∥ — order-independent, no coordinator, no last-write-
// wins. Where the two traces agree on a wall it stays t; where they DISAGREE (one solid, one its
// converse) the merged voxel folds to ⊤ — a contested wall, shivering and phase-walkable. Returns the
// merged abrash world; read it with `grid` or `arenaGrid`.
export function mergeArena(a, b) {
  return federate(a, b);
}

// arenaGrid(world, opts) — read the merged world's geometry as an abrash grid. opts.passContested
// (default true here — a deathmatch arena treats a contested wall as a phase gate) flows to the grid
// reading only insofar as the caller passes it to collision; the grid itself just reports charges.
export function arenaGrid(world, opts = {}) {
  return grid(world, opts);
}

// contestedWalls(world) — the ⊤ voxels in the merged arena: the walls the peers disagree about, each
// carrying BOTH witnesses (the LAW: ⊤ held, nobody erased). A game surfaces these as the phase gates.
export function contestedWalls(world) {
  return disagreements(world)
    .filter((d) => /^voxel:-?\d+,-?\d+$/.test(d.subject))
    .map((d) => {
      const m = /^voxel:(-?\d+),(-?\d+)$/.exec(d.subject);
      return { subject: d.subject, x: Number(m[1]), z: Number(m[2]), witnesses: d };
    });
}

// census(world) — the four-value tally of the arena's solidity (audit on demand: calm by default, the
// contested count is the headline). t settled walls, f carved openings, ⊤ contested gates, ⊥ open floor
// is implicit (not in the grid). Pure read.
export function census(world) {
  const g = grid(world);
  const c = { t: 0, f: 0, top: 0 };
  for (const cell of g.cells.values()) {
    if (cell.charge === FOUR.T) c.t++;
    else if (cell.charge === FOUR.F) c.f++;
    else if (cell.charge === FOUR.TOP) c.top++;
  }
  return c;
}

export { worldFromRows, grid, predicate, deny, cellKey, FOUR, federate };
