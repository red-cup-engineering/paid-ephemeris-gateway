// perception — the agent-legible perception frame (design §2.1), the ONE thing this game hands
// qwzspace as an entity's render state (protocol.mjs's own header: "qwzspace does not own the
// shape of an entity's render state... the entries ride inside snapshot.e/delta.c; this layer
// never inspects them"). Built from three real, already-composed feltos surfaces:
//   - world.mjs's `perceive(world, actor)` — a STRUCTURAL restriction (remote state is absent,
//     not hidden), which is exactly why `subjects` below is safe to hand an agent whole.
//   - world.mjs's `settleSubject` + four.mjs's `fourName` — every cell carries its FOUR
//     evidence-name (`neither`/`true`/`false`/`both`); a contested cell renders as `both`, never
//     silently resolved. This is the load-bearing design choice from §2.1.
//   - `tidepoolAffordances` (this file) — predication.mjs's own `affordances()` (examine/take/
//     drop/say) extended, in-band, per subject, the same way the design brief frames it: a room
//     affords `harvest` only when its cell has stock, `dive` only when the tide is high/rising,
//     and so on — an agent parses ONE frame and knows both what it sees and what it can do.

import { affordances as baseAffordances } from "@red-cup-engineering/feltos/predication";
import { contentsOf, evidenceName, perceive, settleSubject, value } from "@red-cup-engineering/feltos/world";
import { clockReport, clockTime, tideAt } from "@red-cup-engineering/feltos/world-clock";
import { ecologyOf } from "@red-cup-engineering/feltos/ecology";
import {
  BUILD_ROOM, DIVE_ROOM, HARVEST_WARE_OF, MARKET_ROOM, UNDERWATER_ROOMS,
} from "./tidepool-game.mts";
import { WEIR_POLITY } from "./cap-governance.mts";

export const PERCEPTION_KIND = "tidepool.perception.v1";

export interface PerceptionCell {
  predicate: string;
  object: unknown;
  evidence: string;
}

export interface PerceptionSubject {
  id: string;
  cells: PerceptionCell[];
  affordances: string[];
}

export interface PerceptionEvent {
  tick: number;
  channel: string;
  text: string;
}

export interface PerceptionFrame {
  kind: typeof PERCEPTION_KIND;
  tick: number;
  actor: string;
  place: { id: string; name: string; description: string; exits: string[] } | null;
  occupants: { id: string; name: string }[];
  subjects: PerceptionSubject[];
  clock: { time: number; phase: string; season: string; tide: string; weather: string; dryStreak: number };
  recentEvents: PerceptionEvent[];
}

function displayName(world: unknown, subject: string): string {
  const name = value(world, subject, "name");
  return typeof name === "string" ? name : subject;
}

function exitsOf(world: unknown, room: string): string[] {
  return settleSubject(world, room)
    .filter((cell) => cell.predicate.startsWith("exit:") && cell.evidence.positiveEvidence)
    .map((cell) => cell.predicate.slice(5))
    .sort();
}

/** predication.mjs's affordances() extended with Tidepool's own verbs (design §2.2), in-band. */
export function tidepoolAffordances(world: unknown, actor: string, target: string): string[] {
  const result = new Set<string>(baseAffordances(world, actor, target));
  const kind = value(world, target, "kind");

  if (kind === "room") {
    result.add("look");
    result.add("go");
    result.add("listen");
    result.add("emote");
    result.add("signal");
    result.add("mark");
    result.add("share");
    result.add("ask");
    if (target in HARVEST_WARE_OF) {
      const eco = ecologyOf(world, target);
      if (eco.stock > 0) result.add("harvest");
      if (eco.pollution > 0) result.add("tend");
    }
    if (target === MARKET_ROOM) result.add("trade");
    if (target === BUILD_ROOM) result.add("build");
    // Real gap found running a live mixed session (2026-08-20): propose/support/enact
    // (cap-governance.mts) existed as real, working commands but were never enumerated here,
    // unlike every other verb in the game — a player driven purely off this frame (an LLM given
    // only the frame, or a bot with no out-of-band verb knowledge) could never discover
    // governance existed at all. Fixed the same way every other room-conditional verb already
    // works: enumerated at the one room (the weir) where it's meaningful.
    if (target === WEIR_POLITY) { result.add("propose"); result.add("support"); result.add("enact"); }
    if (target === DIVE_ROOM) {
      const tide = tideAt(clockTime(world));
      if (tide === "high" || tide === "rising") result.add("dive");
    }
    if ((UNDERWATER_ROOMS as readonly string[]).includes(target)) result.add("surface");
  }
  if (kind === "word") result.add("unfold");
  if (kind === "actor" && target === actor) {
    result.add("inventory");
  }

  return [...result].sort();
}

/** The pure projector: (world, actor, tick, recentEvents) -> one agent-legible frame. */
export function perceptionFrame(world: unknown, actor: string, tick: number, recentEvents: PerceptionEvent[] = []): PerceptionFrame {
  const view = perceive(world, actor);
  const place = view.place;
  const occupants = place === null ? [] : contentsOf(world, place).filter((id) => id !== actor).map((id) => ({ id, name: displayName(world, id) }));
  const subjects: PerceptionSubject[] = view.subjects.map((id) => ({
    id,
    cells: settleSubject(world, id).map((cell) => ({ predicate: cell.predicate, object: cell.object, evidence: evidenceName(cell) })),
    affordances: tidepoolAffordances(world, actor, id),
  }));
  const report = clockReport(world);
  return {
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
    clock: { time: report.time, phase: report.phase, season: report.season, tide: report.tide, weather: report.weather, dryStreak: report.dryStreak },
    recentEvents,
  };
}

/** The qwzspace snapshot-manager entry shape: `{ id, ...perceptionFrame }` so `id` matches the
 *  actor subject and the whole frame rides verbatim inside snapshot.e / delta.c (protocol.mjs's
 *  own "qwzspace never inspects it" contract). */
export function perceptionSnapEntry(world: unknown, actor: string, tick: number, recentEvents: PerceptionEvent[] = []): { id: string } & PerceptionFrame {
  return { id: actor, ...perceptionFrame(world, actor, tick, recentEvents) };
}
