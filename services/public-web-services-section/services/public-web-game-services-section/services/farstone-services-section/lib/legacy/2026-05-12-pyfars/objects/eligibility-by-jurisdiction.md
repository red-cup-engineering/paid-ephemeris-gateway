---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: subset-cover-positive
requires-predicate: touches
provides-predicate: jurisdiction-write
consequent-predicate: eligible-by-jurisdiction
realizes: [scheduling-policy, dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system, capability-table, work-record, predication-cell]
---

# Eligibility by jurisdiction

A closure rule in the dispatch-closure-rule-system: an office is *eligible* for a work-record when the work-record's `touches:` set (filesystem paths or substrate scopes the work modifies) is covered by the office's `jurisdiction.write:` set.
The jurisdiction-axis complement of [eligibility-by-skills](eligibility-by-skills.md) and [eligibility-by-capabilities](eligibility-by-capabilities.md).

## What jurisdiction expresses

Jurisdiction is the substrate-domain over which an office may act.
A self-theory-author's jurisdiction is `pyfars/theory/`; a pyfars-records-officer's jurisdiction is `pyfars/governance/` and `pyfars/work/`; a pyfars-developer's jurisdiction is `src/`.
An office without write jurisdiction over a path cannot be assigned work that touches that path.

The jurisdiction axis is what makes work-orchestration *boundaried*: not every office can write everywhere.
Work that touches multiple jurisdictions either requires an office whose jurisdiction spans them, or must be decomposed into sub-work-records each within one office's jurisdiction.

## Rule statement

For a work-record $W$ with `touches: [P_1, \ldots, P_n]` (paths or scopes) and an office $O$ with `jurisdiction.write: [J_1, \ldots, J_m]`:

$$\forall P_i \in W.\texttt{touches}, \exists J_j \in O.\texttt{jurisdiction.write}, P_i \subseteq J_j \;\Longrightarrow\; (W, \texttt{eligible-by-jurisdiction}, O) = \mathbf{t}$$

— every path the work touches must fall under at least one path the office has write-jurisdiction over.

## Antecedent and consequent cells

Antecedent: `(W, touches, P)` and `(O, jurisdiction-write, J)` cells.

Consequent: `(W, eligible-by-jurisdiction, O)` with $\mathbf{t}$ on coverage, $\mathbf{f}$ on shortfall, $\bot$ on unspecified.

## Composition

Composes with other eligibility axes via knowledge-meet (per [eligibility-by-skills](eligibility-by-skills.md)).
All axes must hold for total eligibility.

## Path-subset semantics

The rule uses substring-or-prefix subset for paths.
A path `pyfars/theory/concepts/X.md` is covered by jurisdiction `pyfars/theory/` (prefix).
A jurisdiction `pyfars/theory/concepts/` covers concept files but not object files; the granularity is per the polity's choice.

For non-path scopes (e.g., abstract substrate domains like `governance/` or `event-log/`), the same prefix discipline applies: a jurisdiction declared at a coarser scope covers finer scopes within it.

## What this rule does not enforce

- The rule does not enforce that the office *will only write* to the touched paths during execution.
  The office is *eligible* to take the work; whether the actor stays within jurisdiction is a substrate-purity discipline (a write outside jurisdiction during execute is a violation, surfaced by audit).
- The rule does not handle read-jurisdiction.
  An office with read-only access to a path may still be assigned work that *reads* that path; eligibility-by-jurisdiction is about *write* coverage.
  A separate read-jurisdiction rule may be added if needed.

## Polity-extension

- *Jurisdiction grants*: a temporary write-jurisdiction grant for a specific work-record (an office with limited jurisdiction is granted access to do *this* particular work).
  Modeled as a temporary `(O, jurisdiction-write-for, W)` cell that the closure adds for the rule's evaluation.
- *Jurisdiction-overlap policy*: when multiple offices have jurisdiction covering the same path, all are eligible (per this rule); other rules (capacity, preference) break ties.

## Open structural questions

- Path-overlap discipline.
  When two jurisdictions share part of a path, which office is "the" jurisdiction-holder?
  The rule says "any office whose jurisdiction covers" — admit all.
  The selection rule (preference) handles which actually gets the work.
- Read vs. write distinction.
  Currently this rule is write-focused.
  Read-side eligibility may need a parallel rule.
- Cross-polity jurisdiction.
  When work touches a path in another polity's system, jurisdiction crosses polity boundaries; the discipline is open.
