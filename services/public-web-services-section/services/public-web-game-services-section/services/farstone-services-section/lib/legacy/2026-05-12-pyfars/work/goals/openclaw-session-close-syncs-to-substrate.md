---
title: "OpenClaw session close syncs to substrate"
type: goal
milestone: m4-memory-feedback
status: open
horizon: later
theory-basis: [observation-record, three-tier-memory, openclaw-as-interface]
tasks:
  - design-openclaw-memory-to-observation-projector
  - hook-openclaw-session-close-into-projector
  - test-roundtrip-from-claw-memory-to-substrate-cells
---


After this goal, closing an OpenClaw session translates the session's memory file (the in-claw notes a captain or agent jotted) into substrate observation cells.
What's learned in a session survives the session — it lands in the [observations](../observations/_index.md) directory and feeds the same [consolidation cycle](instinct-cells-via-consolidation.md) that processes runtime-emitted observations.

This closes the OpenClaw → PyFARS direction of the memory loop.
The PyFARS → OpenClaw direction (substrate-derived context loaded into a session's preamble) is M5 territory.

## Why

OpenClaw sessions accumulate two kinds of context: the conversation transcript (already substrate-visible via the event log) and the *in-session memory file* — explicit observations a captain or agent recorded mid-session ("the rate-limit error returned after 3 retries", "the eligibility rule fired but didn't disqualify").
The memory file is a structured artifact at the OpenClaw layer; the substrate today doesn't read it.

Without this goal, in-session learning is trapped in the OpenClaw layer — the next session starts without it.
With this goal, the next session's selection step (via [`selection-reads-instinct-cells`](selection-reads-instinct-cells.md)) consumes those observations indirectly, through consolidation.

## Theory grounding

**1.
FARS observation-record** ([`flatfile-agentic-resource-system/objects/observation-record`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/observation-record.md)).
The FARS-side `observation-record` is the agent-noticing-during-session input to the consolidation pipeline. **It is distinct from the predwork [observation](../observations/_index.md) cell-system** (which is the tracking-stage reading of work-substrate state), but they share the fiber-isolation discipline and feed the same downstream consolidation.
This goal builds the bridge: OpenClaw memory entries become observation-records, which the consolidation cycle then settles into instincts.

**2.
Three-tier memory's bottom tier extension** ([`flatfile-agentic-resource-system/concepts/three-tier-memory`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md)).
The bottom tier is "session memory (one tick or conversation)".
OpenClaw's in-session memory file IS bottom-tier content; the goal makes it substrate-visible so it can be promoted by the consolidation cycle's middle-tier mechanism. **The translation is what makes the bottom tier substrate-addressable, not a new memory tier.**

**3.
OpenClaw as interface, not source of truth** ([`work/implementation/openclaw-as-interface`](../implementation/openclaw-as-interface.md)).
OpenClaw is the user-facing surface; the substrate is the canonical state. **The translation direction is OpenClaw → substrate, not substrate ← OpenClaw**: the substrate is the system of record.
A memory entry in OpenClaw is provisional until it lands as a substrate cell; a substrate cell is canonical regardless of whether OpenClaw has read it.

### Design constraints from this grounding

- **Translation happens at session-close, not mid-session.** Mid-session writes to OpenClaw memory are private to the session; they become substrate facts only when the session closes (and not all do — some are scratch notes the user explicitly marks as private).
  The session-close hook reads the memory file, projects it through a parser, and emits observation-records keyed to the [session](sessions-wrap-each-tick.md).
- **The projector is one of the existing projector-framework projectors.** Per the projector framework's counit law, OpenClaw memory file → observation cells must be invertible up to canonical form: a projected observation can be re-rendered into the same memory-file format.
  Non-invertible projection is forbidden.
- **Memory entries the user marks `private:` are NOT translated.** Private is a substrate-respected scope; the OpenClaw memory file's frontmatter (or per-entry tag) declares scope.
  Substrate emission honors scope.
  This is a [norm](../../governance/norms/_index.md) (not yet authored as a separate record): "private OpenClaw memory entries are NEVER substrate-emitted."
- **Idempotency: re-syncing the same memory file produces no new cells.** Per projector counit, the projection's content-hash determines the observation-record's identity; re-emission is a no-op.

## Acceptance

- [ ] A projector at `runtime/openclaw_memory_projector.py` (or equivalent) takes an OpenClaw memory file and emits observation records under the matching session.
- [ ] The OpenClaw harness's session-close hook invokes the projector and emits the cells.
- [ ] Memory entries marked `private:` are filtered out before emission.
- [ ] Roundtrip test: write a memory file with structured entries, close the session, read the resulting observation records — content matches the entries (modulo private filter and projector counit's canonical form).
- [ ] Replay determinism: replaying the OpenClaw session produces the same observation records.
- [ ] Authoring a new [norm](../../governance/norms/_index.md) record at `governance/norms/private-memory-not-substrate-emitted.md` formalizes the privacy guarantee.
