---
title: "Design the invocation-to-observation projector"
type: task
area: engineering
status: open
horizon: soon
milestone: m4-memory-feedback
goal: observation-cells-from-invocations
depends-on: [emit-session-open-and-close-witnesses]
requires-capabilities: [projector-framework, observation-design]
theory-basis: [observation, observation-fiber-isolation, projector-framework-counit]
---


## Description

Specify a projector that takes a `runtime.agent.
InvocationResult` (the current dataclass returned by the agent invocation node) and projects it into a set of substrate [observation](../../observations/_index.md) records.
The projector follows the projector-framework counit law: re-rendering the projected observations into an `InvocationResult`-shaped dict matches the original up to canonical form.

Standard observation kinds emitted per invocation:

- `latency-ms` (scale: `ratio`)
- `tokens-in` (scale: `ratio`)
- `tokens-out` (scale: `ratio`)
- `outcome` (scale: `nominal`; values: `success`, `error`, `timeout`, `rate-limited`)

Optional observation kinds (emitted when their measurement methods are available):

- `quality-score` (scale: per measurement method's declaration)
- `cost-usd` (scale: `ratio`)

The projector produces, for each observation kind, an observation record with:

- `(observation, observes, <dispatchable-slug>) = T`
- `(observation, observed-at, <ISO-timestamp>) = T`
- `(observation, method, <method-slug>) = T`
- `(observation, value, <value>) = T`
- `(observation, baseline, <baseline-or-bot>) = T`
- `(observation, scale, <stevens-scale>) = T`
- `(observation, in-session, <session-id>) = T`
- `(observation, of-invocation, <invocation-id>) = T`

The design document goes at `work/specs/invocation-observation-projector.md`.

## Acceptance

- [ ] A spec exists at `work/specs/invocation-observation-projector.md` describing the projector's input shape, output cells, scale assignments, and counit-law verification.
- [ ] The spec names the canonical observation location (`<substrate-root>/observations/<session-id>/<observation-id>.md`) and how it interacts with the session-bound query path.
- [ ] The spec includes worked examples for: success invocation, error invocation, timeout, rate-limited.
- [ ] Counit verification: re-rendering observation set into invocation-result form is documented as a property test.
- [ ] No fiber pollution: the spec confirms the dispatchable's frontmatter is never modified by observation emission.

## Progress cells

*(empty — task not yet started)*
