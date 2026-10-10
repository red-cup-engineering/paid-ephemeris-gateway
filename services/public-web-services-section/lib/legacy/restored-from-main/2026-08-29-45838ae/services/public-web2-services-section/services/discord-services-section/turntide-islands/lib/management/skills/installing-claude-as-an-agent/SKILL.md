---
name: installing-claude-as-an-agent
description: Installs one office into one node of the tree as a subagent — a single generated file at <node>/.claude/agents/<office-id>.md whose frontmatter and body are a deterministic projection of the office's record, with the skills realizing the office's duties projected in full into the body. Use when a node's sessions must be able to DELEGATE to an office rather than step into it, or when an office's skills must reach an agent without entering the node's shared .claude/skills/ registry.
---

# installing-claude-as-an-agent

Installs one **office** into one **node** of the tree as a **subagent**, so a Claude session opened at that node can delegate work to that office — the office arriving with exactly the skills its record holds, and the node's shared skill registry receiving nothing.

This is the sibling of **installing-claude-as-an-office**, and the difference is the whole point: that skill seats an office as the identity a session *steps into* (the node's CLAUDE.md, the node's skills). This one seats an office as a colleague a session *hands work to*.

## Skill contract (Hoare triple)

This skill is a **process** (closure-kind, per the firm's nuclear-quartet theory).
Its body owes the process runtime contract:

> MUST contain no conditional and produce identical output for identical input; if the world is not as assumed, fail loudly rather than branch.

- **Precondition (P):** The named office resolves from where you stand and its record is an office — a frontmatter record declaring `type: office`, or a canonical record whose `$id` is `emsenn/office/<id>` and whose `kind` is `office`; the node exists; every duty the office records resolves to a duty in a pool; every skill those duties name (and every skill the record's `provides-skill` names, and every skill seated under the office) resolves to a skill directory agreeing with its own `name:`; the office holds at least one skill; no agent file of this office's name exists at the node unless this mechanism installed it.
- **Postcondition (Q):** `<node>/.claude/agents/<office-id>.md` is byte-identical to the deterministic projection of the office's record and skills, and the node's agent manifest records the office as installed.
- **Result:** a success (a settled outcome) or a first-class error —
  `⊥` absence (the office has no skills; a duty or skill resolves to nothing) or
  `⊤` contradiction (a name resolves to two skills; an agent file of this name
  exists that this mechanism does not answer for). Errors are data to route,
  not exceptions to throw.

## Why the skills project into the body

The harness has **one shared skill registry per node**. Anything seated in `<node>/.claude/skills/` puts its description into the *main* session's context — the exact clutter this skill exists to avoid — and the one flag that removes a skill from the main session's view, `disable-model-invocation: true`, removes it from **every agent too**: it blocks Skill-tool invocation everywhere and blocks preloading, because preloading draws from the same set of skills the model can invoke. Per-agent skill *registration* does not exist in the harness.

What does exist is preloading — an agent whose context holds the full skill text from its first turn. So the projection does the preload by generation: each skill's `SKILL.md` body is written, in full, into the agent's body. Nothing registers; nothing clutters; the agent starts already holding what the office records.

**Scripts are not copied.** A skill's text names its scripts by repository path, and the agent runs them where they seat, from the repository root. This is the one place this skill differs from its sibling on purpose: an officer *occupies* a node and carries its tools in; an agent *works in the same repository* the pools live in, so copying scripts would create a second seat for the same tool.

## What it moves

**The record → the frontmatter.** `name:` is the office id. `description:` — what tells a delegating session when to hand work here — is the record's own `description:` (frontmatter office) or, for a canonical record, the first sentence of `normative-structure` plus the duty side of the deontic profile. A canonical record may also carry an **`x-agent`** block — `{"model", "effort", "maxTurns", "tools"}` — projected into the agent's frontmatter, so an office whose work is mechanical can be flowed to a lighter model by its own record. Extension-prefixed because the harness is not doctrine; absent keys inherit the session's defaults. Nothing is authored at install time; a description that reads badly, or a model tier that fits badly, is corrected in the record, then reinstalled.

**The record → the body.** The office speaking: its normative structure, its position (part-of, reports-to, peers, jurisdiction), its deontic profile, its duties and the skills that discharge them, and what remains unrealized. A frontmatter office's body is its CLAUDE.md (carried) or its record body — the same rule as its sibling skill.

**The skills → the body, whole.** Found exactly as the sibling skill finds them: skills seated under the office itself, skills named by the record's `provides-skill`, and skills realizing every duty in `bears-duty` (canonical) or `duties:` (frontmatter), duties resolving nearest-from-the-office, skills nearest-from-the-duty.

## Run it

```sh
node lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/installing-claude-as-an-agent/scripts/install-claude-as-an-agent.js \
  <office> <node>
```

For example, seating the module developer as an agent at the repo root:

```sh
node .../install-claude-as-an-agent.js module-developer .
```

Options: `--list` (name what it would install, install nothing), `--clean` (remove only what this mechanism installed), `--reinstall`, `--dry-run`, `--from <path>` (where you stand, default the working directory), `--root <repo-root>`.

The office may be named by id or by path; the nearest office of that id wins, measured from where you stand, exactly as in installing-claude-as-an-office. The node is a path, defaulting to the repo root. Installs are recorded in `<node>/.claude/.claude-agent-manifest` so that clean is exact.

## What it refuses, and why that is the skill

- **A record that isn't an office** — refused. An agent generated from an arbitrary file is an agent no office answers for.
- **An office with no skills** — refused. An agent holding nothing can discharge nothing; delegation to it is a claim, not work.
- **A duty that seats in no pool; a skill that seats nowhere; a name resolving to two skills; a skill whose `name:` and directory disagree** — refused, for the sibling skill's reasons exactly.
- **An agent file of this name that this mechanism did not install** — refused. It has an author whose reasoning is in no office record, and overwriting it would discard that reasoning silently.

The question is always asked of the **offices**, never of the seated file: `.claude/agents/` is output. Hand-editing an installed agent cannot provoke a refusal — reinstalling over the edit is the correction, which is why the edit belongs in the record.

## When NOT to use

- Not for making a node's sessions *be* an office — that is **installing-claude-as-an-office**. A node has one CLAUDE.md and many possible agents; the two skills install the two different relations.
- Not for authoring an office, a duty, or a skill — this installs what already exists.
- Not for reaching into `.claude/agents/` to fix an agent. It is output: edit the office's record or its skills and reinstall.
