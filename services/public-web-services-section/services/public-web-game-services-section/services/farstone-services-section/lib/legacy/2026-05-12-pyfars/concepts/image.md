---
type: concept
class: polity-state
status: draft
depends-on: [polity, substrate, jsonl-event-log]
---

# Image

A [polity](polity.md) at-rest: the system-cells, JSONL event log, governance, rule-set, and content as files on disk, with no [engine](engine.md) attached.
An image is *bootable* but not currently *booted*; it is the polity's static form.

A polity-directory IS an image when no engine is bound to it.
The image-state of a polity is reproducible: take the directory and place it on another host with a compatible runtime, and you have the same image, ready to boot.

## What an image contains

An image-on-disk contains:

1. **The system-content** — markdown files, frontmatter cells, organized per the polity's directory conventions.
2. **The JSONL log** — the polity's complete witness history.
3. **The active ruleset** — rules in their substrate-cell form.
4. **The governance** — offices, duties, powers, skills.
5. **A manifest** — typically `polity.toml` or `_index.md` at root, declaring the polity's identity and runtime requirements.
6. **Optional supporting files** — wirings, harness templates, configuration.

An image's *state* is the system-state derivable from its log + ruleset.
Two images are equivalent if they produce the same system-state under the same runtime; identical files-on-disk are sufficient (but not necessary — log-replay-equivalent images differ in encoding but converge to the same state).

## Image vs. instance

Distinct states:

- **Image** — at-rest.
  No engine.
  No ticking clock.
  No active pulses.
- **Instance** — running.
  Engine attached.
  Clock ticking.
  Pulses firing.

The same polity is image at one time, instance at another.
The transition image → instance is [booting](../morphisms/booting.md); the inverse is [halting](../morphisms/halting.md).

## Image immutability and witnesses

While a polity is in image-state, its content does not change *via system transitions* (no engine is firing).
It can change via:

- Manual edits by the captain (who can edit system cells directly on disk).
- Git operations (pulling new commits, merging branches).
- File-system tools.

These manual changes are themselves *audit-events* but not system-witnessed-by-engine — they're outside-system changes.
A polity that has been manually edited at-rest must reconcile on next boot: the engine compares its state-on-disk against the JSONL log's expected state; discrepancies are surfaced as [validation](validation.md) findings.

This is why captains-editing-images-by-hand is permitted-but-disciplined.
Engine-mediated transitions are system-witnessed; out-of-band edits are reconciled against the log on boot.

## Image and version control

An image lives well in version control: the directory is committable, diff-able, branchable.
PyFARS's discipline favors keeping the polity-image under git; the JSONL log is part of the image, so log-history aligns with git-history.
Reverting a commit reverts the system state.

For very-active polities, the JSONL log can grow large; archival/compaction discipline is partly settled.

## What this concept does not specify

- The exact manifest schema.
- Image distribution (publishing, sharing across hosts).
  Whether polities should have a registry analogous to docker-hub is a program-shaping question; currently we use git.
- Image signing.
  Whether an image's manifest should carry cryptographic signatures (verifiable provenance) — open.
