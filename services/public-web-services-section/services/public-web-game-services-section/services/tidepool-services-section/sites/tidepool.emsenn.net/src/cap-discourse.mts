// cap-discourse — `share` and `ask`, built directly over communicating.mjs's `meme()` and
// knowing.mjs's `absorb()`/`createKnowledge()`: the module that makes information itself a
// tradeable, uncertain good (design §1.2, `ask`/`share`). knowing.mjs's Knowledge record is a
// plain JS value, not itself world-trace-backed — this capability is "this game's own encoding
// of [it] onto an actor" (tidepool-game.mts's own functionalPredicates comment): each actor's
// Knowledge record round-trips through their `knowledge` cell (functional — an actor has
// exactly one, evolving, JSON-safe knowledge record, same shape LOCATED_IN uses for "exactly
// one current value").
//
// `share <topic>: <claim>` folds a meme into every co-located actor's own Knowledge via
// `absorb()` — which itself calls `joinKnowledge` under the hood (knowing.mjs) exactly the way
// world.mjs's own settleSubject does for nonfunctional cells: a claim repeated by two sources
// strengthens to `true`; a claim CONTRADICTED by a later `share` folds to `both`, the same
// honest "the world holds contradictions as data" law the wider game already lives by, applied
// to gossip instead of ecology.
//
// `ask <topic>` reads back what an actor has personally absorbed — never the world's ground
// truth directly, which is the point: a rumor is uncertain u`ntil corroborated or contradicted,
// and different actors can walk away from the same shore knowing different, even conflicting,
// things.

import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { declareFunctional, tell } from "@red-cup-engineering/feltos/world";
import { meme } from "@red-cup-engineering/feltos/communicating";
import { absorb, createKnowledge } from "@red-cup-engineering/feltos/knowing";

type Knowledge = ReturnType<typeof createKnowledge>;
type ValueFn = (world: unknown, subject: string, predicate: string) => unknown;

function knowledgeOf(world: unknown, actor: string, readValue: ValueFn): Knowledge {
  const raw = readValue(world, actor, "knowledge");
  if (raw !== null && typeof raw === "object" && (raw as { kind?: unknown }).kind === "feltos.knowledge.v1") {
    return raw as Knowledge;
  }
  return createKnowledge();
}

function displayName(ctx: { world: unknown; value: ValueFn }, subject: string): string {
  const name = ctx.value(ctx.world, subject, "name");
  return typeof name === "string" ? name : subject;
}

export const discourseCapability = defineCapability({
  id: "tidepool.discourse",
  commands: {
    share(ctx) {
      const raw = ctx.argument.trim();
      if (raw.length === 0) {
        return { events: [ctx.message(ctx.actor, 'Share what? Try `share <topic>: <claim>`, e.g. `share the-reef: thick with fish`.')] };
      }
      const colon = raw.indexOf(":");
      const topic = (colon === -1 ? raw : raw.slice(0, colon)).trim();
      const content = (colon === -1 ? "" : raw.slice(colon + 1)).trim();
      if (topic.length === 0 || content.length === 0) {
        return { events: [ctx.message(ctx.actor, 'Give both a topic and a claim: `share <topic>: <claim>`.')] };
      }
      const room = ctx.placeOf(ctx.world, ctx.actor);
      if (room === null) return { events: [ctx.message(ctx.actor, "There is no one here to share word with.")] };
      const claim = meme({ id: `${ctx.actor}:${ctx.world.sequence + 1}`, topic, content, charge: "true", mode: "assertion" });
      const hearers = ctx.actors.filter((id: string) => ctx.placeOf(ctx.world, id) === room);
      let world = ctx.world;
      const events = [];
      const speakerName = displayName(ctx, ctx.actor);
      for (const hearer of hearers) {
        const knowledge = absorb(knowledgeOf(world, hearer, ctx.value), {
          subject: claim.topic, predicate: "rumor", object: claim.content, charge: claim.charge,
        });
        world = tell(declareFunctional(world, ["knowledge"]), { subject: hearer, predicate: "knowledge", object: knowledge }, { source: "tidepool.discourse" });
        events.push(ctx.message(
          hearer,
          hearer === ctx.actor ? `You share word about ${topic}: "${content}"` : `${speakerName} shares word about ${topic}: "${content}"`,
          "rumor",
        ));
      }
      return { world, events };
    },

    ask(ctx) {
      const topic = ctx.argument.trim();
      if (topic.length === 0) {
        return { events: [ctx.message(ctx.actor, "Ask about what topic? Try `ask <topic>` after someone has shared word of it.")] };
      }
      const knowledge = knowledgeOf(ctx.world, ctx.actor, ctx.value);
      const heard = Object.values(knowledge.cells).filter((cell) => cell.subject === topic);
      if (heard.length === 0) {
        return { events: [ctx.message(ctx.actor, `You have heard nothing about ${topic}.`)] };
      }
      const lines = heard.map((cell) => `"${String(cell.object)}" (${cell.charge})`);
      return { events: [ctx.message(ctx.actor, `What you've heard about ${topic}: ${lines.join("; ")}`)] };
    },
  },
});
