function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${label} must be a positive integer`);
  return value;
}

export function defineResource(source) {
  if (typeof source?.id !== "string" || source.id.length === 0 || typeof source.ware !== "string" || source.ware.length === 0) throw new TypeError("resource requires id and ware");
  return Object.freeze({ kind: "feltos.resource.v1", id: source.id, ware: source.ware, yield: positiveInteger(source.yield ?? 1, "resource yield"), verbs: Object.freeze([...(source.verbs ?? ["gather"])]) });
}

export function defineShipClass(source) {
  if (typeof source?.id !== "string" || source.id.length === 0) throw new TypeError("ship class requires id");
  return Object.freeze({
    kind: "feltos.ship-class.v1",
    id: source.id,
    hull: positiveInteger(source.hull, "ship hull"),
    speed: positiveInteger(source.speed, "ship speed"),
    capacity: positiveInteger(source.capacity, "ship capacity"),
    materials: Object.freeze({ ...(source.materials ?? {}) }),
  });
}

export function catalog(entries) {
  const result = {};
  for (const entry of entries) {
    if (entry?.id === undefined || result[entry.id] !== undefined) throw new Error(`invalid or duplicate catalog entry: ${String(entry?.id)}`);
    result[entry.id] = entry;
  }
  return Object.freeze(result);
}
