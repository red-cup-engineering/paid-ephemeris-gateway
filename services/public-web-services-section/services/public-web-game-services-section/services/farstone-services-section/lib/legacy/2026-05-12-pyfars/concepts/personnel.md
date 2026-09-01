---
type: concept
class: agent-form
status: draft
depends-on: [agent, entity, witness, polity]
---

# Personnel

A first-class [agent](agent.md)-form: an entity the polity recognizes as a *member* — subject to charter, eligible to hold offices, eligible to participate in governance decisions.
Personnel is the form by which an entity is bound to a polity.

Membership is a *granted relation* between the polity and the entity, not an intrinsic property of the entity.
An entity becomes personnel when the polity issues a recognition cell; the entity is personnel iff the polity's recognition is current.

## Personnel as the membership relation

Per the 561 polity's framework: "an entity is personnel iff the polity has issued a recognition cell."
Substrate-algebraically:

$$\langle \text{polity}, \texttt{recognizes-as-personnel}, \text{entity} \rangle = \mathbf{t} \;\Longleftrightarrow\; \text{entity is personnel of polity}$$

The recognition cell is what the polity *grants*.
It can be revoked (cell flipped to $\mathbf{f}$, with appropriate witnessing per governance discipline).
Membership flows from the cell, not from any intrinsic attribute.

## What personnel can do

A personnel record is the substrate gateway through which a member can:

- **Hold offices** — the personnel-to-office incumbency relation.
  Per office-as-double-settlement (upstream), incumbency requires both recognition AND induction; personnel is the recognition side.
- **Participate in governance decisions** — the polity's decision discipline grants standing to personnel.
- **Bear charter-binding obligations** — personnel are subject to the polity's charter; non-personnel are not.

## Personnel vs. other agent-forms

A single entity may simultaneously be multiple agent-forms:

- **Personnel vs. persona**: personnel is membership-shaped; persona is voice-shaped.
  An entity may operate a [persona](persona.md) without being personnel, or be personnel without operating any persona.
  The captain is both.
- **Personnel vs. operational agent**: personnel is durable membership; operational agents are in-context roles dispatched against work.
  A Claude Code session is an operational agent; it is *not* personnel of the polity (no recognition cell).
- **Personnel vs. officer**: officer is an incumbency relation to a specific office; personnel is membership in the polity.
  Officers are typically (but not necessarily) personnel; non-officer personnel exist (a member without an office).

## Recognition discipline

The polity's grant of personnel-recognition is itself a system transition under governance discipline.
Typically:

1. A candidate entity is identified (often via prior persona-operation, or external introduction).
2. The polity's authority structure (per its charter) admits the recognition (typically the captain or a designated steward).
3. A witness records the recognition cell; the entity becomes personnel.
4. Subsequent acts (office induction, governance participation, etc.) flow from this membership.

Revocation reverses the chain: a witnessed deauthorization flips the recognition cell; subsequent acts depending on personnel-status no longer fire for the entity.

## What this concept does not yet specify

- The complete recognition-and-revocation discipline for any specific polity.
  PyFARS-the-substrate provides the cell-mechanism; per-polity governance defines who can issue and revoke.
- The relation to upstream [predicated-governance](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/) — which defines `polity` and `populace`.
  Personnel is the substrate-cell-level realization of the populace relation.
- Cross-polity personnel — an entity recognized as personnel by multiple polities.
  The composition of memberships is open.
- The interaction with the captain's role as constitutive agent.
  The captain is personnel by founding act, not by subsequent grant; the discipline for constitutive vs. non-constitutive personnel is partly settled.
