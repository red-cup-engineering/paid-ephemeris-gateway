# @emsenn/socializing

The society reading of agency, admitted through `@emsenn/relating` and composed over its sibling faculties (`@emsenn/communicating`, `@emsenn/animating`).
It re-implements none of them; it depends on them.

## The one carrier

socializing is **endomorphic on a single carrier**, the **Social Field** (`socializing/social-field` → `socializing/social-field`) — exactly as communicating is endomorphic on the meme carrier.
The Social Field realizes the corpus's **multi-observer system** `V : O → Settlings_B` (`content/_archive/spatiotemporal-knowledge-presheaf`):

- `members` — the **observers**: each a `Member`, an `agent` (reused from animating) carrying its local `memes` (reused from relating — the valuation of that observer's settling).
- `base` — the **observer category `O`** itself, *not* a bare channel graph: its objects are the members (by index) and its non-identity morphisms are directed `Translation` settling-morphisms `α : source → target` — perspective maps `V(α)`, each carrying a reused `channel`.
  Identities are implicit, composites derivable; only generating translations are stored.
  (A base with no translations is a **discrete `O`** — a family of independent settlings, the degenerate diagonal case.)
- `section` — the glued **common-ground**: the consensus **limit** `lim_O V(o)` (knowledge-meet) and its H¹ obstruction, written by `converge`.

All sub-shapes are `$def`s of the one `social-field.schema.json`, with a bare descent-path `$id`.
The reused carriers (`agent`, `meme`, `channel`) are referenced, never redefined.
The observer category is a **site**: `coverOf(target)` is the replica-cover `{o_i → target}` whose gluing is the consensus and whose obstruction is `H¹`.

## The morphisms (18, all endo on the Social Field)

The **off-diagonal** morphisms are the social heart — genuinely inter-observer, with no single-agent reduction.
The **diagonal** lifts are subordinate per-observer semiosis.

| verb | reading | what it does |
|---|---|---|
| `admit` | **grow `O`** (scale-2-native) | append an observer and grow the observer category (default `completeTranslations`). One observer = a discrete `O` = communicating. |
| `merge` | **CRDT `∨_k`** (scale-2-native) | observer `to` becomes `V(to) ∨_k V(from)` cellwise (charges over a shared cell `joinKnowledge`-d, emitted in canonical normal form). Monotone, idempotent; requires adjacency. No single-agent analog. |
| `settle` | **social settling** (scale-2-native) | iterate the synchronous gossip-merge across settling stages τ to the quiescent limit v∞; record the settling depth κ (the closure ordinal = the graph eccentricity) in `section.closureOrdinal`. CRDT convergence, no consensus protocol. |
| `glue` | **Mayer–Vietoris** (scale-2-native) | present a node's H⁰ global section by ∨_k-merging its replica-cover `{o_i → target}` into it; the cover's δ⁰/H¹ obstruction and Čech overlaps are exposed by `replicaCoverConsensus`. The static Čech complement to `settle`. |
| `translate` | **`V(α)`** (off-diagonal) | carry observer `from`'s memes across a directed translation morphism into observer `to`'s frame, re-signed by communicating's `translate`; `from` unchanged. |
| `broadcast` | speak↑ | the `from` observer fuses a meme to the observers it has outgoing translations to, re-roled in-transit (`potential`), capacity enforced via `withinCapacity`. |
| `attend` | listen↑ | the observer takes up its in-transit (`potential`) memes — charge → `active`; a spent (`active`) meme is refused (linearity). |
| `converge` | ground↑ / **consensus** | (re)compute the glued `section` on two axes: the static opinion axis (`common` = the consensus limit `⋀_k`, `obstruction` = opposition-cycle `H¹`, `coordinationFree`) and the dynamic regime axis (`regime`, `regimeCoordinationFree`, `federationDiscipline`). Optional `cover` input restricts the reading to a node's replica-cover, tying `H¹` to that cover. |
| 10 diagonal lifts | per-observer semiosis | `communicate, semiose, illocute, negate, conflate, refer, modalize, presuppose, quote, compose` — communicating's own morphisms applied at each observer's stalk (each ↾ one agent = communicating verbatim). |

**CALM** (`crdt-convergence-via-cohomological-calm.md`): iterated `merge` over a coordination-free field (`H¹ = 0`) converges every observer to the component's pooled (`∨_k`) charge — exactly what `converge` reports.
When `H¹ ≠ 0`, opposed observers merge to a held `stable` (paraconsistent), not coordinated away.

## Regime stratification (the four-regime dichotomy)

Consensus has a **second, orthogonal axis** — the regime, classified by the closure ordinal κ (`regime.mts`): **strict** (κ<ω), **scott-continuous** (κ=ω), **transfinite-bounded** (ω<κ<ω₁), **aperiodic** (κ≥ω₁).
The society's joint regime is the **max-κ** ("meet") over its observers (declared on the agent; default `strict`).

- **`regimeCoordinationFree`** (cohomological-CALM): the CRDT merge's δ⁰ vanishes — so convergence needs no coordination — exactly in `strict`/`scott-continuous` (κ ≤ ω).
- **`federationDiscipline`**: `endpoint-state` (strict/scott) vs `trajectory` (transfinite/aperiodic), per `federation-convergence`.

The regime axis (does the *merge* need coordination?) is **independent** of the opposition-H¹ axis (do the *opinions* glue?): a strict field can have `obstruction > 0` yet be `regimeCoordinationFree`, and an aperiodic field can have `obstruction = 0` yet not be.

## RelMath Realization

Socializing's observer category can now be checked as a finite causal coordination trace: `analysis.causal.settleCausalSet` makes translation cycles explicit as coordination obstructions, while `probability.conditionalViaFiberAdjoint` gives subgroup/context conditioning an exact finite witness.
The strongest concrete follow-up is to add those receipts to `converge` for a selected cover.

## The consensus / disagreement law (delegated, not re-derived)

`converge` calls **`sheafCharges`** from socializing's own consensus module — the bilattice-network-sheaf-consensus computation — and projects its `SheafConsensus` into `CommonGround`. socializing inherits the theorem:

> `section.glued = true ⟺ section.obstruction = 0 ⟺ the agents' memes glue.
> `

- **`obstruction = 0` (consensus):** the local meme-sections extend to a single glued global section — common ground exists; `coordinationFree = true` (H¹ = 0).
  A held contradiction over a **tree** of edges (no cycle) still glues, with the component pooled to `stable`.
- **`obstruction > 0` (standing disagreement):** a **cycle** of opposed edges; the local sections do not glue.
  Consensus is held, paraconsistent, not exploded — a held contradiction settles `stable` (merged witnesses), never `absurd`.
  This is H¹ ≠ 0, the bilattice-network-sheaf made social.

## Surface

`actions` / `socialActions` (the 15 `*Action`s), `inducedBins` (`induceBins(socialActions)` — the manifold's package-bin transport), the `SocialField` / `SocialTranslation` / `SocialBase` types, the observer-category operations (`translation`, `identityTranslation`, `composeTranslations`, `completeTranslations`, `comparisonEdges`, `neighborsFrom`, `translationBetween`, `coverOf`), the `liftStalkwise` primitive, and `socialize(member, field?)
` (the one-call admission helper).
