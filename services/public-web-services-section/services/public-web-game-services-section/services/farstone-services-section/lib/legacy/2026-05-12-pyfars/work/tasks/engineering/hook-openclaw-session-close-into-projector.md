---
title: "Hook the OpenClaw session-close event into the memory projector"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: openclaw-session-close-syncs-to-substrate
depends-on: [design-openclaw-memory-to-observation-projector]
requires-capabilities: [openclaw-harness, python-editing]
theory-basis: [observation-record, three-tier-memory]
---


## Description

Implement the projector designed in the prior task and wire the OpenClaw harness's session-close event to invoke it.
On session close: read the memory file, run the projector, write the resulting observation records under `<substrate-root>/observations/<session-id>/`, emit a witness binding the OpenClaw session to the substrate session.

The OpenClaw harness lives at `src/pyfars/harnesses/openclaw/`; the session-close hook is configured via the harness's existing wiring.
Verify the hook fires on actual session-close (not on harness shutdown for other reasons).

The implementation must respect the privacy filter — verify by a test that writes a memory file with public+private entries and confirms only public entries land as observations.

## Acceptance

- [ ] `runtime/openclaw_memory_projector.py` (or the equivalent location per the spec) implements the projector.
- [ ] The OpenClaw harness's session-close path invokes the projector and emits observations.
- [ ] A binding witness `(openclaw-session-<id>, projected-to-substrate-session, <substrate-session-id>) = T` is emitted on successful projection.
- [ ] Private entries are filtered (verified by test).
- [ ] Idempotency: re-running session-close on an already-projected session is a no-op (or produces $\top$ if the memory file changed since last projection — flag this as an anomaly per [`anomaly-surfacing-via-contradiction-cells`](../../goals/anomaly-surfacing-via-contradiction-cells.md)).
- [ ] Replay determinism: replaying a session's events produces the same observations.

## Progress cells

*(empty — task not yet started)*
