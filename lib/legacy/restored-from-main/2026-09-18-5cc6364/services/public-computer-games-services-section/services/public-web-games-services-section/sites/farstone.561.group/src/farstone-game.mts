import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { composeCapabilities } from "@red-cup-engineering/feltos/capabilities";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { worldClockCapability } from "@red-cup-engineering/feltos/world-clock";
import { farstoneArcCapability } from "./farstone-arcs.mts";
import { farstoneClimateCapability } from "./farstone-climate.mts";
import { farstoneDepthsCapability } from "./depths.mts";
import { farstoneDirectorCapability } from "./director.mts";
import { farstoneProgressionCapability } from "./farstone-progression.mts";

export interface BibleEntity {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly location?: string;
  readonly exits?: Readonly<Record<string, string>>;
  readonly tags?: readonly string[];
}

export interface FarstoneBible {
  readonly meta: { readonly world: string; readonly playerStart: string; readonly playerStartCoin?: number };
  readonly rooms: readonly BibleEntity[];
  readonly items?: readonly BibleEntity[];
  readonly npcs?: readonly BibleEntity[];
  readonly ships?: readonly BibleEntity[];
}

const functionalPredicates = Object.freeze([
  "active-thought", "advisory", "attack", "campaign-stage", "coin", "condition", "decision-status",
  "died-at", "dry-streak", "fire-danger", "fish-stock", "harbor-closed", "health", "need:hunger",
  "permit-resolved", "price:fish", "shellfish-closed", "skill", "standing", "structures-built",
  "thought-progress", "thoughts-fixed", "want-reward", "wants", "water-quality", "weather", "world-seed", "world-time",
]);

function entityAssertions(entity: BibleEntity, kind: string) {
  const claims: { subject: string; predicate: string; object: unknown }[] = [
    { subject: entity.id, predicate: "kind", object: kind },
  ];
  for (const tag of entity.tags ?? []) {
    claims.push({ subject: entity.id, predicate: "tag", object: tag });
    const split = tag.lastIndexOf(":");
    if (split > 0) {
      const predicate = tag.slice(0, split);
      const raw = tag.slice(split + 1);
      const numeric = Number(raw);
      claims.push({ subject: entity.id, predicate, object: Number.isFinite(numeric) ? numeric : raw });
    }
  }
  if (kind === "npc") {
    if (!claims.some((claim) => claim.predicate === "health")) claims.push({ subject: entity.id, predicate: "health", object: 20 });
    claims.push({ subject: entity.id, predicate: "condition", object: "alive" });
  }
  return claims;
}

/** Convert Farstone's authored Bible into the one inert FeltOS game-data boundary. */
export function gameFromBible(bible: FarstoneBible) {
  const rooms = Object.fromEntries(bible.rooms.map((room) => [room.id, {
    name: room.name,
    description: room.description,
    exits: room.exits ?? {},
  }]));
  const entities = [
    ...(bible.items ?? []).map((entity) => ({ entity, kind: "thing" })),
    ...(bible.npcs ?? []).map((entity) => ({ entity, kind: "npc" })),
    ...(bible.ships ?? []).map((entity) => ({ entity, kind: "ship" })),
  ];
  const things = Object.fromEntries(entities.map(({ entity }) => [entity.id, {
    name: entity.name,
    description: entity.description,
    location: entity.location!,
  }]));
  const assertions = [
    ...bible.rooms.flatMap((room) => entityAssertions(room, "room")),
    ...entities.flatMap(({ entity, kind }) => entityAssertions(entity, kind)),
    { subject: "the-dredging-permit", predicate: "decision-status", object: "contested" },
    { subject: "hydrant-23", predicate: "water-quality", object: "contested" },
    { subject: "hydrant-23", predicate: "advisory", object: "boil-water" },
    { subject: "the-fishing-grounds", predicate: "fish-stock", object: 40 },
    { subject: "farstone-market", predicate: "price:fish", object: 2 },
  ];
  return defineGame({
    id: bible.meta.world,
    name: "Farstone",
    start: bible.meta.playerStart,
    rooms,
    things,
    assertions,
    functionalPredicates,
    capabilities: [
      worldClockCapability.id,
      farstoneClimateCapability.id,
      farstoneDirectorCapability.id,
      farstoneDepthsCapability.id,
      farstoneProgressionCapability.id,
      farstoneArcCapability.id,
    ],
  });
}

const harborPath = fileURLToPath(new URL("../docs/world/harbor.json", import.meta.url));
export const HARBOR_BIBLE = Object.freeze(JSON.parse(readFileSync(harborPath, "utf8")) as FarstoneBible);
export const FARSTONE_GAME = gameFromBible(HARBOR_BIBLE);
export const FARSTONE_RUNTIME = composeCapabilities([
  worldClockCapability,
  farstoneClimateCapability,
  farstoneDirectorCapability,
  farstoneDepthsCapability,
  farstoneProgressionCapability,
  farstoneArcCapability,
]);
