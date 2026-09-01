---
title: "M15 — Bundled Userland (Daily-Driver Replacement Layer)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m14-application-development-surface]
goals:
  - ledger-tool
  - email-client
  - calendar-client
  - text-editor
  - file-browser
  - chat-client
  - terminal
  - calculator
theory-basis: [agential-self-generation, projector-framework-counit, public-projection]
prior-art: [pypredcomp/docs/dev/milestones/v0.3-bundled-userland.md, pypredcomp/docs/dev/specs/bundled-apps]
cites-objects:
  - pyfars/objects/skill-record.md
  - pyfars/objects/runbook-record.md
  - pyfars/objects/jsonl-event-log.md
  - pyfars/objects/corpus-as-flatfile.md
  - pyfars/objects/channels/accounting.md
cites-morphisms:
  - pyfars/morphisms/witnessing-completion.md
  - pyfars/morphisms/queueing-follow-on.md
cites-claims:
  - pyfars/claims/governance-frontmatter-is-substrate.md
  - pyfars/claims/jsonl-is-canonical-state.md
backing-gaps:
  - pyfars/objects/ledger-entry-record.md (NOT YET AUTHORED — hledger-compatible double-entry; for ledger-tool)
  - pyfars/objects/email-message-record.md (NOT YET AUTHORED — RFC 5322 message; for email-client)
  - pyfars/objects/calendar-event-record.md (NOT YET AUTHORED — RFC 5545 VEVENT; for calendar-client)
  - pyfars/objects/text-document-record.md (NOT YET AUTHORED — CRDT-managed text content; for text-editor)
  - pyfars/objects/chat-message-record.md (NOT YET AUTHORED — for chat-client)
  - pyfars/morphisms/round-tripping-hledger.md (NOT YET AUTHORED — byte-identical hledger round-trip)
  - pyfars/morphisms/threading-rfc5322.md (NOT YET AUTHORED — RFC 5322 message-id/in-reply-to threading)
  - pyfars/morphisms/expanding-rrule.md (NOT YET AUTHORED — RFC 5545 RRULE expansion)
acceptance: "A PyFARS instance ships with eight bundled apps installed by default; the captain uses PyFARS for daily email, calendar, chat, file management, text editing, terminal work, calculation, and accounting. Every user action through these apps is a substrate witness; every app's state is substrate cells; M6 federation propagates state across the captain's devices without per-app sync logic."
---

# M15 — Bundled Userland

After [M14](m14-application-development-surface.md) ships the SDK, M15 ships the first wave of apps built against it — the daily-driver basics every general-purpose computing system provides.
Eight apps: ledger, email, calendar, text-editor, file-browser, chat, terminal, calculator.
Productivity-stack apps (tasks, knowledge, governance, dispatch, fleet, review) are deferred to [M17](m17-561-productivity-stack.md); M15 is the layer below — what the captain replaces Gmail, Google Calendar, ProtonMail, Apple Notes, etc. with.

The differentiator across all eight: **state is substrate cells, federation is the substrate's, witnesses are automatic.** Adding a calendar event is settling a substrate cell that the calendar app projects; the same cell is visible to the ledger app for cost-tracking and the dispatch app for workitem timing.
There is no per-app database.

## What's built

### Ledger tool — hledger-compatible double-entry accounting

The ERP-shaped foundational financial layer.
Plain-text double-entry accounting; hledger-format render and import; substrate-native chart of accounts.

**Driver:** `driver:hledger`.
The captain's existing hledger journal imports cleanly as substrate cells; substrate transactions export to hledger format byte-identically; round-trip preserves all data.

**Views:** Register (chronological transactions), Balance (trial balance per account), Account detail (postings to/from one account), Period summary (income/expenses/net per period), Journal entry editor.

**Substrate flow on a new transaction:** user fills journal entry UI → substrate cells created for transaction + postings → closure rule verifies double-entry balances (sum of postings = 0) → trial balance fiber updates.

