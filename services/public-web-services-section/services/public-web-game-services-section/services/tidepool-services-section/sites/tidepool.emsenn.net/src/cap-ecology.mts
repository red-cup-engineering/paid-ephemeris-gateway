// cap-ecology — `tend` and `harvest`, both composed (never kernel-modifying, per
// capabilities.mjs's own contract) directly over ecology.mjs's real driver surface:
// `ecologyOf`, `harvestFish`, `emitPollution`, and the module's own `ecologyCapability` (its
// `onTick` drives `stepEcology`'s logistic regrowth — Tidepool composes that capability
// unchanged, see tidepool-capabilities.mts).
//
// `harvest` is HARVEST_WARE_OF-generalized: the same `harvestFish()` call backs fish at
// the-reef, mussels at mussel-shelf, and clams at sand-flat — ecology.mjs's own predicate names
// (fish-stock/capacity-fish) are reused for whichever ware a given cell actually stocks, exactly
// as the design brief frames it ("generalized over wares").

import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { ecologyOf, harvestFish } from "@red-cup-engineering/feltos/ecology";
import { HARVEST_WARE_OF } from "./tidepool-game.mts";

const TEND_EFFORT = 3; // a small, deterministic pollution reduction per tend — costs an action

export const tendCapability = defineCapability({
  id: "tidepool.tend",
  commands: {
    tend(ctx) {
      const cell = ctx.value(ctx.world, ctx.actor, "located-in");
      if (typeof cell !== "string" || !(cell in HARVEST_WARE_OF)) {
        return { events: [ctx.message(ctx.actor, "There is nothing here to tend.")] };
      }
      const before = ecologyOf(ctx.world, cell);
      if (before.pollution <= 0) {
        return { events: [ctx.message(ctx.actor, `${cell} is already clean; there is nothing to tend.`)] };
      }
      // tending REDUCES pollution. ecology.mjs's own emitPollution is additive-only (its
      // `amount()` guard rejects a negative emission) — the design's own framing calls this the
      // "reverse-direction tell": pollution is a FUNCTIONAL predicate (declared in the game's
      // functionalPredicates), so a fresh tell() REPLACES the settled reading (world.mjs's
      // settleSubject keeps only the latest functional assertion) rather than accumulating.
      const relief = Math.min(before.pollution, TEND_EFFORT);
      const world = ctx.tell(ctx.world, { subject: cell, predicate: "pollution", object: before.pollution - relief }, { source: "tidepool.tend" });
      const after = ecologyOf(world, cell);
      return {
        world,
        events: [ctx.message(ctx.actor, `You work the ${cell.replace(/-/gu, " ")}, easing its pollution from ${before.pollution.toFixed(1)} to ${after.pollution.toFixed(1)}.`)],
      };
    },
  },
});

const HARVEST_REQUEST = 3; // a modest, bounded catch per call — stock is finite and regrows

export const harvestCapability = defineCapability({
  id: "tidepool.harvest",
  commands: {
    harvest(ctx) {
      const cell = ctx.value(ctx.world, ctx.actor, "located-in");
      if (typeof cell !== "string" || !(cell in HARVEST_WARE_OF)) {
        return { events: [ctx.message(ctx.actor, "There is nothing to harvest here.")] };
      }
      const ware = HARVEST_WARE_OF[cell];
      const before = ecologyOf(ctx.world, cell);
      if (before.stock <= 0) {
        return { events: [ctx.message(ctx.actor, `The ${ware} here are fished out for now — nothing to harvest.`)] };
      }
      const { caught, world: harvested } = harvestFish(ctx.world, cell, HARVEST_REQUEST);
      if (caught <= 0) {
        return { events: [ctx.message(ctx.actor, `You find no ${ware} worth taking.`)] };
      }
      const id = `${ware}:${ctx.actor}:${harvested.sequence + 1}`;
      const world = ctx.tell(harvested, [
        { subject: id, predicate: "kind", object: "thing" },
        { subject: id, predicate: "name", object: `${caught.toFixed(1)} ${ware}${caught === 1 ? "" : "s"}, freshly harvested` },
        { subject: id, predicate: "ware-type", object: ware },
        { subject: id, predicate: "located-in", object: ctx.actor },
      ], { source: "tidepool.harvest" });
      return {
        world,
        events: [ctx.message(ctx.actor, `You harvest ${caught.toFixed(1)} ${ware} from the ${cell.replace(/-/gu, " ")}.`)],
      };
    },
  },
});
