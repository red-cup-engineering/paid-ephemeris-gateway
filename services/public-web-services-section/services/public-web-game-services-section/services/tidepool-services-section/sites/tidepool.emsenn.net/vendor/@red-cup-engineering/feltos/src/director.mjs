// director — the emergent quest Director, re-earned from the July 2026
// generation (lib/legacy/2026-07-12-emsenn-fizzos-0.0.1/src/director.mts).
//
// The Director is a standing world-cycle that never completes, only observes:
// each tick it reads the live simulation and, where a situation has sharpened
// past a threshold, mints a finite errand that completes exactly when its
// element is constructed. No quest is authored; the Director reads them off
// the world's own pressure. Hunger the needs-drift produced posts a food
// demand; a trade role posts its standing supply want; a storm has civic
// NPCs calling for timber while it rages. Demands are plain settled cells
// (`wants`, `want-reward`) and the give-path completes them: the item moves,
// the giver is paid, standing with the NPC's faction rises.
import { defineCapability } from "./capabilities.mjs";
import { armsDelivered, factionDemandFor } from "./factions.mjs";
import { need } from "./npc.mjs";
import { shiftStanding } from "./reputation.mjs";
import { CLOCK } from "./world-clock.mjs";
import { contentsOf, declareFunctional, move, placeOf, subjects, tell, value, values } from "./world.mjs";

/** The hunger at which an NPC starts asking strangers for food. */
export const HUNGER_DEMAND = 14;
/** The hunger at which a fed NPC withdraws its standing demand. */
export const HUNGER_SATED = 6;
/** How much standing a fulfilled demand earns with the NPC's faction. */
export const DEMAND_STANDING = 5;

/** The single-valued cells the Director settles. */
export const DIRECTOR_FUNCTIONAL = Object.freeze(["wants", "want-reward", "coins"]);

/** What an NPC's needs would have it ask for — the demand the Director mints, or null. */
export function demandFor(hunger) {
  return hunger >= HUNGER_DEMAND ? Object.freeze({ want: "edible", reward: 5 + hunger }) : null;
}

// Standing supply demands keyed on an NPC's trade — the inn always wants fish
// for the stew-pot, the smith iron for the forge. These renew after each
// fulfilment: a steady quest stream off the cast's own work, not a fixed list.
const ROLE_WANTS = Object.freeze([
  Object.freeze({ role: "innkeeper", want: "fish", reward: 10 }),
  Object.freeze({ role: "smith", want: "iron", reward: 16 }),
  Object.freeze({ role: "shopkeeper", want: "fish", reward: 9 }),
  Object.freeze({ role: "lamp-keeper", want: "fiber", reward: 8 }),
]);

export function roleDemandFor(roles) {
  const match = ROLE_WANTS.find(({ role }) => roles.includes(role));
  return match === undefined ? null : Object.freeze({ want: match.want, reward: match.reward });
}

const CIVIC_ROLES = Object.freeze(["watch", "harbormaster", "civic"]);
const isCivic = (roles) => roles.some((role) => CIVIC_ROLES.includes(role));

// Stagger the cadence across the cast so the harbour doesn't all cry out at once.
function stagger(subject) {
  let hash = 0;
  for (const char of subject) hash = (hash * 31 + char.codePointAt(0)) % 997;
  return hash % 5;
}

function livingNpcs(world) {
  return subjects(world).filter((subject) =>
    value(world, subject, "npc") === true && value(world, subject, "condition") !== "dead");
}

const nameOf = (world, subject) => {
  const name = value(world, subject, "name");
  return typeof name === "string" ? name : subject;
};

function demandCry(world, npc, want) {
  return want === "edible"
    ? `${nameOf(world, npc)} looks half-starved. "I'd see someone right for a bite of something."`
    : want === "timber"
      ? `${nameOf(world, npc)} shouts over the gale: "The breakwater's taking damage — bring me timber and I'll pay well for it!"`
      : want === "arms"
        ? `${nameOf(world, npc)} speaks low: "Times being what they are — I'll pay honest coin for arms."`
        : `${nameOf(world, npc)} calls out: "I'll pay for ${want}, if you've any to spare."`;
}

function post(world, npc, demand) {
  return tell(declareFunctional(world, DIRECTOR_FUNCTIONAL), [
    { subject: npc, predicate: "wants", object: demand.want },
    { subject: npc, predicate: "want-reward", object: demand.reward },
  ], { source: "feltos.director" });
}

function withdraw(world, npc) {
  return tell(declareFunctional(world, DIRECTOR_FUNCTIONAL), [
    { subject: npc, predicate: "wants", object: "" },
    { subject: npc, predicate: "want-reward", object: 0 },
  ], { source: "feltos.director" });
}

/** Whether an item satisfies a want: `edible` matches food, other wants match ware-type. */
export function satisfiesWant(world, item, want) {
  return want === "edible" ? value(world, item, "food") === true : value(world, item, "ware-type") === want;
}

/**
 * Complete a demand: the μ-element exists when a matching item reaches the
 * asking NPC. Edible gifts are eaten (hunger relieved); wares are kept. The
 * giver is paid in coins and rises with the NPC's faction; the want clears.
 */
