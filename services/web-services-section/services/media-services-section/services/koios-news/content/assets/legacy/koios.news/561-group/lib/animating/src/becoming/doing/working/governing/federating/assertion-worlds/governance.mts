import type { ChargeValueName } from "@emsenn/relating";
import { contentId } from "./json.mjs";
import type { GovernanceCone, GovernanceContext, GovernanceDecision } from "./types.mjs";

/**
 * The six axes along which a governance regime is characterized:
 * persons-and-relations, synchronic-diachronic, constitutive-regulative,
 * binding-source, boundary-source, and recursion-of-meta-governance. Frozen
 * tuple of axis names.
 */
export const GOV_AXES = Object.freeze([
  "persons-and-relations",
  "synchronic-diachronic",
  "constitutive-regulative",
  "binding-source",
  "boundary-source",
  "recursion-of-meta-governance",
] as const);

/**
 * The regime name used when no regime is selected: "kyriarchical", the
 * office-capability delegation chain.
 */
export const DEFAULT_REGIME = "kyriarchical";

// A regime never admits a polarity. Each decision articulates the regime's
// own claim of a domain predicate — `grants`, or its contrary `withholds`,
// or `counsels` — and `value` is the reading derived on the grant cell:
// a `withholds` claim is its own potential cell, from which the grant cell
// reads active by derivation; co-standing `grants` and `withholds` claims
// render the held pair stable by derivation; no claim at all reads absurd.
/**
 * The frozen table of governance regimes keyed by name - kyriarchical,
 * consensus-by-withdrawal, advisory, and contrarian - each carrying a name,
 * title, policy, and an admit(ctx) method that reads a context into a raw
 * admission claim and derived charge value.
 */
export const REGIMES = Object.freeze({
  kyriarchical: Object.freeze({
    name: "kyriarchical",
    title: "Kyriarchical (delegation chain)",
    policy: "office-capability",
    admit(ctx: GovernanceContext) {
      const ok = ctx.can?.(ctx.agent, ctx.action) === true;
      return ok
        ? {
            claim: "grants",
            value: "potential" as const,
            jural: "power" as const,
            binding: true,
            policy: "office-capability",
            reason: `${officeOf(ctx)} office holds ${ctx.action}; the office claims grants.`,
          }
        : {
            claim: "withholds",
            value: "active" as const,
            jural: "power" as const,
            binding: true,
            policy: "office-capability",
            reason: `${officeOf(ctx)} office does not hold ${ctx.action}; the office claims withholds, and the grant cell reads active by derivation.`,
          };
    },
  }),
  "consensus-by-withdrawal": Object.freeze({
    name: "consensus-by-withdrawal",
    title: "Consensus by withdrawal",
    policy: "consensus-by-withdrawal",
    admit(ctx: GovernanceContext) {
      const withdrawals = valuesFrom(ctx, "withdrawals");
      const affirmations = valuesFrom(ctx, "affirmations");
      if (withdrawals.length) {
        return { claim: "withholds", value: "active" as const, jural: "privilege" as const, binding: true, policy: "consensus-by-withdrawal", reason: `${withdrawals.join(", ")} claim withholds; the grant cell reads active by derivation.`, withdrawals, affirmations };
      }
      if (affirmations.length) {
        return { claim: "grants", value: "potential" as const, jural: "privilege" as const, binding: true, policy: "consensus-by-withdrawal", reason: `no worker claims withholds; ${affirmations.length} grant claim(s) stand.`, withdrawals, affirmations };
      }
      return { claim: "", value: "absurd" as const, jural: "privilege" as const, binding: false, policy: "consensus-by-withdrawal", reason: "no claim has entered the join yet.", withdrawals, affirmations };
    },
  }),
  advisory: Object.freeze({
    name: "advisory",
    title: "Advisory (counsel without command)",
    policy: "advisory",
    admit(ctx: GovernanceContext) {
      return { claim: "counsels", value: "potential" as const, jural: "privilege" as const, binding: false, policy: "advisory", reason: `advice on ${ctx.action} is offered as counsel; it binds no office.` };
    },
  }),
  contrarian: Object.freeze({
    name: "contrarian",
    title: "Contrarian (productive contradiction surfaced)",
    policy: "contrarian-surfacing",
    admit(ctx: GovernanceContext) {
      const withdrawals = valuesFrom(ctx, "withdrawals");
      const affirmations = valuesFrom(ctx, "affirmations");
      if (withdrawals.length && affirmations.length) {
        return { claim: "", value: "stable" as const, jural: "privilege" as const, binding: false, policy: "contrarian-surfacing", reason: `contradiction on ${ctx.action}: grants and withholds both claimed, and the held pair reads stable by derivation.`, withdrawals, affirmations };
      }
      return { claim: "", value: "absurd" as const, jural: "privilege" as const, binding: false, policy: "contrarian-surfacing", reason: "no standing contrary pair to surface.", withdrawals, affirmations };
    },
  }),
});

