---
type: morphism
class: jural-act
status: draft
depends-on: [governance, officer, enacting, commanding, determining]
---

# Governing

The morphism by which an [officer](../concepts/officer.md) operates [governance](../concepts/governance.md) — the act of *exercising* authority structurally established by governance.
Governing is the gerund-form encompassing the cluster of jural morphisms ([enacting](enacting.md), [commanding](commanding.md), [certifying](certifying.md), [determining](determining.md), revoking) when they are *invoked under governance authority*.

Governing is to governance what [running](running.md) is to a process: the dynamic-form.
Governance establishes the structure; governing operates it.
An office holds powers; governing is what happens when an officer-incumbent exercises them.

## Action

For an officer $O$ holding office $\Omega$ with governing-power over content-class $\Gamma$, performing a governance-act $\alpha$ at moment $\tau$:

$$\mathrm{governing}_O \colon \alpha \;\longrightarrow\; w_{O,\Omega,\alpha,\tau}$$

— the substrate gains a governing-witness recording the act, the office, and its authority-basis.
Specific governing-acts (enacting, commanding, etc.) inherit this base structure with their additional content.

## Governing vs. specific jural morphisms

Governing is the *family* concept; specific morphisms are its members:

- [Enacting](enacting.md) — committing future-binding state.
- [Commanding](commanding.md) — issuing binding directives to subordinates.
- [Certifying](certifying.md) — authoritative attestation.
- [Determining](determining.md) — adjudicating contested state.
- Revoking — withdrawing prior governance acts (a cancellation-shaped governing-act; per-jural-morphism currently).

When a captain enacts a charter amendment, that's both *enacting* (the specific morphism) and *governing* (the family act).
The two framings co-occur; choose the framing that matches the question at hand.

## Governing and accountability

A governing-act records the officer's authority-binding *at the moment of the act*.
If the office's incumbency changes (a new captain succeeds the prior captain), prior governing-acts remain bound to the prior incumbent's authority — they are not retroactively re-bound.
Accountability for governing-acts terminates at the captain or whichever office's authority-chain bottom-outs.

This is the system-side of the polity's accountability discipline: every governing-act has an authority-chain reconstructible from the system; the chain has a clear terminus (the captain) below which "the buck stops."

## Governing vs. administering

[Administrating](administrating.md) is operational: applying procedures, dispatching work, managing day-to-day execution.
Governing is structural: establishing what authority exists and exercising it.
A captain may governing one moment (enacting an amendment) and administrating the next (dispatching a workitem).

The same agent can do both, but the morphism-frames are distinct.
Governing-acts modify the polity's *authority structure*; administrating-acts apply the *existing structure* to operational work.

## What this morphism does not specify

- The boundary cases.
  When a governing-act's content is *quasi-operational* (e.g., assigning an office incumbency), is it governing or administrating?
  Currently per-act-class; partly settled.
- Multi-officer governing.
  When governance requires concurrence of multiple offices (e.g., charter amendments with captain + reviewer assent), the substrate-form is partly settled.
- Governing speed.
  Some governance acts fire instantly (commanding); others have built-in cooling-off (charter amendments).
  The discipline varies; partly settled.
