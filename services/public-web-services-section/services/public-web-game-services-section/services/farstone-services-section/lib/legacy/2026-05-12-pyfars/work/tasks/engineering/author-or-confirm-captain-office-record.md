---
title: "Author or confirm the captain office record carries exposes-commands"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: harness-claude-by-office-assignment
depends-on: [extend-office-record-with-exposes-fields]
requires-capabilities: [substrate-authoring, governance-curation]
theory-basis: [normative-operational-layering]
---


## Description

The slash commands a Claude session presents to *the captain* should come from the captain's office — what the captain is authorized to invoke during a development session.
Either:

1. The captain's office record already exists at `561/governance/offices/<slug>.md` (likely `command/_index.md` or `captain.md` per the substrate layout).
  In that case, audit it: does it carry `exposes-commands:`?
  If not, add the field with a curated list.
2. If no captain-office record exists in the form needed, author one.
  The captain holds `office:command` (the load-bearing standing).
  The record at `governance/offices/command.md` (or wherever offices live) needs the `exposes-commands:` field naming the slash commands the captain wants in their Claude sessions.

The `exposes-commands:` set is typically PyFARS verb slugs (from `pyfars.cli.__main__.
VERB_MODULES`) wrapped as slash commands by the existing `claude-agent-sdk-plugin` projector, plus any substrate-defined commands the captain wants on quick-invoke.

Starting set (subject to captain's curation):

- All currently-registered PyFARS verbs that make sense as slash commands (likely: `show`, `find`, `context`, `validate`, `install-harness`, `run`, `help`).
- Substrate-defined commands if the captain has authored any.

The captain's office may also use `["*"]` as a wildcard meaning "every registered verb"; this is appropriate for the captain (who has full standing) and inappropriate for any narrower office.

## Acceptance

- [ ] The captain's office record (under `561/governance/offices/` or wherever it lives) exists and carries `exposes-commands:`.
- [ ] Each entry resolves to a real PyFARS verb (in `VERB_MODULES`) or substrate-defined command.
- [ ] The captain's office record cites `model:claude`'s `claude-default` office as the office whose `exposes-*:` lists are *narrower* (so the relationship between the two is in substrate, not just in the harness's behavior).
- [ ] If the captain decides a wildcard is right, the record uses `["*"]` and the resolver supports the wildcard (matching task `implement-office-resolver-in-installer`).

## Progress cells

*(empty — task not yet started)*
