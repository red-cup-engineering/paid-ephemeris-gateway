/**
 * actions — playing's *-autonomous operations as cocone legs on the
 * @emsenn/relating `acting` boundary.
 *
 * playing is the OUTSIDE boundary faculty: the single-agent ludics + *-autonomous
 * duality + the cut. Where communicating is the meme MONOID (meaning, ≤_t) and
 * knowing the meme COMONAD (knowledge, ≤_k), playing is the meme's *-AUTONOMOUS
 * DUALITY and the CUT. Its own carrier is the `Design` (a strategy = a partial
 * charge-valuation over a locus tree of memes); its characteristic morphism is the
 * binary `interact` (the cut: `Design ⊗ Design^⊥ → Interaction`). The polarity
 * involution `dualize` is the self-loop A^⊥ at the design node (Player↔Opponent).
 * See dev/docs/notes/2026-06-21-playing-as-star-autonomous-interaction.md.
 *
 * The CGS/multi-agent/social legs (the concurrent participant, the running
 * multiplayer game, and the social play-anthropology) are gaming's — the scale-2
 * lift of playing along the agent-sheaf — and live in @emsenn/gaming-experimental.
 * See dev/docs/notes/2026-06-21-gaming-as-multi-agent-playing.md.
 *
 * Each operation is registered once as an `action` carrying its wire codecs
 * (`inputFormat`/`outputFormat`) AND its carrier schemas — `domainSchema`/
 * `codomainSchema` `$ref` the carrier `$id`s authored in `src/carriers/index.mts`
 * (bare descent paths under `playing/…`). `induceBins` over this list assembles the
 * discovery apex from which the `play` dispatcher (CLI) and `play-serve`
 * (HTTP/OpenAPI/MCP/web) are projected, and one `dispatch` witnesses every play as
 * EAVT in playing's own ledger.
 *
 * The wire is `json` in, `json` out: data is data. EAVT is the shape of the LOG,
 * not the data boundary. Carrier outputs are projected with playing's own encoders;
 * judgment carriers are projected to flat JSON (kinds, scalars, charge-value names,
 * and rationals via `rat`). No carrier reaches `JSON.stringify`.
 */
import {
  action,
  type Action,
  type JsonRecord,
} from "@emsenn/relating";

import { starAutonomousActions } from "./star-autonomous.mjs";
import { proofActions } from "./proof.mjs";
import { topologyExtraActions } from "./topology-extra.mjs";
import { compositionActions } from "./composition-actions.mjs";
import {
  designCarrier,
  designRef,
  interactionCarrier,
  requestSchema,
} from "./carriers/index.mjs";
import { playingTerms } from "./expressing.mjs";

// ── TypeBox request schemas for boundary admission bags ──

const designRequestSchema = requestSchema("playing/request/design", {
  entries: {
    type: "array",
    items: {
      type: "object",
      required: ["locus", "act"],
      additionalProperties: false,
      properties: {
        locus: { type: "array", items: { type: "integer", minimum: 0 } },
        act: { enum: ["proponent", "opponent", "daimon", "none"] },
      },
    },
  },
}, ["entries"], "DesignRequest");

const interactRequestSchema = requestSchema("playing/request/interact", {
  designA: designRef,
  designB: designRef,
}, ["designA", "designB"], "InteractRequest");

// ── the Design grain made first-class: the strategy carrier and its polarity involution ──

/** design — build a ludics Design (the OWN carrier) from a per-locus act labelling.
 *  Domain: { entries: [{ locus, act }] } with act ∈ proponent/opponent/daimon/none
 *  (in bijection with the charge values potential/active/stable/absurd). Codomain:
 *  the encoded Design (`playing/design`). The producer of the carrier playing owns. */
export const designAction: Action = action({
  verb: "design",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: designRequestSchema as unknown as JsonRecord,
  codomain: designCarrier,
  runTerm: playingTerms.design,
  summary: "Build a ludics Design (a strategy: a charge-valuation over loci) from a per-locus act labelling.",
  description: "Domain: { entries: [{ locus: number[], act: proponent|opponent|daimon|none }] }. Codomain: the encoded Design (playing/design) — playing's own carrier, a partial charge-valuation over a locus tree of memes.",
});

/** dualize — the polarity involution A^⊥ on a Design: the *-autonomous self-loop at the
 *  design node, swapping Player↔Opponent (potential↔active) per locus via the ≤_t
 *  negation. Domain and codomain are both `playing/design` — the endo self-loop where the
 *  two-sidedness of play lives. (Daimon ⊤ and the absent ⊥ region are negation-fixed.) */
export const dualizeAction: Action = action({
  verb: "dualize",
  inputFormat: "json",
  outputFormat: "json",
  domain: designCarrier,
  codomain: designCarrier,
  runTerm: playingTerms.dualize,
  summary: "Dualize a Design (A^⊥): swap Player↔Opponent per locus — the *-autonomous polarity involution.",
  description: "Domain: an encoded Design (playing/design). Codomain: its dual Design (playing/design), each locus charge negated on the truth order (potential↔active; stable/absurd fixed). The self-loop at the design node where play's two-sidedness lives.",
});

/** interact — THE CUT: the interaction normal form of two dual designs. The
 *  characteristic *-autonomous morphism `Design ⊗ Design^⊥ → Interaction`: the
 *  pointwise knowledge-join of two dual valuations, recording per-locus meetings and
 *  the Daimon collisions where the interaction converges (orthogonality). */
export const interactAction: Action = action({
  verb: "interact",
  inputFormat: "json",
  outputFormat: "json",
  domainSchema: interactRequestSchema as unknown as JsonRecord,
  codomain: interactionCarrier,
  runTerm: playingTerms.interact,
  summary: "The cut: report the interaction normal form (knowledge-join) of two dual designs.",
  description: "Domain: { designA: <playing/design>, designB: <playing/design> } — a strategy and its counter-strategy. Codomain: the interaction report (playing/interaction): the normal form, the per-locus meetings, and the Daimon loci where the cut converges (orthogonality).",
});

/** The package's core actions: the Design grain (design/dualize) and the cut (interact). */
const coreActions: readonly Action[] = Object.freeze([
  designAction,
  dualizeAction,
  interactAction,
]);

/**
 * The package's actions — the source `induceBins` reads to project every transport.
 * The core surface (the Design grain and the cut) plus the *-autonomous category
 * surface and proof layer (orthogonality, behaviours, the MALL connectives, the
 * exponentials, incarnation, cut-elimination, Fax, the fragment lattice, focusing
 * with shifts, the embeddings) from `star-autonomous.mts`, the logic layer from
 * `proof.mts`, the topology roundout from `topology-extra.mts`, and the categorical
 * composition from `composition-actions.mts`.
 */
export const actions: readonly Action[] = Object.freeze([
  ...coreActions,
  ...starAutonomousActions,
  ...proofActions,
  ...topologyExtraActions,
  ...compositionActions,
]);
