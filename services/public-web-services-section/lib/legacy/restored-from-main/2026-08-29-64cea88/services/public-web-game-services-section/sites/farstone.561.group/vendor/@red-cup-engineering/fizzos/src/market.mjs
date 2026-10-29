import { contentsOf, declareFunctional, move, tell, value } from "./world.mjs";

function nonnegative(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be nonnegative and finite`);
  return value;
}

const key = (prefix, ware) => `${prefix}:${ware}`;

export function initializeMarket(world, market, wares) {
  const predicates = [];
  const claims = [];
  for (const [ware, spec] of Object.entries(wares)) {
    const price = nonnegative(spec.price, `${ware} price`);
    const stock = nonnegative(spec.stock, `${ware} stock`);
    predicates.push(key("price", ware), key("base-price", ware), key("stock", ware));
    claims.push(
      { subject: market, predicate: key("price", ware), object: price },
      { subject: market, predicate: key("base-price", ware), object: price },
      { subject: market, predicate: key("stock", ware), object: stock },
    );
  }
  return tell(declareFunctional(world, predicates), claims, { source: "fizzos.market" });
}

export function marketQuote(world, market, ware) {
  return Object.freeze({
    price: Number(value(world, market, key("price", ware)) ?? 0),
    basePrice: Number(value(world, market, key("base-price", ware)) ?? 0),
    stock: Number(value(world, market, key("stock", ware)) ?? 0),
  });
}

export function buyFromMarket(world, { buyer, market, ware, quantity = 1 }) {
  nonnegative(quantity, "quantity");
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new TypeError("quantity must be a positive integer");
  const quote = marketQuote(world, market, ware);
  const cost = quote.price * quantity;
  const coin = Number(value(world, buyer, "coin") ?? 0);
  if (quote.stock < quantity) throw new Error(`market lacks ${ware}`);
  if (coin < cost) throw new Error(`buyer lacks ${cost - coin} coin`);
  const predicates = ["coin", key("price", ware), key("stock", ware), "ware-type"];
  const claims = [
    { subject: buyer, predicate: "coin", object: coin - cost },
    { subject: market, predicate: key("stock", ware), object: quote.stock - quantity },
    { subject: market, predicate: key("price", ware), object: quote.price * (1 + 0.05 * quantity) },
  ];
  for (let index = 0; index < quantity; index += 1) {
    const id = `market-good:${ware}:${world.sequence + claims.length + index + 1}`;
    claims.push(
      { subject: id, predicate: "kind", object: "thing" },
      { subject: id, predicate: "name", object: ware },
      { subject: id, predicate: "ware-type", object: ware },
      { subject: id, predicate: "located-in", object: buyer },
    );
  }
  return Object.freeze({ cost, world: tell(declareFunctional(world, predicates), claims, { source: "fizzos.market.buy" }) });
}

export function sellToMarket(world, { seller, market, item }) {
  if (!contentsOf(world, seller).includes(item)) throw new Error(`${seller} does not carry ${item}`);
  const ware = value(world, item, "ware-type");
  if (typeof ware !== "string") throw new Error(`${item} is not a ware`);
  const quote = marketQuote(world, market, ware);
  const proceeds = quote.price;
  const coin = Number(value(world, seller, "coin") ?? 0);
  world = tell(declareFunctional(world, ["coin", key("price", ware), key("stock", ware)]), [
    { subject: seller, predicate: "coin", object: coin + proceeds },
    { subject: market, predicate: key("stock", ware), object: quote.stock + 1 },
    { subject: market, predicate: key("price", ware), object: Math.max(0.01, quote.price * 0.95) },
  ], { source: "fizzos.market.sell" });
  return Object.freeze({ proceeds, world: move(world, item, market, { source: "fizzos.market.sell" }) });
}

export function meanRevertMarket(world, market, ware, rate = 0.1) {
  const quote = marketQuote(world, market, ware);
  const price = quote.price + (quote.basePrice - quote.price) * rate;
  return tell(declareFunctional(world, [key("price", ware)]), { subject: market, predicate: key("price", ware), object: price }, { source: "fizzos.market.reversion" });
}

export function regionalPrice(basePrice, distance, { transportRate = 0.15 } = {}) {
  nonnegative(basePrice, "base price");
  nonnegative(distance, "distance");
  return basePrice * (1 + distance * transportRate);
}
