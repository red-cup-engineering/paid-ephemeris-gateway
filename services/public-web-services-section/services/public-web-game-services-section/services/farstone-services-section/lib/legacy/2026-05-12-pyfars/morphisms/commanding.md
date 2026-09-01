---
type: morphism
class: jural-act
status: draft
depends-on: [officer, agent, dispatching, enacting, deontic-profile]
---

# Commanding

The morphism by which an [officer](../concepts/officer.md) issues an instruction binding on subordinates within their action-domain.
Commanding pairs office-authority to act-content: the officer's command is a substrate-recordable directive that subordinates have a duty to enact (or to refuse with cause, where authority permits refusal).

Commanding sits between [enacting](enacting.md) (which establishes binding governance over the polity) and [dispatching](dispatching.md) (which assigns specific work to specific agents):

- *Enacting* establishes the rules.
- *Commanding* directs subordinates within those rules.
- *Dispatching* assigns one work-instance to one agent.

A captain enacts the polity's charter; a captain commands subordinates to carry out specific operations; the subsequent dispatching distributes the operations to capable agents.

## Action

For an officer $O$ commanding subordinate-domain $D$ with directive $\kappa$ at moment $\tau$:

$$\mathrm{commanding}_O \colon (\kappa, D) \;\longrightarrow\; w_{O,\kappa,D,\tau}$$

— the substrate gains a command-witness binding $\kappa$ to $O$'s authority over $D$.
Subordinates within $D$ now hold a duty (or refusal-right) toward $\kappa$.

## Commanding and authority chains

Commands respect authority chains: a captain can command any office in their authority chain; an office can command its subordinates; an office cannot command above its authority.
The chain itself is system-cells (the office-relations); commanding-validity is closure-derivable from those cells.

A command issued outside authority produces an audit-rejected witness, not a binding directive.

## Commanding and refusal

Per the duty/refusal-right structure of deontic profiles, some commands can be refused with cause (e.g., a subordinate refusing an instruction that would violate policy or charter).
Refusal is itself a substrate-witness; the command-and-refusal pair is auditable; escalation to higher authority may follow.

This is the system-side of the polity's accountability chain: commands flow down; refusals flow up; both are recorded.

## What this morphism does not specify

- The schema of command-witnesses.
- The discipline for command revocation.
- Standing commands vs. point-commands.
  A captain's standing command ("monitor X continuously") differs from a point-command ("execute Y now"); the substrate-form is partly settled.
