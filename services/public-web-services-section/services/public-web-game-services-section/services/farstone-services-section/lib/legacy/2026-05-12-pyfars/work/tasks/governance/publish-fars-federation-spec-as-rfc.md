---
title: "Publish the FARS federation spec as an RFC"
type: task
area: governance
status: open
horizon: captured
milestone: m6-federation
goal: fars-federation-spec-section-authored
depends-on: [review-spec-against-closure-merge-commutation-lemma]
requires-capabilities: [rfc-publication]
theory-basis: []
---


## Description

Once the lemma-preservation review passes (or any non-preserving disciplines are revised), update the spec's `status:` from `draft` to `rfc`.
Announce the RFC where downstream consumers will see it (the polity's specifications index; cross-link from [M6](../../milestones/m6-federation.md)).

Implementation tasks for federation are **blocked** on this RFC: no wire-transport implementation begins before the spec is published.

## Acceptance

- [ ] Spec's `status:` is `rfc`.
- [ ] Linked from the polity's spec index and from [`work/milestones/m6-federation.md`](../../milestones/m6-federation.md).
- [ ] [`work/goals/federation-envelope-wire-transport.md`](../../goals/federation-envelope-wire-transport.md) and downstream task records can now be unblocked.

## Progress cells

*(empty — task not yet started)*
