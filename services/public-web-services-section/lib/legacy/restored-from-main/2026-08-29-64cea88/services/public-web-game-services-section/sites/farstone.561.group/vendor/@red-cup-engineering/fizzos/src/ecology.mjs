import { defineCapability } from "./capabilities.mjs";
import { four, fourName } from "./four.mjs";
import { declareFunctional, settledWorld, tell, value } from "./world.mjs";

const STOCK = "fish-stock";
const CAPACITY = "capacity-fish";
const POLLUTION = "pollution";
const LETHAL_POLLUTION = 100;

function amount(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be a nonnegative finite number`);
  return value;
}

export function initializeEcology(world, cells) {
  world = declareFunctional(world, [STOCK, CAPACITY, POLLUTION]);
  const claims = [];
  for (const [cell, spec] of Object.entries(cells)) {
    const capacity = amount(spec.capacity, `${cell} capacity`);
    const stock = amount(spec.stock ?? capacity, `${cell} stock`);
    if (stock > capacity) throw new RangeError(`${cell} stock exceeds capacity`);
    claims.push(
      { subject: cell, predicate: CAPACITY, object: capacity },
      { subject: cell, predicate: STOCK, object: stock },
      { subject: cell, predicate: POLLUTION, object: amount(spec.pollution ?? 0, `${cell} pollution`) },
    );
  }
  return tell(world, claims, { source: "fizzos.ecology" });
}

export function ecologyOf(world, cell) {
  return Object.freeze({
    stock: Number(value(world, cell, STOCK) ?? 0),
    capacity: Number(value(world, cell, CAPACITY) ?? 0),
    pollution: Number(value(world, cell, POLLUTION) ?? 0),
  });
}

export function ecologicalCharge(world, cell) {
  const { stock, capacity, pollution } = ecologyOf(world, cell);
  return fourName(four(stock > 0 && capacity > 0, stock <= 0 || pollution >= LETHAL_POLLUTION));
}

export function harvestFish(world, cell, requested) {
  amount(requested, "requested catch");
  const ecology = ecologyOf(world, cell);
  const caught = Math.min(ecology.stock, requested);
  return Object.freeze({
    caught,
    world: tell(declareFunctional(world, [STOCK]), { subject: cell, predicate: STOCK, object: ecology.stock - caught }, { source: "fizzos.harvest" }),
  });
}

export function emitPollution(world, cell, emitted) {
  amount(emitted, "pollution emission");
  const prior = ecologyOf(world, cell).pollution;
  return tell(declareFunctional(world, [POLLUTION]), { subject: cell, predicate: POLLUTION, object: prior + emitted }, { source: "fizzos.pollution" });
}

export function stepEcology(world, { growthRate = 0.15, cleanupRate = 0.01 } = {}) {
  const cells = [...new Set(settledWorld(world).filter(({ predicate }) => predicate === CAPACITY).map(({ subject }) => subject))].sort();
  const claims = [];
  for (const cell of cells) {
    const { stock, capacity, pollution } = ecologyOf(world, cell);
    const pressure = Math.max(0, 1 - pollution / LETHAL_POLLUTION);
    const growth = stock <= 0 || capacity <= 0 || pollution >= LETHAL_POLLUTION
      ? 0
      : growthRate * stock * (1 - stock / capacity) * pressure;
    claims.push(
      { subject: cell, predicate: STOCK, object: pollution >= LETHAL_POLLUTION ? 0 : Math.min(capacity, stock + growth) },
      { subject: cell, predicate: POLLUTION, object: Math.max(0, pollution * (1 - cleanupRate)) },
    );
  }
  return claims.length === 0 ? world : tell(declareFunctional(world, [STOCK, POLLUTION]), claims, { source: "fizzos.ecology.tick" });
}

export const ecologyCapability = defineCapability({
  id: "fizzos.ecology",
  onTick(ctx) { return { world: stepEcology(ctx.world) }; },
});
