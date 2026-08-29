---
type: concept
class: frame
status: draft
depends-on: [system, directory, program, governance, dispatch, agent, office, charter]
see-also: [scope-as-fiber, image, instance, engine, runtime, agential-self-generation]
---

# Polity

The **agential frame** of a PyFARS instance: agents, offices, dispatch, assignments, sessions, processes, work, and the closure rules that make these cells *act* — turn system state into operations on behalf of someone.
The polity is the frame that views the [substrate](substrate.md) as **information** — what the data carried by the [system](system.md) means to its agents.

A polity is one of four lenses through which the same [substrate](substrate.md) presents itself; the other three are [directory](directory.md), [system](system.md), and [program](program.md).
A polity does not exist apart from the substrate it views — it is what the substrate becomes when its cells include agential predicates and the closure rules that animate them.
A PyFARS instance with no agents, no offices, no dispatch is a substrate-with-a-system-view but not a polity.

## What a polity IS

A polity is *agential operation under a charter*.
Its primitives:

- **Agents** — [`AgentRecord`](../objects/agent-record.md) entities.
  An agent is a system entity the polity treats as an actor: an emitter of witnessed operations, a holder of skills, an inhabitant of offices.
  Per [agential-self-generation](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/concepts/agential-self-generation.md), the agent's existence IS its system record — there is no off-system agent registry.
- **Offices** — [`OfficeRecord`](../objects/office-record.md) entities.
  An office is a fuzzy cell of authority, scope, and duties; agents inhabit offices, and an agent-in-office composes the agent's own fiber with the office's fiber (per [scope-as-fiber](scope-as-fiber.md)).
- **Dispatch** — the matching of agents to work.
  Dispatch is a closure-rule-driven settling: the polity's closure rules read the system's cells and emit `(workitem, assigned-to, agent)` cells.
  The dispatch logic lives in the system as authored closure rules — it is not Python code in the [engine](engine.md).
- **Charter, conventions, decisions** — the polity's settled commitments about what it does and how.
  These are system records; their predicates compose with agent and office fibers to determine what is permissible.
- **Sessions** — the polity's recorded engagements with humans or external systems.
  A session is a polity entity (it has an office binding, a duration, a witness footprint), even though it traces back to a [program](program.md) driving it.

What makes the polity a polity, and not merely a system that happens to carry the word "agent" in some predicates, is that the closure rules *act on those predicates* — produce dispatch decisions, surface authorization conflicts, route witnesses to channels, settle scope at investiture.
The polity is the system *under its agential closure rules*.

## What a polity is NOT

- A polity is not a [system](system.md).
  A system is the cell space and its algebra; a polity is what the cell space enacts when its cells include agents-and-offices.
  A polity-shape system carries more commitment (agential closure rules); but the system frame is still the substrate-algebra frame regardless of whether the cells happen to be agential.
- A polity is not a [program](program.md).
  Programs run and exit; a polity persists across program lifetimes.
  When no [engine](engine.md) program is running, the polity is at rest — its agents have offices, its dispatch records are settled, but no agential operation is in flight.
  When the engine program runs again, the polity resumes.
- A polity is not a [directory](directory.md).
  The directory is bytes on disk; the polity emerges from the system that those bytes project to.
  A directory is necessary (the polity-shape cells live in directory files); but the directory and the polity are not the same thing.
- A polity is not a [runtime](runtime.md).
  A runtime is the installed PyFARS package — what *runs* polities.
  Many polities may exist on one host; one runtime may boot any of them.
  The polity is the content; the runtime is the executor.

## What a polity contains that a non-polity system does not

A conforming polity holds, at minimum:

- At least one agent record (an actor).
- At least one office record (an authority position).
- A **charter** — the polity's foundational record declaring its identity, its scope, its commitments.
- **Dispatch-shape closure rules** — rules that turn workitems and agents into assignments.
- A **witness-routing discipline** — rules that direct witnesses to channels and to the event log.
- An **identity manifest** at the [directory](directory.md) root (typically `_index.md`, or a `polity.toml` equivalent), naming the polity.
- A **JSONL event log** — the polity's history of system transitions.

