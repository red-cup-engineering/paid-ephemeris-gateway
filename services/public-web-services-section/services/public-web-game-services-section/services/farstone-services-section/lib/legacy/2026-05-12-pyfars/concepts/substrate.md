---
type: concept
class: medium
status: draft
depends-on: [predication-cell, closure-2-monad, four-regime-classification, identity-by-relations]
realizes: [predication-substrate]
see-also: [system, polity, directory, program, corpus, jsonl-event-log]
---

# Substrate

The mathematical structure PyFARS operates over: the collection of [predication-cells](predication-cell.md) `(subject, predicate, object) → value` with bilattice values, the closure-rule-systems that govern how those cells settle, the witness chain that records every operator invocation, and the projector machinery that translates between cells and bytes.
Substrate is the medium; it is not a frame.

The substrate is *predication-addressable*, not memory-addressable: a cell at $(s, p, o)$ is reached by naming its $(s, p, o)$, not by reading from an address.
Operations on substrate are not "read from address $A$, write to address $B$" — they are "read the cell at $(s, p, o)$, settle by closure."

Substrate realizes the predicated-computing notion of [predication-substrate](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/concepts/) as the primary computational medium of a computer: substrate is what PyFARS computes *with*, not what it computes *over*.

## Substrate is not a frame

PyFARS has four [frames](#the-four-frames-and-their-views) — [directory](directory.md), [system](system.md), [polity](polity.md), [program](program.md) — each a way of looking at the substrate. **Substrate is not one of those frames.** It is the thing the frames are views of.
Each frame represents the same substrate under a different aspect; the substrate itself is invariant under choice of frame.

This distinction matters: code, prose, and discipline should reserve the word **substrate** for the underlying mathematical structure.
When PyFARS docs mean "the cell space the kernel holds in memory," the right word is **system** (the frame).
When PyFARS docs mean "the bytes on disk that project to cells," the right word is **directory** (the frame).
And so on for polity and program.

## What's in the substrate

A cell $(s, p, o)$ with bilattice value $v$ is *in* the substrate.
The substrate also carries:

- **Closure rules** — productions that derive new cell values from existing ones.
  These are themselves substrate content (substrate cells claim "this closure rule is active in this regime"); substrate's closure dynamic is internally specified.
- **Regime classification** — every closure-rule-system has a regime per the [four-regime classification](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/) (strict / Scott-continuous / transfinite-bounded / aperiodic).
  Regime governs convergence behavior.
  PyFARS's substrate as a whole does not have one regime; different sub-domains live in different regimes.
- **Quiescent subsets** — the cells whose values are stable under further closure application.
  Settled cells.
- **Pending witnesses** — events recorded in the JSONL log that have not yet been folded into closure.
  Substrate state at any moment is the cells fixed by closure of the witnesses received so far.

## The four frames and their views of the substrate

The four frames each present the substrate under a different aspect:

| Frame | Views substrate as | Question it answers |
|---|---|---|
| [Directory](directory.md) | **bytes** | What is on disk? |
| [System](system.md) | **data** | What predication structure is held? |
| [Polity](polity.md) | **information** | What does the structure mean to its agents? |
| [Program](program.md) | **operations** | What is being done to the substrate right now? |

The progression is not arbitrary.
Bytes lift to data when projectors interpret them as cells; data lifts to information when closure rules give the cells agential meaning; information lifts to operations when programs act on it; operations write back through projectors to bytes.
The four frames are the four stations of one cycle, and the substrate is the invariant medium that all four are reading or writing.

## Substrate vs. corpus vs. event log

Three things easily confused.
Distinguishing them is foundational:

- **The substrate** is the abstract medium of predication cells with bilattice values, settled by closure.
  It is what PyFARS computes with.
- **The [corpus](corpus.md)** is a [directory](directory.md)-frame projection of substrate state into a markdown filesystem.
  The corpus is what humans read; the substrate is what PyFARS computes with.
- **The [jsonl-event-log](../objects/jsonl-event-log.md)** is the canonical *transport* of substrate transitions: an append-only log of witnesses whose closure produces the current substrate state.

The substrate, at any moment, is determined by the closure of the JSONL events received up to that moment, against the closure rules active in that moment.
The corpus is a derived rendering.
This ordering — log → substrate → corpus — is load-bearing; it underwrites several of PyFARS's claims (see [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md), [`markdown-as-projection`](../claims/markdown-as-projection.md)).

## What substrate-purity commits to

PyFARS commits that all substrate transitions are explicit witnesses.
Implementation infrastructure — caches, in-memory indices, derived computations — does not modify substrate; it accelerates reads.
See [`substrate-purity`](../claims/substrate-purity.md) for the claim and its proof obligation.

This commitment is the engineering reason for keeping the four frames distinct from the substrate: caches live at the [system](system.md) frame; derived files live at the [directory](directory.md) frame; in-flight operations live at the [program](program.md) frame.
None of those are the substrate itself.
The substrate stays pure; the frames hold the accelerators.

## Substrate and identity

Per [identity-by-relations](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/concepts/identity-by-relations.md), an entity in substrate is identified by the relations (cells) it participates in.
Two substrates with byte-identical cells are the same substrate; adding cells or revising values produces a new substrate.
The witness chain records the trajectory between successive substrates.

This is what makes substrate replay deterministic: replaying the witnesses against the same closure rules reproduces the same substrate cells, byte-for-byte.
Cf. [predicated-nix's narrative](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/deployment-systems/theories/nix/theories/predicated-nix/narratives/nix-mapped-onto-the-substrate.md) for how this maps onto Nix's input-addressed reproducibility — a related (thinner) instance of the same closure-driven discipline.

## Open structural questions

- Whether PyFARS commits to a single bilattice for its whole substrate or admits per-sub-domain bilattice choices (FOUR for the bulk; richer locally).
- Whether closure rules themselves are tracked as substrate cells (self-describing) or live in code.
  The current realization is mixed; settling this is an architecture-shaping question.
- The handling of substrate transitions across time — temporal predication-cells whose values change with time, vs. event-versioned cells.
- The discipline for substrate composition under federation — when two substrates merge, the closure-rule sets may overlap or conflict; the convergence rules are partly settled.
