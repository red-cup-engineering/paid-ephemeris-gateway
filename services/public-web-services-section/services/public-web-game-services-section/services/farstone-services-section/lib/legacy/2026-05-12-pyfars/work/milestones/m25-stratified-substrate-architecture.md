---
title: "M25 — Stratified Substrate Architecture (Three-Stratum Predication Store)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m5-agential-self-generation, m19-self-developing-pyfars]
goals:
  - stratum-tag-on-every-predication-cell
  - separate-rule-saturation-and-bilattice-stabilization-passes
  - event-log-as-stratified-fiber-history
  - mcp-serves-stratum-2-not-stratum-0
  - outer-alternation-provenance-tagging
  - stratum-aware-dispatch-routing
  - stratum-aware-federation-merge
theory-basis: [closure-2-monad-lax-idempotence, stratified-predication-fiber, bilattice-stabilization-nucleus, sigma-delta-pass-decomposition, predication-fiber-algebra, settling-convergence, two-internal-logics, closure-algebra-coalgebra-correspondence]
prior-art: [engineering-archive/operations/command/ideas/triage/dont-flatten-the-tower.md]
backing-gaps:
  - pyfars/objects/stratum-tag.md (NOT YET AUTHORED — stratum-0/1/2 annotation on every predication cell atom)
  - pyfars/objects/stratified-cell-atom.md (NOT YET AUTHORED — wire-form stratum field plus derived_from/derived_via witness fields)
  - pyfars/morphisms/rule-saturation-pass.md (NOT YET AUTHORED — cl^S closure operator as standalone substrate operation emitting stratum-1 atoms)
  - pyfars/morphisms/bilattice-stabilization-pass.md (NOT YET AUTHORED — N_Δ = T_a^* per-cell stabilization emitting stratum-2 atoms)
  - pyfars/claims/mcp-serves-stratum-2-not-stratum-0.md (NOT YET AUTHORED)
  - pyfars/claims/stratum-tag-invariant.md (NOT YET AUTHORED — every predication cell atom carries exactly one stratum tag)
acceptance: "Every predication cell atom in the substrate carries a stratum tag (0/1/2 = asserted/saturated/settled). The rule-saturation pass (cl^S) and bilattice-stabilization pass (N_Δ) are separate substrate operations with separate witness records. An MCP read call applies the default projection π₂ and returns only stratum-2 (settled) atoms; a cell atom at stratum 1 (saturated but not yet stabilized) is invisible to the MCP surface but visible in the raw event log. The substrate's event log distinguishes cl^S-firing records from N_Δ-stabilization records. A stratum-aware dispatch rule routes a workitem to a different agent depending on whether its eligibility predicate is at stratum 0 (tentatively asserted) vs. stratum 2 (doubly settled)."
---

# M25 — Stratified Substrate Architecture

The current substrate stores everything at one level: all predication cell atoms — asserted, rule-saturated, bilattice-stabilized, observed — look identical in the event log.
The mathematics requires three distinct strata.
The current implementation conflates them.
This is the correctness gap the captain called "flattening the tower."

> "One historic issue is that when trying to implement these mathematics and systems, we often end up flattening things that are actually many layers of deep math into the simpler math that can't ACTUALLY support the complexity we need." — captain directive, 2026-04-04

M25 un-flattens the tower: each predication cell atom carries an explicit **stratum tag**; the rule-saturation closure operator cl^S and the bilattice stabilization nucleus N_Δ run as separate passes with separate witnesses; the substrate's event log is interpreted as a stratified predication fiber A^♭_p rather than a flat atom bucket; the MCP surface applies the default projection π₂ returning only stratum-2 atoms.

## What's built

### Three-stratum taxonomy

Every predication cell atom in the substrate carries exactly one stratum tag from the stratified predication fiber A^♭_p:

| Stratum | Name | Content | How reached |
|---|---|---|---|
| 0 | asserted | Raw claim `(s, p, o, v, t)` admitted by an external sender; not yet exposed to cl^S or N_Δ | Agent writes, on-complete emits, boundary admits |
| 1 | saturated | Atoms in cl^S(A^(0)_p) \ A^(0)_p — conclusions derivable by cl^S-firings against asserted (and previously-saturated) premises | cl^S rule-saturation pass over stratum-0 atoms |
| 2 | settled | Atoms in N_Δ(A^(0)_p ∪ A^(1)_p) \ (A^(0)_p ∪ A^(1)_p) — per-cell bilattice fixed points in Fix(cl^S) ∩ Fix(N_Δ) = H*_t | N_Δ bilattice-stabilization pass over stratum ≤1 atoms |

