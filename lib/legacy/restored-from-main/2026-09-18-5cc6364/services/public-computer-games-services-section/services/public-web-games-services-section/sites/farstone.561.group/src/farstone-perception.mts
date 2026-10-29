// farstone-perception — the agent-legible perception frame Farstone hands qwzspace as an entity's
// render state, Farstone's counterpart to Tidepool's own `perception.mts` (tidepool-services-section
// sibling) — SAME top-level shape (`{ kind, tick, actor, place, occupants, subjects, clock,
// recentEvents }`), same rationale: qwzspace does not own the shape of an entity's render state (the
// entries ride inside snapshot.e/delta.c; qwzspace never inspects them) — this layer defines that
// shape as the feltos perception frame itself. Built from the same real, already-composed feltos
// surfaces Tidepool's own perception.mts uses:
//   - world.mjs's `perceive(world, actor)` — a STRUCTURAL restriction (remote state is absent, not
//     hidden), which is exactly why `subjects` below is safe to hand an agent whole.
//   - world.mjs's `settleSubject` + four.mjs's `fourName` (via `evidenceName`) — every cell carries
//     its FOUR evidence-name. This matters concretely for Farstone, not just in principle: the harbor
//     bible (farstone-game.mts) seeds TWO genuinely contested cells — `the-dredging-permit`'s
//     `decision-status` and `hydrant-23`'s `water-quality` — both of which settle to `both` until
//     `petition`/`inspect` (farstone-arcs.mts) resolve them, and an agent reading this frame must see
//     that contest as data, never a silently-picked side.
//   - `farstoneAffordances` (this file) — predication.mjs's own base `examine`/`take`/`drop`/`say`,
//     extended per-subject with exactly the verbs Farstone's own capabilities actually implement
//     (farstone-progression.mts's `work`/`fish`/`build`/`think`, farstone-climate.mts's `almanac`,
//     farstone-arcs.mts's `petition`/`inspect`, depths.mts's `attack`) — gated the same way each
//     capability's own handler gates itself, named per verb below. No verb is invented here that the
//     engine does not already accept.

import { affordances as baseAffordances } from "@red-cup-engineering/feltos/predication";
import { contentsOf, evidenceName, perceive, placeOf, settleSubject, value, values } from "@red-cup-engineering/feltos/world";
import {
  admit,
  createPerceptionFrameType,
  displayName,
  exitsOf,
  specializePerceptionClockType,
  type PerceptionEvent,
} from "@red-cup-engineering/feltos-perception-frame-service";
import { farstoneClimateReport } from "./farstone-climate.mts";

export const PERCEPTION_KIND = "farstone.perception.v1";

export type { PerceptionEvent };

/** Farstone's own clock adds harborClosed/shellfishClosed/fireDanger to the shared feltos-
 *  perception-frame-service six-field clock every game reports — see farstoneClimateReport. */
const FARSTONE_CLOCK_TYPE = specializePerceptionClockType(
  "farstone.climate-clock@1",
  "Farstone's climate clock",
  "The shared feltos clock plus Farstone's own harbor/shellfish/fire-danger fields.",
  {
    required: ["harborClosed", "shellfishClosed", "fireDanger"],
    properties: {
      harborClosed: { type: "boolean" },
      shellfishClosed: { type: "boolean" },
      fireDanger: { type: "string", minLength: 1 },
    },
  },
);

/** Farstone's own perception-frame type — the shared shape (feltos-perception-frame-service)
 *  discriminated by PERCEPTION_KIND and carrying Farstone's own clock. `perceptionFrame` below
 *  `admit()`s every constructed frame against this before returning it, so a shape bug is caught
 *  at runtime, in the same place every other admission refusal in the house is caught. */
const FARSTONE_FRAME_TYPE = createPerceptionFrameType(PERCEPTION_KIND, FARSTONE_CLOCK_TYPE);

/** predication.mjs's affordances() extended with Farstone's own verbs, in-band, per subject — one
 *  entry per real capability command, gated exactly the way that command's own handler gates itself
 *  (see each branch's cited source file). */
