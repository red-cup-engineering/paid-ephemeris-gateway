---
type: definition
class: system-morphism
status: draft
realizes: [intaking, observing]
depends-on: [session-record, opening-session, closing-session, observation-cell, jsonl-event-log]
implementation: pyfars.adapters.openclaw.sync_session
---

# Syncing OpenClaw session

The morphism that bridges OpenClaw's session-close event to PyFARS's substrate: when an OpenClaw session closes (the operator hits the `/end-session` command, the WhatsApp/Telegram channel disconnects, or OpenClaw's heartbeat-ladder reaches a session-end state), the morphism reads OpenClaw's session-end record, projects its observations into PyFARS system cells, and emits the matching `session-closed` event in PyFARS's observation channel.

Realizes the upstream OpenClaw-as-prior-art pattern from the [memory-feedback question](../questions/memory-feedback-self-generation-and-failure-modes.md) — OpenClaw's six-mechanism continuous-learning architecture with sessions as the natural boundary for memory consolidation.
PyFARS adopts the boundary discipline; the morphism is what keeps the two engines in agreement when both are running on the same polity.

## Signature

$$\mathrm{sync\text{-}openclaw\text{-}session}\colon \mathrm{OpenClawSessionRecord} \;\longrightarrow\; \mathrm{Substrate}'$$

— takes an OpenClaw session-end record (markdown file produced by OpenClaw at `~/.openclaw/sessions/<id>.md`) and produces system cells corresponding to the session's observations, witnesses, and closure-state.

## What the morphism does

1. **Locate session record.** Read `(openclaw-deployment, sessions-root, <path>) = t` cell to find the OpenClaw session directory; identify the most recently closed session not yet synced.
2. **Parse OpenClaw frontmatter.** OpenClaw sessions carry frontmatter with `session-id`, `started-at`, `closed-at`, `channel`, `participant-set`.
  Read these into PyFARS-compatible cells.
3. **Project observations.** For each observation in the OpenClaw session body (typically structured as a turn-by-turn log), emit `(observation-id, of-session, <pyfars-session-id>) = t` and the observation's content cells.
  The OpenClaw-to-PyFARS observation mapping is per-channel-adapter (each channel has its own conversion rule).
4. **Mark synced.** Write `(openclaw-session-id, synced-at, <ts>) = t` and `(openclaw-session-id, synced-to, <pyfars-session-id>) = t` cells.
  The OpenClaw session is no longer eligible for re-sync.
5. **Emit causal event.** A `openclaw-session-synced` event on the `observation` channel; `caused-by` includes the OpenClaw session-end event (or its filesystem mtime as a proxy for the absent native event).

## When the morphism fires

Two trigger conditions:

- **Per-tick poll.** At [`ticking`](ticking.md) start, the morphism's antecedent reads `(openclaw-deployment, has-unsynced-sessions, t) = t` (computed by a strict-regime polling rule) and fires if so.
- **On-demand.** Captain or operator may invoke `pyfars sync-openclaw` directly, which materializes the trigger cell.

The morphism does not run mid-tick — it batches at tick boundaries to align with PyFARS's tick discipline.

## OpenClaw-PyFARS mapping discipline

OpenClaw's session model differs from PyFARS's per-tick session in three ways the morphism reconciles:

1. **Session length.** OpenClaw sessions span minutes to hours (a chat conversation); PyFARS sessions are per-tick (seconds).
  The morphism produces *one* PyFARS session-record per OpenClaw session, with the OpenClaw session's full duration as the PyFARS session's wall-clock window.
2. **Observation granularity.** OpenClaw records turn-by-turn; PyFARS records cell-by-cell.
  The morphism splits each OpenClaw turn into per-cell observations.
3. **Channel-specific extras.** OpenClaw carries channel-specific metadata (WhatsApp message-id, Telegram chat-id, Signal-recipient).
  The morphism preserves these as `(observation, channel-id, <id>) = t` cells but does not require a PyFARS-side schema.

## What this morphism commits to

1. **One-way sync.** OpenClaw sessions sync *to* PyFARS substrate; the reverse (PyFARS sessions appearing in OpenClaw) is a separate morphism not yet authored.
  PyFARS treats OpenClaw as an upstream observation source, not a peer.
2. **Idempotent.** Re-running sync on an already-synced OpenClaw session is a no-op (the `synced-at` cell prevents re-emission).
3. **Replay-deterministic.** Given the same OpenClaw session-record file (byte-identical) and the same channel-adapter rules, sync produces byte-identical PyFARS cells.

## What this morphism does not specify

- Discipline for OpenClaw sessions whose record is malformed or partial (OpenClaw crashed mid-session).
  Currently fires `(openclaw-session-id, sync-failed, malformed) = top` on `guard`; whether to attempt partial sync or skip is open.
- Real-time sync (per-turn rather than per-session-close).
  Currently batched at session close; per-turn sync would require OpenClaw to emit native events PyFARS could subscribe to.
- Cross-deployment OpenClaw federation (one OpenClaw deployment serving multiple PyFARS polities).
  Currently one OpenClaw deployment per PyFARS instance; multi-tenant is open.
- Backward sync (PyFARS observations appearing in OpenClaw's memory).
  The bidirectional case is open work for [M6](../work/milestones/m6-federation.md)-style federation between heterogeneous engines.
