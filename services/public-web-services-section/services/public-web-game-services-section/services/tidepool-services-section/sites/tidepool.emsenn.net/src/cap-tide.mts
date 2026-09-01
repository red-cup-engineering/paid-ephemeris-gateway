// cap-tide — `dive` and `surface`, gated by world-clock.mjs's real `tideAt(clockTime(world))`.
// TIDE_LENGTH = 8 ticks (world-clock.mjs) means the dive window recurs every 8 ticks and is
// genuinely closed roughly half the time (low/falling), not a one-off gimmick — see the design
// brief's own framing. `dive`/`surface` deliberately do NOT use `exit:` predicates: the
// underwater register is reachable only through this capability (see tidepool-game.mts's header
// for why, and the world-content test that asserts no `exit:` edge reaches it any other way).

import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { clockTime, tideAt } from "@red-cup-engineering/feltos/world-clock";
import { DIVE_DESTINATION, DIVE_ROOM } from "./tidepool-game.mts";

function canDive(world: unknown): boolean {
  const tide = tideAt(clockTime(world as never));
  return tide === "high" || tide === "rising";
}

export const tideCapability = defineCapability({
  id: "tidepool.tide",
  commands: {
    dive(ctx) {
      const room = ctx.placeOf(ctx.world, ctx.actor);
      if (room !== DIVE_ROOM) {
        return { events: [ctx.message(ctx.actor, "There is nowhere to dive from here — try the kelp fringe.")] };
      }
      if (!canDive(ctx.world)) {
        const tide = tideAt(clockTime(ctx.world));
        return { events: [ctx.message(ctx.actor, `The tide is ${tide} — too low to dive here right now. Wait for it to rise.`)] };
      }
      const world = ctx.move(ctx.world, ctx.actor, DIVE_DESTINATION, { source: "tidepool.dive" });
      return { world, events: [ctx.message(ctx.actor, "You dive beneath the kelp fringe into cold, green-dark water.")] };
    },
    surface(ctx) {
      const room = ctx.placeOf(ctx.world, ctx.actor);
      if (room !== DIVE_DESTINATION && room !== "the-reef" && room !== "eelgrass-meadow") {
        return { events: [ctx.message(ctx.actor, "You are not underwater.")] };
      }
      const world = ctx.move(ctx.world, ctx.actor, DIVE_ROOM, { source: "tidepool.surface" });
      return { world, events: [ctx.message(ctx.actor, "You surface at the kelp fringe, dripping.")] };
    },
  },
});
