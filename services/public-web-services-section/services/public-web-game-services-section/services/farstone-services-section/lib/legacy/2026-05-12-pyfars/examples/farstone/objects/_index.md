---
type: index
status: open
---

# Farston activated closure rules

Each record under this directory activates one closure rule for `pyfars run examples/farston/`.
The records are thin pointers to PyFARS's canonical specifications under `../../../../objects/`; full rule semantics live there.

| Slug | What it does |
|---|---|
| `eligibility-by-capabilities` | Workitem-D pair eligible iff D's `provides-capabilities` cover W's `requires-capabilities` |
| `eligibility-by-skills` | Same shape on the skills axis |
| `eligibility-by-jurisdiction` | D's `jurisdiction-write` covers W's `touches` paths |
| `eligibility-by-rate-limit` | D disqualified when `rate-limit-remaining = 0` |
| `eligibility-by-charter-binding` | D disqualified when `charter-binding-violated = true` |
| `selection-by-load` | Among eligible D, pick the one with fewest `(_, assigned-to, D) = T` cells |

Removing any record disables the rule for Farston without affecting other polities.
