# @emsenn/organizing

Organizing is the **social-scale reading of governing** — the settling of an open plurality of agents into one bounded, law-bearing collective (community → institution → polity).

It is the Gen-2 (inter-agent) lift of `@emsenn/animating` along the agency spiral: where animating glues three faculty-faces into one agent, organizing glues a **sheaf of agents** into one organization.
The gluing act is **adjudication** (the receiving dual of speaking): it holds many agents' contributions into one record-state under three disciplines — conflict held contested (Belnap), partial held open, accumulation monotone and converging — so H¹ over the social cover is the consensus cost (zero = coordination-free, non-zero = adjudication required).

## The Gen-2 boundary faces

Organizing's three Gen-2 boundary faces (one per axis):

| face | scale-1 analog | role in organizing |
|---|---|---|
| `@emsenn/socializing` | communicating (across) | the social field of agent stalks |
| `@emsenn/computing` | knowing (inside) | computable programs over agents |
| `@emsenn/gaming` | playing (outside) | concurrent-game strategies over agents |

The organization is the **global section** — the glued interior — of the sheaf over these three faces.

## The morphism surface (14 verbs)

| verb | what it does |
|---|---|
| `organize` | the one-call top: admit a plurality into a bounded collective |
| `assemble` | assemble an organization from three face-projections |
| `adjudicate` | hold many agents' contributions into one consensus record-state |
| `community` | declare a community: a set of agents with a shared social base |
| `institute` | institute a rule-structure over a community (office + role assignment) |
| `federate` | federate two communities under a shared governance protocol |
| `face` | declare one of the three Gen-2 boundary face attachments |
| `project` | project the organization along a face to the downstream faculty |
| `relating` | the organizational settling: knowledge-join the agents' world-models |
| `social-becoming` | the Lakota organizational becoming (iyokheya → wotakuye → wolakota) |
| `social-factor` | factor the organization along a Lakota organizational boundary |
| `office-eligibility` | determine which agents satisfy an office's eligibility criteria |
| `accounting-balance` | project the organization's accounting ledger balance |
| `accounting-utterances` | emit EAVT utterances from the accounting record |

## Usage

```ts
import { organizeAction, adjudicateAction, communityAction } from "@emsenn/organizing";

// community — declare a community of agents
const community = communityAction.run({ agents: [...] }, {});

// adjudicate — fold many agents' contributions into one consensus record
const org = adjudicateAction.run({ community, contributions: [...] }, {});
```

## Subpaths

```ts
import { ... } from "@emsenn/organizing";    // full surface
```

## RelMath Realization

Organizing's work-item dependency graphs can now be graded by the finite causal surface: `analysis.causal.settleCausalSet`, `analysis.causal.apexCount`, and the Myrheim-Meyer geometry/topology witness give exact order, apex, and obstruction reads.
Priority and risk event buckets can also be normalized with `probability.measureIsValuation`.
The strongest concrete follow-up is to attach these receipts to work/dependency and office-eligibility reports.
