// cap-economy — `build` (crafting.mjs's `defineRecipe`/`craft`, with `outputKind: "structure"`
// for the weir/stall recipes) and `trade` (market.mjs's `buyFromMarket`/`sellToMarket`, with
// `regionalPrice` giving rooms other than the-landing a real "further from market costs more"
// texture, per the design brief).

import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { craft, defineRecipe, recipeShortfall } from "@red-cup-engineering/feltos/crafting";
import { buyFromMarket, marketQuote, regionalPrice, sellToMarket } from "@red-cup-engineering/feltos/market";
import { BUILD_ROOM, MARKET_ROOM, WARES } from "./tidepool-game.mts";

export { MARKET_ROOM, BUILD_ROOM };

// --- recipes: driftwood-shed's own catalog -----------------------------------------------------
export const RECIPES = Object.freeze({
  "mend-weir": defineRecipe({ id: "mend-weir", inputs: { driftwood: 2 }, output: "weir-timber", outputKind: "structure", name: "a mended stretch of weir" }),
  "raise-stall": defineRecipe({ id: "raise-stall", inputs: { driftwood: 3 }, output: "market-stall", outputKind: "structure", name: "a driftwood market stall" }),
  "kelp-line": defineRecipe({ id: "kelp-line", inputs: { kelp: 2 }, output: "kelp-line", outputKind: "thing", name: "a length of kelp cordage" }),
});

function formatShortfall(missing: Readonly<Record<string, number>>): string {
  return Object.entries(missing).map(([ware, count]) => `${count} ${ware}`).join(", ");
}

export const buildCapability = defineCapability({
  id: "tidepool.economy",
  commands: {
    build(ctx) {
      const recipeId = ctx.argument.trim().toLowerCase();
      if (recipeId.length === 0) {
        return { events: [ctx.message(ctx.actor, `Build what? Recipes: ${Object.keys(RECIPES).join(", ")}.`)] };
      }
      const recipe = (RECIPES as Record<string, ReturnType<typeof defineRecipe> | undefined>)[recipeId];
      if (recipe === undefined) {
        return { events: [ctx.message(ctx.actor, `There is no recipe for "${recipeId}". Recipes: ${Object.keys(RECIPES).join(", ")}.`)] };
      }
      if (ctx.placeOf(ctx.world, ctx.actor) !== BUILD_ROOM) {
        return { events: [ctx.message(ctx.actor, "You need to be at the driftwood shed to build.")] };
      }
      const missing = recipeShortfall(ctx.world, ctx.actor, recipe);
      if (Object.keys(missing).length > 0) {
        return { events: [ctx.message(ctx.actor, `You are short: ${formatShortfall(missing)}.`)] };
      }
      const { world, output } = craft(ctx.world, ctx.actor, recipe);
      return { world, events: [ctx.message(ctx.actor, `You build ${recipe.name} (${output}).`)] };
    },
    trade(ctx) {
      const [verb, ...rest] = ctx.argument.trim().split(/\s+/u).filter((token: string) => token.length > 0);
      if (verb === undefined) {
        return { events: [ctx.message(ctx.actor, "Trade how? \"trade buy <ware> [n]\", \"trade sell <item>\", or \"trade quote <ware>\".")] };
      }
      const room = ctx.placeOf(ctx.world, ctx.actor);
      if (room === null) return { events: [ctx.message(ctx.actor, "You are nowhere to trade from.")] };
      const distance = room === MARKET_ROOM ? 0 : 1; // one hop of "away from market" for every non-landing room

      if (verb === "quote") {
        const ware = rest[0];
        if (typeof ware !== "string" || !(WARES as readonly string[]).includes(ware)) {
          return { events: [ctx.message(ctx.actor, `Quote which ware? One of: ${WARES.join(", ")}.`)] };
        }
        const quote = marketQuote(ctx.world, MARKET_ROOM, ware);
        const here = regionalPrice(quote.price, distance);
        return { events: [ctx.message(ctx.actor, `${ware}: ${quote.price.toFixed(2)} at the landing (${here.toFixed(2)} here), ${quote.stock} in stock.`)] };
      }

      if (verb === "buy") {
        const ware = rest[0];
        const quantity = Number.isFinite(Number(rest[1])) && Number(rest[1]) > 0 ? Math.floor(Number(rest[1])) : 1;
        if (typeof ware !== "string" || !(WARES as readonly string[]).includes(ware)) {
          return { events: [ctx.message(ctx.actor, `Buy which ware? One of: ${WARES.join(", ")}.`)] };
        }
        try {
          const { world, cost } = buyFromMarket(ctx.world, { buyer: ctx.actor, market: MARKET_ROOM, ware, quantity });
          return { world, events: [ctx.message(ctx.actor, `You buy ${quantity} ${ware} for ${cost.toFixed(2)} coin.`)] };
        } catch (error) {
          return { events: [ctx.message(ctx.actor, `You cannot buy that: ${error instanceof Error ? error.message : String(error)}.`)] };
        }
      }

      if (verb === "sell") {
        const item = rest[0];
        if (typeof item !== "string" || item.length === 0) {
          return { events: [ctx.message(ctx.actor, "Sell what? Give the item's id.")] };
        }
        try {
          const { world, proceeds } = sellToMarket(ctx.world, { seller: ctx.actor, market: MARKET_ROOM, item });
          return { world, events: [ctx.message(ctx.actor, `You sell ${item} for ${proceeds.toFixed(2)} coin.`)] };
        } catch (error) {
          return { events: [ctx.message(ctx.actor, `You cannot sell that: ${error instanceof Error ? error.message : String(error)}.`)] };
        }
      }

      return { events: [ctx.message(ctx.actor, `Unknown trade action "${verb}". Try buy, sell, or quote.`)] };
    },
  },
});
