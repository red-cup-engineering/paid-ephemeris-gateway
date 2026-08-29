---
type: claim
status: draft
depends-on: [substrate, predication-cell, record, governance, corpus-as-flatfile]
---

# Governance frontmatter is substrate

**Claim.** Every $(\text{slug}, \text{key}, \text{value})$ triple in a governance record's YAML frontmatter is a [predication-cell](../concepts/predication-cell.md) of the form $(s, p, o)$.
Reading governance is reading substrate.
Writing governance frontmatter is producing substrate cells.
There is no separate "governance configuration" layer beneath governance frontmatter — the frontmatter IS the governance state, projected.

The claim formalizes the captain's articulated principle: *"every governance bit as a proper claim, $(\text{slug}, \text{key}, \text{value})$ is $(s, p, o)$"*.

## Statement

For any governance record $G$ at slug $\sigma_G$, with frontmatter fields $(k_1: v_1), (k_2: v_2), \ldots, (k_n: v_n)$:

$$\text{Cells}(G) \;=\; \{\, (\sigma_G, k_i, v_i) = \mathbf{t} \;|\; i \in \{1, \ldots, n\}, v_i \neq \bot, v_i \neq \emptyset \,\}$$

— each frontmatter field projects one cell (or, when $v_i$ is a list, one cell per list element).
The substrate's view of governance is the union of these cells across all governance records, plus their closure under the dispatch and capability-table rule-systems.

In particular: looking up "what powers does office X hold?" is reading the cells $(X, \text{action-domain}, *) = \mathbf{t}$; the answer is in substrate, not in a separate governance-configuration data structure.

## Sketch

### (1) Frontmatter is parseable as cells

YAML frontmatter has well-defined semantics: fields with scalar values, fields with list values, fields with mapping values.
The parsing is unambiguous; the resulting key-value tree projects naturally to predication-cells:

- Scalar field `kind: office` → cell $(\sigma_G, \text{kind}, \text{office}) = \mathbf{t}$.
- List field `provides-skill: [auditing-X, writing-Y]` → two cells $(\sigma_G, \text{provides-skill}, \text{auditing-X}) = \mathbf{t}$ and $(\sigma_G, \text{provides-skill}, \text{writing-Y}) = \mathbf{t}$.
- Mapping field `deontic-profile: {power-X: power}` → cell $(\sigma_G, \text{deontic-profile-power-X}, \text{power}) = \mathbf{t}$ — possibly with a richer object-side encoding for nested structures.

[Gap: the precise serialization for nested mapping fields (where the value is itself a tuple or a structured object) is not yet uniformly specified.
The realization currently handles common cases; edge cases may need a convention.]

### (2) Reading frontmatter is reading substrate

The pyfars implementation already loads frontmatter and indexes it.
Per [`corpus-as-flatfile`](../objects/corpus-as-flatfile.md), the predication-graph is derived from frontmatter.
The claim's content is recognizing that *this derivation IS the substrate-cell read*; there's no further step needed to "convert governance to substrate."
The frontmatter's parse tree IS the cell set.

### (3) Substrate purity holds

Per [substrate-purity](substrate-purity.md), PyFARS modifies substrate only via witnessed verbs.
Editing governance frontmatter (via the edit verbs, or via in-place markdown edit subsequently captured by `pyfars commit`) is a witnessed substrate transition.
The cells that change are exactly the frontmatter fields that change; no hidden cells are mutated.

## Discussion

### What this claim does

It eliminates the abstraction layer between "governance" and "substrate."
A polity does not have: - A governance system (one set of rules, with its own format and engine), AND - A substrate (a different set of cells, with its own representation),

with an integration layer translating between them.
A polity has *one* substrate, and governance is a sub-fiber of it.
Reading any governance bit is reading some cells.
Modifying any governance bit is producing witnesses that change cells.

This unifies the architecture and removes a class of bugs: governance-substrate-divergence (where the policy says one thing but the substrate state implies another) is structurally impossible if the policy IS the substrate state.

### What this claim does not say

- It does not say all governance is in frontmatter.
  Body content of governance records (prose explanations, rationales, examples) is *not* substrate-cell-projected; it's content for human reading.
  The body provides context; the frontmatter provides cells.
  Both belong in the record; only the frontmatter is substrate.
- It does not say governance is the only substrate.
  Work cells, theory cells, witness events — all these are also substrate.
  Governance is one sub-domain of the substrate.
- It does not say substrate is *only* governance frontmatter.
  Substrate cells come from governance, work, theory, log events, and any other cell-producing source.

### What would have to change for this claim to fail

- If PyFARS adopted a separate governance engine (an external rules system reading PyFARS records but storing its own state out-of-substrate), the claim would fail.
  Fix: keep governance state in-substrate.
- If frontmatter became too poor in expressivity for a needed governance pattern (e.g., conditional rules, parameterized policies), and the workaround was to put governance state outside frontmatter, the claim would fail.
  Fix: extend the frontmatter convention or move richer expressivity into substrate-tracked closure rules.

## Connection to upstream

This is PyFARS's realization of the predication-categories commitment that *all substrate state is predication-cells, no privileged metadata exists*.
The upstream theory says everything that matters is a cell; this claim says PyFARS realizes that for governance specifically — governance is not an exception, not a separate plane, not a configuration; it's substrate.

## Practical consequences

- **For dispatch**: the [dispatch-closure-rule-system](../objects/dispatch-closure-rule-system.md) reads cells, period.
  There is no separate "consult governance" step; governance lookup IS substrate lookup.
- **For audit**: questions like "why does office X have power Y?" route to substrate-cell lookup.
  The answer is one or more cells; the witnesses producing those cells are the audit trail.
- **For change**: changing governance is producing substrate cells via witnesses.
  There's no "deploy new governance" separate from "witness new cells."
  Live evolution is the default.
- **For migration**: when governance frontmatter conventions evolve (e.g., `deontic-profile:` reshape), the substrate cells reshape correspondingly.
  The migration is itself a witnessed substrate transition.
