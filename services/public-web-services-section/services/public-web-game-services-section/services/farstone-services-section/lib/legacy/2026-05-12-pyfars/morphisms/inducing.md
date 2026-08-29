---
type: morphism
class: closure-step
status: draft
depends-on: [closure, settling, predication-cell]
---

# Inducing

The morphism by which a single closure rule produces a consequence cell from its antecedent cells.
Inducing is the *atomic step* of closure-rule application: a rule whose antecedent matches existing cells *induces* the consequence cell into substrate.
[Settling](settling.md) is the iterated, exhaustive application of inducing across all active rules until the substrate reaches [closure](../concepts/closure.md).

Inducing is the system's mechanism for *automatic* truth-propagation — what closure-derived cells *come from*.
It is rule-driven and deterministic, distinct from [deriving](deriving.md) (agent-driven, deliberate).

## Action

For a closure rule $\rho \in R$ with antecedent-pattern matching cells $C \subseteq S$, inducing the consequence cell $c$:

$$\mathrm{inducing}_\rho \colon C \;\longrightarrow\; \{c\}$$

— the substrate gains $c$ as a derived cell. $c$ is not separately witnessed; it is *closure-content*, reconstructible from the witnesses of $C$ and the rule $\rho$.

## Inducing and witness vs. derivation

A subtle but load-bearing distinction:

- **Inducing** produces *closure-derived cells* — not separately witnessed, reconstructible from JSONL log + rule-set.
- **Witnessing** produces *witnessed cells* — directly recorded as JSONL log entries.
- **Deriving** produces *agent-attributed cells* — recorded by an agent's deriving-witness, with skill provenance.

Per [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md), the JSONL log + rule-set + timestamp is sufficient to reconstruct substrate at any time.
Inducing is the mechanism by which the rule-set's contribution is computed.

## Inducing and bilattice

Inducing is monotone in the bilattice's knowledge order: extending the active rule-set with a new rule cannot un-induce a previously-induced cell; it can only induce more cells.
This is what makes incremental rule additions safe — adding rules adds cells.

In paraconsistent cases, inducing may produce $\top$-valued cells (when two rules induce contradictory consequences).
The substrate retains both; [validation](../concepts/validation.md) surfaces the conflict; [determining](determining.md) may resolve it.

## What this morphism does not specify

- The discipline for cyclic closure rules (rules whose induced cells trigger their own antecedents).
  Currently handled by stratification; cases that defeat stratification are program-shaping.
- The performance characteristics.
  Naive inducing (re-firing every rule on every settling step) is sound but expensive; PyFARS's runtime uses dirty-bit tracking and dependency-driven re-induction.
- The rule-set's substrate-form.
  Closure rules can be code-defined (Python functions) or substrate-declared (in `_index.md` cells); the migration toward fully-substrate-declared rules is partly settled.
