---
type: definition
class: system-tracked-closure-rules
status: draft
realizes: [scheduling-policy]
depends-on: [substrate, scheduling-policy, capability-table, work-record, work-status, settling]
---

# Dispatch closure-rule-system

The system-tracked closure-rule-system whose closure produces dispatch decisions: assignments of [work records](../concepts/work-record.md) to offices/personnel/principals according to the polity's [scheduling policy](../concepts/scheduling-policy.md).
Realizes the upstream [closure-rule-system](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) at the dispatch scope.

This is the object that lets PyFARS realize the captain's principle "every governance bit is a proper claim, $(\text{slug}, \text{key}, \text{value})$ is $(s, p, o)$" at the dispatch level: instead of dispatch logic being hardcoded in Python, the rules live as system cells whose closure yields dispatch decisions.

## Data

A dispatch closure-rule-system $R^{\mathrm{dispatch}}$ for a polity is

$$R^{\mathrm{dispatch}} \;=\; \{r_1, r_2, \ldots, r_n\}$$

— a set of closure rules, each $r_i$ of the form:

$$r_i \colon \quad \text{antecedent cells} \;\;\Longrightarrow\;\; \text{consequent cells}$$

Antecedent cells read governance, work, capability-table, and existing assignment cells.
Consequent cells produce or refine assignment cells.
Iterated application of all rules until quiescence yields the system's set of dispatch decisions for the current tick.

## Notation

For a polity $P$, write $R^{\mathrm{dispatch}}_P$ for the polity's dispatch rule-system.
The system is *itself* a substrate object — corpus notes (or system cells) declaring its rules.
Polities may extend a default rule-system inherited from PyFARS-the-package or replace it entirely.

## Categories of rules

The default dispatch closure-rule-system contains rules in these categories:

### Eligibility rules

- "If work-record $W$ has `requires-skills: [S1, ..., Sn]`, and office $O$'s capability-table entry shows holding all of $S1, ..., Sn$, then $(W, \text{eligible-office}, O) = \mathbf{t}$."
- "If $W$ requires capability $C$, and $O$ holds $C$, then $(W, \text{eligible-office}, O) = \mathbf{t}$."
- "If $W$ has `touches: [P1, ..., Pm]` (filesystem paths), and $O$ has `jurisdiction.write` covering all of $P1, ..., Pm$, then $(W, \text{eligible-office}, O) = \mathbf{t}$."

### Disqualification rules

- "If work-record's `charter-binding` requires constraint $K$, and office $O$ does not hold or honor $K$, then $(W, \text{eligible-office}, O) = \mathbf{f}$."
- "If office $O$'s rate-limit-budget reads zero remaining, then $(W, \text{eligible-office}, O) = \mathbf{f}$ for all $W$ this tick."
- "If office $O$'s incumbency is below dignitas (vacant or recognized-not-yet-inducted), then $(W, \text{eligible-office}, O) = \mathbf{f}$."

### Selection rules (preference ordering)

- "Among offices eligible for $W$, prefer the one with lowest current-load."
  (Capacity rule.)
- "Among eligible endpoints, prefer per `provider-rank` cells."
  (Provider preference; the polity can declare its own rank.)
- "Among multiple eligible offices with equal preference, break ties by lexicographic slug."
  (Determinism.)

### Assignment rules

- "If for $W$ exactly one office is eligible-and-preferred, then $(W, \text{assigned-to}, O) = \mathbf{t}$."
  (Assignment fires.)
- "If for $W$ no office is eligible, then $(W, \text{status}, \text{blocked}) = \mathbf{t}$."
  (Block on capability gap.)
- "If $(W, \text{assigned-to}, O) = \mathbf{t}$ has been settled, then $(W, \text{status}, \text{assigned}) = \mathbf{t}$."
  (Status follows assignment.)

### Status-transition rules

- "If $(W, \text{blockers}, [B_1, \ldots])$ and all $B_i$ have `status: settled`, and $(W, \text{requires-skills}, ...)$ is non-empty, then $(W, \text{status}, \text{ready}) = \mathbf{t}$."
  (Ready-promotion rule.)
- "If $(W, \text{settling-cell}, \mathbf{t})$, then $(W, \text{status}, \text{settled}) = \mathbf{t}$."
  (Settled rule.)

These categories are the structural decomposition; specific polities adapt the rules within each category.

## What this object commits to

1. **Substrate-tracked**.
  The rules are corpus notes (or system cells); they're not hidden in code.
  A polity reading its own substrate can find its dispatch rules at `objects/<rule-slug>.md`; `runtime.eligibility_rules.discover_active_rule_slugs(root)` is the walker the runtime uses.
2. **Composable**.
  Polity-extensions to the default add or modify rules without rewriting the system.
  Two polities can share a base while differing in specifics.
3. **Bounded convergence**.
  The rule-system is in the strict regime: closure converges in finitely many steps per tick.
  Bounded by (work-queue size) × (capability-table size).
4. **Deterministic**.
  Given the same system state, the same closure runs produce the same dispatch decisions.
  Witnesses are the source of nondeterminism (when external events arrive); the rule-system itself is pure.

## Implementation pointers

The rule-system is realized in:

- `src/pyfars/runtime/eligibility_rules.py` — the instantiator registry (`RULE_INSTANTIATORS`).
  Each slug maps to a function that walks the system's `pypredcalc.
  PredicationStore` and emits grounded `pypredcalc.
  StoreRule` objects in the strict regime (quantifier-free over a finite carrier).
- `src/pyfars/runtime/closure_runner.py` — Kleene iteration over `pypredcalc.
  StoreClosureRuleSystem` with per-firing `RuleFiring` provenance and a deterministic `rsv_hash` (rule-system-version hash) that stamps the run for replay and federation.
- `src/pyfars/runtime/dispatch_graph.py` — the LangGraph that drives `load_store → apply_eligibility_rules → select_winners → invoke_agent` each tick.

A polity authorizes a default rule by carrying its `objects/<slug>.md` record; rule deactivation is record removal.
Polities extend the default by authoring additional rule records and registering instantiators in `RULE_INSTANTIATORS`.

Currently realized rule categories: **eligibility** (capabilities, skills, jurisdiction — implemented as `_subset_cover_rules`) and **disqualification** (rate-limit, charter-binding — implemented as `_disqualification_rules`).
Selection (winner choice from the eligible set) currently uses a lexicographic slug-tiebreak in `select_winners_node`; moving it into a substrate-authored selection closure rule is the remaining alignment work.
Assignment-as-substrate-cell (writing `(W, assigned-to, D) = T` cells back) is the further refinement.

## What this object does not yet specify

- The exact serialization of a closure rule as a substrate note.
  A rule is a logical implication; its frontmatter representation (antecedent fields, consequent fields, conditions) needs a convention.
- The handling of *contradictory* rule outputs.
  When two rules' consequents conflict (one says "eligible," one says "not-eligible" for the same pair), bilattice values produce $\top$ (paraconsistent), and dispatch surfaces the conflict rather than silently picking.
  The adjudication discipline is partly settled.
- Cross-polity rule composition.
  When PyFARS instances federate, rule-systems may need to merge; the merge discipline routes through bilattice-network-sheaf-consensus upstream but isn't yet PyFARS-side-specified.
- The treatment of *unrunnable* but still-listed offices (e.g., an office that holds the right skills but whose authority-chain has been revoked).
  Currently disqualification rules cover this; the boundary cases are open.