**Token-economy + attention accounting integrated.** The ledger's account hierarchy includes substrate-resident operational accounts:

```
expenses:llm:claude-opus
expenses:llm:claude-sonnet
attention:morgan:engineering
attention:morgan:research
revenue:client:<slug>
assets:cash:<institution>
```

Claude API spend (recorded automatically by the engine's existing endpoint-routing instrumentation), captain's time logged via the dispatch app, and ordinary financial work all use the same machinery.
This is the load-bearing simplification: there is no separate "operational metrics dashboard" — operational metrics ARE ledger entries, queryable with the same hledger-compatible verbs.

**Conformance:** captain's existing hledger journal imports cleanly; new entries export byte-identical; trial balance matches `hledger balance` output; token-economy and attention accounts ride the same machinery.

### Email client — SMTP/IMAP with substrate-resident threads

Inbox, threading, compose, send. **Driver:** `driver:smtp-imap`.

**Views:** Inbox (sortable by date/from/subject; filterable by flag/folder/account), Thread (chronological per RFC 5322 References/In-Reply-To), Compose (to/from/cc/bcc/subject/body, attachments, signing), Settings (accounts, signatures, drafts, default-folder).

**Substrate flow on inbound mail:** SMTP-IMAP IDLE event fires → substrate cell `(message:inbox:<id>, ...)
` created → closure rules apply DKIM/DMARC verification, match against threading rules (thread-by-references-header), trigger UI update via WebSocket subscription.

**Outbound:** user clicks send → closure rule asserts `(message:outbound:<id>, send, "now", t)` → driver's apply fires SMTP submission → on success: `(message:outbound:<id>, sent-at-ord, ..., t)`.

**Conformance:** captain reads and replies to a real email; threading correct per RFC 5322; DKIM-signed outbound passes verification on receiving server.

### Calendar client — CalDAV with RFC-correct recurrence

Month/week/day views, event creation, recurring events, CalDAV sync. **Driver:** `driver:caldav`.

**Views:** Month (grid with events), Week (hourly grid), Day (single-day with time-blocks), Event detail (title/time/attendees/location/description/attachments), New event (compose UI with recurring options), Settings (accounts, default-calendar, time-zone, week-starts-on).

**Recurrence:** RRULE per RFC 5545 §3.3.10.
Closure rules expand RRULE to materialized event-instance cells for queryable date ranges (configurable horizon).
Bilattice handles "this instance was modified from the recurrence" cleanly: instance-cell carries $\mathbf{t}$ for the override; recurrence-cell still carries $\mathbf{t}$ for the rule; both visible.

**Invite flow per RFC 6638 / iMIP per RFC 6047:** inbound invite arrives via email → closure rule extracts iCalendar VEVENT, creates substrate cell → UI presents accept/decline → on accept: closure rule writes to user's calendar, emits REPLY iMIP back.

**Conformance:** captain accepts an invite end-to-end; recurring events expand correctly; CalDAV sync round-trips with a real CalDAV server; timezones handled correctly across DST.

### Text editor — substrate-aware with CRDT collaborative shape

Edits substrate `text-content` cells with collaborative-editing CRDT shape per the interactive-application-platform's `document-record` object.
Plain-text fallback for non-substrate files.

**Modes:** Substrate text (CRDT-edited text-content cell), Plain-text host file (via fs-driver), Markdown with frontmatter (split view: frontmatter as predicate-form, body as text), Closure rule (structured editor for premise/conclusion patterns), Cell raw (JSON-edit a cell record for advanced ops).

**Collaborative editing:** multiple sessions edit the same text-content cell concurrently; each edit asserts a text-span cell per the IAP CRDT shape; federation merges via the cellwise $\odot$ algebra; conflicts retain both edits as $\top$ and the UI surfaces the conflict for resolution.
This is the same merge algebra [M6](m6-federation.md) provides for all substrate cells; the editor doesn't reimplement it.

**Save:** substrate text → `assert (text-content-cell, body, "<new-text>", t)`; host file → closure rule fires fs-driver `write-content`.

**Conformance:** edit substrate text cell, save, reload, content matches; plain-text host file edit/save round-trip via fs-driver; two concurrent editors converge via CRDT.

### File browser — predicate-driven views

Navigation by predicate-driven views over substrate cells, not raw filesystem paths.
The default view is path-tree (familiar shape for the captain), but the navigation primitive is "show me cells matching predicate P" — `(*, kind, document, *)`, `(*, modified-after, 2026-01-01, *)`, `(*, depended-on-by, <some-slug>, *)`.

The browser composes naturally with the [M14](m14-application-development-surface.md) capability surface: an app holding `read-fiber:library` can launch the file-browser scoped to that fiber.

### Chat client — substrate-resident message history

Persistent substrate-resident message history; messages are substrate cells federated via [M6](m6-federation.md); the same chat thread is readable on every device the captain federates with.
Drivers for at minimum Matrix (`driver:matrix`); IRC/XMPP/Signal as later additions.

### Terminal — substrate-readable command history

Terminal with command history as substrate cells; commands emit witnesses; the dispatch app can subscribe to terminal-event cells (e.g., to surface long-running commands as workitems).

### Calculator — predication-aware

Calculator where every computation is a substrate event; the ledger app and tasks app subscribe to calculator outputs (e.g., a tax calculation surfaces as a draft journal entry the ledger app picks up).
Symbolic and numeric modes; unit-aware (the bilattice handles "the result has uncertain precision" cleanly).

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `ledger-tool` | hledger-compatible; captain's journal round-trips byte-identical; token-economy + attention subaccounts ride the same machinery | open |
| `email-client` | SMTP/IMAP via driver; RFC 5322 threading; DKIM/DMARC verification; substrate-resident threads | open |
| `calendar-client` | CalDAV; RRULE per RFC 5545; iMIP invite flow per RFC 6047; substrate-resident events | open |
| `text-editor` | CRDT-collaborative on substrate text-content cells; frontmatter split view; closure-rule structured editor | open |
| `file-browser` | Predicate-driven views over substrate cells with path-tree default | open |
| `chat-client` | Substrate-resident message history federated via M6; Matrix driver minimum | open |
| `terminal` | Substrate-readable command history; commands emit witnesses dispatch app subscribes to | open |
| `calculator` | Substrate-event-emitting; outputs feed ledger and tasks apps | open |

## Done when

The captain uses PyFARS as their primary daily computing surface for one full week: email, calendar, journal entries, text edits, terminal work, chat.
Federation across `vps-mini-cold-red-gate` and a second device propagates all state.
Every action emits witnesses traceable in the audit chain.

## Theoretical shape

**Apps as substrate projections.** Per [`public-projection`](../../concepts/public-projection.md), each app's UI projects substrate state — email client renders the threads-fiber, calendar renders the events-fiber, ledger renders the accounts-fiber.
The projector counit law: nothing rendered that doesn't trace to a substrate cell.

**Cross-app integration is automatic via shared substrate.** The calendar reads ledger event cells; the email client emits substrate workitems for follow-up the dispatch app picks up; the file browser navigates by predicate over the same cells the text editor edits.
There is no integration layer; integration IS the shared substrate.

**Federation is the substrate's, not the apps'.** Because each app's state is substrate cells, [M6](m6-federation.md)'s content-federation propagates the captain's state across devices without per-app sync logic.
An app that "doesn't sync correctly" is a substrate-federation bug, not an app bug — concentrating bug surface where it can actually be fixed.

## Related

- [Roadmap](roadmap.md)
- [M14 — Application Development Surface](m14-application-development-surface.md) — prerequisite SDK
- [M6 — Federation](m6-federation.md) — provides cross-device sync
- [M17 — 561 Productivity Stack](m17-561-productivity-stack.md) — polity-specific apps that follow
