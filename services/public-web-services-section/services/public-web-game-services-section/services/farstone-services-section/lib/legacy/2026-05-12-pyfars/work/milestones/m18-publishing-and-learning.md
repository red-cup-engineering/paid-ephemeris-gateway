---
title: "M18 — Publishing & Continuous Learning (Closing the Operations Loop)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m4-memory-feedback, m5-agential-self-generation, m17-561-productivity-stack]
goals:
  - observation-to-instinct-to-skill-to-tool-to-hook-promotion-pipeline
  - algebraic-learning-calculus-tier-2-models
  - captain-reviews-promotion-via-governance-app
  - hugo-style-publishing-from-substrate-fibers
  - persona-agents-have-publication-channels
  - rss-and-activitypub-feeds
theory-basis: [consolidation-as-settlement, agential-self-generation, public-projection, operations-loop, cheapest-sufficient-computation-tier]
prior-art: [pypredcomp/docs/dev/milestones/v0.9-publishing-and-learning.md]
cites-objects:
  - pyfars/objects/observation-cell.md
  - pyfars/objects/instinct-cell.md
  - pyfars/objects/skill-record.md
  - pyfars/objects/jsonl-event-log.md
  - pyfars/objects/public-fiber.md
  - pyfars/objects/polity-homepage.md
cites-morphisms:
  - pyfars/morphisms/consolidating.md
  - pyfars/morphisms/rendering.md
  - pyfars/morphisms/witnessing-completion.md
cites-claims:
  - pyfars/claims/substrate-purity.md
  - pyfars/claims/markdown-as-projection.md
  - pyfars/claims/homepage-derives-from-public-fiber.md
backing-gaps:
  - pyfars/objects/promotion-rung.md (NOT YET AUTHORED — five-rung observation→instinct→skill→tool→hook ladder)
  - pyfars/morphisms/promoting-rung.md (NOT YET AUTHORED — captain-reviewed promotion morphism)
  - pyfars/objects/tier-2-model-record.md (NOT YET AUTHORED — algebraic-learning-calculus model artefact)
  - pyfars/objects/decision-forest-model.md (NOT YET AUTHORED — Tier-2 model family)
  - pyfars/objects/markov-chain-model.md (NOT YET AUTHORED — Tier-2 model family)
  - pyfars/objects/publication-channel.md (NOT YET AUTHORED — RSS 2.0 / ActivityPub feed projector)
  - pyfars/morphisms/rendering-rss-feed.md (NOT YET AUTHORED)
  - pyfars/morphisms/rendering-activitypub-actor.md (NOT YET AUTHORED)
  - pyfars/claims/retraction-vector-determinism.md (NOT YET AUTHORED — retraction-vectors satisfy replay-determinism per M18 acceptance)
acceptance: "End-to-end pipeline observation → instinct → skill → tool → hook is operational, with captain review at each step visible in the governance-app review queue. At least one observed Tier-3 (LLM-dispatched) behaviour is promoted through the algebraic-learning-calculus path to a Tier-2 model artefact under captain review; subsequent dispatches against the same office × task shape route to Tier 2 instead of Tier 3 (cheaper). A persona's site is live and reachable; RSS feed validates per RSS 2.0; a stock Mastodon user can follow the persona via ActivityPub and receive new posts."
---

# M18 — Publishing & Continuous Learning

After [M4](m4-memory-feedback.md) wires observation → instinct, [M5](m5-agential-self-generation.md) makes governance substrate-writeable, and [M17](m17-561-productivity-stack.md) gives the captain UI surface, M18 closes the operations loop:

- **Continuous learning** — the promotion ladder: observation → instinct → skill → tool → hook.
  Plus a Tier-2 *training* surface that produces model records the engine's existing endpoint-routing consumes for cheaper-sufficient dispatch.
- **Publishing** — persona-agents have live publication channels; Hugo-style site generation from substrate fibers; RSS and ActivityPub feeds.

The two surfaces ship together because they're entangled: what's learned becomes what's published (a persona publishes its newly-promoted skills); what's published becomes what's learned-against (subscriber feedback feeds the next observation cycle).

## What's built

### Promotion ladder (observation → instinct → skill → tool → hook)

Each rung is a substrate-record kind.
Promotion is a closure-rule firing that *settles* the next-rung record from the previous-rung pattern; each settlement requires captain ratification through the [M17](m17-561-productivity-stack.md) governance-app before taking effect.

**Observation** ([predicated-work `observation`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/observation.md)).
Already exists from [M4](m4-memory-feedback.md): every dispatch produces observation cells with `(workitem, dispatchable, outcome, witness-chain)`.
M18 doesn't change observation-record shape; it consumes them.

