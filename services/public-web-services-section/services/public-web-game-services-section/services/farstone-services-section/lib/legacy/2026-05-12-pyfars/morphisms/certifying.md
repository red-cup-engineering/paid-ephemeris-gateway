---
type: morphism
class: jural-act
status: draft
depends-on: [certification, agent, witness, officer]
---

# Certifying

The morphism by which an authorized [agent](../concepts/agent.md) attests system state under their office's authority.
Certifying produces a [certification](../concepts/certification.md) — the noun-form act-specialization recording the attestation.

Where [observing](observing.md) records *perception*, certifying records *commitment*.
The certifying agent does not merely report what they saw; they commit to its truth, with their authority backing the commitment.

## Action

For an agent $A$ holding office $\Omega$ with certification-power over content-class $\Gamma$, attesting claim $\phi$ at moment $\tau$:

$$\mathrm{certifying}_A \colon (\phi, \Gamma) \;\longrightarrow\; w_{A,\Omega,\phi,\tau}$$

— the substrate gains a certification-witness binding $\phi$ to $A$'s authority via $\Omega$.
Subsequent reads of the system see $\phi$ as certified-by-$A$-at-$\tau$.

## Certifying and authority

Certifying requires an authority basis.
The agent's deontic profile must include certification-power over the content-class.
Without authority, certifying produces an audit-rejected witness; the system records the *attempt* but not the certification.

This is what keeps certifications meaningful: they cannot be issued without the office-grounded authority backing them.

## Certifying vs. determining

A near-cousin: [determining](determining.md) is decisional resolution (often of contested or paraconsistent state).
Certifying is attestation of the system-truth.
Both produce authority-bound witnesses, but determining presupposes contestation; certifying does not.

## Certifying and revocation

A subsequent witness (with appropriate authority — typically the same office or a higher one) can revoke a certification.
The revocation is itself a substrate event; the original certification remains in the log; the post-revocation system-state reflects the revocation.

## What this morphism does not specify

- The schema of certification-witnesses.
- Multi-party certifying (joint authority).
- Cryptographic signing of certifications.
- Certifying chains (where one certification supports another).
