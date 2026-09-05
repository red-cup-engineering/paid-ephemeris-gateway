---
name: "Authoring a foundational self-theory concept"
description: "Produces a `concepts/<slug>.md` entry naming a role that recurs across PyFARS as a realization (substrate, projection, settling, verb, harness, heartbeat, etc.), with body sections written in PyFARS-and-upstream-theory terms and depends-on chains pointing into the upstream lineage. Use when a foundational role of PyFARS-as-OS is not yet named in self-theory and other entries (objects, morphisms, claims) are blocked because they have nothing to realize:."
---


## Requirements

- Read access to `concepts/_index.md` for the convention.
- Read access to upstream theory entries the concept draws on (predication-categories, predicated-computing, FARS spec).
- Read access to existing `concepts/` content to avoid duplication and to identify reusable foundational concepts.
- A clear sense of *what role* the concept names (a sentence-length statement is a useful test before writing).

## Steps

1. **State the role in one sentence.** "Substrate is the medium in which PyFARS operates."
  "Projection is the morphism family from substrate state to a transport-readable rendering."
  If the one-sentence statement doesn't feel solid, the role is probably not yet ready to be a concept — it may be a question, an object's discussion section, or a narrative.

2. **Walk upstream.** What concepts/objects in the upstream lineage does the role *depend on* — i.e., what must exist upstream for the PyFARS-side role to be precisely nameable?
  Add these to `depends-on:`.
  If a needed upstream entry doesn't exist, file the gap as a question (do not invent a placeholder slug).

3. **Walk PyFARS-side.** What other PyFARS-side concepts/objects does the role build on?
  Add these to `depends-on:`.
  The dependency closure should be a directed acyclic graph; if the new concept depends on a concept that depends back on it, one of them is misnamed and needs revision.

4. **Write the body.** Open with the one-sentence role statement after the title.
  Then sections in this order, named after the structural move that brings new shape to the role (not after papers or authors):
   - **Role-naming** — what the role names in PyFARS, what pressures it imposes on any structure realizing it.
   - **Distinguishing from adjacent concepts** — when two roles are easily confused, name the boundary.
   - **What this commits to / does not commit to** — load-bearing implications, and what the concept stops short of saying.
   - **Open structural questions** — things the concept does not yet specify.

5. **Set frontmatter**: `type: concept`, `class:` (a classifier like `substrate-atom`, `medium`, `rendering-relation`, `closure-dynamic`), no `status:` (concepts don't carry status), `depends-on:` per the walks, optional `realizes:` if the concept itself realizes some upstream concept.

6. **Cross-check the references**.
  Every `depends-on:` slug should resolve.
  Every relative link should reach an existing path.
  Run `pyfars validate <slug>` if the verb is configured for this scope.

## Outcomes

A new `concepts/<slug>.md` entry that:

1. States the role precisely in PyFARS terms.
2. Cites upstream warrants via `depends-on:`.
3. Is referenceable by future objects, morphisms, and claims via `realizes:` and `depends-on:`.
4. Surfaces what it does not specify as open structural questions.

The concept becomes part of the foundational spine that other self-theory entries can build on.
Subsequent runs of `expanding-self-theory-for-sub-domain` and `lifting-upstream-pattern-to-self-theory` reach for foundational concepts as building blocks.
