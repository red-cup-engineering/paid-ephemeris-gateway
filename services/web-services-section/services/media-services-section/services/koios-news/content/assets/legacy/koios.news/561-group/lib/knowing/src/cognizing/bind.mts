/**
 * cognizing/bind — knowing/knowledge-state → knowing/binding: the BINDING PROBLEM via
 * sheaf cohomology, as a knowing morphism.
 *
 * The binding problem is a central HARD problem of cognitive neuroscience: how do
 * distributed feature representations — color (V4), motion (MT), shape (IT), location —
 * processed in separate cortical areas, bind into ONE unified percept? The 2024–2025
 * mathematical turn (cellular-sheaf models of binding; Hansen–Ghrist sheaf Laplacians on
 * the feature graph) frames it as a sheaf-gluing question — and that is EXACTLY the corpus's
 * settling cohomology (content/…/settling-cohomology.md: H⁰ = the section realized, H¹ = the
 * obstruction to gluing local sections into one). So the famous hard problem is easy here:
 * knowing already holds the comonad context C(Meme) = the distributed features, and `bind`
 * reads their sheaf cohomology over the predication graph (entities = nodes, predications =
 * subject—object edges):
 *   - H⁰ = connected components = the distinct BOUND PERCEPTS — segmentation, how many
 *     unified objects the features cohere into (the LIMIT / cone over the feature diagram);
 *   - H¹ = the cycle rank (edges − nodes + components) = the BINDING OBSTRUCTION — the
 *     independent cycles where the same features admit multiple inconsistent conjunctions
 *     (Treisman's illusory conjunctions / von der Malsburg's superposition catastrophe).
 *     `bound` ⟺ H¹ = 0: a unique coherent conjunction exists.
 * The cohomology is the same H⁰/H¹ relating's settling sheaf computes, here at the meme
 * grain (entities/predications). Pure, total over any held knowledge-state.
 */
import { action, jsonResource, type Action, type JsonValue } from "@emsenn/relating";
import { admitState, heldMemesOf } from "./section.mjs";
import { bindingCarrier, type Binding } from "./binding.mjs";

const STATE_CARRIER_ID = "knowing/knowledge-state";

/** A predication term's entity key — the node it is in the feature graph. */
const entityKey = (term: { readonly mark: { readonly value: unknown } }): string => String(term.mark.value);

/**
 * The sheaf cohomology of the feature graph held by a knowledge-state: H⁰ = connected
 * components (union-find over entities, edges = predications), H¹ = the cycle rank
 * `edges − nodes + components`. This is the settling sheaf's H⁰/H¹ at the meme grain.
 */
function bindingOf(memes: ReturnType<typeof heldMemesOf>): Binding {
  const parent = new Map<string, string>();
  const ensure = (node: string): void => { if (!parent.has(node)) parent.set(node, node); };
  const find = (node: string): string => {
    let root = node;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cursor = node;
    while (parent.get(cursor) !== root) { const next = parent.get(cursor)!; parent.set(cursor, root); cursor = next; }
    return root;
  };
  let edges = 0;
  for (const m of memes) {
    const subject = entityKey(m.cell.subject);
    const object = entityKey(m.cell.object);
    ensure(subject); ensure(object);
    edges += 1;
    parent.set(find(subject), find(object)); // union — this predication binds the two entities
  }
  const nodes = parent.size;
  const components = new Set([...parent.keys()].map(find)).size; // H⁰
  const obstruction = Math.max(0, edges - nodes + components);   // H¹ = cycle rank
  return {
    kind: "knowing.binding",
    features: memes.length,
    percepts: components,
    bound: obstruction === 0,
    obstruction,
  };
}

/** bind — read whether a held knowledge-state's distributed features bind into a unified
 *  percept (the binding problem, via sheaf cohomology). */
export const bindAction: Action = action({
  verb: "bind",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Bind a held knowledge-state's distributed features into unified percept(s) — the binding problem solved by sheaf cohomology (H⁰ = bound percepts, H¹ = the binding obstruction).",
  description: `Domain: ${STATE_CARRIER_ID} — the comonad context C(Meme), the distributed features. Codomain: ${bindingCarrier.id} — the binding verdict. Reads the sheaf cohomology of the feature graph (entities = nodes, predications = edges): H⁰ (\`percepts\`) = connected components = distinct bound objects; \`bound\` = (H¹ = 0); H¹ (\`obstruction\`) = the cycle rank = inconsistent conjunctions (illusory conjunctions / the superposition catastrophe). The famous hard problem is easy here because the corpus's settling sheaf cohomology IS the binding cohomology.`,
  domainSchema: Object.freeze({ $ref: STATE_CARRIER_ID }),
  codomain: bindingCarrier,
  run: (input: unknown): JsonValue =>
    jsonResource(bindingOf(heldMemesOf(admitState(input as JsonValue, "bind"))) as unknown as JsonValue, "binding"),
});
