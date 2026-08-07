// registry.ts — per-commodity display precision. A `commodity` directive declares an authoritative
// precision; otherwise the MAX precision observed in the journal is recorded, so formatting never
// loses digits. Plain data: a single Map keyed by commodity symbol.

export interface Registry {
  prec: Map<string, number>;
}

export const makeRegistry = (defaults: Record<string, number> = {}): Registry => ({
  prec: new Map(Object.entries(defaults)),
});

export const declareCommodity = (reg: Registry, symbol: string, precision: number | null): Registry => {
  if (precision !== null) reg.prec.set(symbol, precision);
  return reg;
};

export const observe = (reg: Registry, symbol: string, precision: number): Registry => {
  const cur = reg.prec.get(symbol);
  if (cur === undefined || precision > cur) reg.prec.set(symbol, precision);
  return reg;
};

export const precisionOf = (reg: Registry, symbol: string, fallback = 2): number => {
  const cur = reg.prec.get(symbol);
  return cur === undefined ? fallback : cur;
};
