---
title: "Implement office-resolver in install_harness.py"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: harness-claude-by-office-assignment
depends-on: [extend-office-record-with-exposes-fields]
requires-capabilities: [pyfars-package-structure, substrate-frontmatter-parse]
theory-basis: [eligibility-by-office]
---


## Description

Add a resolver to `tools/platform/pyfars/src/pyfars/cli/install_harness.py` that, given a polity-root and an office slug, returns the office's `exposes-*:` sets:

```python
def _resolve_office(root: Path, office_slug: str) -> dict:
    """Read governance/offices/<slug>.md frontmatter and return its exposes-* sets.

    Returns dict with keys 'skills', 'agents', 'commands', each a set of slugs.
    A '*' wildcard in any list expands to "all available" at projection time
    (the harness using the resolver decides what 'all available' means in its
    context).

    If the office record is missing or has no exposes-* field, returns
    empty sets (not all-available — absence is NOT the same as wildcard).
    """
```

Helpers:

- `_resolve_model_office(root, model_slug)` — reads `governance/assets/computing/models/<slug>.md`'s `holds-office:` field and chains to `_resolve_office`.
  Used by `_install_claude_code` (and the new `claude-code-skills`) to find Claude's office.
- `_resolve_captain_office(root)` — finds the personnel record holding `office:command`, follows to the office record, returns its `exposes-*:` sets.
  Used by the slash-command installer.

The resolver's wildcard handling is delegated to the caller — the resolver returns `{"*"}` literally when it sees a wildcard list, and each harness's installer decides what wildcard means in its target.
For agents, `"*"` typically means "every record under `governance/agents/`"; for commands, "every entry in `pyfars.cli.__main__.
VERB_MODULES`".

Add a `_filter_by_office(items, office_set)` utility that takes a list of (slug, …) tuples and an office set; returns the subset whose slug is in the office set, or all items if the office set contains `"*"`.
Used by the harness installers to apply the office filter uniformly.

The resolver does NOT enforce the filter — it just exposes the sets.
Each harness installer chooses to use them.
This keeps the resolver-side code path simple and the policy decision visible at each harness's call site.

## Acceptance

- [ ] `_resolve_office(root, office_slug)` exists and returns `{"skills": set, "agents": set, "commands": set}`.
- [ ] `_resolve_model_office(root, model_slug)` exists.
- [ ] `_resolve_captain_office(root)` exists.
- [ ] `_filter_by_office(items, office_set)` exists and handles wildcard.
- [ ] Smoke check: against a fixture polity with a model and an office, the resolver returns the expected sets.
- [ ] Missing office records do not crash the installer; they return empty sets and surface a visible warning.

## Progress cells

*(empty — task not yet started)*
