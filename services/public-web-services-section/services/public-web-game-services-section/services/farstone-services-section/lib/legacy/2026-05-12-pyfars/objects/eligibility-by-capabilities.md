---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: subset-cover-positive
requires-predicate: requires-capabilities
provides-predicate: provides-capabilities
consequent-predicate: eligible-by-capabilities
realizes: [scheduling-policy, dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system, capability-table, work-record, predication-cell]
---

# Eligibility by capabilities

A closure rule in the dispatch-closure-rule-system: an office is *eligible* for a work-record when the office's capability-holdings cover the work-record's capability requirements.
The capability-axis complement of [eligibility-by-skills](eligibility-by-skills.md).

## Skills vs. capabilities

The two axes differ subtly:

- A **skill** is a procedure (a gerunding-verb-phrase), defining *how* the holder performs work — e.g., `auditing-derivation-chain-governance`.
  Skills realize specific operational capacities.
- A **capability** is a structural admission to perform a class of action — e.g., `provides-capabilities: [reading, writing, sandbox-execution]`.
  Capabilities realize broader functional attributes.

A work-record may require both: e.g., `requires-skills: [writing-task-records]` plus `requires-capabilities: [tool-use]` — the skill is the procedure, the capability is the structural admission.
Some endpoints (LLM endpoints, agent runtimes) declare capabilities; offices declare skills; both are dispatchable contexts.

## Rule statement

For a work-record $W$ with `requires-capabilities: [C_1, \ldots, C_n]` and a dispatchable $D$ (office, agent, endpoint, principal) with `provides-capabilities: [P_1, \ldots, P_m]`:

$$\big\{C_1, \ldots, C_n\big\} \subseteq \big\{P_1, \ldots, P_m\big\} \;\Longrightarrow\; (W, \texttt{eligible-by-capabilities}, D) = \mathbf{t}$$

## Antecedent and consequent cells

Antecedent: `(W, requires-capabilities, C)` and `(D, provides-capabilities, P)` cells, projected from frontmatter.

Consequent: `(W, eligible-by-capabilities, D)` cell with $\mathbf{t}$ on coverage, $\mathbf{f}$ on shortfall, $\bot$ on unspecified.

## Composition

Per the eligibility-axis composition discipline ([eligibility-by-skills](eligibility-by-skills.md)), total dispatch eligibility is the knowledge-meet across all axes.
Eligibility-by-capabilities is one of the conjuncts.

## Polity-extension

- *Capability hierarchies*: a polity may declare `(C', subsumes, C) = t`, meaning capability $C'$ implies capability $C$.
  An additional closure rule extends `provides-capabilities:` cells via subsumption.
- *Conditional capabilities*: a capability that's held only under certain conditions (`provides-capability-when:` cells).
  Currently not modeled; an extension would add condition-checking to the closure.

## Open structural questions

- The boundary between skills and capabilities sometimes feels arbitrary — `tool-use` could be a skill or a capability depending on framing.
  The discipline for choosing which axis is partly conventional, partly system-tracked (the polity declares a skill or a capability, and the chosen axis is fixed).
- Capability-revocation timing.
  When a capability is revoked, in-flight assignments dependent on it remain — the assignment was made when the capability was held.
  Whether to retroactively re-evaluate is a polity-policy.
