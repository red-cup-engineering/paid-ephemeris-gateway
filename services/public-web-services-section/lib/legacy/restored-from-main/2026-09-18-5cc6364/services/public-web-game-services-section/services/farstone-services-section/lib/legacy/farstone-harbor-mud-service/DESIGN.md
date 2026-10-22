# Farstone — Engine Design

This is the canonical design document for the Farstone engine.
It exists so the *vision* stops being lost through iteration.
Read it before reading the code: the code is large and the dream is simple, and if you reconstruct the dream from the code you will reconstruct it wrong.

If you take one thing from this document, take this:

> **A MUD is not built *on* this theory.
> A MUD is what the theory looks like wearing a face you can walk inside.**

Everything below is the working-out of that one sentence.

---

## 1. The thesis

### Games are computers are games

There is a load-bearing theorem under this whole stack (`@emsenn/computing`, from the corpus's `concurrent-game-system.md`):

> **CGS** — the category of concurrent games with symmetry — **IS** the theory of computing.
> It is the unique $*$-autonomous category into which sequential (Hyland–Ong), nominal (AGMOS), session-typed (Caires–Pfenning), and realizability ($\mathbf{Eff}$) computation all embed as full sub-categories or Kleisli sub-CCCs.

That is not a metaphor about games "modeling" computation.
It is an identity.
Concurrent game systems *are* computing, presented in its native geometry.
And a concurrent game with arenas, players, and moves is — read in plain English — a *world with rooms, characters, and actions*.

So the chain closes:

**a running computation = a game being played = a world being inhabited.**

A MUD is the third face of a thing whose other two faces are "a program executing" and "a proof being checked."
When a player at a Farstone prompt types `give the sword to the ferryman`, they are not *triggering* a computation that is *modeled as* a game.
They **are**:

- **constructing a proof** — the command is a derivation step in a linear logic;
- **running a computation** — the command is one interaction of the concurrent computer;
- **playing a strategy** — the command is a Player move in a CGS arena.

And the world they are changing — the settled state of every fact — **is the proof-state**.
The world *is* the partially-completed proof.
Playing the game *is* extending the derivation.

### The correspondence

The Curry–Howard–Lambek correspondence, extended along the CGS axis and given a world-face, is the engine's entire conceptual spine.
Every column of this table is the *same object* seen from a different discipline.
Keep this table next to you while you read the rest of the document.

| logic | computation | game theory | ludics | **Farstone** |
|---|---|---|---|---|
| proof | program | strategy | design | **character behavior** |
| proposition | type | arena | behaviour | **a room / a situation** |
| cut-elimination | execution | interaction | normalization | **a turn** |
| connective | type constructor | arena operation | — | **a way to compose the world** |
| $!A$ (of-course) | reusable value | re-askable arena | — | **a persistent thing (the room, your name)** |
| $A$ (linear) | consumed value | one-shot move | — | **a movable thing (the sword, gold)** |
| FOUR / bilattice | — | — | — | **the truth-state of a contested world** |

Two rows deserve emphasis because they are where most engines go wrong:

- **cut-elimination = execution = interaction = a turn.** A turn is not "the server ticking."
  A turn is *cut-elimination*: two designs (the actor's behavior and the world's behavior) are put in interaction across a cut, and the turn is that cut being eliminated to a normal form.
  This is why turns are the unit of meaning, not seconds.

- **the bilattice FOUR = the truth-state of a multi-perspectival, sometimes contradictory world.** A fact in Farstone is not a boolean.
  It carries a *charge* in Belnap's FOUR — affirmed, denied, *held-contradictory*, or unknown.
  A world that has rumors, lies, an oracle who disagrees with the ferryman, and fog you cannot see through is a world whose truth values genuinely live in FOUR, not in `{true, false}`.
  The bilattice is not a feature bolted on for flavor; it is the *only* honest truth-object for a world with more than one point of view.

The discipline that falls out of this thesis: **you never invent a mechanic.** You read a mechanic *off the theory*, you name the invariant it must preserve, and you build the smallest surface that preserves it.
Sections 4 and 5 are that discipline applied.

---

## 2. The architecture stack

Each layer in the stack is **a face of the layer below it.** Nothing in an upper layer is new content; it is the lower layer presented in a more walk-into-able form.
From the bottom:

```
  site            session transport — SSE perception out, commands into the tick
   │  (a face of)
  farstone        the world as data — rooms, things, characters, facts
   │  (a face of)
  fizzos          the MUD OS kernel — tick loop, timeline, perception, verbs
   │  (a face of)
  computing       the running concurrent computer — observe / run / federate
   │  (a face of)
  games           CGS — rooms = arenas, characters = designs, command = move
   │  (a face of)
  relationality   the world = an utterance log settling to a bilattice fixpoint
```

### relationality — the substrate (`@emsenn/relationality`)

The world is **not a mutable database.** It is an **utterance log** that *settles* to a **bilattice fixpoint.**

Facts are never overwritten.
To change the world you *tell* it something — you append an utterance (`articulate → predicate → posit`) — and the engine folds the log through its descent (`settle`) into a frozen carrier where every cell (`entity × predicate × entity`) has a settled charge in FOUR, combined by the **knowledge-join**.
This buys, for free and structurally:

- **event-sourcing** — the log is the source of truth; the carrier is derived;
- **replay / fork / diff** — any past world is `induce`-able from a prefix of the log, and two timelines are just two folds;
- **paraconsistency** — the bilattice is *paraconsistent*: a cell can settle to the held-contradictory value (`stable`) without the logic trivializing.
  A contradiction is a *value*, not a crash.

This is the floor.
Everything above is this, wearing faces.

### games — CGS (`@emsenn/gaming`)

The same settled structure, read as a concurrent game:

- a **room / situation** is an **arena** (a polarized prime event structure);
- a **character** is a **design / strategy** (its behavior is a strategy on its arena, in the ludics sense — checkable, not scripted);
- a **command** is a **move** in that arena.

`@emsenn/gaming` carries the CGS structure as data — arenas, strategies, ludics loci/designs, interaction as the knowledge-join, behaviours as bi-orthogonal closures.

### computing — the running computer (`@emsenn/computing`)

The same game, made to *operate*.
This is the SPOTCOMP pipeline, and it is **the definition of a turn:**

$$\text{settled world} \xrightarrow{\;\texttt{observe}\;} \text{CGS arena} \xrightarrow{\;\texttt{run(strategy, move)}\;} \text{new utterances}$$

- **`observe`** reads a frontier of settled memes — *restricted to the actor's perception fiber* — into a polarized arena, using the identity **a polarity IS a charge value** (`potential` = $t$ = Player; `potential` = $f$ = Opponent; `active`/`absurd` commit no move and are kept as audit evidence).
- **`run`** executes one interaction step: a modeled player (a CGS morphism — a character's strategy) responds to an admitted Opponent move with the (concurrent, possibly empty) set of Player moves it enables.
- **multiplayer = federation.** `federate` composes many players by the multiplicative parallel $\|$ — *federation IS $\|$*.
- **concurrent conflict = the bigraded $H^1$ class.** When federated sites settle the same cell to different charges in one tick, the obstruction to a global section is a *computed* class $$H^1 \;=\; H^1_t \,\oplus\, H^1_\top$$ — the truth-row disagreement (sites split affirm-vs-deny; classical, a choice resolves it) plus the inconsistency-row disagreement (sites glue to the held contradiction `stable`).
  The two summands are independent: the paraconsistent content *cannot* be re-merged into the classical content.

### fizzos — the MUD OS kernel (`@emsenn/fizzos`)

The operating system that makes all of the above run *as a world*.
Fizzos owns:

- the **tick loop** (the sole writer of the world — see §3);
- the **timeline** (the deterministic record of ticks: replay/fork/diff in practice);
- **perception** (an actor's fiber — the restriction it is allowed to read);
- **thing-composition** (a "thing" is a settled bundle of facts with a joined charge — a room, a sword, a character are all things);
- **verb dispatch** (turning a typed command into an admitted move).

Fizzos reads the tick boundary *as a federation* and the fan-in disagreement *as the bigraded $H^1$* — it does not reimplement concurrency, it imports the theorem.

### farstone — the world as data

The actual harbor: rooms, inhabitants, geography, lore, the things and characters and facts of one specific place (`world/`).
Farstone is **content**, not engine — adding to Farstone is adding facts and scripts, never plumbing.

### site — session transport

The thinnest layer: it carries **perception out** (settled fibers streamed as SSE) and **commands in** (player input threaded into the next tick).
The site does *not* re-implement the world.
A script in a package is a filter — params in, a byte-stream out — and the site *transports what pipes out*: streaming all the way down, content-negotiated, cacheable.
The world logic lives in the packages; the site is a pipe.

---

## 3. The turn loop

The loop, precisely:

```
   settled world
        │
        │  observe(actor's perception fiber)        ── restrict the global
        ▼                                              settled topology to
   arena of available actions                          what this actor can read
        │
        │  interaction / run(strategy, move)        ── the player's command is
        ▼                                              a move; the character
   new utterances                                      strategies respond
        │
        │  settle (fold the log by the knowledge-join)
        ▼
   settled world'    ── the next proof-state; the loop repeats
```

A turn is **one cut-elimination**: the actor's design and the world's designs are put in interaction, the cut is eliminated, and the residue is the new utterances that fold back into the world.
The world after the turn is the new proof-state.

### The live world is a persistent stateful process

This is the single most important runtime fact, and the one most easily lost:

> **The live world is a PERSISTENT, stateful process.
> The tick is the *sole writer*.
> The world is NOT rebuilt from scratch per request, and requests do NOT mutate it directly.**

The tick loop is a long-running process holding the current settled carrier.
Player commands do not write the world — they are *queued as proposals for the next tick*.
The tick:

1. drains the queue of proposals (one tick = a federation of all proposals admitted in this window);
2. computes the confluence class $H^1$ of that federation;
3. folds the confluent floor into the world by the knowledge-join;
4. handles non-confluence as choice (branch or surface — never silent flatten);
5. publishes the new settled fibers to perception (the site streams them out).

Because the tick is the sole writer, the world is always a single coherent settled state, replay is exact, and "what did the world look like at tick *n*" is always answerable.
Stateless per-request scripts (like `look`) read a *snapshot* of this process; they never *are* the world.

---

## 4. The mechanics

Each mechanic is **derived from the theory, named by the invariant it preserves, and built as the smallest testable surface.** Do not add a mechanic that does not fit this shape.
The pattern is always: *theory → invariant → smallest surface.*

### 4.1 Linear-logic inventory

**Theory.** Linear logic distinguishes the exponential `!
A` (of-course: arbitrarily reusable) from linear `A` (used exactly once).

- `!
  ` (reusable) — the **room**, your **name**, the *kind* "sword": you can observe them, refer to them, re-enter them, without consuming them.
- linear (consumable / movable) — *the* sword, *this* gold: it is in exactly one place; moving it *removes* it from where it was.
- **give** = a **linear transfer**: the sword leaves the giver, arrives at the receiver; no duplication, no annihilation.
- **craft** = a tensor lollipop $A \otimes B \multimap C$: consume an `A` *and* a `B`, produce a `C`.

**Invariant — CONSERVATION, and it comes from the type.** A movable thing is `located-in` exactly one held place.
Conservation is not enforced by bookkeeping code; it is enforced by the *linear type*: asserting a new location (`potential`) *denies the old* (`potential`) in the same fold.
You cannot write a duplication bug because the type does not have a derivation that duplicates a linear resource.

**Smallest surface.** The functional predicate `located-in`, with the rule that a new location-assertion denies every prior location-assertion for that thing.
Test it by trying to put one sword in two rooms and watching conservation hold.

### 4.2 Paraconsistent contested world

**Theory.** The bilattice FOUR.
A fact's charge is one of:

- **affirmed** (`potential` = $t$);
- **denied** (`active` = $f$);
- **held-contradictory** (`stable` = both — *stable*, does **not** explode);
- **unknown** (`absurd` = neither).

**Theory's gift.** In a paraconsistent bilattice, `stable` is a *fixed point*, not a fault.
A world can *contain* contradiction.
The oracle says the ferryman is a traitor; the ferryman says the oracle lies.
That cell settles to `stable` and *stays there* — it is **content** (a rumor, a lie, an unresolved accusation), not a crash.
The whole texture of intrigue, deception, and conflicting testimony is *the bilattice doing its job*, not special-cased "lie" flags.

**Invariant — the bilattice never trivializes on `stable`.** A held contradiction infects nothing it does not logically touch; the logic does not derive everything-from-contradiction.
`stable` is a value the world carries, not a state the world dies in.

**Smallest surface.** Tell the world two opposing facts; assert that the cell settles to `stable`, that reading it returns "contested," and that *other* unrelated facts are unaffected.

### 4.3 Perception as a sheaf restriction (umwelt)

**Theory.** The settled world is a global section over a topology.
Each actor does not read the global section — it reads the **restriction** of that section to its own **fiber** (its umwelt: what *this* actor, here, with these senses and secrets, can perceive).

- **stealth, secrets, lies, fog** are *sheaf restrictions*, not boolean flags.
  A hidden assassin is not "flag: invisible=true"; it is a thing whose presence is simply *not in the section* the other actors' fibers restrict to.
  A secret is a fact present in one fiber and absent from another.
  Fog is a restriction that drops the far cells.

**Invariant — no actor reads outside its section.** `observe` is *always* given the actor's fiber, never the global carrier.
Perception is a restriction map; an actor physically cannot read a cell its fiber does not contain.
Information leakage is impossible *by construction*, not by careful filtering.

**Smallest surface.** Two actors, one fact visible only to the first; `observe` each fiber; assert actor-one's arena contains the move and actor-two's does not.

### 4.4 Multiplayer disagreement as cohomology

**Theory.** A tick is a federation of all the proposals admitted in its window.
Concurrent conflicting actions are the obstruction to gluing those proposals into one global section — the bigraded first cohomology class

$$H^1 \;=\; H^1_t \,\oplus\, H^1_\top$$

(truth-row disagreement + inconsistency-row disagreement).

- **confluent ticks commute** — when the class vanishes, the proposals are order-independent, tensor-safe; fold them in any order, same world.
- **non-confluent ticks** carry a real disagreement class.
  Two players move the same item to different rooms in one tick: that is a genuine $H^1$ class.
  It is resolved as **choice** — either by *branching the timeline* (parallel futures) or by *surfacing the contradiction* — but it is **never silently flattened by input order.**

**Invariant — the confluent fold is the floor; non-confluence is choice, never silently flattened.** The engine computes the class; it does not let arrival order secretly decide a conflict.
A conflict is logged as a witness and handled as a decision, in the open.

**Smallest surface.** `functionalProposalSites`: two actors proposing different values for the same `entity|predicate` in one tick; assert the $H^1$ class is non-zero and a witness is logged, rather than the second write silently winning.

### 4.5 NPCs as ludics designs; conversation as cut

**Theory.** A character is not a script of `if`-statements.
A character is a **ludics design** — a strategy on its arena.
A **conversation** is the **cut** between two designs: the player's design and the NPC's design put in interaction.

- *"Does this conversation terminate / go anywhere?"* is the precise question *"do these two designs converge to the **daimon**?"* (the ludics convergence marker).
  A conversation that loops forever is two designs that do not converge; a conversation that resolves is a cut that eliminates to a normal form.

**Invariant — behavior is a checkable strategy, not a script.** An NPC's behavior is a design you can *check*: does it converge against the behaviours it claims to inhabit?
You can ask of an NPC, statically, whether it can get stuck, whether it answers every admitted move — questions you *cannot* ask of a pile of `if`-statements.

**Smallest surface.** One NPC-design and one player-design; compute their cut; assert convergence to the daimon for the intended exchange and non-convergence (a detectable loop) for a designed-in evasion.

### 4.6 Quests as recursive types

**Theory.** The two faces of recursion in the type theory:

- a **finishable quest** is a **$\mu$-type** (an *initial algebra*): you *construct* the completion.
  The quest is finished exactly when you have built the algebra element — fetch this, then that, then return: a finite construction with a last step.
- a **standing duty / world cycle** — the tides, the seasons, an eternal patrol, the harbor itself running — is a **$\nu$-type** (a *final coalgebra*) / a **traced fixed point** (`@emsenn/organizing/category`'s trace — the self-running world feedback loop).
  It has no last step; it is *observed*, not *completed*.

**Invariant — completion = constructing the algebra element.** A quest is complete *iff* the player has produced the $\mu$-element; there is no separate "isComplete" boolean to get out of sync with the world.
A world cycle never "completes" — asking it to is a type error — it is a traced loop that keeps producing the next state.

**Smallest surface.** One $\mu$-quest whose completion is the constructed element (assert it is complete *only* when the element exists), and one $\nu$-cycle as a traced fixed point (assert it produces successive states and has no terminal).

---

## 5. Build order

The discipline, sequenced. **Earn each step before the next.**

1. **Recover & canonicalize the world.** *(Happening now.)* Get the world's facts, rooms, things, and characters into the relationality substrate as a clean utterance log that settles.
  Before any mechanic, the world must be *data that settles to a fixpoint.* This document is part of this step: pinning the vision so the recovery is canonical.

2. **Pin the turn loop honestly, and make fizzos actually run it.** Implement §3 as written: a persistent stateful tick process that is the sole writer, draining proposals, settling, publishing fibers.
  No mechanic is real until the loop that carries it is real.
  "Honestly" means: if it is not yet a persistent process, say so — do not pretend a per-request script is the live world.

3. **Earn the mechanics one at a time, each preserving its invariant.** In order:
   1. **Linear inventory** (§4.1) — CONSERVATION. The foundation: things that
      move without duplicating.
   2. **Paraconsistent facts** (§4.2) — the bilattice never trivializes on
      `stable`. The foundation for content with more than one point of view.
   3. **Perception as fiber** (§4.3) — no actor reads outside its section.
      Required before multiplayer means anything.
   4. **$H^1$ branching** (§4.4) — the confluent fold is the floor; non-confluence
      is choice. Required before concurrent multiplayer is honest.
   5. **NPC-designs** (§4.5) and **quest-types** (§4.6) come *after* the first
      four — they are the richest mechanics and they sit on top of perception,
      conservation, and the contested world.

Each step ships with the *smallest testable surface* from §4 and a test that *names and checks its invariant*.
A mechanic without its invariant test is not earned.

---

## 6. What's real vs. aspirational today

Honesty is part of the discipline.
Here is the line, as of this writing.

### Already exists (the substrate is real)

In `lib/computing` + `lib/gaming` + `lib/relationality`:

- **the $*$-autonomous category** — tensor $\|$, dual $(-)^\perp$, par $⅋$, lollipop $\multimap$, copycat identity, interaction-plus-hiding composition (`@emsenn/organizing/category`);
- **the `!
  `-comonad + comonoid + `?
  `-monad + additives** — the full exponential structure (reusable vs. linear) and the additive connectives, with Seely's axioms tested (`category/exponential.mts`, `exponential-comonoid`, `why-not`, `additive`);
- **the traced monoidal structure** — feedback / $Y$ / the self-running fixed point, for $\nu$-type world cycles (`category/traced.mts`);
- **`observe` / `run` / `federate`** — the SPOTCOMP pipeline: settled memes → arena → strategy → player move, and many players composed by $\|$ (`computing/computer`);
- **`federationCohomology` with the bigraded $H^1 = H^1_t \oplus H^1_\top`** — the disagreement class *computed*, no longer deferred, with the glued global section and projection-fixed-point witness (`computer/federation.mts`);
- **ludics designs / behaviours / cut** — characters as designs, conversation as interaction (`games/algebra`, `games/topology`, `category/ludics-bridge.mts`);
- **the charge bilattice FOUR + settling** — the paraconsistent truth substrate, the knowledge-join, and the `induce`/`extend`/`settle` descent that folds an utterance log to a fixpoint (`relationality/algebra`, `relationality/topology`).

In `services/fizzos`:

- the **engine** reads a world as a settled charge valuation and folds facts by the knowledge-join (`engine.mts`);
- the **tick concurrency** reads a tick *as a federation* and computes its confluence class, denying competing values for a functional predicate so the collision surfaces as a real $H^1$ rather than flattening (`concurrency.mts`, `functionalProposalSites`).

### Still to be wired (the mechanics are aspirational)

- the **persistent stateful tick process** as the sole writer (§3) — the loop exists as transitions; making it a long-running, perception-publishing process driving the site is build-order step 2;
- **linear inventory** end-to-end (`give`, `craft` as $A \otimes B \multimap C$) with the conservation invariant test as the public surface (§4.1);
- **perception-as-fiber** wired so `observe` is *always* handed a restricted section per actor, with the no-leak invariant test (§4.3);
- **$H^1$ branching** that actually *forks the timeline* or *surfaces the contradiction* on non-confluence, beyond computing the class (§4.4);
- **NPC behaviors authored as designs** (not `if`-trees) with convergence checks (§4.5);
- **quests authored as $\mu$-/$\nu$-types** with completion = constructed algebra element (§4.6);
- the **site transport** streaming per-actor settled fibers as SSE and threading commands into the tick window (§2, site layer).

The substrate is the hard part, and it is done.
What remains is *earning the faces* — wiring each mechanic so the world a player walks into is, provably, the theory wearing a face.
