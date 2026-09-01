---
type: morphism
class: jural-act
status: draft
depends-on: [agent, officer, certification, witness, substrate]
---

# Enacting

The morphism by which a [decision](../concepts/derivation.md) — a deliberate determination by an authorized agent — becomes substrate-binding.
Enacting commits a future-binding state into substrate: a policy, an assignment, a charter amendment, a configuration change.
After enacting, the substrate carries the enacted-cell as a *governing* fact, not merely an attested one.

Enacting differs from neighboring morphisms:

- [Certifying](certifying.md) attests *that something is true*.
  Enacting commits *that something will hold*.
- [Dispatching](dispatching.md) assigns work.
  Enacting may *create* the work-domain that dispatching operates over.
- [Determining](determining.md) resolves contested state.
  Enacting establishes new state.

## Action

For an authorized agent $A$ holding office $\Omega$, enacting decision $\delta$ at moment $\tau$:

$$\mathrm{enacting}_A \colon \delta \;\longrightarrow\; w_{A,\Omega,\delta,\tau} + \delta\text{'s system cells}$$

The witness records $A$'s authority and the enacted decision; the decision's system cells become governing-cells (read by closure rules, dispatch decisions, validation).

## Enacting and the deontic profile

An office's deontic profile names what its incumbents can enact.
The captain can enact governance amendments; an office-incumbent can enact decisions within their action-domain; a process cannot enact (it executes, it pulses, but it does not enact).
Enacting is reserved for offices with explicit jural authority.

## Enacting and the substrate-purity discipline

Enacted cells are system cells: they have witnesses, they participate in closure, they can be revoked.
Enacting does not bypass substrate-purity.
What makes enacted cells different from other cells is their *role* — they govern subsequent operations rather than merely recording state.

## What this morphism does not specify

- The schema of enacting-witnesses (per-decision-kind currently).
- The discipline for revocation.
  An enacted decision can be revoked by a subsequent enacting; the revocation chain is auditable but partly settled.
- Multi-officer enacting (when multiple offices must co-sign).
