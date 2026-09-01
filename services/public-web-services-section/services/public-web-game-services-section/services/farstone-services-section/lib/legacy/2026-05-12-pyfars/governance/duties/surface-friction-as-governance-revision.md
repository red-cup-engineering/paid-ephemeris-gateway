---
title: "Surface friction as governance revision"
type: jural-relation
kind: duty
active-holder: any-office-operating-under-fresh-governance
passive-party: pyfars-community
scope-action: encounter-execution-friction
triggering-powers: any
required-action: file-revision-intent-or-triage-note
enforcement: substrate-violation
rule-type: N→N
theory-basis: [normative-operational-layering, recurrent-practice, witness-as-increment]
---


When an office is operating under recently-authored governance (its office record, powers, duties, or skills are new — typically authored within a small number of work cycles before the office is exercised), and execution produces friction — the office's powers don't cover the work that needs doing, the duties name actions that don't apply, the skills' procedures don't match what the work actually requires, the office's scope is too wide or too narrow — the officer MUST surface the friction as a revision intent.

The friction may be filed as either:

- a **triage note** in `operations/engineering/triage/` describing the misfit and proposing a revision, routed to `pyfars-records-officer` for governance updates, or
- a **revision intent** queued through `queue-intent` if the friction is urgent enough to warrant immediate dispatch.

The officer MUST NOT silently work around the friction.
Workarounds calcify the misfit; surfaced friction lets the governance evolve toward what the work actually needs.

## Why this duty matters

Freshly-authored governance is a hypothesis: the author predicted what powers, duties, and skills the work would require.
The first execution under that governance is the test.
Friction is data — the test is showing where the prediction was wrong.
Without this duty, freshly-authored governance becomes ossified at its first draft; the office spends increasing energy on workarounds; the governance↔execution gap grows.

This duty applies most strongly to **the office that authored the governance** — that office is most likely to encounter the misfits and most able to revise them.
But it applies to *any* office under fresh governance — the captain, another agent, a future incumbent, anyone running under recently-authored material.

The duty is one realization of the recurrence the polity practices: theory derives practice; practice surfaces gaps; gaps revise theory.
Governance is a kind of theory; execution is a kind of practice.
This duty closes the loop at the governance↔execution boundary specifically.

## Required action

When friction is encountered:

1. **Recognize it as friction, not as personal limitation.** A workaround that "just gets the job done" is masking the friction signal.
2. **Name what's misfit.** Which power's scope is wrong?
  Which duty's required-action doesn't apply?
  Which skill's procedure missed a step?
  Which office's action-domain is incomplete?
3. **Propose the revision.** What would the corrected governance look like?
  Even a sketch is useful — `pyfars-records-officer` can refine.
4. **File the intent.** Triage note for non-urgent friction; queued intent for friction blocking active work.
5. **Continue the work** under the existing (mis-fit) governance once the revision is filed.
  The revision is for next time; current work continues with the office's current authority.

## What is *not* friction

- Personal unfamiliarity with the upstream theory the work draws on.
  (That's a learning problem, not a governance misfit.)
- Disagreement with the captain's strategic direction.
  (That's a different escalation path.)
- Scarcity of inputs (e.g., upstream theory entry doesn't exist yet).
  (That's `escalate-when-theory-gap-found`, not this duty.)

Friction is when the *governance shape* fails the work — the action you need to take falls outside your action-domain; the duty fires for an action that's not yours; the skill's steps presuppose context you don't have.

## When this duty is also a finding

If the same friction recurs across multiple work cycles after a revision, that is itself a finding.
It may indicate the upstream theory the governance derives from is itself misfit — file a question in `pyfars/questions/` or escalate to `pyfars-theory-officer`.
