---
type: concept
class: agent-form
status: draft
depends-on: [agent, entity, witness]
---

# Persona

A first-class [agent](agent.md)-form: a persistent voice-bearing identity the polity recognizes and dispatches to produce voice-bearing content.
Realizes the agent-form the captain's polity calls *persona* — distinct from [personnel](personnel.md) (recognized polity members) and from operational AI agents (in-context roles without persistent voice).

A persona has soul and memory.
It speaks; it has interpretive frames; it produces content under its name.
Personas are how the polity carries multiple authentic voices alongside each other — the captain's persona, the diviner's voice, the critic's voice, the naturalist's voice — without conflating them.

## What distinguishes a persona

Per the 561 polity's working framework, a persona has:

- **An interpretive framework** — the principles that govern how the persona reads the world.
- **A library domain** — the persona's source content under the appropriate theory.
- **Publishing surfaces** — where the persona's content is rendered (e.g., Hive Routine Reads, Koios News, an emsenn-net section).
- **Persistent voice** — the persona's content is stylistically consistent; its perspective recurs.

These distinguish persona from operational AI agents (which are in-context, role-based, not voice-bearing) and from personnel (which is membership-shaped, not voice-shaped).

## Personas vs. other agent-forms

A single entity may simultaneously be multiple agent-forms:

- **Persona vs. personnel**: an entity can be a persona without being personnel (a persona may be an AI persona the captain operates without polity membership).
  An entity can be personnel without operating any persona (purely office-bearing membership).
  The captain (emsenn) is both.
- **Persona vs. operational agent**: a persona has persistent voice; an operational agent has an in-context role per session.
  A Claude Code session might *operate* a persona for a session (channeling that persona's voice for outputs), but the persona is the persistent identity, not the session.
- **Persona vs. officer**: officer is an incumbency relation to an office; persona is a voice-identity relation.
  An office may be held by an entity who also operates a persona, but neither subsumes the other.

## Personas in PyFARS substrate

PyFARS represents personas as system records (typically `kind: persona`) at the polity-level governance directory (e.g., `561/governance/personas/<slug>.md`).
PyFARS-the-substrate provides the recording discipline and dispatch hooks; the polity owns its persona roster.

For dispatch: - A workitem may declare `requires-persona: <slug>` if the work must be performed in a particular persona's voice. - An agent (in the operational sense) attached to a session may operate a specific persona; the operating relation is a system cell `(agent-session, operates-persona, <slug>)`.

## Persona as one of the agent-forms

The captain's polity-level governance index notes "persona and personnel are distinct first-class agent-forms — not synonyms, not record-kind shadows of each other."
This concept names the persona form; sibling concepts ([personnel](personnel.md), [officer](officer.md), [endpoint](endpoint.md)) name the others.
The catalogue is open; new agent-forms may be added as the polity's needs emerge.

## What this concept does not yet specify

- The full discipline for persona authoring — how a persona's interpretive framework is captured as substrate.
- The relation between a persona's published content and its system record.
  The persona record carries identity; published content lives elsewhere (in the persona's library domain, in publishing surfaces).
- Cross-polity personas — when a persona is recognized by multiple polities.
  Open.
- The relation between personas and AI personas (some of the 561 polity's personas appear to be AI-operated).
  Whether AI-operation is a separate dimension or an attribute of the persona record is open.