export function farstoneAffordances(world: unknown, actor: string, target: string): string[] {
  const result = new Set<string>(baseAffordances(world, actor, target));
  const kind = value(world, target, "kind");

  if (kind === "room") {
    // universal built-in verbs (engine.mjs) — every room affords looking and moving.
    result.add("look");
    result.add("go");
  }

  if (kind === "npc") {
    // depths.mts's attack: co-located, and only while the target is not already dead.
    const alive = value(world, target, "condition") !== "dead";
    if (alive && placeOf(world, target) === placeOf(world, actor)) result.add("attack");
  }

  if (kind === "actor" && target === actor) {
    // engine.mjs's own built-in.
    result.add("inventory");
    // farstone-progression.mts: work/build have no location or state gate in their own handlers.
    result.add("work");
    result.add("build");
    // farstone-climate.mts's almanac/forecast: always available, no gate in its own handler.
    result.add("almanac");
    // farstone-progression.mts's fish: mirrors the handler's own "grounds fished bare" check.
    const fishStock = Number(value(world, "the-fishing-grounds", "fish-stock") ?? 0);
    if (fishStock > 0) result.add("fish");
    // farstone-progression.mts's think: mirrors the handler's own "a thought already occupies you" check.
    if (value(world, actor, "active-thought") === null) result.add("think");
    // farstone-arcs.mts's petition/inspect: both handlers gate on the ACTOR's own current room
    // carrying the "civic" tag (their shared `civic()` helper) — not on the target's location.
    const room = placeOf(world, actor);
    const roomTags = room === null ? [] : values(world, room, "tag");
    if (roomTags.includes("civic")) {
      const permitStatus = value(world, "the-dredging-permit", "decision-status");
      if (permitStatus === "contested") result.add("petition");
      result.add("inspect");
    }
  }

  return [...result].sort();
}

/** The pure projector: (world, actor, tick, recentEvents) -> one agent-legible frame. */
export function perceptionFrame(world: unknown, actor: string, tick: number, recentEvents: PerceptionEvent[] = []) {
  const view = perceive(world, actor);
  const place = view.place;
  const occupants = place === null ? [] : contentsOf(world, place).filter((id) => id !== actor).map((id) => ({ id, name: displayName(world, id) }));
  const subjects = view.subjects.map((id) => ({
    id,
    cells: settleSubject(world, id).map((cell) => ({ predicate: cell.predicate, object: cell.object, evidence: evidenceName(cell) })),
    affordances: farstoneAffordances(world, actor, id),
  }));
  const climate = farstoneClimateReport(world);
  const frame = {
    kind: PERCEPTION_KIND,
    tick,
    actor,
    place: place === null ? null : {
      id: place,
      name: displayName(world, place),
      description: String(value(world, place, "description") ?? ""),
      exits: exitsOf(world, place),
    },
    occupants,
    subjects,
    clock: {
      time: climate.time,
      phase: climate.phase,
      season: climate.season,
      tide: climate.tide,
      weather: climate.weather,
      dryStreak: climate.dryStreak,
      harborClosed: climate.harborClosed,
      shellfishClosed: climate.shellfishClosed,
      fireDanger: climate.fireDanger,
    },
    recentEvents,
  };
  const admitted = admit(FARSTONE_FRAME_TYPE, frame);
  if (!admitted.ok) throw new Error(`farstone-perception: perception frame shape refused: ${JSON.stringify(admitted.refusal)}`);
  return admitted.value;
}

export type PerceptionFrame = ReturnType<typeof perceptionFrame>;

/** The qwzspace snapshot-manager entry shape: `{ id, ...perceptionFrame }` so `id` matches the actor
 *  subject and the whole frame rides verbatim inside snapshot.e / delta.c. */
export function perceptionSnapEntry(world: unknown, actor: string, tick: number, recentEvents: PerceptionEvent[] = []): { id: string } & PerceptionFrame {
  return { id: actor, ...perceptionFrame(world, actor, tick, recentEvents) };
}
