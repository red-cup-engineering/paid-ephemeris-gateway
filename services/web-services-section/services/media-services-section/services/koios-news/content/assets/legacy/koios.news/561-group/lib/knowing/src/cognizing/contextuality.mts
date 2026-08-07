/**
 * cognizing/contextuality — SHEAF-THEORETIC CONTEXTUALITY as a knowing morphism, the SIGNED sibling
 * of `bind`.
 *
 * Abramsky–Brandenburger frame contextuality as the non-existence of a GLOBAL SECTION over a cover
 * of measurement contexts — exactly the corpus's settling cohomology (content/…/settling-cohomology.md),
 * the same machinery `bind` uses. The difference is the SIGN: bind glues UNSIGNED features (cycle rank
 * over the feature graph); contextuality glues SIGNED constraints — `a=b` (agree, +) and `a≠b` (disagree,
 * −, which IS the bilattice negation as a sign). A global truth-assignment exists iff the signed
 * constraint graph is BALANCED (every cycle has an even number of − edges); an unbalanced cycle is
 * FRUSTRATION — the Z₂/H¹ obstruction — i.e. CONTEXTUALITY: each context is locally satisfiable, yet no
 * single global assignment satisfies them all. That is the cognitive form of ORDER EFFECTS / cognitive
 * dissonance / the conjunction fallacy (quantum cognition, 2024–2026). Decided here by a union–find with
 * parity (the discrete signed-graph balance / Z₂ cohomology). Total over any constraint set.
 */
import {
  action,
  analysis,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import type { Contextuality } from "./carriers.mjs";

/** Parse one constraint `a=b` (agree) or `a≠b`/`a!=b` (disagree) into its two cells and sign. */
function parseConstraint(text: string): { readonly a: string; readonly b: string; readonly agree: boolean } | null {
  const neq = text.search(/!=|≠|<>/);
  if (neq >= 0) {
    const [a, b] = text.split(/!=|≠|<>/, 2).map((s) => s.trim());
    return a && b ? { a, b, agree: false } : null;
  }
  const eq = text.indexOf("=");
  if (eq >= 0) {
    const a = text.slice(0, eq).trim();
    const b = text.slice(eq + 1).trim();
    return a && b ? { a, b, agree: true } : null;
  }
  return null;
}

/**
 * contextualityOf — decide whether a set of agree/disagree constraints admits a GLOBAL consistent
 * assignment (non-contextual) or is FRUSTRATED (contextual). Union–find with parity: each cell carries
 * a parity relative to its component root; `a=b` requires equal relative parity, `a≠b` opposite. A
 * constraint that contradicts the already-forced relation is FRUSTRATION (an unbalanced cycle — the
 * Z₂/H¹ obstruction). frustration = 0 ⟺ a balanced signed graph ⟺ a global section.
 */
export function contextualityOf(constraints: readonly string[]): Contextuality {
  // Index the distinct cells as graph vertices, then decide balance with relating's substrate
  // `signedBalance` (the same union-find-with-parity, single-sourced): `a=b` is a positive (+) edge,
  // `a≠b` a negative (−) one; processed in constraint order so the frustration count is unchanged.
  const index = new Map<string, number>();
  const vertex = (cell: string): number => {
    const found = index.get(cell);
    if (found !== undefined) return found;
    const next = index.size;
    index.set(cell, next);
    return next;
  };
  const edges: (readonly [number, number, boolean])[] = [];
  let parsed = 0;
  for (const raw of constraints) {
    const c = parseConstraint(String(raw));
    if (c === null) continue;
    parsed += 1;
    edges.push([vertex(c.a), vertex(c.b), c.agree]); // agree ⇒ positive (+); disagree ⇒ negative (−)
  }
  const balance = analysis.signedBalance(index.size, edges);
  const contextual = balance.frustration > 0;
  return {
    kind: "knowing.contextuality",
    variables: index.size,
    constraints: parsed,
    contextual,
    globalSection: !contextual,
    frustration: balance.frustration,
  };
}

/** Admit a constraint set from the wire: an array of strings, or `{ constraints: [...] }`. */
function admitConstraints(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input
    : input !== null && typeof input === "object" && Array.isArray((input as { constraints?: unknown }).constraints)
      ? (input as { readonly constraints: readonly unknown[] }).constraints
      : null;
  if (raw === null) throw new TypeError("contextuality: expected an array of constraints or { constraints: [...] }");
  return raw.map((x) => String(x));
}

const CONTEXTUALITY_ID = "knowing/contextuality";

/** contextuality — judge a set of agree/disagree constraints for a global section vs frustration. */
export const contextualityAction: Action = action({
  verb: "contextuality",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Judge sheaf-theoretic contextuality: do agree/disagree constraints admit a global truth-assignment, or are they frustrated (contextual)?",
  description: `Domain: an array of constraint strings (or { constraints: [...] }) — each \`a=b\` (agree) or \`a≠b\`/\`a!=b\` (disagree). Codomain: ${CONTEXTUALITY_ID} — SHEAF-THEORETIC CONTEXTUALITY (Abramsky), the SIGNED sibling of \`bind\`: a global consistent assignment exists iff the signed constraint graph is BALANCED; FRUSTRATION (an unbalanced cycle — the Z₂/H¹ obstruction) is contextuality, the cognitive form of order effects / dissonance / the conjunction fallacy. \`frustration\` is the discrete contextual-fraction proxy. Same settling cohomology as bind, over a signed cover. Grounded in settling-cohomology.md + the bilattice negation.`,
  domainSchema: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }) as JsonRecord,
  codomainSchema: Object.freeze({ $ref: CONTEXTUALITY_ID }),
  run: (input: unknown): JsonValue => jsonResource(contextualityOf(admitConstraints(input)) as unknown as JsonValue, "contextuality"),
});
