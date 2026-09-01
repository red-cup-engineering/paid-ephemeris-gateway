---
type: workitem
subtype: procedure
title: "Decide permit application 2026-117 (rear deck addition)"
status: pending
priority: high
sourced-from: permit-application-2026-117
filed-at: "2026-06-22"
deadline-at: "2026-07-22"
days-pending: 27
requires-capabilities:
  - permit-authority
requires-skills:
  - issuing-building-permit
touches:
  - examples/farston/governance/decisions/permits/
  - examples/farston/operations/triage/dispatch-intents/
acceptance:
  - decision-record-filed
  - applicant-notified
  - witness-fired
---

# Decide permit application 2026-117

Application: rear deck addition at 412 Cherry Lane.
Filed 2026-06-22. **27 of 30 days elapsed.** Charter Article III §3 requires a decision (approve, deny, or request additional information) within 30 calendar days.

## Procedure

1. Director Patel reviews the application against the residential code (deck setbacks, structural attachment, railing height).
2. If complete and compliant: invoke issuing-building-permit skill.
3. If non-compliant: invoke denying-building-permit skill with reasons cited.
4. If incomplete: file `decision: additional-information-requested` with the specific gaps.
5. Notify applicant within 1 business day of decision.

## Risk

If a decision is not filed by 2026-07-22, the substrate fires `(building-safety-director, charter-binding-violated, true) = T`, the eligibility-by-charter-binding rule disqualifies the office from new permits until any held application gets a decision.

## Acceptance

- [ ] Decision record filed under `governance/decisions/permits/`.
- [ ] Applicant notified through records clerk.
- [ ] Charter-binding-violation cell does NOT fire (deadline met).