The distinction matters.
A stratum-0 atom is a raw claim — it may be retracted, contradicted, or not yet propagated.
A stratum-2 atom is in the settled fiber H*_t — it has passed both the knowledge-order rule-saturation (cl^S) and the truth-order per-cell bilattice stabilization (N_Δ).
Only stratum-2 atoms are authoritative inputs to dispatch eligibility rules.
The substrate's read surface commits to the default projection π₂: A^♭_p → A^(2)_p; stratum-0 and stratum-1 atoms are derivation-record content, available for audit and federation but not to default consumers.

**Current gap:** The existing `predication_store` and JSONL event log mix stratum-0, stratum-1, and stratum-2 atoms indistinguishably.
Dispatch eligibility rules read raw stratum-0 atoms.
The MCP server returns raw stored atoms.
This means: a tentative assertion is indistinguishable from a settled fact.
Dispatch may route on claims that the settlement process would have revised or retracted.

### Separate rule-saturation and bilattice-stabilization passes

The existing `kernel/closure.py:apply_active_rules` conflates the two nuclei into a single Kleene iteration.
This prevents the substrate from distinguishing: - Atoms at stratum 1 (rule-derivable conclusions, cl^S-stable but not yet N_Δ-stabilized) - Atoms at stratum 2 (both cl^S-stable and per-cell N_Δ-stabilized, doubly settled)

M25 separates them into two distinct substrate operations:

**Rule-saturation pass (cl^S):** Reads atoms at strata ≤1, fires closure rules from the closure-rule system S against matching premises, and emits new atoms at stratum 1 with `derived_via` pointing to the firing rule and `derived_from` pointing to the premise atoms.
Terminates when a full layer of rule firings produces no new conclusion (a cl^S fixed point).
Operates on the **knowledge order** — it adds atoms, increasing the fiber's knowledge content.

**Bilattice-stabilization pass (N_Δ = T_a^*):** Reads atoms at strata ≤2, applies the per-cell composite step T_a(x) = a ⇒ (a ⊙ x) to each moved cell's value until the cell's per-cell fixed point, and emits new atoms at stratum 2 with witness pointing to the stratum-1 (or stratum-0) atoms whose values were composed in the T_a-orbit.
Operates on the **truth order** — it refines each cell's truth-component value, not the fiber's knowledge content.
Bounded: on the four-bilattice FOUR, per-cell Δ-fuel is at most 2 substeps.

The two passes produce structurally distinct witness records: - `cl^S-firing-record`: which stratum-0/1 premises fired, which stratum-1 atoms were produced - `N_Δ-stabilization-record`: which stratum ≤1 atoms were consumed, which stratum-2 atoms were produced, the per-cell background value a used

**Why separate:** The two passes have different termination conditions (rule fixed point vs. per-cell T_a fixed point), different fuel disciplines (regime-dependent σ-fuel vs. structurally bounded Δ-fuel ≤2 on FOUR), and produce atoms at different output strata.
A single-loop implementation that conflates them loses the per-cell witness chain's structural information and makes post-hoc diagnosis impossible when fuel runs out.

**Theory basis:** The **σ/Δ pass decomposition** engineering concept establishes the two-nucleus structure and the structural distinctness of the two passes.
The **closure-2-monad lax-idempotence** theorem establishes that Cl is lax-idempotent (Kelly-Lack K1): the closure 2-monad applied twice need not equal the closure 2-monad applied once in the strict sense.
This means the ordered sequence of passes is mathematically non-trivial; what you get from the rule-saturation pass alone (stratum 1) is genuinely distinct from what you get after the bilattice-stabilization pass (stratum 2).

### Event log as stratified fiber history

The current substrate interprets the JSONL event log as a flat atom bucket: all atoms ever asserted, regardless of stratum or history position.
This conflates: - Atoms at stratum 0 from current and retracted claims - Atoms at stratum 1 from rule-derivation passes that may have been superseded - Atoms at stratum 2 from the current H*_t

The correct interpretation is the **stratified predication fiber** A^♭_p: the event log records atoms at their stratum of emission, with per-atom witness chains (`derived_from`/`derived_via`) pointing to lower-stratum justifications.
The substrate's in-memory view at query time materializes the current A^♭_p from the log: atoms are forward-only (stratum is non-decreasing along the canonical firing trajectory); per-atom persistence-under-promotion holds (a stratum-2 atom at coordinate (s, p, o) does not erase the stratum-1 atom at the same coordinate, which remains as the derivation record).

