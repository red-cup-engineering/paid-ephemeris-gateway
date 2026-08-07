/**
 * proving — knowing's syntactic face: finding a proof (Curry–Howard–Lambek).
 *
 * To KNOW a proposition is to hold a PROOF — a term of its type in @emsenn/relating's
 * CHL.Tm calculus, where *terms ARE proofs* (CurryHowardLambekQuartet). `find` is proof
 * SEARCH / type inhabitation: given a proposition (a `Ty`) and hypotheses (a context of
 * `Ty`), search the →/×/unit fragment for a CHL-core term that inhabits it, and CERTIFY
 * the result with relating's `hasTy` — the trusted verification floor. A found proof is
 * trustworthy because it type-checks, not because the search is.
 *
 * This is the syntactic dual of ./closing (the semantic face: forming the concept =
 * computing the settling closure). Wurm's theorem — concept lattices are complete
 * semantics for the Lambek calculus — makes the two faces one structure. The proof terms
 * `find` searches are the very CHL.Tm IR relating proves and evaluates.
 */
import {
  ty,
  tm,
  hasTy,
  tyEqual,
  action,
  jsonResource,
  type Ty,
  type Tm,
  type Action,
  type JsonValue,
  type JsonRecord,
} from "@emsenn/relating";

/**
 * Search for a proof of `goal` under the de-Bruijn hypothesis context `ctx`, fuel-bounded
 * (proof search in the implication/product/unit fragment is decidable; the fuel guards the
 * backward-chaining recursion). Returns a CHL-core proof term, or null if none is found.
 * Right-invertible introductions are applied eagerly; an atomic goal is met by eliminating
 * a hypothesis (projecting pairs, applying functions whose arguments are themselves proved).
 */
export function inhabit(ctx: readonly Ty[], goal: Ty, fuel = 64): Tm | null {
  if (fuel <= 0) return null;
  switch (goal[0]) {
    case "unit":
      return tm.star();
    case "prod": {
      const left = inhabit(ctx, goal[1], fuel - 1);
      const right = left === null ? null : inhabit(ctx, goal[2], fuel - 1);
      if (left !== null && right !== null) return tm.pair(left, right);
      break;
    }
    case "arrow": {
      const body = inhabit([goal[1], ...ctx], goal[2], fuel - 1);
      if (body !== null) return tm.lam(body);
      break;
    }
    case "base":
      break;
  }
  // Left rules: use a hypothesis to reach the goal (an atomic goal, or as a fallback when
  // the introduction did not close).
  for (let index = 0; index < ctx.length; index += 1) {
    const used = useHypothesis(ctx, tm.var(index), ctx[index]!, goal, fuel - 1);
    if (used !== null) return used;
  }
  return null;
}

/** Eliminate a hypothesis `term : have` toward `goal`: project a product, or apply a
 *  function once its argument is proved, until the carried type meets the goal. */
function useHypothesis(ctx: readonly Ty[], term: Tm, have: Ty, goal: Ty, fuel: number): Tm | null {
  if (tyEqual(have, goal)) return term;
  if (fuel <= 0) return null;
  if (have[0] === "prod") {
    return useHypothesis(ctx, tm.fst(term), have[1], goal, fuel - 1)
      ?? useHypothesis(ctx, tm.snd(term), have[2], goal, fuel - 1);
  }
  if (have[0] === "arrow") {
    const argument = inhabit(ctx, have[1], fuel - 1);
    if (argument !== null) return useHypothesis(ctx, tm.app(term, argument), have[2], goal, fuel - 1);
  }
  return null;
}

/** A found proof, certified by relating's `hasTy`: knowing the proposition. */
export interface ProofWitness {
  readonly kind: "knowing.proving.proof:witness";
  readonly proposition: Ty;
  readonly context: readonly Ty[];
  readonly proof: Tm;
}

/** No proof found: the proposition is not known (in this context, within the search bound). */
export interface ProofObstruction {
  readonly kind: "knowing.proving.proof-obstruction";
  readonly proposition: Ty;
  readonly context: readonly Ty[];
}

/** The judgment a proof search returns. */
export type ProofJudgment = ProofWitness | ProofObstruction;

/** Find a proof of `goal` under `context`: search the CHL.Tm calculus, then CERTIFY the
 *  result with `hasTy`. A witness is returned only when the proof genuinely type-checks. */
export function find(goal: Ty, context: readonly Ty[] = []): ProofJudgment {
  const proof = inhabit(context, goal);
  if (proof !== null && hasTy(context, proof, goal)) {
    return Object.freeze({ kind: "knowing.proving.proof:witness" as const, proposition: goal, context: Object.freeze([...context]), proof });
  }
  return Object.freeze({ kind: "knowing.proving.proof-obstruction" as const, proposition: goal, context: Object.freeze([...context]) });
}

/** Admit a proof goal from the wire: a bare CHL type s-expression, or `{ goal, context }`. */
function admitGoal(input: JsonValue, verb: string): { goal: Ty; context: readonly Ty[] } {
  if (Array.isArray(input)) return { goal: input as unknown as Ty, context: [] };
  if (input !== null && typeof input === "object") {
    const record = input as JsonRecord;
    const goal = record["goal"];
    if (Array.isArray(goal)) {
      const context = Array.isArray(record["context"]) ? (record["context"] as unknown as Ty[]) : [];
      return { goal: goal as unknown as Ty, context: Object.freeze([...context]) };
    }
  }
  throw new TypeError(`${verb}: expected a proposition (a CHL type s-expression like ["arrow",["base"],["base"]]) or { goal, context }`);
}

/**
 * find — proof search: a proposition in, a hasTy-certified proof out (or an obstruction).
 * Knowing a proposition IS finding its proof (Curry–Howard). The dual semantic reading —
 * forming the concept — is ./closing; by Wurm they are one structure.
 */
export const findAction: Action = action({
  verb: "find",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Find a proof of a proposition: proof search over the CHL.Tm calculus (Curry–Howard).",
  description: "Domain: a proposition as a CHL type s-expression (or { goal, context } with a hypothesis context). Codomain: the proof judgment (knowing/proving/proof) — a witness carrying a hasTy-certified proof term, or an obstruction when none is found.",
  run: (input: unknown): JsonValue => {
    const { goal, context } = admitGoal(input as JsonValue, "find");
    return jsonResource(find(goal, context), "proof judgment");
  },
});

/** A worked propositional tautology for documentation/tests: `A → A` proved by `λx.x`. */
export const identityProposition: Ty = ty.arrow(ty.base(), ty.base());
