---
title: ADR — Regime Field for CartridgeManifest
description: Proposed schema addition to @561-group/cartridge — an optional, computed regime field on CartridgeManifest naming the finite/scott/transfinite/aperiodic settling regime a game's own obstruction computation reaches, where one exists.
date: 2026-08-19
keywords: ["gaming", "cartridge", "adr", "obstruction", "schema"]
---

# ADR — Regime Field for `CartridgeManifest`

Status: proposed, not adopted. No schema change has been made to `@561-group/cartridge` yet.

This ADR belongs in `@561-group/cartridge`'s own `docs/adr/` once it is adopted or rejected. It
is drafted here for now because that package's tree was off-limits during a concurrent build.

## Context

`@lenticule-science/metrologic/obstruction`'s settling-regime classification (`classify(settling).regime`, one
of `"finite" | "scott" | "transfinite" | "aperiodic"`) is already an independent, real property of
at least two fleet mechanics: Crucible's per-move obstruction cost (every move's cost is computed
via `settling`/`classify`/`h1` on a settling the game constructs per move) and Equivo's `observe`
exercise type. This ADR proposes exposing that already-computed classification on the
`CartridgeManifest` a game publishes, so the storefront (or any downstream consumer) can read a
game's own settling regime without importing its full engine.

An earlier draft of this idea proposed naming the field's four values after Caillois' play
categories (Agon/Alea/Mimicry/Ilinx). That naming was rejected: the Mimicry mapping doesn't hold
up under scrutiny, and the regime taxonomy's own honest names are preferred over a partially-fitting
borrowed vocabulary. The field is named after the regime taxonomy itself.

## Decision (proposed)

Add one optional field to `CartridgeManifest` (`@561-group/cartridge/manifest`):

```ts
export interface CartridgeManifest {
  // ...existing fields, unchanged...

  /**
   * The settling regime a real settling/obstruction computation reaches for this game's own
   * mechanic, where one exists — computed at manifest-generation time by calling
   * `@lenticule-science/metrologic/obstruction`'s `classify()` (or an equivalent settling computation) against
   * a representative or worst-case settling the game itself constructs. Never authored by hand,
   * never a design/marketing label. Absent (the whole `regime` key omitted, not `null` or a
   * placeholder string) for any game with no real settling computation to report.
   */
  readonly regime?: "finite" | "scott" | "transfinite" | "aperiodic";
}
```

**Computed, never authored — the one non-negotiable part of this proposal.** A manifest generator
that hard-codes `regime: "aperiodic"` because a level "feels chaotic" violates this ADR's whole
premise even if the schema technically accepts the string. The field is only meaningful if every
value traces to an actual `classify()` call on a settling the game's own code constructs.

**Which fleet lanes would populate it, and how, if adopted:**

- **Crucible** — already computes `classify`/`h1` per move; the natural candidate for `regime` is
  the daily tangle's own settling classification at generation time, giving a per-daily "today's
  tangle is a `transfinite` day" signal for free from code that already runs.
- **Equivo** — the `observe` exercise type already runs `classify(settling)`/`h1(settling)` per
  exercise; a theme-level manifest could report the distribution of regimes its exercise bank
  covers, though what "the regime" of a whole theme (versus one exercise) means needs its own
  design pass — an open question this ADR does not resolve.
- **onestone** — has no real settling/obstruction computation to call, so under this ADR its
  manifest correctly omits `regime` entirely rather than reporting one. Not every game gets this
  field, and that's by design.
- **flickering-delve, solitaire, lantern** — no settling/obstruction computation exists in any of
  the three; all three would correctly omit `regime`.

## Consequences, if adopted

- **Positive.** A storefront or catalog reader gains one honest, computed signal distinguishing
  "this game's core mechanic provably terminates" (`finite`/`scott`, H¹=0) from "this game's core
  mechanic genuinely cannot be resolved from within" (`transfinite`/`aperiodic`, H¹≠0) — without
  needing to understand or import the game's own math. This is a checkable fact about a game's
  mechanic, not a marketing genre tag.
- **Negative / risk.** A schema change to an already-published manifest is not free — every
  existing manifest-generating module would need review, and `validateManifest` would need a rule
  for the new optional field. Schema changes deserve one deliberate pass, not a same-release
  bundling with an unrelated fix.
- **Open question.** Whether a multi-config manifest (a many-level cartridge, or a future
  theme-level Equivo manifest) reports one `regime` for the whole cartridge or one per config is
  unresolved — flagged for whoever picks this ADR up next.

## Alternatives considered

- **Author the field by hand per game, as a marketing/genre tag.** Rejected — this is the exact
  failure mode the "computed, never authored" clause exists to prevent.
- **Name the four values after Caillois' play categories.** Rejected — the Mimicry mapping does
  not hold up, and the regime taxonomy's own honest names fit better than a partial borrowing.
- **Ship it immediately in the next patch release.** Rejected — that release is already committed
  to an unrelated fix, and bundling an unrelated schema proposal into it would conflate two
  separate decisions under one version bump.
