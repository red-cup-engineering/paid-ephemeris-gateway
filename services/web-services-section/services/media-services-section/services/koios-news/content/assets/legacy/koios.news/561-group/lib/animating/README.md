# @emsenn/animating

Animating is the agency reading of `@emsenn/relating`: one settling descent read as becoming, doing, working, and governing, then glued into an interior agent that can perceive and act.

It is not endomorphic and not a single morphism.
It traverses the four relating closure regimes as a descent through four agency stages:

| relating closure | void-math object | agency stage | agency face |
|---|---|---|---|
| aperiodic | cell | becoming | animate |
| transfinite | fiber | doing | agential |
| Scott-continuous | charged presheaf | working | agentic |
| strict/finite | glued sheaf | governing | individual |

The bottom codomain is the interior agent: a glued individual sheaf that can be read as a `perceive(input) -> act(output)` loop made of perception, action, and goal.
The individual is settled below and open above: it re-seeds the next-scale spiral through gaming, computing, socializing, and organizing.

## Carriers

Carriers are single-source TypeBox declarations registered through Relating's category kernel.
There is no package-local schema codegen step.

The key public carriers include:

- `animating/face` - a boundary-face local section over communicating, knowing, or playing
- `animating/boundary-projection` - the holographic projection of an agent through its faces
- `animating/becoming/animate` - the void/mark read as the first capacity to sense
- `animating/becoming/doing/agential` - a fiber: a sensing-capable node in a goal-directed structure
- `animating/becoming/doing/working/agentic` - a charged presheaf: a goal-bearing perceiver
- `animating/becoming/doing/working/governing/individual` - the glued sheaf: the full agent

## Actions

Each action is a Relating action over those carriers, so CLI, OpenAPI, MCP, and web projections come from the shared Relating boundary machinery.

| verb | stage | what it does |
|---|---|---|
| `animate` | becoming | animate a void mark into a sense-capable cell |
| `prehend` | doing | fold a fiber into a sensing node |
| `perceive` | doing -> working | project input into the agent's world-model |
| `act` | working | execute one perceive-to-act cycle |
| `factor` | working | factor a face's act into locution, illocution, and perlocution |
| `glue` | governing | glue the three faculty-face projections into one individual |
| `face` | governing | settle one faculty membrane into its boundary face |
| `project` | governing | project the individual to its holographic boundary |
| `reseed` | spiral | re-seed the individual into the next spiral scale |

## Usage

```ts
import { actAction, animateAction, perceiveAction } from "@emsenn/animating";

const agent = await animateAction.run("my-agent", {});
const perceived = await perceiveAction.run({ agent, input: "signal" }, {});
const result = await actAction.run({ agent, input: "signal" }, {});
```

## Subpaths

```ts
import { glue } from "@emsenn/animating";
import { animate } from "@emsenn/animating/becoming";
import { prehend } from "@emsenn/animating/becoming/doing";
import { labor } from "@emsenn/animating/becoming/doing/working";
import { buildAgent } from "@emsenn/animating/becoming/doing/working/governing";
```

## RelMath Realization

Animating can now grade perception/action/labor traces with finite RelMath receipts.
The `labor` reading now exposes `cohomology`, a normalized `cohomologyTerms.laplacian` receipt over the generated working predication field, so the Scott-continuous working stage carries its finite H0/H1 ranks, vanishing witness, and Laplacian rank identity as public data.
`analysis.causal.settleCausalSet` and the probability RMN catalog remain available for richer event-order and stochastic operating-loop readings.
