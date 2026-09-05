---
title: "New skill records dispatchable next tick"
type: goal
milestone: m5-agential-self-generation
status: open
horizon: later
theory-basis: [agential-self-generation, projector-framework-counit, recurrent-practice]
tasks:
  - confirm-projector-rebuilds-store-on-each-tick
  - test-mid-tick-skill-authorship-and-next-tick-dispatch
  - document-skill-authorship-mid-session-as-substrate-norm
---


After this goal, an agent that authors a new `governance/skills/<gerund-phrase>.md` record during a tick has that skill loaded by the next tick's projector and visible to eligibility rules — without any Python restart, code change, or manual reload.
This is the substrate-writable end of agential self-generation: layer 3 (behavior) is editable by the system that ticks within it.

## Why

[M5](../milestones/m5-agential-self-generation.md)'s acceptance is exactly this: "An agent completing a workitem can write a new skill record to the substrate and that skill is dispatched on the next tick without any Python restart or code change."
This goal is the load-bearing path for that acceptance.

The good news: PyFARS's existing projector framework already supports per-tick substrate reloads — the [tick](../recurrent-practices/tick.md)'s boot phase projects the substrate fresh each cycle.
So the *infrastructure* already exists.
What this goal does is **verify** the property end-to-end, **document** it as substrate norm, and add a regression test so future refactoring doesn't break it.

## Theory grounding

**1.
Agential self-generation** ([Charter C3](../../governance/charter.md); [`flatfile-agentic-resource-system/_index.md`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md)).
The polity's machinery — agents, skills, runbooks, governance rules — is **substrate content**.
An agent ticking within the polity can extend the polity's capabilities by editing substrate records. **The closure of this loop is what distinguishes a self-generating polity from an externally-extended platform.**

**2.
Projector counit law** ([`flatfile-agentic-resource-system/concepts/projector-framework`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/) — when authored).
Each tick's boot projects substrate → store; the counit law guarantees that projecting then re-rendering is the identity (modulo canonical form). **A new skill record's content thus appears in the store with the same fidelity as authored skills.** No special-case handling for "new" skills; they're indistinguishable from "existing" once projected.

**3.
Tick-as-iteration** ([`flatfile-agentic-resource-system/concepts/tick-as-iteration`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/tick-as-iteration.md)).
Each [tick](../recurrent-practices/tick.md) is one iteration of the closure-rule system over the substrate.
The system's input is the substrate state at boot; its output is the updated substrate state at halt. **A skill authored mid-tick lands in the substrate; the next tick reads the updated substrate.** The cycle-boundary semantics of the tick practice is what makes "new this tick → live next tick" the natural cadence, not an exceptional case.

### Design constraints from this grounding

- **No mid-tick hot-reload.** A skill authored during tick N is NOT live during tick N — it's live starting tick N+1.
  This is what preserves replay-determinism: tick N's behavior is determined by the substrate at boot of tick N.
  Authoring writes a *witness* (a substrate increment); the next boot reads the witnessed state.
- **The path to authoring a skill is substrate-write, not API call.** The agent writes `governance/skills/<gerund-phrase>.md`; that's it.
  No `pyfars register-skill` command, no API endpoint.
  The boot projector is the only thing that reads the file system; it picks up the new skill on the next boot.
- **A new skill's frontmatter must validate.** If the new skill record is malformed (missing required fields, invalid type), the boot projector emits a $\top$ cell on the skill's predicate; the dispatch graph treats malformed-skill as ineligible.
  Per [`anomaly-surfacing-via-contradiction-cells`](anomaly-surfacing-via-contradiction-cells.md), the $\top$ surfaces as a queued review-workitem.

## Acceptance

- [ ] Confirmed-by-test: a skill record authored mid-tick is loaded by the next tick's projector.
  (May already pass; verify and add a regression test.)
- [ ] A test at `tests/test_substrate_writable_skills.py`: write a `governance/skills/<test-slug>.md` file mid-tick, run the next tick, observe the new skill in the store and (if a matching workitem exists) in the dispatch graph's eligibility output.
- [ ] No projector code-changes required to load the new skill — it's a regression test against the existing infrastructure.
- [ ] Documented in [`prose/explanation/`](../../prose/explanation/) (or a new explanation note): "How an agent authors a new skill mid-session", linking to the test as the executable proof.
- [ ] A new [norm](../../governance/norms/_index.md) record at [`governance/norms/skills-authored-this-tick-live-next-tick.md`](../../governance/norms/) formalizes the cadence so federated peers know to expect it.
