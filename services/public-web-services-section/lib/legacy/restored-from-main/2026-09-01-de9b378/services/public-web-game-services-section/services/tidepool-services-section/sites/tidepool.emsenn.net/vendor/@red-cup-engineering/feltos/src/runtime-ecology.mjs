export function runtimeTrace({ tick, capability, input, output, charge = "true" }) {
  return Object.freeze({ kind: "feltos.runtime-trace.v1", tick, capability, input, output, charge });
}

export function runtimeEcology(traces) {
  const byCapability = {};
  for (const trace of traces) byCapability[trace.capability] = [...(byCapability[trace.capability] ?? []), trace];
  return Object.freeze({ kind: "feltos.runtime-ecology.v1", traces: Object.freeze([...traces]), byCapability: Object.freeze(byCapability) });
}
