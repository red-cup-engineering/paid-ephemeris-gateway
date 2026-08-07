# @emsenn/playing

Playing is the **outside boundary faculty** over `@emsenn/relating` — the *-autonomous DUALITY and CUT of the meme carrier.

Where `@emsenn/communicating` is the meme MONOID (meaning, truth order ≤_t) and `@emsenn/knowing` is the meme COMONAD (knowledge order ≤_k), playing is the meme's `*`-autonomous duality: the interaction of a Design with its dual opponent closes the game, giving the cut law of linear logic.
This is the corpus's spiral hinge: convergence to ⊤ = gluing the game = closing animating's turn.

## The one carrier

A **Design** is playing's primary carrier: a partial charge-valuation over a locus tree (`designing/design.schema.json`).
Loci are address-paths into the tree; charges (`potential`, `active`, `stable`, `absurd`) record the Proponent/Opponent/Daimon/none stance at each node.
A Design is playing's meme analog: a partial proof-forest.

The **Behaviour** is the bi-orthogonal closure of a set of Designs — the smallest saturated strategy closed under the cut.
The **Interaction** is the binary cut of two dual Designs — the knowledge-join of their overlapping loci (Girard's cut law).

## The morphism surface (37 verbs)

| subpath | what it covers |
|---|---|
| `@emsenn/playing` | Structuring carriers, encoding, expressing (CHL terms over Designs) |
| `@emsenn/playing/ludics` | Core ludics: `design`, `dualize`, `cut`, `interact`, `behave`, `normalize`, `orthogonal`, `compose`, `copycat`, `incarnate`, `fax`, `fax-law`, `identity-law`, `internal-completeness` |
| `@emsenn/playing/structuring` | Design topology: `focus`, `focusing-duality`, `locativity`, `delocate`, `close`, `coherent` |
| `@emsenn/playing/running` | Game-running: `superpose`, `chronicles`, `chronicle-convergence`, `classify-fragment`, `in-fragment`, `fragments` |
| `@emsenn/playing/encoding` | Codecs: Design ↔ JSON, Locus ↔ address-array; `formula`, `session`, `session-compat`, `dual-prop`, `dual-session`, `embed`, `embeddings`, `proves`, `cut-elimination`, `design-leq`, `propose`, `negate-behaviour`, `dual-behaviour` |

`@emsenn/playing/ludics` is the import recommended for downstream packages (gaming, computing) that build over playing's proof-engine without needing the full surface.

## Usage

```ts
import { designAction, dualizeAction, interactAction, cutAction } from "@emsenn/playing/ludics";
import { Design, Locus } from "@emsenn/playing";

// A Design: one potential locus (the root)
const d: Design = { entries: [{ locusKey: "", charge: "potential" }] };

// Dualize — flip Proponent/Opponent polarity
const dPerp = dualizeAction.run(d, {});

// Cut — the knowledge-join at shared loci
const interaction = interactAction.run({ left: d, right: dPerp }, {});
```

## Subpaths

```ts
import { ... } from "@emsenn/playing";          // full surface + carriers
import { ... } from "@emsenn/playing/ludics";    // core cut/interact/normalize
import { ... } from "@emsenn/playing/structuring"; // Design topology
import { ... } from "@emsenn/playing/running";   // game chronicles
import { ... } from "@emsenn/playing/encoding";  // Design ↔ JSON codecs
```

## RelMath Realization

Playing's chronicles and interaction traces have a natural finite-causal reading: `analysis.causal.settleCausalSet` distinguishes timelike play sequences from spacelike simultaneous loci, while `probability.markovStationaryIsClosureFixpoint` can witness stable strategy-state loops.
The strongest concrete follow-up is to add these receipts to `@emsenn/playing/running` chronicle reads without changing the core ludics cut carrier.
