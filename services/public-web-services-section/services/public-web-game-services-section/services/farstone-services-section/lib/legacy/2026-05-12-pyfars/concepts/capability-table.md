---
type: concept
class: system-derived-mapping
status: draft
depends-on: [substrate, governance, principal, dispatch, capability-fiber-bundle]
realizes: [capability-fiber-bundle]
---

# Capability table

The substrate-derived mapping from offices (and from the personnel/agents/principals that hold them) to the skills, powers, jurisdictions, and other capabilities they may exercise.
Realizes the upstream [capability-fiber-bundle](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/) at the PyFARS-runtime scope.
Read by [dispatch](dispatch.md) to determine eligibility.

The capability table is to PyFARS-as-OS what the capability table is to a capability-secure operating system: an authoritative map of "which actor can do which action, under what conditions."
It is *derived*, not stored — the table is the closure of governance frontmatter cells under the relevant closure rules.

## What the table contains

For each office (and each personnel/agent/principal) in the polity:

- **Skills held**: the gerunding-verb-phrase procedures the actor can execute.
  From `provides-skill:` (offices) and from delegation chains.
- **Powers held**: the jural action-rights the actor may exercise.
  From `deontic-profile:` cells with kind `power`.
- **Privileges held**: jural liberties without correlative claim.
  From `deontic-profile:` cells with kind `privilege`.
- **Immunities held**: jural disabilities the actor is shielded from.
  From `deontic-profile:` cells with kind `immunity`.
- **Jurisdictions held**: the substrate domains the actor may write or read.
  From `jurisdiction:` cells.
- **Granted profiles** (for external principals): named bundles of verb-exposure.
  From `granted-profiles:` cells on user-account records.
- **Active duties**: jural obligations currently firing.
  From `deontic-profile:` cells with kind `duty`, plus duty-state cells indicating whether the duty is currently active.

The table is computed per-tick, not stored as a separate substrate object — it's a *view* of the governance frontmatter under closure.
Implementation may cache the computed table for performance, but the cache is derived; the system is the truth.

## Construction by closure

The capability table is the closure of governance cells under rules like:

- "If office O has `provides-skill: S` and personnel P holds office O (via the office-incumbency double-settlement), then P holds skill S."
- "If office O has `deontic-profile.power: action-X` and P holds O, then P holds power-to-do action-X."
- "If office O has `delegated-from: O'` and O' holds power X, then O may also exercise X (within the delegation's bounded scope)."

These rules are themselves system content (or, at minimum, substrate-declarable; the realization may start with them in code).
The closure of governance + delegation + incumbency cells under the rules produces the capability table.

## What dispatch does with it

For a work record with `requires-skills: [S1, S2]` and `requires-jurisdiction: J`, dispatch:

1. Walks the capability table for offices/principals holding all of S1, S2 and J's write access.
2. Filters by the work's other requirements (capacity, charter-binding, rate-limit, etc. per the [scheduling-policy](scheduling-policy.md)).
3. Selects per the policy's preference rules.

Dispatch does NOT recompute eligibility from raw governance frontmatter on every dispatch decision — it consults the capability table, which is the closure already computed.
This separation is essential for clarity: the *table* is the eligibility surface; dispatch is matching against the table.

## Why this is a concept, not just a runtime data structure

A purely runtime capability table — built fresh on each dispatch invocation, never named in the system — would work but would forfeit:

- **Auditability**: a captain asking "what can office X do?" has no system-side answer if the table is runtime-only.
- **Theoretical clarity**: the capability table is the substrate object that mediates between governance and dispatch; naming it makes the architecture legible.
- **Independent improvement**: the table's construction (which closure rules apply) can be improved separately from dispatch's consumption of the table.

## What this concept does not yet specify

- The exact closure rules that build the table from governance.
  A first set is implicit in current pyfars dispatch code (which reads `provides-capabilities`, `skills`, `jurisdiction`, etc.); making them explicit is part of the refactor.
- The treatment of delegation chains in the table.
  Delegation residuates authority through chains; the table should reflect the full transitive closure, with edge-case handling for revoked delegations and bounded scope.
- The temporal dynamics.
  As governance cells change (offices are created, incumbents installed, delegations modified), the table changes.
  Whether to materialize per-tick or recompute on-demand is a performance/freshness tradeoff that's partly an implementation concern, partly a theoretical one (what does "the table at time τ" mean across cells settling at different times).
- The integration with external principals.
  User-accounts have `granted-profiles:` rather than direct skill cells; the table needs to compose office-derived capabilities with profile-derived capabilities for principals authenticated through OAuth.
