export function defineThingModel(source) {
  if (typeof source?.id !== "string" || source.id.length === 0) throw new TypeError("thing model requires id");
  return Object.freeze({
    id: source.id,
    name: source.name ?? source.id,
    base: Object.freeze([...(Array.isArray(source.base) ? source.base : source.base === undefined ? [] : [source.base])]),
    behaviors: Object.freeze([...(source.behaviors ?? [])]),
    qualities: Object.freeze([...(source.qualities ?? [])]),
    attributes: Object.freeze({ ...(source.attributes ?? {}) }),
    additive: Object.freeze([...(source.additive ?? ["behaviors", "qualities"])]),
  });
}

export function realizeThing(id, modelId, { models, qualities = {} }) {
  const chain = [];
  const seen = new Set();
  function visit(current) {
    if (seen.has(current)) throw new Error(`cyclic thing base: ${current}`);
    const model = models[current];
    if (model === undefined) throw new Error(`unknown thing model: ${current}`);
    seen.add(current);
    for (const base of model.base) visit(base);
    chain.push(model);
  }
  visit(modelId);
  let name = id;
  let behaviors = [];
  let qualityIds = [];
  let attributes = {};
  for (const model of chain) {
    name = model.name;
    behaviors = model.additive.includes("behaviors") ? [...behaviors, ...model.behaviors] : [...model.behaviors];
    qualityIds = model.additive.includes("qualities") ? [...qualityIds, ...model.qualities] : [...model.qualities];
    attributes = { ...attributes, ...model.attributes };
  }
  const provided = {};
  for (const qualityId of qualityIds) {
    const quality = qualities[qualityId];
    if (quality === undefined) throw new Error(`unknown thing quality: ${qualityId}`);
    behaviors.push(...(quality.behaviors ?? []));
    attributes = { ...attributes, ...(quality.attributes ?? {}) };
    for (const procedure of quality.provides ?? []) provided[procedure] = [...(provided[procedure] ?? []), qualityId];
    for (const requirement of quality.requires ?? []) if (!(requirement in provided)) throw new Error(`quality ${qualityId} requires ${requirement}`);
  }
  return Object.freeze({ id, model: modelId, name, behaviors: Object.freeze([...new Set(behaviors)]), qualities: Object.freeze([...new Set(qualityIds)]), attributes: Object.freeze(attributes), provided: Object.freeze(provided) });
}
