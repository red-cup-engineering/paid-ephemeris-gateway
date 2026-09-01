---
title: "Author the inbound boundary template"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: inbound-only-boundary-records
depends-on: [author-boundary-record-type]
requires-capabilities: [substrate-authoring, frontmatter-design]
theory-basis: [boundary-as-fiber, swarm-participation-handedness]
---


## Description

Add an inbound-specific boundary template at `governance/templates/boundary-inbound.md` (specializes the generic [`boundary` template](author-boundary-record-type.md)).
Frontmatter:

```yaml
---
title: "<inbound-boundary-name>"
type: boundary
slug: <kebab-case>
status: active | retired
handedness: inbound-only                    # FIXED for inbound boundaries
office: <office-slug>                       # REQUIRED — admits incoming calls under this office's authority
jurisdiction: <jurisdiction-slug>           # REQUIRED — scopes the boundary
auth: bearer-token | mtls | oauth2-client-credentials   # REQUIRED — non-empty
exposed-predicates: [<predicate>...]        # REQUIRED — sub-cap of office's jurisdiction
location: <network-location>                # e.g., uds:/var/run/pyfars-mcp.sock
mode: request-response | streaming
scope-policy: <policy-slug>
---
```

Author at least one example inbound boundary at `governance/boundaries/mcp-public.md` for end-to-end testing.

## Acceptance

- [ ] `governance/templates/boundary-inbound.md` exists.
- [ ] An example inbound boundary at `governance/boundaries/mcp-public.md`.
- [ ] Validation rejects: missing office, missing jurisdiction, missing auth, exposed-predicates exceeding office's jurisdiction.

## Progress cells

*(empty — task not yet started)*
