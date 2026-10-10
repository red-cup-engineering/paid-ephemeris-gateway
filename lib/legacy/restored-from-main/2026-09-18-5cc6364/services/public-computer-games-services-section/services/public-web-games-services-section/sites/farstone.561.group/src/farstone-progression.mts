import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { beginThought, internalizeThought } from "@red-cup-engineering/feltos/progression";
import { placeOf, tell, value } from "@red-cup-engineering/feltos/world";
import { THOUGHTS } from "./thoughts.mts";

const numberAt = (world: unknown, subject: string, predicate: string): number => Number(value(world, subject, predicate) ?? 0);
const update = (ctx: any, claims: readonly { predicate: string; object: unknown }[], source: string) => ({
  world: tell(ctx.world, claims.map((claim) => ({ subject: ctx.actor, ...claim })), { source }),
});

function work(ctx: any) {
  const result = update(ctx, [
    { predicate: "coin", object: numberAt(ctx.world, ctx.actor, "coin") + 8 },
    { predicate: "skill", object: numberAt(ctx.world, ctx.actor, "skill") + 1 },
  ], "farstone.work");
  return { ...result, events: [ctx.message(ctx.actor, "You put your hands to the harbor's work.")] };
}

function fish(ctx: any) {
  const stock = numberAt(ctx.world, "the-fishing-grounds", "fish-stock");
  if (stock < 1) return { events: [ctx.message(ctx.actor, "The grounds are fished bare.")] };
  let world = tell(ctx.world, [
    { subject: "the-fishing-grounds", predicate: "fish-stock", object: stock - 1 },
    { subject: ctx.actor, predicate: "coin", object: numberAt(ctx.world, ctx.actor, "coin") + 4 },
    { subject: ctx.actor, predicate: "skill", object: numberAt(ctx.world, ctx.actor, "skill") + 1 },
  ], { source: "farstone.fishing" });
  return { world, events: [ctx.message(ctx.actor, "You land a silver fish and sell it on the quay.")] };
}

function think(ctx: any) {
  if (value(ctx.world, ctx.actor, "active-thought") !== null) return { events: [ctx.message(ctx.actor, "A thought already occupies you.")] };
  return { world: beginThought(ctx.world, ctx.actor, THOUGHTS[1]), events: [ctx.message(ctx.actor, "You begin internalizing the Off-Season Mind.")] };
}

function build(ctx: any) {
  const coin = numberAt(ctx.world, ctx.actor, "coin");
  if (coin < 20) return { events: [ctx.message(ctx.actor, "You need 20 coin for timber and fittings.")] };
  const id = `structure:${ctx.actor}:${ctx.tick}`;
  const world = tell(ctx.world, [
    { subject: ctx.actor, predicate: "coin", object: coin - 20 },
    { subject: ctx.actor, predicate: "structures-built", object: numberAt(ctx.world, ctx.actor, "structures-built") + 1 },
    { subject: id, predicate: "kind", object: "structure" },
    { subject: id, predicate: "name", object: "a tar-caulked fishing shack" },
    { subject: id, predicate: "owner", object: ctx.actor },
    { subject: id, predicate: "located-in", object: placeOf(ctx.world, ctx.actor) ?? ctx.actor },
  ], { source: "farstone.construction" });
  return { world, events: [ctx.message(ctx.actor, "You raise a fishing shack of your own.")] };
}

export const farstoneProgressionCapability = defineCapability({
  id: "farstone.progression",
  commands: { work, fish, think, build },
  onTick(ctx) {
    let world = ctx.world;
    for (const actor of ctx.actors) {
      const thought = value(world, actor, "active-thought");
      if (thought !== THOUGHTS[1].id) continue;
      const result = internalizeThought(world, actor, THOUGHTS[1]);
      world = result.world;
      if (result.fixed) world = tell(world, { subject: actor, predicate: "thoughts-fixed", object: numberAt(world, actor, "thoughts-fixed") + 1 }, { source: "farstone.thoughts" });
    }
    return { world };
  },
});