A system that holds none of these is just a system.
A system that holds some but not all is a *partial* polity — it may admit some agential operations but not others.
A system that holds all of them satisfies the polity-shape commitment and is fully a polity.
A directory missing any of these projects to a system that PyFARS will refuse to boot as a polity (or will boot as a degenerate non-polity case).

## Image and instance

A polity exists in two relationships to a running [program](program.md):

- **At-rest** — the polity-as-[image](image.md): the system's cells are in their last-witnessed state on disk; no engine program is attached.
  The polity exists, but no agential operations are in flight.
- **Running** — the polity-as-[instance](instance.md): an [engine](engine.md) program is attached, ticking closure rules, dispatching assignments, witnesses appending to the event log.

The same polity moves between at-rest and running.
Each [boot](../morphisms/booting.md) and [halt](../morphisms/halting.md) is itself a system operation, witness-recorded.

## Position among the four frames

The polity is the *third* frame in the forward direction:

```
directory  →  system  →  polity  →  program
```

The forward step from [system](system.md) to polity is *closure-rule application*: the system's agential closure rules fire on the system's agential cells and produce the dispatch decisions, scope compositions, and authorization fibers that constitute polity operation.

The reverse step (polity to system) is *witness emission*: a polity operation (a dispatch, a session, an agent action) becomes system-resident as a witness chain entry.
The system records the polity's history; the polity reads the system's commitments.

## What the polity is not allowed to do

The polity does not bypass the system.
Every polity operation is a system operation under the system's closure rules and witness discipline.
An agent's "action" is, in the system frame, a witness emitted under operator invocation; an office's "authority" is, in the system frame, a fiber of cells composed at investiture.
There is no agential operation that escapes the system's audit chain.
This is the engineering content of *agential-self-generation*: the polity is built from the same system primitives as everything else.

## Polity vs. workspace, repository

Distinct concepts:

- A **workspace** is a developer's working directory — may or may not be polity-shape.
- A **repository** is a version-controlled directory — may or may not be polity-shape.
- A **polity** is the agential view of a system loaded from a directory.

A directory can be all three (the pyfars/ directory IS polity-shape, IS a repository, IS a workspace).
But the concepts are independent: a polity-shape system might not be version-controlled; a repository might not load to a polity-shape system.

## Polity as an OS-level abstraction

PyFARS-the-runtime is to a polity what:

- A *Unix kernel* is to a root filesystem — the thing the OS boots.
- A *container runtime* is to a container image — the thing the daemon instantiates.
- A *web server* is to a served directory — the thing the server hosts.

The polity is the content; the runtime is the executor.
PyFARS preserves the system-purity discipline by making the polity self-describing: governance, rules, content, log all in the directory; nothing essential lives in the runtime alone.
Booting a polity is loading its [directory](directory.md) into a [system](system.md), then attaching an [engine](engine.md) program.

## Polity and federation

When two polities federate, they retain their separate identities (their directories remain distinct, their systems carry separate cells) but share certain system cells through bilattice network-sheaf consensus.
The merged substrate is not a third polity — it's a *coordination layer* over the federated polities.
Federation discipline is partly settled.

## Position relative to predicated-governance

Polity instantiates the broader [predicated-governance](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-governance/_index.md) commitment that *governance is system-resident*.
A PyFARS polity is one realization of predicated-governance at the flatfile substrate: its charter, its offices, its decisions are all `.md` files in the directory; its dispatch and authorization are closure-rule applications over those files.

## Open issues

- **Manifest schema.** `polity.toml` vs. `_index.md` at root; partly settled.
- **Polity versioning.** When a polity's system content evolves (via witnessed transitions, via captain-edits, via federation), what counts as "the same polity over time" is partly settled — we currently rely on directory-identity.
- **Sub-polities and nesting.** Whether a polity-shape system can contain another polity-shape system (recursive bootable substructure) is open territory.