**Instinct.** A *pattern over observations* — when N observations of office × task shape Y produce outcome Z, an instinct cell `(office:foo, instinct, "shape Y → Z", t, derived-from: [obs1, obs2, ...])
` settles.
Already partially present in M4's instinct surface; M18 makes the promotion closure rule explicit.

**Skill** ([governance/skills](../../governance/skills/)).
When an instinct stabilises (M observations confirm; no contradicting observation in the freshness window) AND the captain ratifies via the governance-app, a skill record is *authored* (literally a new `governance/skills/<slug>.md` file written via the substrate-writability path [M5](m5-agential-self-generation.md) provides).
The skill is dispatchable on the next tick.

**Tool.** A skill that has been used N times successfully across distinct workitems graduates to a *tool* — a fully-typed substrate operation that can be invoked without LLM dispatch.
Tool records carry execution semantics (a Python callable in the package; or a Modbus/MQTT command sequence for [M16](m16-industrial-control.md) actuation tools; or a closure-rule template for substrate-only tools).
The dispatch graph routes tool-eligible workitems to tools (cheaper than skills) before falling back to skills.

**Hook.** A tool that fires automatically on a substrate-state pattern, without an explicit workitem.
Hooks are the most-promoted form: pre-existing trigger pattern → tool fires → witness emitted.
Captain ratification for hook-promotion is the highest-bar step; an autonomously-firing hook is a small piece of the substrate operating without per-tick captain attention.

### Algebraic learning calculus — Tier-2 model training

Per the [`cheapest-sufficient-computation-tier`](../../concepts/) discipline (carried forward from [M5](m5-agential-self-generation.md)/M8 endpoint-routing): some patterns warrant a *trained model* rather than per-dispatch LLM call.
M18 ships the training surface that produces these model records.

**Training-event records** carry: source corpus (substrate cells the training read), hyperparameters, model-family (decision-forest, Markov chain — two families ship in M18; more later), produced-weights cell (Ed25519-signed binary blob with substrate provenance), training-witness, conformance-vector results.

**Two model families:**

- **Decision-forest** — for classification-shaped problems (which office should handle this workitem? which template fits this email?).
  Trains over historical dispatch outcomes.
