import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { move, placeOf, tell, value, values } from "@red-cup-engineering/feltos/world";

export const DEFAULT_RESPAWN = 50;

export function homeOf(tags: readonly string[]): string | null {
  const tag = tags.find((entry) => entry.startsWith("home:"));
  return tag === undefined ? null : tag.slice(5);
}

const tagsOf = (world: unknown, subject: string): readonly string[] => values(world, subject, "tag").filter((tag): tag is string => typeof tag === "string");
const tagNumber = (tags: readonly string[], prefix: string, fallback: number): number => {
  const tag = tags.find((entry) => entry.startsWith(`${prefix}:`));
  const parsed = Number(tag?.slice(prefix.length + 1));
  return Number.isFinite(parsed) ? parsed : fallback;
};

function attack(ctx: any) {
  const target = ctx.argument.trim();
  if (target === "" || placeOf(ctx.world, target) !== placeOf(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Attack what?")] };
  const health = Number(value(ctx.world, target, "health") ?? 10);
  const damage = Math.max(1, Number(value(ctx.world, ctx.actor, "attack") ?? 4));
  const next = Math.max(0, health - damage);
  const claims = [{ subject: target, predicate: "health", object: next }];
  if (next === 0) claims.push(
    { subject: target, predicate: "condition", object: "dead" },
    { subject: target, predicate: "died-at", object: ctx.tick },
  );
  return {
    world: tell(ctx.world, claims, { source: "farstone.combat" }),
    events: [ctx.message(ctx.actor, next === 0 ? `${target} falls.` : `${target} has ${next} health.`)],
  };
}

export const farstoneDepthsCapability = defineCapability({
  id: "farstone.depths",
  commands: { attack },
  onTick(ctx) {
    let world = ctx.world;
    for (const subject of Object.keys(ctx.game.things)) {
      const tags = tagsOf(world, subject);
      if (!tags.includes("monster") || value(world, subject, "condition") !== "dead") continue;
      const diedAt = Number(value(world, subject, "died-at") ?? ctx.tick);
      const delay = tagNumber(tags, "respawn", DEFAULT_RESPAWN);
      if (ctx.tick - diedAt < delay) continue;
      const home = homeOf(tags) ?? placeOf(world, subject);
      world = tell(world, [
        { subject, predicate: "health", object: tagNumber(tags, "health", 10) },
        { subject, predicate: "condition", object: "alive" },
        { subject, predicate: "died-at", object: -1 },
      ], { source: "farstone.respawn" });
      if (home !== null) world = move(world, subject, home, { source: "farstone.respawn" });
    }
    return { world };
  },
});
