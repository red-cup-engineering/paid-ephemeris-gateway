---
# Spec: event-log-append:2026.05.09+event-log-append §6.2 — Substrate singleton
# Fixture: the exact frontmatter content the substrate's event-log-append-call-site
# record must hold, per spec R3 + §6.2 acceptance.
type: event-log-append-call-site
implementation-module: pyfars.runtime.event_log
implementation-class: EventLog
implementation-method: append
opens-path-pattern: <root>/<event-log-dir>/<YYYY-MM-DD>.jsonl
open-mode: a
realizes: [surface-invariant-codepath]
audited-by: auditing-codepath-uniqueness
---

The substrate's canonical event-log-append call-site singleton.