/**
 * The frozen list of named regime families recognized but not implemented as
 * REGIMES entries - haudenosaunee-great-law, ubuntu, confucian-li,
 * maori-rangatiratanga, and inuit-qaujimajatuqangit - each carrying a name and
 * a derived flag (all false).
 */
export const KNOWN_REGIME_FAMILIES = Object.freeze([
  Object.freeze({ name: "haudenosaunee-great-law", derived: false }),
  Object.freeze({ name: "ubuntu", derived: false }),
  Object.freeze({ name: "confucian-li", derived: false }),
  Object.freeze({ name: "maori-rangatiratanga", derived: false }),
  Object.freeze({ name: "inuit-qaujimajatuqangit", derived: false }),
]);

/** Returns the names of the implemented regimes: the keys of REGIMES. */
export function regimeNames(): string[] {
  return Object.keys(REGIMES);
}

/**
 * Resolves a regime by name, falling back to DEFAULT_REGIME when the name is
 * omitted or not a known regime.
 */
export function selectRegime(name?: string): typeof REGIMES[keyof typeof REGIMES] {
  return REGIMES[(name ?? DEFAULT_REGIME) as keyof typeof REGIMES] ?? REGIMES[DEFAULT_REGIME];
}

/**
 * Reports whether a charge value admits the action: true only when the value
 * reads "potential".
 */
export function isAdmitted(value: ChargeValueName): boolean {
  return value === "potential";
}

type RawAdmission = {
  claim: string;
  value: ChargeValueName;
  jural: "power" | "privilege";
  binding: boolean;
  policy: string;
  reason: string;
  withdrawals?: readonly string[];
  affirmations?: readonly string[];
};

/**
 * Runs the selected regime's admit method over a governance context and returns
 * the resulting raw admission frozen together with the regime's name and title.
 */
export function admitUnder(regimeName: string | undefined, ctx: GovernanceContext): RawAdmission & { regime: string; title: string } {
  const regime = selectRegime(regimeName);
  const decision = regime.admit(ctx) as RawAdmission;
  return Object.freeze({ regime: regime.name, title: regime.title, ...decision });
}

/**
 * Computes a governance decision for an agent attempting an action on a target:
 * selects a regime (from options.regime, an options.regimeFor mapping over
 * options.structuration, or DEFAULT_REGIME), folds any cone reading into the
 * admit options, admits under that regime, and returns a frozen
 * GovernanceDecision recording the actor, office, claim, value, jural, binding,
 * reason, policy, withdrawals, affirmations, cost witness, and whether the
 * action is admitted.
 */
