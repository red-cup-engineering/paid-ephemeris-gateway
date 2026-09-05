---
type: morphism
class: operational-act
status: draft
depends-on: [administrator, administration, dispatching, governing]
---

# Administrating

The morphism by which an [administrator](../concepts/administrator.md) (or an officer with administrative powers) *operates* the polity's [administration](../concepts/administration.md).
Administrating is the gerund-form encompassing the cluster of operational morphisms ([dispatching](dispatching.md), service-management, incumbency-changes, resource-allocation) when invoked under administrative authority.

Administrating is to administration what [governing](governing.md) is to governance: the dynamic-form.
Administration is the operational state; administrating is what produces and modifies it.

## Action

For an administrator $A$ holding administrative-power over operational-domain $\Omega$, performing an administrative-act $\alpha$ at moment $\tau$:

$$\mathrm{administrating}_A \colon \alpha \;\longrightarrow\; w_{A,\Omega,\alpha,\tau}$$

— the substrate gains an administrating-witness recording the act, the administrator's authority, and the operational effect.
Specific administrative-acts inherit this base structure with their additional content.

## Administrating vs. governing

The distinction matters:

- **Governing** modifies the *structural* authority system (enacts rules, amends charter, certifies substantive truth).
- **Administrating** applies the *existing* authority system to operational work (dispatches workitems, manages services, rotates incumbents per governance-defined rules).

A captain enacting a new rule is governing.
The same captain dispatching a workitem under the rule is administrating.
Both are jural acts; both require authority; but governing modifies authority-structure while administrating exercises it.

## Administrating's typical members

The administrating-family includes:

- **[Dispatching](dispatching.md)** — assigning workitems to capable agents.
- **Service supervision** — starting/halting/reconfiguring services.
  Per-service-kind currently; partly settled.
- **Incumbency rotation** — appointing or transitioning office-incumbents within governance-defined rules.
- **Resource-budget adjustment** — increasing or decreasing capability-table capacity.
- **Schedule-keeping** — maintaining cadence-set, watch boundaries.
- **Audit coordination** — running scheduled audits, surfacing findings.

Each is a specific morphism in its own right; administrating is the family.

## Administrating and substrate-purity

Administrating-acts are system-witnessed.
An administrator's dispatch decisions are reconstructible from the system; the authority backing each decision is substrate-derivable from the office-cells and rule-cells; no administrative-magic happens outside substrate.

This is the system-side of operational accountability: every administrative act has its authority-chain reconstructible; the chain bottoms out at the captain (or the relevant office's terminal authority).

## Administrating and the engine

When an [engine](../concepts/engine.md) is running, much of its work IS administrating: ticks fire dispatching's pulse; the engine, on behalf of the administrator-office's standing-authority (or via direct administrator-incumbent acts), assigns ready work.
The administrator does not need to manually dispatch each workitem; they configure governance and the engine administers per the configuration.

This is what makes the polity scale: administrators set policy via governance (closure-rule cells, eligibility rules, capacity policies); the engine, operating under that governance, administers per the policy without per-act administrator intervention.

## What this morphism does not specify

- The complete administrative-act catalogue.
  Per-polity-needs; partly settled.
- Administrating-failure recovery.
  When an administrative act fails (a service can't start, a dispatch is rejected), the discipline is partly settled.
- Administrator-engine boundary.
  Some administrative-acts are explicit administrator-incumbent acts; others are engine-driven under standing-authority.
  The boundary is partly settled.
