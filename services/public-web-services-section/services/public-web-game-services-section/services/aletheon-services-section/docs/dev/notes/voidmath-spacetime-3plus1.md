# voidmath as 3 + 1 spacetime, and the bilattice as world-truth

This note records the two readings of voidmath that Aletheon is built on, kept honest about which parts are *what the files say* and which are *the interpretation we act on*.

## What the files say

`development/lab/spacetime/cosmogenerating.md` classifies the kernel's four regimes by where the closure ordinal κ lands and whether the first cohomology H¹ vanishes:

> "Strict-finite and Scott-continuous regimes have H¹ = 0: their closure orbits are determined by countable internal resources.
> Only the aperiodic corner (κ ≥ ω₁, H¹ ≠ 0) **extends the base with genuinely new entities and facts**, and it is the only corner that *needs the outside*."

So of the four regimes — strict-finite, scott-continuous, transfinite, aperiodic — **three** have H¹ = 0 (they reorganize evidence already present; they need nothing from outside), and **exactly one**, the aperiodic corner, introduces genuine novelty and "needs the outside."

The `spacetime` package's own descent is named `informational → quantum → classical → thermal`, and its morphisms are readings of the kernel (e.g. `realize = saturate`, `spread = possibilize-knowledge`).

The archive carries the earliest geometric reading.
`lab/archive/.../void-monoid/manifold_dpm.py` embeds the directional preordered monoid in 3D: *"Grade n → ring of histories at radius r; bypass edges → chords; rings widen with grade."* Its `ring_r(n) = R_BASE + n·R_GROW` and `theta = 2π·rank/total` are transcribed into [`shared/worldgen.mjs`](../../../shared/worldgen.mjs).

## The interpretation we act on (stated as such)

**Read the three H¹ = 0 regimes as the three spatial dimensions, and the one aperiodic regime as time.** The justification is structural, not decorative:

- The three internal regimes only *rearrange* what is already articulated — like moving through **space**: reversible, you may go and return (the modal pair ◇ possibilize / □ necessitate is the forward/back of each axis), and nothing new is created by the trip.
- The aperiodic regime alone *extends the base with new facts* and is irreversible — like **time**: the arrow that brings genuine novelty and cannot be walked backward.
  This is exactly the EAVT append-only trace, which only ever grows (`server/world/store.mjs`).

This is the spatiotemporal reading the `spacetime` package's name already encodes; we make it the literal spine of the engine:

| voidmath                              | Aletheon                                                        |
| ------------------------------------- | --------------------------------------------------------------- |
| the 3 internal regimes (H¹ = 0)       | the 3 spatial axes `x, y, z`; movement is ◇/□, free both ways    |
| the aperiodic regime (H¹ ≠ 0)         | **time** `τ` — the world tick / each entity's EAVT trace length  |
| the void-monoid grade-ring manifold   | the **map**: concentric rings, grade 0 the Settled Reach        |
| grade rising outward                  | danger, strangeness, and corruption rising toward the rim       |

We still represent the three spatial axes as Euclidean floats and draw them with rederived vec/mat transforms — that is the *chart* the GPU needs, not a competing geometry.
The manifold gives the world its shape; Euclidean math renders it.

## The bilattice as world-truth

The other half.
Each creature carries one predication `(self, alive, self)`; its charge is the kernel's, not an HP integer (`server/world/value.mjs`, on `voidmath-kernel-cleanup`'s `joinKnowledge` / `present` / `isTop`):

- **⊥** — no evidence: unspawned / unknown ground (the fog-of-war is the knowledge-LFP).
- **t** — positive only: alive and standing.
- **f** — negative only: a blow appended enough negative evidence to overwhelm the positive face.
- **⊤** — BOTH asserted: positive life-evidence re-asserted onto an already-slain cell.
  The kernel joins t and f to ⊤; the creature does not die but rises as a **Corrupted Anomaly**.
  The world holds the contradiction as a situation and lets it walk — the same move as `tab`'s Permit #23.

This is the whole reason to build a game on a bilattice rather than a boolean: *"is and is not alive"* is a first-class, renderable state (the violet ⊤ shimmer), not a crash or a coin-flip.
It gives a familiar fantasy surface — undeath, corruption, necromancy — that is *derived*, not scripted: `tests/world.test.mjs` shows the ⊤ emerging from the real kernel, and `server/world/ticking.mjs` lets it spread from Anomaly to fresh corpse across the grade-rings on its own.
