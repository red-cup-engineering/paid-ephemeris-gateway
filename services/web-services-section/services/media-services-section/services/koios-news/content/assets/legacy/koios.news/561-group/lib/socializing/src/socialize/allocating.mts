/**
 * allocating — socializing's FAIR DIVISION of indivisible work-items among agents. The office layer
 * (`office.mts`) binds a work-item to an agent as a duty (`assign`); this decides WHICH agent gets
 * which item FAIRLY, the central question for a swarm drawing from a shared pool of labor: split the
 * work without envy or starvation.
 *
 * Indivisible goods admit no perfectly envy-free split in general, so the modern fairness literature
 * uses relaxations. Round-robin picking (each agent in turn takes its most-valued remaining item)
 * guarantees ENVY-FREENESS UP TO ONE ITEM (EF1): any residual envy is erased by removing a single item
 * from the envied bundle (Caragiannis et al. 2019, Lipton et al. 2004). We also report PROPORTIONALITY
 * (each agent gets ≥ 1/n of its own total valuation) and the NASH WELFARE (the product of utilities —
 * the allocation maximizing it is EF1 and Pareto-efficient; we report it for the round-robin result).
 *
 * Valuations are additive: each agent values each work-item, and a bundle's value is the sum.
 */

/** An allocation of work-items to agents and its fairness diagnostics. */
export interface Allocation {
  readonly kind: "socializing.allocation";
  /** the bundle of work-item ids each agent received. */
  readonly bundles: Readonly<Record<string, readonly string[]>>;
  /** each agent's utility (its additive valuation of its own bundle). */
  readonly utility: Readonly<Record<string, number>>;
  /** ENVY-FREE UP TO ONE ITEM: every agent's envy of another vanishes after removing one item from
   *  the envied bundle. Guaranteed by round-robin for additive valuations. */
  readonly ef1: boolean;
  /** PROPORTIONAL: every agent receives at least 1/n of its own valuation of the whole pool. */
  readonly proportional: boolean;
  /** the Nash welfare — the product of the agents' utilities (0 if any agent got nothing it values). */
  readonly nashWelfare: number;
  /** fully ENVY-FREE: no agent prefers another's bundle outright (rare for indivisible goods). */
  readonly envyFree: boolean;
}

type Valuations = Readonly<Record<string, Readonly<Record<string, number>>>>;

const valueOfItem = (valuations: Valuations, agent: string, item: string): number => valuations[agent]?.[item] ?? 0;

const bundleValue = (valuations: Valuations, agent: string, bundle: readonly string[]): number =>
  bundle.reduce((sum, item) => sum + valueOfItem(valuations, agent, item), 0);

/**
 * allocateWork — assign indivisible work-items to agents by ROUND-ROBIN picking in the given agent
 * order: each agent, in turn, takes its most-valued remaining item until the pool is empty. Returns
 * the bundles and the fairness diagnostics (EF1, proportionality, Nash welfare, exact envy-freeness).
 * Round-robin guarantees EF1 for additive valuations; the other properties are reported, not forced.
 */
export function allocateWork(agents: readonly string[], items: readonly string[], valuations: Valuations): Allocation {
  const bundles: Record<string, string[]> = Object.fromEntries(agents.map((agent) => [agent, []]));
  const remaining = new Set(items);

  let turn = 0;
  while (remaining.size > 0 && agents.length > 0) {
    const agent = agents[turn % agents.length]!;
    let best: string | undefined;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (const item of remaining) {
      const value = valueOfItem(valuations, agent, item);
      if (value > bestValue) { bestValue = value; best = item; }
    }
    if (best !== undefined) {
      bundles[agent]!.push(best);
      remaining.delete(best);
    }
    turn += 1;
  }

  const utility: Record<string, number> = {};
  for (const agent of agents) utility[agent] = bundleValue(valuations, agent, bundles[agent]!);

  // EF1: for every ordered pair, the envy is erased by dropping one item from the envied bundle.
  let ef1 = true;
  let envyFree = true;
  for (const i of agents) {
    for (const j of agents) {
      if (i === j) continue;
      const own = utility[i]!;
      const otherBundle = bundles[j]!;
      const otherValue = bundleValue(valuations, i, otherBundle);
      if (otherValue > own + 1e-9) envyFree = false;
      const bestInOther = otherBundle.reduce((max, item) => Math.max(max, valueOfItem(valuations, i, item)), 0);
      if (otherValue - bestInOther > own + 1e-9) ef1 = false;
    }
  }

  // proportionality: each agent's bundle is worth ≥ 1/n of its valuation of the whole pool.
  const n = agents.length;
  const proportional = agents.every((agent) => {
    const whole = bundleValue(valuations, agent, items);
    return utility[agent]! + 1e-9 >= whole / n;
  });

  const nashWelfare = agents.reduce((product, agent) => product * utility[agent]!, 1);

  return Object.freeze({
    kind: "socializing.allocation" as const,
    bundles: Object.freeze(Object.fromEntries(agents.map((agent) => [agent, Object.freeze([...bundles[agent]!])]))),
    utility: Object.freeze(utility),
    ef1,
    proportional,
    nashWelfare,
    envyFree,
  });
}
