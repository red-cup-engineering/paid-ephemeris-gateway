---
type: question
status: open
explores: [office, scope-dimensions, channels, action-domain, agent-scope, investiture]
---

# What do `reads` and `writes` on an office record name, and how do they relate to the office's `scope-dimensions`, `channels-read`/`channels-write`, and `entities-governed` fields?

The pre-decruft `runtime/office.py` dataclass carried two `frozenset[str]` fields, `reads` and `writes`, described as "predicate slugs the office is scoped to read/write."
These fed into agent scope at investiture (the deleted `invest(agent, office)` function called `agent.with_added_scope(reads=office.reads, writes=office.writes)`).

The pydantic `entities/office.py:Office` covers the same FARS-spec eight-component template but does *not* carry direct `reads`/`writes` fields.
It has several adjacent fields:

- `scope-dimensions.substantive: list[str]` — substantive scope of authority (one of five dimensions).
- `channels-read: list[str]` / `channels-write: list[str]` — channel-membership read/write rights.
- `entities-governed: list[str]` — the entities under the office's authority.

For the `runtime/office.py` → `entities/office.py` consolidation, `reads` and `writes` were preserved verbatim as new direct fields on the pydantic model so behavior could be carried over unchanged.
This question asks whether that preservation is the right long-term answer or whether `reads`/`writes` should resolve into one of the existing fields.

## What is known

- `reads`/`writes` were *agent-scope* predicate slugs — they fed `Agent.with_added_scope`, which is about what the *agent* is permitted to read/write on the substrate (per `runtime/agent.py`'s scope-and-sandboxing model: Bussard's "scope is a list of entity references, loaded at investiture").
- `channels-read`/`channels-write` are about *channel membership* — which of the seven standard channels (observation, guard, accounting, query, mutation, analysis, learning) the office is subscribed to or may publish on.
- `scope-dimensions.substantive` is the substantive component of the FARS five-dimensional scope (positional, substantive, temporal, jurisdictional, who-bound) — what kinds of matters the office is empowered over, not which substrate cells.
- `entities-governed` is the action-domain enumeration of entities under the office's authority.

These are four genuinely distinct concepts; the dataclass was using `reads`/`writes` for the first one (agent-scope predicates).

## What would settle it

A claim that one of the following is the right answer, with citations into FARS theory and predicated-work theory:

1. **Keep `reads`/`writes` as direct fields**, distinct from the four above.
  Agent-scope-by-investiture is its own first-class axis on an office, separate from substantive scope, channel membership, and governed entities.
2. **Fold `reads`/`writes` into `scope-dimensions.substantive`**, possibly with a structural distinction (read vs write as a sub-dimension).
  Treats agent-scope-by-investiture as a derived projection of substantive scope.
3. **Fold `reads`/`writes` into `channels-read`/`channels-write`**, treating the agent-scope predicates as channel slugs.
  Requires the seven-channel typology to be the universal substrate-access primitive.
4. **Fold `reads`/`writes` into `entities-governed`**, treating agent-scope as a derived projection of which entities the office governs.
  Probably wrong: governed-entities is about *authority over*, not *access to*.

The decision needs grounding in: what investiture *is* per the FARS office record spec; whether agent-scope predicates and channel slugs occupy the same vocabulary; and whether the substantive scope dimension is meant to encode substrate-cell predicates or higher-level subject-matter classes.

## Where the answer would live

A claim in `claims/` named something like `office-investiture-scope-axis` or `agent-scope-derives-from-office`.
If the answer collapses `reads`/`writes` into an existing field, the migration is a code change (remove the direct fields, update the investiture site) plus a docstring update on `Office` and `Agent`.
If the answer keeps them distinct, the claim names the four axes and explains the distinction.

## Provenance

Filed 2026-05-10 during the office decruft pass that consolidated `runtime/office.py` (frozen dataclass) into `entities/office.py` (pydantic).
The dataclass's `reads`/`writes` fields were preserved as direct fields on the pydantic model to keep the consolidation scoped to deletion rather than re-vocabulary.
This question routes the vocabulary decision through proper channels.
