---
type: concept
class: workitem-subtype
status: draft
depends-on: [workitem, work-status, work-record]
---

# Derivation

A [workitem](workitem.md) subtype: produces theory entries (concepts, objects, morphisms, claims, narratives) by *deriving* them from upstream theory, the practice surface, and authored intent.
Derivations are the workitem kind that grows the polity's theoretical corpus.

The polity's theory-derivation-officer ([governance/offices/](../governance/offices/theory-derivation-officer.md)) and self-theory-author ([governance/offices/](../governance/offices/self-theory-author.md)) primarily perform derivations as their substantive work.

## What distinguishes a derivation

A derivation workitem has:

1. **Upstream warrant** — the derivation cites upstream theory (predication-categories, predicated-computing, a parent theory) as the source of its content's authority.
2. **Author-asserted content** — the derivation produces author-determined material (theory records are determinations, not log-derived projections — see [record](record.md)).
3. **No external execution** — the work is intellectual: reading, thinking, writing.
  Unlike a procedure (which has a deterministic recipe) or a process (which has stateful execution), a derivation's act is *authoring*, mediated by the actor's understanding of the upstream and the realization.
4. **Cite-traceable conclusions** — every claim or definition the derivation produces should trace to upstream warrant via `depends-on:` chains; un-cited assertions are findings to surface.

Derivations are how the polity's understanding grows: each derivation lifts upstream into PyFARS-side language, or specializes upstream into PyFARS-realization terms.

## Examples

- **Authoring a self-theory concept** — the work-record concept I authored is itself a derivation (deriving from upstream task-cell-system + the captain's framing).
- **Lifting an upstream pattern to self-theory** — the [`lifting-upstream-pattern-to-self-theory`](../governance/skills/lifting-upstream-pattern-to-self-theory.md) skill performs derivation.
- **Authoring a claim about PyFARS** — like [`substrate-purity`](../claims/substrate-purity.md), where the substantive content is asserting what PyFARS commits to and routing the proof obligation through upstream.
- **Producing a monograph** — composing existing theory entries into a longer narrative is also a derivation (the synthesis is author-asserted).

## Why distinguish derivation from procedure

Procedures are *executable* — an actor follows the recipe and produces an output.
Derivations are *authorial* — the actor reads, thinks, writes; the output's content depends on the actor's understanding, not on a deterministic recipe.

This distinction matters for dispatch: procedures can be assigned to non-agentic actors (a script, a workflow); derivations require agentic actors with the relevant theory-reading capability.
Conflating them risks dispatching derivations to actors who can't perform them.

## OS analog

Derivations are *not* processes in the OS-process sense.
The closest analog is a **build-system action** that depends on inputs (upstream theory), produces an output (a theory entry), and is dirty when its inputs change.
But this is a loose analogy; the substantive work of derivation has no clean OS analog.

## What this concept does not yet specify

- The discipline for deciding when a derivation is "complete."
  Theory entries can always be refined; what counts as `status: settled` for a derivation's output is partly conventional.
- Multi-actor derivations.
  When two actors collaborate on a derivation, whose authoring intent prevails?
  The discipline for multi-actor derivation is partly settled.
- The relationship to inquiry.
  An inquiry that resolves into a derivation is a common pattern; the discipline for transition is partly settled.