export function fulfillDemand(world, giver, npc, item) {
  const want = value(world, npc, "wants");
  if (typeof want !== "string" || want === "") return Object.freeze({ world, fulfilled: false, reason: "no-demand" });
  if (!satisfiesWant(world, item, want)) return Object.freeze({ world, fulfilled: false, reason: "mismatch", want });
  const reward = Number(value(world, npc, "want-reward") ?? 0);
  if (want === "edible") {
    world = move(world, item, "feltos:void", { source: "feltos.director.eat" });
    world = tell(declareFunctional(world, ["need:hunger"]), {
      subject: npc, predicate: "need:hunger", object: Math.max(0, need(world, npc, "hunger") - 60),
    }, { source: "feltos.director.eat" });
  } else {
    world = move(world, item, npc, { source: "feltos.director.supply" });
  }
  world = tell(declareFunctional(world, DIRECTOR_FUNCTIONAL), {
    subject: giver, predicate: "coins", object: Number(value(world, giver, "coins") ?? 0) + reward,
  }, { source: "feltos.director.pay" });
  const faction = value(world, npc, "faction");
  // Delivered arms feel like safety: the receiving faction's worst rivalry eases.
  if (want === "arms" && typeof faction === "string" && faction !== "") world = armsDelivered(world, faction);
  if (typeof faction === "string" && faction !== "") world = shiftStanding(world, giver, faction, DEMAND_STANDING);
  world = withdraw(world, npc);
  return Object.freeze({ world, fulfilled: true, want, reward, ...(typeof faction === "string" && faction !== "" ? { faction } : {}) });
}

const resolveCarried = (world, actor, token) =>
  contentsOf(world, actor).find((item) => item === token || nameOf(world, item).toLowerCase().includes(token.toLowerCase()));

const resolvePresentNpc = (world, actor, token) => {
  const room = placeOf(world, actor);
  return room === null ? undefined : contentsOf(world, room).find((subject) =>
    value(world, subject, "npc") === true
    && (subject === token || nameOf(world, subject).toLowerCase().includes(token.toLowerCase())));
};

export const directorCapability = defineCapability({
  id: "feltos.director",
  commands: {
    give(ctx) {
      const [itemToken, npcToken] = ctx.argument.split(/\s+to\s+/u);
      if (!itemToken || !npcToken) return { world: ctx.world, events: [ctx.message(ctx.actor, "Give what to whom?")] };
      const item = resolveCarried(ctx.world, ctx.actor, itemToken.trim());
      if (item === undefined) return { world: ctx.world, events: [ctx.message(ctx.actor, `You carry no ${itemToken.trim()}.`)] };
      const npc = resolvePresentNpc(ctx.world, ctx.actor, npcToken.trim());
      if (npc === undefined) return { world: ctx.world, events: [ctx.message(ctx.actor, `There is no ${npcToken.trim()} here.`)] };
      const result = fulfillDemand(ctx.world, ctx.actor, npc, item);
      if (!result.fulfilled) {
        return { world: result.world, events: [ctx.message(ctx.actor, result.reason === "no-demand"
          ? `${nameOf(ctx.world, npc)} has no need of that.`
          : `${nameOf(ctx.world, npc)} wants ${result.want}, not that.`)] };
      }
      const thanks = result.want === "edible"
        ? `${nameOf(ctx.world, npc)} eats gratefully and presses ${result.reward} coins into your hand.`
        : `${nameOf(ctx.world, npc)} takes it with a nod and pays you ${result.reward} coins.`;
      return { world: result.world, events: [ctx.message(ctx.actor, thanks)] };
    },
  },
  onTick(ctx) {
    let world = ctx.world;
    const events = [];
    const storm = value(world, CLOCK, "weather") === "storm";
    for (const npc of livingNpcs(world)) {
      if (ctx.tick % 5 !== stagger(npc)) continue;
      const roles = values(world, npc, "role").filter((role) => typeof role === "string");
      const wants = value(world, npc, "wants") ?? "";
      const hunger = need(world, npc, "hunger");
      const demand = demandFor(hunger)
        ?? (storm && isCivic(roles) ? Object.freeze({ want: "timber", reward: 30 }) : null)
        ?? factionDemandFor(world, npc)
        ?? roleDemandFor(roles);
      if (demand !== null && wants === "") {
        world = post(world, npc, demand);
        const room = placeOf(world, npc);
        if (room !== null) {
          const cry = demandCry(world, npc, demand.want);
          for (const actor of ctx.actors) if (placeOf(world, actor) === room) events.push(ctx.message(actor, cry));
        }
      } else if (wants === "edible" && hunger < HUNGER_SATED) {
        // Only a fed NPC withdraws a hunger demand; supply demands persist until filled.
        world = withdraw(world, npc);
      } else if (wants === "timber" && !storm && isCivic(roles) && roleDemandFor(roles)?.want !== "timber") {
        // The storm errand exists only while the storm rages.
        world = withdraw(world, npc);
      }
    }
    return { world, events };
  },
});
