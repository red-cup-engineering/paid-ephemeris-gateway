---
type: question
status: partial
explores: [restorative-accountability, jural-relation, normative-operational-layering, pyfars-office-relations, substrate-violation-as-relation-rupture]
---

# Should PyFARS substrate-violation response follow restorative-accountability rather than the implicit retributive frame?

Several existing duty records use the phrase "substrate violation" as the enforcement mechanism: `witness-every-classification`, `maintain-watch`, `write-in-correct-derivation-layer`, `escalate-degeneration-to-steward`, etc. The current framing is implicitly retributive: a duty-bearer who fails to discharge a duty has produced a "violation" — a substrate-readable record of non-compliance attached to the violating office or agent.

Per `restorative-accountability`, the alternative pattern frames harm as rupture of a *relation* rather than an individual fault.
The closure-rule consequent in restorative-accountability is on the ruptured relation's `repair-needed` cell, not on the harming party's `owes-sanction` cell.
The substrate's primary fact is the relational fiber, not the individual-property cell.

## Where this matters in PyFARS

Two PyFARS situations seem to call for restorative-accountability rather than retributive:

1. **The XO's `close-execution-loops` duty fires on tasks the XO dispatched.** When a dispatched task stalls without resolution, the XO is in violation — but the *harm* is to the relation between the XO and the office that received the dispatch (the functional office's work was started but not closed; the XO's watch state contains stale entries).
  Repairing the relation (re-dispatching, returning the task, escalating to the steward) is the appropriate response, not sanctioning the XO.

2. **The theory officer's `escalate-degeneration-to-steward` duty.** When a confirmed degeneration signal is held without escalation, the harm is to the relation between the theory officer and the steward — the steward cannot act on signals it doesn't receive.
  The repair is the delayed escalation plus an explanation; sanctioning the theory officer doesn't restore the information flow.

## What would be different under restorative-accountability

Per `restorative-accountability`'s closure-rule schema:

$$\langle V, \texttt{harm-by}, P_h\rangle = \mathbf{t} \,\wedge\, \langle V, \texttt{harm-to}, P_v\rangle = \mathbf{t} \,\wedge\, \langle V, \texttt{relation-rupture}, R\rangle = \mathbf{t} \;\Longrightarrow\; \langle R, \texttt{repair-needed}, \tau\rangle = \mathbf{t}$$

A substrate-violation event in PyFARS would identify: - $P_h$: the office that failed its duty - $P_v$: the office or work-stream harmed by the failure - $R$: the relation between them (e.g., the dispatch-routing relation, the report-receipt relation) - The consequent: a `repair-needed` cell on $R$, opening a deliberative process to restore the relation.

The current substrate-violation framing leaves $P_v$ and $R$ implicit.
Making them explicit would: 1.
Reveal that some "violations" have no clear $P_v$ (e.g., a wrongly-formatted record violates conventions but harms no one specifically), suggesting those aren't really violations in the restorative sense.
2.
Reveal that some relation-ruptures occur without clear duty-violations (e.g., communication breakdown between offices when no one specifically owed a duty), which the retributive frame misses entirely.

## What would need to be answered

1. Are PyFARS's current substrate-violation enforcements all amenable to restorative reframing, or do some genuinely require retributive sanctioning?
  (The Hohfeldian eightfold has no retributive structure either — it has duties and the failure to discharge them, but does not prescribe the response.
  The retributive frame is read in.)
2. If restorative, what is the deliberative process?
  Per `restorative-accountability`, the process is "open" — the substrate names the rupture and opens deliberation, but the deliberative procedure is polity-specific.
  What is PyFARS's deliberative procedure?
3. How does the governing-by-kinship pattern interact with the relation-cells that restorative-accountability operates on?
  Are PyFARS office relations kinship-relations in the relevant sense?

## Why this is filed as a question

The retributive vs. restorative choice is a structural commitment of the polity, not a technical decision the XO can make autonomously.
PyFARS sits inside the 561 Group, which is founded for Black Liberation and Indigenous Sovereignty — both traditions emphasize restorative rather than retributive accountability.
The current Hohfeldian framing is the math program's default, not the polity's chosen tradition.
The question is whether to align the substrate's violation-response pattern with the polity's tradition.
