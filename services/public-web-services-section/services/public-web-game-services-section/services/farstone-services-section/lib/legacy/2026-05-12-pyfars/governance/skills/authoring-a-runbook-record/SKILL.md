---
name: "Authoring a runbook record"
description: "Creates a runbook record in work/runbooks/ encoding a step-by-step procedure for a recurrent operational task or response to a known operational condition. Use when an officer must execute the same procedure multiple times across cycles and the procedure benefits from being substrate-cached rather than re-derived each time."
---


## Requirements

- The procedure is *recurrent* (executed multiple times across cycles, not a one-shot).
- The procedure is *operational*, not normative — it's a how-to-do, not a what-must-be-done.
  Norms live in [`governance/norms/`](../norms/); duties in [`governance/duties/`](../duties/); skills in [`governance/skills/`](../skills/).
  Runbooks are the *execution-side* artifact, distinct from skills (which are *capability-side*).
- The triggering condition is namable: a recurrent practice fires it, an event triggers it, or an officer initiates it on demand.

## Steps

1. Verify [`work/runbooks/`](../../work/runbooks/) exists; if not, create it with an `_index.md` (this skill's first invocation may be the bootstrap).
2. **Identify the slug** as a descriptive verb-phrase or noun-phrase (e.g., `recover-from-stuck-dispatch`, `rotate-llm-endpoint-keys`, `respond-to-rate-limit-saturation`).
3. Author frontmatter with `type: runbook`, `status: draft | active | retired`, `triggers:` (recurrent-practice slug or event-spec or "on-demand"), `executor:` (office slug responsible for executing), `prerequisites:` (substrate state required before execution), `expected-cycle-time:` (rough scalar with unit), `theory-basis:`.
4. Author body sections:
   - **When to execute** — the triggering condition; cite the recurrent practice or event-spec
   - **Prerequisites** — substrate state required before starting (specific cells, capability availability)
   - **Steps** — numbered list of execution steps; each step is concrete enough for direct execution
   - **Verification** — how to verify the runbook completed correctly; specific cells or witnesses
   - **Failure paths** — what to do if a step fails; escalation paths to other officers or to the captain
   - **Related observations** — observation-record slugs whose cells inform the runbook's diagnostics
5. Cross-reference: if the runbook is fired by a recurrent-practice, ensure the practice's `constitutes:` cell includes this runbook slug.

## Outcomes

A new file in [`work/runbooks/`](../../work/runbooks/) with `type: runbook` and concrete execution steps.
The executor office can dispatch through the runbook on trigger; verification cells settle when the runbook completes.

## Discipline notes

- **A runbook is not a skill.** A skill defines *what an office is capable of doing*; a runbook defines *the specific procedure for one operational scenario*.
  A skill may be invoked by many runbooks; a runbook composes one or more skills.
- **A runbook is not a norm.** A norm prescribes what *must* happen; a runbook prescribes *how to make it happen* in one specific scenario.
  The norm fires the closure rule; the runbook is what an officer reaches for to satisfy the rule.
- **Don't pre-author runbooks for hypothetical scenarios.** Per CLAUDE.md's "Don't add features beyond what the task requires" and the [`501-don't-invent-adjacent-scope`](../../../../.claude/projects/-home-emsenn-561/memory/feedback_561_dont_invent_adjacent_scope.md) feedback, author a runbook *when* the operational condition arises and the procedure is needed, not in anticipation.
  Runbooks for never-encountered scenarios drift and become misleading.
- **Per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md)**, runbook steps that reference other substrate cells use markdown links, not bare slugs.
