// cap-governance — the harvest-rights contradiction's aging-toward-settlement mechanic
// (design §1.3 #1), built directly over progression.mjs's real `proposeLaw`/`supportLaw`/
// `enactLaw`. The immutable `harvest-rights` `both` cell at the-weir (tidepool-game.mts) is
// NEVER rewritten by this capability — feltos's kernel law is "assertions form an immutable,
// inspectable trace" (architecture.md). What `enact` adds is a NEW, separate authoritative
// fact (`law:shared-harvest-rights`) alongside the still-permanent dispute: the contradiction
// stays legible in the trace forever, but play can still produce a settled common law on top
// of it, by real quorum, across real ticks — the "watch a contradiction settle" moment.
//
// onTick also carries the-spring's water-quality dispute (§1.3 #2): NOT by rewriting the
// immutable `water-quality` `both` cell (evidence only accumulates — world.mjs's own law makes
// that impossible to do honestly), but by deriving a separate, functional `spring-reading`
// gauge from world-clock.mjs's real `dry-streak` field. Drought concentrates the dispute
// (the reading degrades); rain resets dry-streak, and the reading recovers on the next tick.

import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { enactLaw, proposeLaw, supportLaw } from "@red-cup-engineering/feltos/progression";
import { declareFunctional, tell } from "@red-cup-engineering/feltos/world";
import { clockReport } from "@red-cup-engineering/feltos/world-clock";

export const WEIR_POLITY = "the-weir";
export const HARVEST_LAW = "shared-harvest-rights";
const SPRING = "the-spring";

function lawArgument(argument: string): string {
  const trimmed = argument.trim();
  return trimmed.length === 0 ? HARVEST_LAW : trimmed;
}

export const governanceCapability = defineCapability({
  id: "tidepool.governance",
  commands: {
    propose(ctx) {
      const law = lawArgument(ctx.argument);
      if (ctx.placeOf(ctx.world, ctx.actor) !== WEIR_POLITY) {
        return { events: [ctx.message(ctx.actor, `You must be at ${WEIR_POLITY} to propose harvest-rights law.`)] };
      }
      const world = proposeLaw(ctx.world, WEIR_POLITY, law, ctx.actor);
      return {
        world,
        events: [ctx.message(ctx.actor, `You propose "${law}" at the weir. Others here can \`support ${law}\`, then anyone can \`enact ${law}\` once quorum is reached.`)],
      };
    },
    support(ctx) {
      const law = lawArgument(ctx.argument);
      try {
        const world = supportLaw(ctx.world, WEIR_POLITY, law, ctx.actor);
        return { world, events: [ctx.message(ctx.actor, `You lend your support to "${law}".`)] };
      } catch (error) {
        return { events: [ctx.message(ctx.actor, `Cannot support: ${error instanceof Error ? error.message : String(error)}`)] };
      }
    },
    enact(ctx) {
      const law = lawArgument(ctx.argument);
      const result = enactLaw(ctx.world, WEIR_POLITY, law, ctx.actors);
      if (!result.enacted) {
        return { events: [ctx.message(ctx.actor, `Not enough support yet for "${law}": ${result.supporters}/${result.quorum} needed.`)] };
      }
      const witnesses = ctx.actors.filter((id: string) => ctx.placeOf(ctx.world, id) === WEIR_POLITY);
      const line = `The weir dispute settles: "${law}" is enacted by quorum (${result.supporters}/${result.quorum}). `
        + "The shore-families and the landing-guild now share harvest rights under common law.";
      return { world: result.world, events: witnesses.map((id: string) => ctx.message(id, line, "governance")) };
    },
  },
  onTick(ctx) {
    const report = clockReport(ctx.world);
    const reading = report.dryStreak >= 40 ? "fouled-looking" : report.dryStreak >= 16 ? "concerning" : "clear";
    const current = ctx.value(ctx.world, SPRING, "spring-reading");
    if (current === reading) return {};
    const world = tell(
      declareFunctional(ctx.world, ["spring-reading"]),
      { subject: SPRING, predicate: "spring-reading", object: reading },
      { source: "tidepool.governance.tick" },
    );
    return { world };
  },
});
