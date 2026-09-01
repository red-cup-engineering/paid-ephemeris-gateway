---
title: "Author the boundary record type with handedness coordinate"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: boundary-records-with-handedness-coordinate
depends-on: []
requires-capabilities: [substrate-authoring, frontmatter-design]
theory-basis: [boundary-as-fiber, swarm-participation-handedness]
---


## Description

Add a `boundary` record type.
The frontmatter shape:

```yaml
---
title: "<boundary-name>"
type: boundary
slug: <kebab-case>
status: active | retired
handedness: bidirectional | inbound-only | outbound-only
office: <office-slug>                        # which office's authority gates this boundary
jurisdiction: <jurisdiction-slug>            # the office's jurisdiction that scopes the boundary
auth: bearer-token | mtls | oauth2-client-credentials | none   # required for inbound-only
exposed-predicates: [<predicate>...]         # for inbound: what predicates the boundary admits work-on
target-handedness-pair: <peer-or-endpoint-slug>   # for outbound: what's the dial-out target
location: <location-slug>                    # network location, IP/UDS path, etc.
mode: <mode-slug>                            # interaction mode (request-response, streaming, etc.)
scope-policy: <policy-slug>                  # the scope-policy fiber coordinate
---
```

Add `governance/boundaries/` to the directory schema (already done in [`directories.md`](../../../governance/specifications/directories.md)).
Add `governance/templates/boundary.md` as the canonical template.
Add at least one example boundary of each handedness: `governance/boundaries/local-bidirectional.md`, `governance/boundaries/mcp-public.md` (inbound), `governance/boundaries/cerebras-llama-outbound.md` (outbound).

## Acceptance

- [ ] `governance/templates/boundary.md` exists with the canonical frontmatter shape.
- [ ] [`governance/conventions.md`](../../../governance/conventions.md) declares the boundary frontmatter, especially that `handedness:` is required and one-of `{bidirectional, inbound-only, outbound-only}`.
- [ ] Three example boundary records exist (one per handedness).
- [ ] Validation rejects: missing handedness, invalid handedness value, missing `office` (for inbound), missing `target-handedness-pair` (for outbound).
- [ ] No regression in [M2](../../milestones/m2-substrate-dispatch.md) endpoint records — they're orthogonal until the migration in [`migrate-existing-boundary-references-to-explicit-handedness`](migrate-existing-boundary-references-to-explicit-handedness.md).

## Progress cells

*(empty — task not yet started)*
