---
title: "Wire claude-code installers to the office filter"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: harness-claude-by-office-assignment
depends-on: [implement-office-resolver-in-installer, add-claude-code-skills-harness]
requires-capabilities: [pyfars-package-structure]
theory-basis: [eligibility-by-office]
---


## Description

After the office resolver exists and the `claude-code-skills` harness is added, wire each Claude-Code-targeted projection installer to apply the office filter:

1. **`_install_claude_code` (agents)**: read `_resolve_model_office(root, "claude").get("agents")` and filter the agent-record set to only office-authorized agents before projecting.
  Wildcard `"*"` means "every record under `governance/agents/`" — the existing behavior, preserved as the wildcard case.
  Empty office set means projecting zero agents (with a warning).
2. **`_install_claude_code_skills` (the new harness)**: same pattern but against the office's `skills` set.
  Already part of that harness's task; this task confirms the wiring is consistent across both.
3. **`_install_claude_code_hooks`**: hooks are not skill-shaped; they are event-handlers.
  Office filtering does not naturally apply (a hook record either declares an event or it doesn't; offices don't authorize event-handling).
  Leave hooks unfiltered.
  Document the choice in the harness's `_index.md`.
4. **`_install_claude_code_mcp`**: similar — MCP wiring is config, not a skill or agent.
  Leave unfiltered.
  Document.

The filter call-sites should use the `_filter_by_office` utility introduced in the resolver task to keep the pattern uniform.

The harness `_index.md` files for `claude-code` and `claude-code-skills` are updated to name the office-filter behavior: "By default this harness projects only the agents/skills the model `claude`'s `holds-office` authorizes via `exposes-*:`.
Override with `--override-include-all` to project every record regardless."
(The override flag is OPTIONAL — if it's not implemented in the first cut, the harness simply respects the office filter unconditionally.)

## Acceptance

- [ ] `_install_claude_code` filters its agent-record set by `_resolve_model_office(root, "claude")["agents"]`.
- [ ] `_install_claude_code_skills` filters its skill-record set similarly.
- [ ] Wildcard `"*"` in either office field expands to all records of that kind.
- [ ] Empty office field projects nothing (with a clear warning).
- [ ] `claude-code/_index.md` and `claude-code-skills/_index.md` document the office-filter behavior.
- [ ] An install against 561 with a known `claude-default` office produces a `.claude/agents/` and `.claude/skills/` whose contents match what the office authorizes — verified by file count + spot-check.

## Progress cells

*(empty — task not yet started)*
