---
type: concept
class: system-atom
status: draft
depends-on: [bilattice, predication]
realizes: [predication]
---

# Predication cell

The atomic unit of PyFARS system state: a $(s, p, o)$ triple — *subject*, *predicate*, *object* — together with a bilattice value drawn from at minimum **FOUR** = $\{t, f, \bot, \top\}$.
PyFARS realizes the [predication-categories notion of a predication](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/predication.md) as a unit of stored truth-state, with the bilattice value carrying both the truth-order ($\leq_t$) and knowledge-order ($\leq_k$) information about what is currently known about the subject's relation to the object via the predicate.

## Role in PyFARS

PyFARS's substrate is a multiset of predication-cells.
Every fact PyFARS holds about its world — the captain holds an office, a task is assigned to an agent, a corpus note depends on another, an external principal is granted a profile — is one or more predication-cells.

The atomicity matters: PyFARS does not have a privileged level of representation between "predication-cell" and "everything else."
There are no records, no rows, no objects-with-attributes at the system level.
There are predication-cells, and constructions over predication-cells (settled subsets, fibers, projections).
Records and rows appear only at projection layers; substrate truth is per-cell.

## What value comes from FOUR vs. richer bilattices

PyFARS today commits at minimum to FOUR — the smallest non-trivial bilattice.
This admits: - $t$ — *told true* - $f$ — *told false* - $\bot$ — *told nothing* - $\top$ — *told both* (contradictory evidence; surface for adjudication)

Richer bilattices and quantale-valued predication structures are admissible per upstream theory.
Whether PyFARS commits to a particular richer structure for any sub-domain (e.g., temporal truth values, fuzzy validation results) is an open program-shaping question that lives in `questions/`.

## Subject, predicate, object — what they range over

In PyFARS: - *Subjects* range over substrate entities: corpus notes (by slug), agents, offices, sessions, polities, ships, computer-systems, etc. - *Predicates* range over a controlled vocabulary of relation-names: `depends-on`, `realizes`, `assigned-to`, `holds-office`, `granted-profile`, `authored-by`, etc. The vocabulary is open — new predicates can be added — but each predicate is a substrate concept in its own right. - *Objects* range over substrate entities and over scalar/literal values where appropriate (timestamps, counts, free-text notes).

The (subject, predicate, object) framing is the predication-categories convention; PyFARS adopts it without modification.
Some predicates are partial functions — at most one cell with $t$-value per subject — but PyFARS does not enforce this at the system level; it is enforced (or surfaced as $\top$) by closure rules at the relevant scope.

## What this concept does not yet specify

- The exact bilattice PyFARS uses for any given sub-domain.
  FOUR is the floor; richer bilattices may apply locally.
- The serialization of cells.
  Cells are derived from JSONL event log records and from frontmatter; the canonical serialized form is one of the open structural questions PyFARS will need to settle.
- The handling of paraconsistent cells ($\top$).
  PyFARS surfaces them; the conflict-adjudication discipline is upstream.
