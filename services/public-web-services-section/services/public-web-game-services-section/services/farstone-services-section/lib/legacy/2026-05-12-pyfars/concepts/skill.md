---
type: concept
class: agent-capability
status: draft
depends-on: [agent, action, act, witness]
realizes: [skill]
---

# Skill

The bridge between [agent](agent.md) and [action](action.md): a system-tracked procedure that an agent *uses* to perform a specific kind of action.
Skills are how agents act in the polity — an agent without skills cannot perform actions; an action without a skill is captain-direct or otherwise outside the standard discipline.

Realizes the upstream notion of *skill* from [agential-orchestration-platform](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/) and the recipe-form discipline from [agent-skill-recipe-system](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/agent-skill-recipe-system/).

## What a skill is

A skill is:

- **A named procedure**, identified by a gerunding-verb-phrase slug (`writing-task-records`, `auditing-derivation-chain-governance`, `lifting-upstream-pattern-to-self-theory`).
- **A system record** — a `kind: skill` markdown record in `governance/skills/` (per the polity's directory taxonomy), carrying frontmatter (name, description) and a body (the recipe).
- **A recipe** in normal form: orient → act → verify → witness, 1-4 steps, bounded radius.
  (Per the upstream [agent-skill-recipe-system](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/agent-skill-recipe-system/_index.md) discipline.)
- **A capability claim** — when an office or agent declares `provides-skill: [skill-X]`, that's a system cell asserting the skill is held.

## Skill bridges agent to action

The full chain: an agent with skill $S$, using its [capabilities](capability.md), invokes [tools](tool.md) (scripts, runbooks, verbs, APIs) to produce [actions](action.md) of kind-$S$:

$$\text{agent (capabilities)} \;\xrightarrow{\text{has}}\; \text{skill} \;\xrightarrow{\text{invokes}}\; \text{tool} \;\xrightarrow{\text{effects}}\; \text{action}$$

Specifically:

- An agent's `provides-skill: [S]` cell says "this agent knows the recipe for $S$-actions."
- A workitem's `requires-skills: [S]` cell says "this workitem needs an $S$-action to be performed."
- Dispatch (per [eligibility-by-skills](../objects/eligibility-by-skills.md)) matches the two.
- The agent invokes the skill — runs its recipe — and the recipe's `act` slot calls one or more **tools**.
- The tool produces the system effect (the action).
- The skill's `witness` slot records the action.

Without skills, agents and actions don't connect cleanly.
Without tools, skills can only describe internal-capability work; most of what gets done in a polity goes through tools.

## Skill vs. verb

PyFARS has both [verbs](verb.md) and skills, with overlapping but distinct roles:

- **Verb**: a named operation of PyFARS-the-software, exposed via the CLI (and possibly MCP, FastAPI).
  Verbs are realization-level operations: they have argparse specs, runtime implementations, error codes.
- **Skill**: a named procedure that an agent uses to perform an action.
  Skills are system-level: they have substrate frontmatter, a recipe in markdown body, and they declare what kind of action they enable.

The two map: a skill *typically* invokes one or more verbs as its `act` slot.
A verb may be the leaf operation of multiple skills (e.g., `pyfars commit` may be invoked by both `committing-corpus-changes` skill and `recording-decision` skill).

When an agent attached via MCP performs an action, the chain is: - Agent decides which skill to invoke (or is dispatched a workitem with `requires-skills:`). - Agent invokes the skill's recipe. - Recipe's `act` slot calls a verb (or several). - Verb modifies substrate (the action). - Recipe's `witness` slot records the action.

## Skill recipe normal form

Per upstream, skills should be in recipe-normal-form: - 1-4 steps. - Each step is bounded and either directly executable or directly checkable. - Slots: orient, act, verify, witness.
Omissions must be witnessed elsewhere.

Most of PyFARS's existing skills (in `governance/skills/`) are *not* yet in recipe-normal-form — they're more elaborate, more discursive, sometimes essay-like.
Migrating them to normal form is ongoing work; new skills should be authored in normal form from the start.

## What this concept does not yet specify

- The complete skill inventory of PyFARS-the-package.
  The realization adds skills as polities need them; the inventory is open-ended.
- The discipline for *grants* of skills (e.g., a skill held by an office but exercisable by another office under delegation).
  Currently held vs. delegated is partly settled.
- The relationship to *runbooks* — a runbook is a composed procedure (multiple skill invocations sequenced); a skill is the leaf.
  The boundary is partly settled.
- Skill-bundle handling.
  Some polities may want named bundles of skills; the discipline for bundles vs. individual skills is open.
