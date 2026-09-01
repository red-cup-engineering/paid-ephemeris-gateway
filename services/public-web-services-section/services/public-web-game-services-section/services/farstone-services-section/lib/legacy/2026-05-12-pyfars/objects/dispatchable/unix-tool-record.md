---
type: object
class: dispatchable-record-spec
status: draft
depends-on: [dispatchable, unix-tool, eligibility-by-capabilities]
see-also: [agent-record, llm-endpoint, office-record]
---

# Unix-tool record

The substrate-record spec for a *unix-tool* dispatchable: a deterministic shell-side operator (script, binary, function) wrapped with system-level discipline.
The fourth member of the dispatchable family alongside [agent-record](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/agent-record.md), llm-endpoint, and office-record.

The runtime's eligibility machinery (`runtime/eligibility_rules.py`) already lists `unix-tool` as one of the four `DISPATCHABLE_TYPES`.
This record fills the previously-open theory gap: there was no governance object spec describing what a unix-tool record's frontmatter holds.

## Why a unix-tool is dispatchable

The polity's dispatch loop matches workitems to dispatchables under the `eligibility-by-capabilities` closure rule.
An LLM agent provides capabilities; an office provides them too; an llm-endpoint provides them; a unix-tool provides them.
The substrate is uniform — any entity carrying a covering `provides-capabilities:` cell is a dispatch candidate, regardless of whether it's powered by an LLM or by `bash`.

This matters because much of pyfars's actual work is shell-side (running tests, building Hugo, parsing JSON, computing diffs).
A unix-tool record makes the substrate aware of those tools as first-class dispatch targets.

## Required fields

Every conforming `unix-tool` record SHALL hold:

- **`type`** — exactly `unix-tool`.
  The substrate-projector type tag.
- **`slug`** — canonical identifier within the substrate.
- **`title`** / **`description`** — display text.
- **`command`** — the executable path.
  Resolved against the polity's `tools/` tree or the runtime's PATH at invocation.
- **`args-template`** — base argv with placeholder tokens (e.g. `"{record-path}"`, `"{slug}"`) the runtime substitutes from workitem cells.
- **`args-schema`** — schema for the placeholder tokens (types, required-vs-optional, defaults).
  Substrate validates calls before reaching the executable.
- **`provides-capabilities`** — capability fiber the tool serves.
  Matched against workitem `requires-capabilities` at dispatch.
- **`work-types`** — workitem subtypes the tool accepts (typically `procedure`).

## Optional fields

- **`required-capabilities`** — capabilities the invoking *agent* must hold (distinct from provides-capabilities; these are the agent-gate side).
- **`stdin-from`** — cell predicate whose value gets piped to stdin (for tools like `jq` that consume on stdin).
- **`exit-code-actions`** — map from exit code (as string) to runtime response: `success` / `retry` / `abort` / `skip` / `escalate`.
  Code 0 is implicitly `success`; unmapped non-zero defaults to `abort`.
- **`witness-format`** — declared shape of the witness the tool emits.
- **`channel`** — default channel for the witness.
  Substrate-mutating tools land on `mutation`; read-only tools land on `observation` or `query`.
- **`idempotent`** — bool.
  Most tools should be idempotent; non-idempotent tools require additional retry-policy discipline.

## Invariants

- **Substrate entity.** A `unix-tool` record SHALL be a substrate entity.
  New tools are added by creating new records.
- **Type is `unix-tool`.** The dispatch loop's `DISPATCHABLE_TYPES` set is the authoritative list of dispatchable type tags; a unix-tool record's `type:` SHALL exactly match.
- **Witness-emitting.** Every invocation produces a witness citing the tool's slug as the dispatchable.
  The witness's channel is the tool's declared channel.
- **Capability-bounded.** A unix-tool that lacks declared `provides-capabilities` is non-dispatchable — the eligibility-by-capabilities rule never matches an empty provider.

## What a unix-tool record is not

- **Not a script alias.** A script alias is realization-side (a shell function, an alias).
  A unix-tool record is the system-level wrapper that makes the script dispatchable, with declared capabilities and witness shape.
- **Not a hook.** A hook fires in response to the system events (insertion, edit).
  A unix-tool runs in response to dispatch — the dispatch loop selected it as the winner for some workitem.
- **Not a skill.** A skill is the system-level *agreement* about an invocable procedure (with preconditions, postconditions, witness format).
  A unix-tool MAY be the body of an F2 skill — the skill is the wrapper that adds the discipline; the unix-tool record is the wrapped tool.

## Position

The unix-tool record makes the substrate aware of shell-side tools as first-class dispatch targets, alongside agents, llm-endpoints, and offices.
The PyFARS-side Pydantic class is `pyfars.entities.unix_tool.
UnixTool`.
