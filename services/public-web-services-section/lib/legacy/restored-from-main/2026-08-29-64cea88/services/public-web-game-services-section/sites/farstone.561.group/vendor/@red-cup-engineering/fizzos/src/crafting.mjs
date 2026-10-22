import { contentsOf, declareFunctional, move, placeOf, tell, value } from "./world.mjs";

export function defineRecipe(source) {
  if (source === null || typeof source !== "object" || typeof source.id !== "string" || source.id.length === 0) throw new TypeError("recipe requires an id");
  const inputs = Object.freeze(Object.fromEntries(Object.entries(source.inputs ?? {}).sort()));
  for (const [ware, count] of Object.entries(inputs)) {
    if (!Number.isSafeInteger(count) || count < 1) throw new TypeError(`recipe input ${ware} must have a positive integer count`);
  }
  if (typeof source.output !== "string" || source.output.length === 0) throw new TypeError("recipe requires an output ware");
  return Object.freeze({
    kind: "fizzos.recipe.v1",
    id: source.id,
    inputs,
    output: source.output,
    name: source.name ?? source.output,
    outputKind: source.outputKind ?? "thing",
  });
}

function inventoryByWare(world, actor) {
  const result = new Map();
  for (const item of contentsOf(world, actor)) {
    const ware = value(world, item, "ware-type");
    if (typeof ware === "string") result.set(ware, [...(result.get(ware) ?? []), item]);
  }
  return result;
}

export function recipeShortfall(world, actor, recipe) {
  const inventory = inventoryByWare(world, actor);
  const missing = {};
  for (const [ware, count] of Object.entries(recipe.inputs)) {
    const lack = count - (inventory.get(ware)?.length ?? 0);
    if (lack > 0) missing[ware] = lack;
  }
  return Object.freeze(missing);
}

export function craft(world, actor, recipe) {
  if (recipe?.kind !== "fizzos.recipe.v1") throw new TypeError("craft requires a defined recipe");
  const missing = recipeShortfall(world, actor, recipe);
  if (Object.keys(missing).length > 0) throw new Error(`crafting shortfall: ${JSON.stringify(missing)}`);
  const inventory = inventoryByWare(world, actor);
  const consumed = [];
  for (const [ware, count] of Object.entries(recipe.inputs)) consumed.push(...inventory.get(ware).slice(0, count));
  for (const item of consumed) world = move(world, item, "fizzos:void", { source: "fizzos.crafting.consume" });
  const output = `crafted:${recipe.id}:${world.sequence + 1}`;
  const destination = recipe.outputKind === "structure" ? placeOf(world, actor) : actor;
  world = tell(declareFunctional(world, ["ware-type", "owner"]), [
    { subject: output, predicate: "kind", object: recipe.outputKind },
    { subject: output, predicate: "name", object: recipe.name },
    { subject: output, predicate: "ware-type", object: recipe.output },
    { subject: output, predicate: "owner", object: actor },
    { subject: output, predicate: "located-in", object: destination ?? actor },
  ], { source: "fizzos.crafting.produce" });
  return Object.freeze({ world, output, consumed: Object.freeze(consumed) });
}
