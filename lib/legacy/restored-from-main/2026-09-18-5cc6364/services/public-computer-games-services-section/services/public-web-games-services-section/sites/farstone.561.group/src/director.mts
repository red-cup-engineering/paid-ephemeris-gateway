import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { placeOf, tell, value, values } from "@red-cup-engineering/feltos/world";
import { settleOffSeason } from "./campaign.mts";

export const HUNGER_DEMAND = 14;
export const HUNGER_SATED = 6;

export function demandFor(hunger: number): { want: string; reward: number } | null {
  return hunger >= HUNGER_DEMAND ? { want: "edible", reward: 5 + hunger } : null;
}

const ROLE_WANTS = Object.freeze([
  { tag: "innkeeper", want: "fish", reward: 10 },
  { tag: "smith", want: "iron", reward: 16 },
  { tag: "shopkeeper", want: "fish", reward: 9 },
  { tag: "lamp-keeper", want: "fiber", reward: 8 },
]);

export function roleDemandFor(tags: readonly string[]): { want: string; reward: number } | null {
  const role = ROLE_WANTS.find((entry) => tags.includes(entry.tag));
  return role === undefined ? null : { want: role.want, reward: role.reward };
}

function stableHash(text: string): number {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  return hash >>> 0;
}

const tagsOf = (world: unknown, subject: string): readonly string[] => values(world, subject, "tag").filter((tag): tag is string => typeof tag === "string");
const numberAt = (world: unknown, subject: string, predicate: string, fallback = 0): number => {
  const number = Number(value(world, subject, predicate));
  return Number.isFinite(number) ? number : fallback;
};

export const farstoneDirectorCapability = defineCapability({
  id: "farstone.director",
  onTick(ctx) {
    let world = ctx.world;
    for (const actor of ctx.actors) {
      if (value(world, actor, "coin") === null) {
        world = tell(world, [
          { subject: actor, predicate: "coin", object: 250 },
          { subject: actor, predicate: "skill", object: 0 },
          { subject: actor, predicate: "thoughts-fixed", object: 0 },
          { subject: actor, predicate: "structures-built", object: 0 },
          { subject: actor, predicate: "permit-resolved", object: 0 },
          { subject: actor, predicate: "standing", object: 0 },
          { subject: actor, predicate: "campaign-stage", object: 0 },
        ], { source: "farstone.admission" });
      }
      world = settleOffSeason(world, actor).world;
    }

    const npcs = Object.keys(ctx.game.things).filter((id) => value(world, id, "kind") === "npc");
    const claims: { subject: string; predicate: string; object: unknown }[] = [];
    for (const npc of npcs) {
      if (ctx.tick % 5 === stableHash(npc) % 5) {
        const hunger = numberAt(world, npc, "need:hunger") + 1;
        const demand = demandFor(hunger) ?? roleDemandFor(tagsOf(world, npc));
        claims.push({ subject: npc, predicate: "need:hunger", object: hunger });
        if (demand !== null) claims.push(
          { subject: npc, predicate: "wants", object: demand.want },
          { subject: npc, predicate: "want-reward", object: demand.reward },
        );
      }
      if (ctx.tick % 17 === stableHash(npc) % 17) {
        const room = placeOf(world, npc);
        const exits = room === null ? [] : Object.values(ctx.game.rooms[room]?.exits ?? {});
        if (exits.length > 0) claims.push({ subject: npc, predicate: "located-in", object: exits[stableHash(`${npc}:${ctx.tick}`) % exits.length]! });
      }
    }

    if (ctx.tick % 23 === 0) {
      for (const npc of npcs) {
        const rivalTag = tagsOf(world, npc).find((tag) => tag.startsWith("rival:"));
        const rival = rivalTag?.slice(6);
        if (rival !== undefined && placeOf(world, rival) === placeOf(world, npc)) {
          claims.push({ subject: rival, predicate: "health", object: Math.max(0, numberAt(world, rival, "health", 20) - 1) });
        }
      }
    }

    const stock = Math.max(0, numberAt(world, "the-fishing-grounds", "fish-stock", 40) + (ctx.tick % 7 === 0 ? -2 : 0.2));
    claims.push(
      { subject: "the-fishing-grounds", predicate: "fish-stock", object: stock },
      { subject: "farstone-market", predicate: "price:fish", object: 2 + (40 - Math.min(40, stock)) / 10 },
    );
    world = tell(world, claims, { source: "farstone.simulation" });
    return { world };
  },
});