This is not a database redesign — the JSONL event log format does not change.
It is an **interpretation discipline**: the log already records which atoms were emitted when and by which operation.
M25 makes the stratum structure explicit in that interpretation.

**Theory basis:** The **stratified predication fiber** object A^♭_p (from the predication-categories theory) is the mathematical carrier of the three-stratum discipline.
Its structural properties — forward-only stratum, persistence-under-promotion, acyclic witness chain — are the properties the substrate's event-log interpretation must preserve.

### MCP serves stratum-2 atoms via the default projection

The MCP server currently returns raw stored atoms in response to substrate queries.
Raw atoms include stratum-0 claims — tentative, potentially inconsistent, not yet settled.

The default projection π₂: A^♭_p → A^(2)_p retains only stratum-2 atoms and is the correct read surface for a knowledge-order interface.
The **two-internal-logics** theorem establishes that the predication hyperdoctrine supports both a classical logic T_t over the truth order and a paraconsistent logic T_k over the knowledge order; MCP queries are knowledge-order queries — "what does the substrate know?" — and should be answered from the knowledge-order-settled content, which is precisely the stratum-2 fixed points Fix(cl^S) ∩ Fix(N_Δ) = H*_t.

The practical change: `list-tools` and `call-tool` MCP endpoints apply π₂.
A workitem whose eligibility predicate is at stratum 0 (raw assertion, not yet cl^S-stable) is not surfaced as eligible.
A workitem whose eligibility is at stratum 2 (settled) is surfaced.
The difference matters: a stale claim asserted in a previous session but not yet propagated through the settlement passes is correctly invisible at the MCP surface but visible in the raw event log.

### Outer alternation provenance tagging

The substrate's full settlement requires alternating the two passes — cl^S then N_Δ then cl^S again if N_Δ produced atoms that satisfy previously-unsatisfied rule premises — until both nuclei are simultaneously at their joint fixed point H*_t.
Each outer-alternation round trip produces atoms that feed the next pass.

In the existing `kernel/closure.py`, this alternation is unwitnessed: there is no record of whether a given stratum-2 atom was produced in the first N_Δ pass or a later one after a further cl^S round.
M25 adds a provenance tag to each atom recording which outer-alternation step produced it:

- `promoted-in-outer-step: N` — the atom was produced in outer-alternation step N (where step 0 is the initial cl^S pass)
- For atoms at stratum 2 produced after the initial N_Δ pass, their provenance records that they required a cl^S refinement round to reach their fixed-point value

This is not the same as saying "L2 cells generate new L0 assertions" (which I incorrectly stated in an earlier draft).
What happens is: the N_Δ pass stabilizes a cell's truth-component value, which may produce a stratum-2 value that satisfies a cl^S rule's premise that the stratum-1 value did not.
The outer-alternation step runs cl^S again, emitting new stratum-1 atoms at new coordinates.
These new stratum-1 atoms then go through N_Δ in the next step, producing stratum-2 atoms at those new coordinates.
The algebra runs forward through the outer alternation; the provenance tag records where in that trajectory each atom landed.

**Theory basis:** The **closure-algebra-coalgebra-correspondence** theorem establishes that Cl-algebras (C-closed settled fibrations) correspond bijectively to Cl*-coalgebras under Jung-Rivieccio duality.
The practical meaning: the settled content H*_t is simultaneously the algebra's fixed point and the coalgebra's terminal object, which makes the forward-generation behavior of the outer alternation formally tractable.
The outer-alternation provenance tag is the substrate-side record of this structure.

### Stratum-aware dispatch and federation

**Dispatch:** The dispatch graph's eligibility rules should read **stratum-2 atoms only** for capability matching.
Reading stratum-0 atoms means dispatching on tentative claims.
Reading stratum-2 atoms means dispatching on settled facts.
The dispatch scheduler (`programs/engine/dispatch.py`) reads from the closed store; M25 ensures `kernel/closure.py:apply_active_rules` settles to stratum-2 before the scheduler reads, via the π₂ projection.

