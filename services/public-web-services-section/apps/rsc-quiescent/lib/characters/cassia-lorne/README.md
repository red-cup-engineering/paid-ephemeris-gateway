# cassia-lorne.substack.com — the Routine Read

Cassia Lorne's daily divination publication.
Syndication-only: there is no served site and none is planned — her content goes out to platforms (Substack first, once the autonomous reads are consistently good) so that she reads as a person with a blog you can optionally pay for, not a property.
Until syndication is wired, reads land in `content/` for review.

## The cycle (two stages, cron's job to recur)

1. **Atomic divinations** (`pnpm run divine:indicators [-- YYYY-MM-DD]`, ~02:00) — deterministic claims first: the day's chart from our own ephemeris (provenance attached), the Moon's placement and lunation, the featured motion (ingress or aspect, with its exact time), the seeded tarot draw (the seed IS the provenance), the date's numerological reduction, the lection from `data/lectionary.json` (RCL daily; honest fallback cycle when no entry exists).
  Then the synthesized signals: an element census (computed), and a dream fragment + color tone from the atomics model (NIM), each stamped with its synthesizer.
  Writes `backstage/indicators/<date>.json`, `backstage/briefs/<date>.md`, `backstage/spreads/<date>.md` (skill-compatible spread document).

2. **Synthesis under gates** (`pnpm run divine:read [-- YYYY-MM-DD [--revise] [--rewrite] [--dry-run] [--draft path]]`, ~05:00) — an Opus-class writer (the `claude` CLI in print mode) writes the Routine Read from the persona document and the brief; the gates judge it against the diviner office's deontics (`src/gates.ts`): every symbol cited, no foreknowledge claims, no prescriptions, her word range, flowing paragraphs.
  Clear → `content/<date>.md`; blocked → `backstage/withheld/<date>.md`; either way the gate report lands in `backstage/gate-reports/<date>.json`.

Dry-run mechanics: raw drafts persist in `backstage/drafts/<date>.md` and are reused — regating is free.
`--rewrite` forces a fresh synthesis; `--revise` allows ONE evidence-guided minimal revision when gates block (the koios.news precedent); `--dry-run` writes nothing.

Note the licensed-prediction line: "by evening she will square Pluto" is a witnessed ephemeris claim (deterministic, provenance attached), not foreknowledge.
The gates police prophecy aimed at the reader and the world's contingencies, not the sky's computable motion.

## Recurrence (when emsenn installs it)

```cron
0 2 * * *  cd /home/emsenn/561-group/sites/cassia-lorne.substack.com && pnpm run divine:indicators >> backstage/cron.log 2>&1
0 5 * * *  cd /home/emsenn/561-group/sites/cassia-lorne.substack.com && pnpm run divine:read -- --revise >> backstage/cron.log 2>&1
```

## The cable

The divination capital is published as wires at `{astrologia,cartomantia,arithmomantia,lectio,rete-agentium}.filum.
561.group` (sites/filum.
561.group, services/newscable).
The wire is: stage 1 consumes it via `--from-cable <url>` when available, computing locally as the fallback — the same topology code produces both, so the values witness each other.

## What waits on what

- Substack delivery waits on the reads being consistently good under review; `substack-topology`/`substack-codecs` are commissioned but not started (see dev/TODO/media-threads.md).
- `data/lectionary.json` carries June 8–14, 2026 (Vanderbilt RCL daily, Year A); extend it or mount lib/liturgy-topology when its lectionary tables land.
