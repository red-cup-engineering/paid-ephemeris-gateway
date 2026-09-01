---
name: "Presiding over novation"
description: "Produces a complete novation record — proposed hard-core amendment, three-party consent witness, and rationale — for a change to the charter's rules tier. Use when the steward has determined that a constitutive commitment (C1–C5) must be amended and the captain's ratification is being sought."
---


## Requirements

- Read access to `governance/charter.md` (current rules-tier text)
- Read access to `governance/enterprise.md` (hard-core slugs and their description)
- Steward office incumbency (both recognition and induction predicates settled)

## Steps

1. **Draft the proposed amendment**: state precisely which commitment (C1–C5) is being amended, what the current formulation is, what the proposed formulation is, and why it is necessary.
  The "why" must reference the theory stack — which predication-categories or predicated-work result the amendment is responding to.

2. **Assess whether this is genuine novation**: per `enterprise`, an amendment to C creates a new enterprise $\mathcal{E}'$.
  Confirm this is a rules-tier change (not a guidelines-tier change, which uses `ratify-governance-rule` instead).
  If in doubt, consult the fragment-tier correspondence in `charter-as-closure-system` — rules-tier commitments use bare Π₁; anything richer is likely guidelines.

3. **File the novation proposal**: write a draft record under `governance/decisions/` with `status: proposed`, including the three-party consent fields: steward-proposes, captain-must-ratify, corpus-attests.
  The corpus attestation is the git commit containing the final ratified record.

4. **Present to the captain**: route the draft to the captain for ratification.
  The steward does not ratify its own proposals — the captain's ratification is required for C amendments.
  The XO routes this as a `requires-action: captain-review` triage note.

5. **Complete the record on ratification**: once the captain ratifies, update the record's `status: ratified`, add the captain's ratification witness, and commit.
  The commit hash is the corpus attestation.
  Update `governance/charter.md` to reflect the new rules-tier text.

## Outcomes

A ratified novation record in `governance/decisions/` with complete three-party consent documentation, and an updated `governance/charter.md` reflecting the new hard core.
The new enterprise $\mathcal{E}'$ is now constituted.
