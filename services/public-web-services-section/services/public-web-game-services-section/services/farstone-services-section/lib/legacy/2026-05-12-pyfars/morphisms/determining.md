---
type: morphism
class: jural-act
status: draft
depends-on: [agent, officer, validation, certification, witness]
---

# Determining

The morphism by which an authorized agent resolves contested or paraconsistent ($\top$-valued) system state.
Determining is the polity's adjudication mechanism: when validation surfaces a $\top$-cell (contradictory evidence) or a contested fact (multiple agents committing incompatible states), determining produces a binding resolution.

Determining differs from neighboring morphisms:

- [Certifying](certifying.md) attests to the system-truth.
  Determining decides among conflicting candidates.
- [Enacting](enacting.md) establishes new state.
  Determining resolves prior conflict.
- [Validating](validating.md) surfaces conflict.
  Determining settles it.

## Action

For an authorized agent $A$ with adjudication-power over content-class $\Gamma$, resolving contested state $\xi$ at moment $\tau$:

$$\mathrm{determining}_A \colon \xi \;\longrightarrow\; w_{A,\xi,\rho,\tau}$$

— the substrate gains a determination-witness binding the resolution $\rho$ to $A$'s authority.
The contested state $\xi$ is now read as $\rho$ for purposes of subsequent operations; the conflict-evidence remains in the substrate as audit-trace.

## Determining preserves substrate-purity

Determining does not erase the contested evidence.
The original conflicting witnesses remain in the JSONL log; the determination is *itself* a substrate-witness.
Replay reproduces the same determined-state given the same prior witnesses and the same determining-witness.

This is what keeps adjudication transparent: a future captain can read why-the-determination-was-made by reading the contested-evidence and the determination-witness's rationale.

## Determining and bilattice values

Per upstream [bilattice values](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/), $\top$-cells are surfaced by validation, not silently coerced.
Determining is the morphism by which a $\top$ becomes resolvable for *operational* purposes (subsequent reads can use the determined-resolution) while the $\top$ remains substrate-visible (the contradiction-evidence is retained).

## Determining and authority

Determining requires explicit adjudication-authority.
The captain has it broadly; offices have it within their action-domains; ordinary operational agents typically do not.
An agent attempting to determine outside their authority produces an audit-rejected witness.

## What this morphism does not specify

- The schema of determination-witnesses.
- The discipline for revising determinations (when new evidence later contradicts a prior determination).
- Multi-party determining (when multiple authorities must concur).
