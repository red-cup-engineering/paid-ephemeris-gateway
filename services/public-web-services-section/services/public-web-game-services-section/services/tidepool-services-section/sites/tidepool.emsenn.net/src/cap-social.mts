// cap-social — `signal` (fields.mjs's `worldGraph`/adjacency, a wider-than-one-room voice),
// `mark`/`unfold` (predication.mjs's `foldWord`/`unfoldWord` — the mechanism that turns play
// into residue a LATER visitor encounters, i.e. stories), `listen` (world-clock.mjs's
// `clockReport()` plus a same-room occupant/activity summary), and `emote` (soul.mjs's
// `soulEmote`/`renderSoul`, viewer-relative third-person text).

import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { worldGraph } from "@red-cup-engineering/feltos/fields";
import { foldWord, unfoldWord } from "@red-cup-engineering/feltos/predication";
import { clockReport } from "@red-cup-engineering/feltos/world-clock";
import { renderSoul, soulEmote } from "@red-cup-engineering/feltos/soul";

function displayName(ctx: { world: unknown; value: (world: unknown, subject: string, predicate: string) => unknown }, subject: string): string {
  const name = ctx.value(ctx.world, subject, "name");
  return typeof name === "string" ? name : subject;
}

export const signalCapability = defineCapability({
  id: "tidepool.social",
  commands: {
    signal(ctx) {
      const room = ctx.placeOf(ctx.world, ctx.actor);
      if (room === null || ctx.argument.trim().length === 0) {
        return { events: [ctx.message(ctx.actor, "Signal what? Give a short message.")] };
      }
      const graph = worldGraph(ctx.world);
      const neighbors = graph.adjacency[room] ?? [];
      const targets = new Set<string>([room, ...neighbors]);
      const events = [];
      for (const actorId of ctx.actors) {
        const actorRoom = ctx.placeOf(ctx.world, actorId);
        if (actorRoom === null || !targets.has(actorRoom)) continue;
        const text = actorId === ctx.actor
          ? `You raise a signal: "${ctx.argument}"`
          : `A signal carries from ${displayName(ctx, room)}: "${ctx.argument}"`;
        events.push(ctx.message(actorId, text, "signal"));
      }
      return { events };
    },

    mark(ctx) {
      const room = ctx.placeOf(ctx.world, ctx.actor);
      if (room === null) return { events: [ctx.message(ctx.actor, "There is nowhere here to leave a mark.")] };
      const note = ctx.argument.trim();
      if (note.length === 0) return { events: [ctx.message(ctx.actor, "Mark what? Give a short note to fold into this place.")] };
      const witnesses = ctx.actors.filter((id: string) => id !== ctx.actor && ctx.placeOf(ctx.world, id) === room);
      const { world: folded, word } = foldWord(ctx.world, ctx.actor, room, [ctx.actor, ...witnesses]);
      if (word === null) {
        return { events: [ctx.message(ctx.actor, "The mark needs at least one witness — yourself counts, but something went wrong.")] };
      }
      const world = ctx.tell(folded, [
        { subject: word, predicate: "kind", object: "word" },
        { subject: word, predicate: "name", object: `a mark left by ${displayName(ctx, ctx.actor)}` },
        { subject: word, predicate: "description", object: note },
      ], { source: "tidepool.mark" });
      return { world, events: [ctx.message(ctx.actor, `You fold your presence into this place — ${word} now waits here for someone to unfold.`)] };
    },

    unfold(ctx) {
      const word = ctx.argument.trim();
      if (word.length === 0) return { events: [ctx.message(ctx.actor, "Unfold what? Give a mark's id (see `look` for what is here).")] };
      if (ctx.value(ctx.world, word, "kind") !== "word") {
        return { events: [ctx.message(ctx.actor, `${word} is not a mark that can be unfolded.`)] };
      }
      const description = ctx.value(ctx.world, word, "description");
      const { world, being } = unfoldWord(ctx.world, word, ctx.actor);
      return {
        world,
        events: [ctx.message(ctx.actor, `The mark unfolds into ${being} — an echo of what was left: "${String(description ?? "")}"`)],
      };
    },

    listen(ctx) {
      const room = ctx.placeOf(ctx.world, ctx.actor);
      const report = clockReport(ctx.world);
      const occupants = room === null ? [] : ctx.contentsOf(ctx.world, room).filter((id: string) => id !== ctx.actor);
      const activity = occupants.length === 0
        ? "Nothing stirs nearby."
        : `You hear ${occupants.map((id: string) => displayName(ctx, id)).join(", ")} nearby.`;
      const text = `It is ${report.phase} in ${report.season}. The tide is ${report.tide}, the weather ${report.weather}`
        + `${report.dryStreak > 0 ? ` (${report.dryStreak} ticks since rain)` : ""}. ${activity}`;
      return { events: [ctx.message(ctx.actor, text)] };
    },

    emote(ctx) {
      const room = ctx.placeOf(ctx.world, ctx.actor);
      const action = ctx.argument.trim();
      if (room === null || action.length === 0) {
        return { events: [ctx.message(ctx.actor, "Emote what? Give a short action.")] };
      }
      const name = displayName(ctx, ctx.actor);
      const emote = soulEmote({
        actor: ctx.actor,
        actorText: `You ${action}.`,
        roomText: `${name} ${action}s.`,
      });
      const events = ctx.actors
        .filter((id: string) => ctx.placeOf(ctx.world, id) === room)
        .map((id: string) => ctx.message(id, renderSoul(emote, id), "emote"));
      return { events };
    },
  },
});