**Federation:** The `FederationEnvelope` merge (`programs/federation.py`) currently merges all atoms regardless of stratum.
M25 makes stratum explicit in the merge: stratum-0 atoms from a peer are received as stratum-0 (tentative, requiring local settlement); stratum-2 atoms from a peer are received as stratum-2 (already doubly-settled on the sending substrate, trusted per the peer's trust level).

A `(s, p, o, v, t)` atom claimed by a peer at stratum 2 is different from the same atom claimed tentatively at stratum 0 by the same peer.
The stratum tag carries across the federation boundary and determines whether the receiving substrate must re-run settlement.

## What M25 does NOT claim

- **Not a database redesign.** The JSONL event log format does not change.
  The stratified fiber is an interpretation of the existing log structure, not a new storage format.
- **Not four strata.** The stratified predication fiber A^♭_p defines exactly three strata: 0 (asserted), 1 (saturated = cl^S-stable), 2 (settled = H*_t = Fix(cl^S) ∩ Fix(N_Δ)).
  There is no fourth "observable" or "global section" stratum in the mathematics.
  Read surfaces apply the default projection π₂ to stratum-2 content; this is a projection, not a new stratum.
- **Not performance-sensitive.** The separate cl^S and N_Δ passes add one pass to the closure runner.
  For the current substrate sizes (hundreds to low thousands of atoms), this is negligible.
- **Not complete modal logic.** The connection to the two-internal-logics theorem (T_t vs T_k) establishes that MCP queries are knowledge-order queries and should read from stratum-2.
  It does not assert that the substrate implements a complete modal logic engine.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `stratum-tag-on-every-predication-cell` | Every atom in the event log carries a 0/1/2 stratum tag | open |
| `separate-rule-saturation-and-bilattice-stabilization-passes` | cl^S and N_Δ run as separate closure passes with separate witness records | open |
| `event-log-as-stratified-fiber-history` | In-memory store interpreted as A^♭_p with forward-only stratum and per-atom witness chains | open |
| `mcp-serves-stratum-2-not-stratum-0` | MCP read surface applies π₂ projection; stratum-0/1 atoms invisible to external queries | open |
| `outer-alternation-provenance-tagging` | Atoms carry promoted-in-outer-step tag; outer cl^S↔N_Δ alternation is provenance-witnessed | open |
| `stratum-aware-dispatch-routing` | Dispatch eligibility rules read stratum-2-only atoms; stratum-0 claims do not gate dispatch | open |
| `stratum-aware-federation-merge` | FederationEnvelope distinguishes stratum-0 atoms (require local settlement) from stratum-2 atoms (peer-trusted) | open |

## Done when

Every atom in a real polity substrate event log carries a stratum tag.
The closure runner produces separate cl^S-firing and N_Δ-stabilization witness records.
An MCP read returns only stratum-2 atoms (demonstrated by showing a deliberately unset stratum-0 claim is invisible to the MCP surface but visible in the raw event log).
The dispatch graph routes two otherwise-identical workitems differently based on whether their eligibility predicate is at stratum 0 vs. stratum 2 — the stratum-0-eligible workitem is not dispatched; the stratum-2-eligible one is.
A federation merge from a peer correctly treats the peer's stratum-2 atoms as settled and the peer's stratum-0 atoms as requiring local settlement.

## Theoretical shape

**Stratum separation as structural necessity.** The cl^S and N_Δ passes are operationally and structurally distinct: cl^S operates on the knowledge order (adds atoms, increasing knowledge content) and its fuel budget is regime-dependent; N_Δ operates on the truth order per-cell (refines values, bounded on FOUR at ≤2 substeps) and its budget is structurally fixed.
The **σ/Δ pass decomposition** engineering concept documents this distinctness and explicitly warns that conflating the two senses of σ/Δ in the corpus "has surfaced in dev specifications more than once."
M25 resolves the conflation in the substrate implementation.

**Stratified fiber as the canonical atom carrier.** The stratified predication fiber A^♭_p is the smallest mathematical structure that (1) distinguishes three closure-degrees without conflating them as a single "current value"; (2) carries a witness chain on every stratum-1 and stratum-2 atom making per-atom dependent-invalidity computable from the witness graph; (3) forms the carrier on which the canonical firing trajectory and its per-artifact projection are stated.
A^♭_p is not an added layer — it is what the substrate's atom store already approximates, made mathematically precise.

**MCP surface as T_k knowledge-order interface.** The two-internal-logics theorem establishes that every predication hyperdoctrine supports both T_t (classical, truth-order) and T_k (paraconsistent, knowledge-order) logics.
The MCP surface answers knowledge-order queries — "what is known?" — and must read from the knowledge-order-settled content, which is the stratum-2 fixed-point content H*_t.
The default projection π₂ is the T_k query discipline applied to the stratified fiber.

## Related

- [Roadmap](roadmap.md)
- [M5 — Agential Self-Generation](m5-agential-self-generation.md), [M19 — Self-Developing PyFARS](m19-self-developing-pyfars.md) — prerequisites
- [M24 — Predication-Native Simulation](m24-predication-native-simulation.md) — M25's stratified store is a prerequisite for M24's tower-fold generation mechanism
- [Engineering archive source](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/dont-flatten-the-tower.md)