export function governAction(
  agent: { name?: unknown; office?: unknown } | null,
  action: string,
  target: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
): GovernanceDecision {
  const selected = typeof options["regimeFor"] === "function" && options["structuration"] !== undefined
    ? (options["regimeFor"] as (structuration: unknown) => unknown)(options["structuration"])
    : undefined;
  const regimeName = String(options["regime"] ?? selected ?? DEFAULT_REGIME);
  const office = String(options["officeName"] ?? agent?.office ?? agent?.name ?? "worker");
  const admitOptions = withConeReading(options);
  const ctx: GovernanceContext = {
    action,
    target,
    options: admitOptions,
    officeName: office,
    ...(agent === null ? {} : { agent }),
    ...(admitOptions["can"] === undefined ? {} : { can: admitOptions["can"] as (agent: unknown, action: string) => boolean }),
  };
  const decision = admitUnder(regimeName, ctx);
  const created = options["now"] ?? null;
  const costWitness = options["costWitness"] ?? {};
  return Object.freeze({
    kind: "animating.federation.governance.decision",
    id: `decision:${contentId([agent?.name ?? "", action, target["kind"] ?? "", target["title"] ?? "", created]).slice(0, 16)}`,
    actor: String(agent?.name ?? ""),
    office,
    action,
    targetKind: String(target["kind"] ?? ""),
    targetTitle: String(target["title"] ?? ""),
    admitted: isAdmitted(decision.value),
    regime: decision.regime,
    title: decision.title,
    claim: decision.claim ?? "",
    value: decision.value,
    jural: decision.jural ?? "power",
    binding: decision.binding ?? true,
    reason: decision.reason ?? "",
    policy: decision.policy ?? "",
    withdrawals: Object.freeze([...(decision.withdrawals ?? [])].map(String)),
    affirmations: Object.freeze([...(decision.affirmations ?? [])].map(String)),
    costWitness,
    costWitnessKind: typeof costWitness === "object" && costWitness !== null ? String((costWitness as { kind?: unknown }).kind ?? "") : "",
    created,
  });
}

function valuesFrom(ctx: GovernanceContext, key: "affirmations" | "withdrawals"): string[] {
  const options = ctx.options ?? {};
  const target = ctx.target ?? {};
  const values = ([] as unknown[]).concat(options[key] as never[] ?? [], target[key] as never[] ?? []);
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

function withConeReading(options: Record<string, unknown>): Record<string, unknown> {
  const cone = readCone(options["space"], options["point"]);
  if (!cone) return options;
  return {
    ...options,
    affirmations: uniqueStrings(options["affirmations"], cone.affirmations),
    withdrawals: uniqueStrings(options["withdrawals"], cone.withdrawals),
  };
}

// The cone read is honest about derivation: a state reads potential on a
// point because of its own claim, and active only by derivation from its
// claim of the declared contrary predicate; stable contributes to both.
function readCone(space: unknown, point: unknown): { affirmations: readonly string[]; withdrawals: readonly string[] } | null {
  if (!space || typeof space !== "object") return null;
  const cone = space as Partial<GovernanceCone>;
  if (!Array.isArray(cone.points) || !Array.isArray(cone.states) || typeof cone.valueAt !== "function") return null;
  const selected = typeof point === "string" && cone.points.includes(point) ? point : cone.points[0];
  if (selected === undefined) return null;
  const affirmations: string[] = [];
  const withdrawals: string[] = [];
  for (const state of cone.states) {
    const value = cone.valueAt(selected, state);
    if (value === "potential" || value === "stable") affirmations.push(String(state));
    if (value === "active" || value === "stable") withdrawals.push(String(state));
  }
  return Object.freeze({
    affirmations: Object.freeze([...new Set(affirmations)].sort()),
    withdrawals: Object.freeze([...new Set(withdrawals)].sort()),
  });
}

function uniqueStrings(...lists: readonly unknown[]): string[] {
  const values: string[] = [];
  for (const list of lists) values.push(...([] as unknown[]).concat(list as never[] ?? []).filter(Boolean).map(String));
  return [...new Set(values)].sort();
}

function officeOf(ctx: GovernanceContext): string {
  return ctx.officeName ?? String(ctx.agent?.office ?? ctx.agent?.name ?? "worker");
}
