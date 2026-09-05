---
type: concept
class: act-specialization
status: draft
depends-on: [act, witness, agent, observation]
---

# Certification

An [act](act.md) of authoritative attestation: an [agent](agent.md) with appropriate authority commits a witness asserting that some system state holds — that a claim is true, that a workitem is complete, that an audit has passed, that an attribute is verified.
Certification is the system's mechanism for *adding warranted truth* by named-actor commitment.

Certification is one of the act-specializations.
It pairs with [observation](observation.md) (which records what was *seen*) by recording what the agent *attests*.
Observation is epistemic; certification is jural — it carries the authority of the certifying agent.

## Certification vs. observation

The distinction matters:

- An **observation** records a perception.
  "I saw X."
  Substrate-recording of the read.
- A **certification** records an attestation with authority.
  "I, by my authority as $office$, attest that X holds."
  Substrate-recording of the committed truth-claim.

A captain's certification that "this audit-finding has been adjudicated" is *not* an observation — it is the captain *committing* an outcome.
The certification carries the captain's authority; without that authority, the same witness would be an audit-rejected witness.

A reviewer's certification that "this code change is approved" is the reviewer *adding warranted truth* about the change's status.
Subsequent dispatch decisions can read the certification.

## What a certification has

A certification has:

1. **A certifying agent** — the agent committing the attestation.
  Always exactly one.
2. **A subject** — the substrate entity or state being attested.
  May be a cell, a workitem, an audit-finding, a relation between cells.
3. **An attestation content** — the substantive claim.
  "Complete," "approved," "adjudicated," "verified," "valid."
4. **Authority basis** — the office or role under which the agent is certifying.
  Different roles can certify different things; the basis records which.
5. **Optional rationale** — why the certification was granted, what evidence supports it.
6. **A witness** — the JSONL log entry recording the certification.

## Certification and authority

Every certification requires authority.
The agent's deontic profile must permit the certification's content over its subject.
Examples:

- A captain has authority to certify governance-decisions.
- A reviewer has authority to certify code-review-completion.
- An auditor has authority to certify audit-pass / audit-fail.
- An office-incumbent has authority to certify within their action-domain.

Without authority, a certification attempt produces an audit-rejected witness.
This is what keeps certifications meaningful: they cannot be issued without the authority backing them.

## Certification and substrate-truth

Certified cells participate in the system the same way as any settled cell — but their *origin* is the named-actor's commitment rather than mere closure-derivation.
This matters for audit:

- "This cell is true *because* a closure rule fired" — read the closure rule's antecedent witnesses.
- "This cell is true *because* the captain certified it" — read the captain's certification-witness.

Both are substrate; both are audit-able; the chain-of-warrant is different.

## Certification and revocation

Certifications can be revoked: a subsequent witness retracting the certification (with appropriate authority — typically the same office, or a higher one).
Revocation is itself a substrate event; the original certification remains in the log; the system-state at the post-revocation moment reflects the revocation.

This means certifications are *current-attested*, not *eternally-attested*.
A retracted certification leaves an audit-trace.

## Certification vs. witness, validation

- A **witness** is the broad category — any substrate-transitioning event.
- An **observation** is a witness recording perception.
- A **certification** is a witness recording authoritative attestation.
- A **[validation](validation.md)** is a witness recording rule-check results.

Certifications and validations may co-occur: a code review's certification depends on its validation having passed; the certification-act references the validation-witnesses as supports.

## What this concept does not specify

- The schema of certification-witnesses.
  Per-domain currently; uniform schema partly settled.
- Multi-party certifications.
  When two officers must co-certify (joint authority), the substrate-recording is partly open.
- Certification chains.
  When agent A certifies based on agent B's certification, the chain-of-warrant is recordable but the discipline for traversing it is open.
- Cryptographic signing of certifications.
  Certifications are particularly suited to signing (they bind authority to claim); whether to require signatures is a program-shaping question.