- **Markov chain** — for sequence-shaped problems (what step typically follows in this workflow? what's the expected duration distribution?).

**Algebraic learning calculus** — training is *predication settling* over evidence cells, not arbitrary numerical optimisation.
The training operation is itself a closure-rule firing: rule premises are evidence-shape cells, conclusion is the model-weights cell.
This means: training is replayable (same evidence + hyperparameters → byte-identical weights, by deterministic construction), retraction-aware (retracting an evidence cell invalidates every model whose `derived_from` chain cites it), and federation-safe (model records federate via [M6](m6-federation.md)'s cellwise merge).

**Cheapest-sufficient progression.** When a Tier-3 (LLM-dispatched) behaviour produces consistent observations, the algebraic-learning-calculus path proposes a Tier-2 model promotion.
Captain review through the governance-app. On ratification, the dispatch graph's endpoint-router starts routing matching workitems to the Tier-2 model (cheaper) before falling back to Tier 3 (LLM).
Cost-per-tick drops; correctness is monitored (anomaly cells surface if the Tier-2 dispatches start producing $\top$).

### Hugo-style publishing from substrate fibers

A site-generator that reads substrate fibers (concepts, theorems, narratives, persona-content) and produces a static-website tree.
Templates are themselves substrate cells: `(template:concept, body, "<jinja-or-tera-template>", t)`.
This means:

- Site rebuild is a closure-rule firing — template + content → rendered HTML.
- Template changes are substrate witnesses (auditable site evolution).
- Per-persona templating: a persona has a `publication-template` cell pointing to its template-record.

**Site shapes shipped:** - Polity homepage (561.group) — currently hand-authored static content; M18 makes it substrate-derived. - Per-persona blog/portfolio. - Per-theory monograph (compose theory's narratives + concepts + theorems into a single readable document — used by the [M17](m17-561-productivity-stack.md) knowledge app's monograph-builder).

### Persona-agents with publication channels

A *persona* (distinct from a *personnel* — a persona is a publishable identity, not necessarily a human) carries a publication-channel record with: editorial state (what's published, what's draft), publication schedule, subscriber list, federation policy.

The captain's `morgan` persona publishes engineering and research; the polity's `561-group` persona publishes governance announcements; specific projects can have their own personas (a `pyfars-development` persona publishing release notes).

**Editorial flow:** captain (or persona-agent) drafts in [M17](m17-561-productivity-stack.md)'s knowledge-app → marks as ready-to-publish → governance-app ratifies (per persona-policy: some personas auto-publish, others require captain attestation) → publish-witness emitted → site rebuild fires → feeds update.

### RSS 2.0 and ActivityPub feeds

Each persona's publication channel exposes:

- **RSS 2.0 feed** — validating per the RSS 2.0 spec.
  Standard feed-readers (Feedly, Inoreader, terminal readers) consume directly.
- **ActivityPub Actor** — implementing enough of the ActivityPub spec that a stock Mastodon user can follow the persona, receive `Note`/`Article` activities, and reply.
  The persona-agent doesn't necessarily reply (replies are a separate decision; M18 ships read-side federation, write-side responses are post-M18).

The federation discipline: an ActivityPub follow from a stock Mastodon instance creates a *peer record* in the substrate (per [M7](m7-boundary-handedness-and-outbound-endpoints.md) boundary algebra) with handedness `inbound-only` (we publish, they consume; we don't trust their writes by default).
This is how PyFARS speaks to the broader fediverse without breaking its substrate-purity discipline.

## What M18 does NOT claim

- **Not autonomous self-improvement.** Each promotion goes through captain review via the governance-app. The system observes and proposes; the captain ratifies.
  The captain remains the authority over what enters the operative substrate.
- **Not full publishing platform.** M18 ships site-generation, RSS, ActivityPub.
  It does not ship a comments system, recommendations engine, or content moderation.
  Post-M18 if/when needed.
- **Not retroactive learning.** The promotion pipeline starts from observations going forward.
  Past M4 observations feed in; pre-M4 substrate state isn't backfilled.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `observation-to-instinct-to-skill-to-tool-to-hook-promotion-pipeline` | Five-rung ladder; each promotion is a closure-rule firing requiring governance-app ratification | open |
| `algebraic-learning-calculus-tier-2-models` | Training-event records; decision-forest + Markov-chain families; replayable, retraction-aware, federation-safe model records | open |
| `captain-reviews-promotion-via-governance-app` | Each promotion appears in M17 governance-app review queue; captain ratifies or rejects-with-reason | open |
| `hugo-style-publishing-from-substrate-fibers` | Site-generator reading substrate; templates as substrate cells; polity homepage + per-persona sites + per-theory monographs | open |
| `persona-agents-have-publication-channels` | Persona records with editorial state, publication schedule, subscriber list, per-persona templates | open |
| `rss-and-activitypub-feeds` | RSS 2.0 feed validating against the spec; ActivityPub Actor that stock Mastodon users can follow | open |

## Done when

End-to-end: a Tier-3 behaviour (LLM-dispatched workitem) observed N times, promoted through the pipeline to a Tier-2 model under captain review, dispatch graph starts routing to Tier 2 instead of Tier 3 for matching workitems.
A persona's site is live; RSS validates; a stock Mastodon user follows the persona and receives new posts.
The operations loop is substrate-resident end-to-end.

**Replay determinism vector:** a training event run twice from a clean store on the same corpus + hyperparameters produces the same weights-cell SHA-256.

**Retraction vector:** retracting a model invalidates every settled cell whose `derived_from` chain includes its weights; the dispatch scheduler stops selecting it.

## Theoretical shape

**Continuous learning as substrate-settlement.** Per [`consolidation-as-settlement`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/consolidation-as-settlement.md), instinct cells aren't authored — they're *settled* from observations.
M18 extends: skill cells settle from instinct patterns; tool cells settle from skill patterns; hook cells settle from tool patterns.
The whole promotion pipeline is closure-rule firing, not separate code paths.
Same for Tier-2 model training: weights settle from evidence-cells via the algebraic learning calculus.

**Publishing as public-projection at scale.** Each persona's publication channel is a [`public-projection`](../../concepts/public-projection.md): persona's authored cells → public-fiber → HTTP/RSS/ActivityPub.
Same algebra as polity-homepage rendering, specialised to a single persona's content cone.

**The operations loop closes here.** Per [`operations-loop`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/operations-loop.md): plan → execution → observation → finding → adjustment → next plan.
M18 is the *adjustment* end: findings (from M4 + [M17](m17-561-productivity-stack.md) review-app) feed adjustment proposals (skills, tools, hooks, models); captain ratification effects them; next plan reads the adjusted substrate.

## Related

- [Roadmap](roadmap.md)
- [M4 — Memory and Session Feedback](m4-memory-feedback.md), [M5 — Agential Self-Generation](m5-agential-self-generation.md), [M17 — 561 Productivity Stack](m17-561-productivity-stack.md) — prerequisites
- [M19 — Self-Developing PyFARS](m19-self-developing-pyfars.md) — capstone depending on M18 closing the loop
