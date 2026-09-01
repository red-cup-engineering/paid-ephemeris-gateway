---
type: question
status: partial
explores: [rotational-authority, office-as-double-settlement, recurrent-practice, pyfars-office-rotation]
---

# Should PyFARS office incumbency rotate through eligible personnel rather than being held permanently?

The current PyFARS office records all describe incumbency informally held by the captain or "whatever agent is tasked" — a permanent-appointment pattern.
Per `rotational-authority`, an alternative pattern cycles authority through the eligible population, with bounded term $\pi$ and a rotation discipline $\delta$.

This is not a normative question about whether rotation is "better."
It is a structural question: what cohomological signature should PyFARS's incumbency settling have?

## Why rotation might be appropriate

Per `rotational-authority`'s comparison with permanent appointment:

| | Rotational | Permanent |
|---|---|---|
| Period $\pi$ | Bounded | Indefinite |
| Substrate-recorded distribution | Wide | Narrow |
| Robustness to incumbent failure | High | Low |
| Continuity for projects | Lower | Higher |

For PyFARS specifically:

1. **The XO incumbency rotating through frontier-model agents on a heartbeat-cycle period** would distribute operational experience across the agent population rather than concentrating it in one agent's session history.

2. **The theory-officer incumbency rotating among `derived-theory-improver`, `predication-theory-lifter`, and `theory-researcher` agents on a derivation-cycle period** would prevent any single agent's reading of the theory derivation from becoming the authoritative reading.

3. **The records-officer incumbency** is currently held informally by "the captain and any engineering agent tasked with records work" — a de-facto rotational pattern without explicit discipline.
  Should the discipline be formalized?

## What rotation would require encoding

Per `rotational-authority`, encoding rotation requires a tuple $(O, \mathrm{Pop}_O, \pi, \delta)$:

- $\mathrm{Pop}_O$: the eligible population for each office.
  PyFARS would need substrate records identifying which agents are eligible for each office (currently informal).
- $\pi$: the rotation period.
  Heartbeat-aligned?
  Derivation-cycle-aligned?
  Per-session?
- $\delta$: the rotation discipline.
  Random selection?
  Round-robin?
  Based on prior-rotation-completion?

Encoding these would add structure: explicit per-office eligibility records, a rotation-clock predicate, and a closure-rule subsystem implementing the term-end-trigger / relief / selection / installation cycle (per `rotational-authority`'s "Realization as periodic succession" section).

## What's at stake structurally

Per `rotational-authority`'s "Distinguishing properties":

- **No accumulation of personal authority.** With rotation, no single agent's reading of (e.g.) the theory-derivation chain becomes the authoritative reading; multiple agents' interpretations enter the substrate over time.
- **Distributed experience of authority.** Over time, every eligible agent has at-some-stage held each office.
  The polity's history records authority-experience as broadly distributed.
- **Constraints on durable change.** Multi-cycle initiatives (e.g., a multi-month theory derivation) require either cross-rotation continuity (each new theory-officer continues the prior's work explicitly) or institution-embedding (the work becomes a charter rule, persisting beyond any single incumbent).

The third point is significant.
Currently PyFARS has implicit project-continuity (the captain's ongoing presence supplies the continuity).
Under rotation, projects extending beyond $\pi$ would need to be either explicit cross-rotation handoffs or charter-embedded — a structural pressure toward institutionalization.

## What would need to be answered

1. Is rotation appropriate for some offices but not others?
  E.g., the steward's accountability for C is an $H^0_t$-invariant (per `military-command-chain-as-modal-composition`) — does that invariant survive rotation, or does rotation imply C has multiple stewards over time?
2. What discipline $\delta$ is appropriate?
  Is it the same for all offices, or per-office?
3. The ayllu's combination of *ayni* (reciprocal-debt graph) and *minka* (rotational leadership) suggests rotation in indigenous traditions is paired with reciprocal accumulation.
  Does PyFARS need an *ayni*-like reciprocal-debt structure between offices?
  (This connects to the separate `kinship-substrate-for-polity-substrate` question.)
4. Per `rotational-authority`'s closure-ordinal analysis: a Markov rotation is Scott-continuous; a limit-aggregating rotation (cycle through all eligible agents before any can be re-selected) is transfinite-bounded.
  Which regime should PyFARS rotation use?

## Why this is filed as a question

The choice between permanent appointment and rotational authority is a structural commitment of the polity, with cohomological consequences.
The current implicit permanent-appointment-by-default is the math program's default, not a chosen pattern.
The 561 Group, founded on indigenous sovereignty traditions, may prefer rotational authority for some or all offices.
The captain should make this choice explicitly.
