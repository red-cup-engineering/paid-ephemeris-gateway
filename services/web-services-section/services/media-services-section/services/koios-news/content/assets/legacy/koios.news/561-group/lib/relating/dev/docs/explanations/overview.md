# Overview: what @emsenn/relating models

This is an explanation, not a tutorial.
It describes the domain the package operationalizes, the responsibility of each module subpath, how the subpaths depend on one another, and the mental model a reader needs before using any of the named exports.

## The domain

`@emsenn/relating` is the relational substrate, operationalized as one package.
It is a paraconsistent, transfinitely-valued linear logic of relations.
Three words in that sentence carry the whole model:

- Relational.
  The thing being computed over is a relation between terms - a cell `Cell = E x Pi x E` (subject, predicate, object).
  Nothing has a value on its own; values live on relations.
- Paraconsistent.
  A relation is not true-or-false.
  Its standing is a bilattice charge - a point with two axes (knowledge and truth).
  Contradiction is a representable value, not an error: a cell can be both affirmed and denied (absurd) and the engine keeps computing.
- Transfinitely-valued.
  Settling a body of evidence is a closure that runs to a fixed point, and that closure is indexed by ordinals - finite, omega, omega squared - so a settling that does not stabilize in finitely many steps still has a defined limit.

The one admission rule frames everything else: evidence enters only by articulating utterances.
There is no verb that admits a charge, a polarity, or a denial directly.
Charges, edges, sections, and contradictions are all derived by folding an utterance log through the descent `articulate -> predicate -> posit -> settle` into a frozen carrier, then reading the carrier's fixed-point sections.
If you want to change what the system believes, you add an utterance; you never write a charge.

## The mental model

1. You build utterances (the only input).
2. You `induce`/`extend` them into a frozen `MemeTopologyCarrier`.
  This runs the descent: articulate the marks, predicate them into cells, posit them into a valuation fiber, and settle that fiber to its fixed points under ordinal closure.
3. You read the carrier.
  Reads are pure projections of the four fixed-point sections (knowledge/truth, least/greatest); everything legible is a function of the settled carrier, never a side channel.

Exactness is a through-line invariant.
Distributions are histograms over a canonical support, spectra are exact polynomials, divergences are charges - not floats.
Where two things are genuinely incomparable, the package returns an explicit judgment object rather than collapsing to a number.

## The modules and what each owns

The former `meme-*` libraries are now realigned inside this one package, and the source tree is organized as the **category of relating** itself: a single descent spine

```
./articulating
  -> ./articulating/predicating
    -> ./articulating/predicating/positing
      -> ./articulating/predicating/positing/settling
```

plus two standalone representation boundaries, `./codecs` and `./holography`.
There is no longer a top-level `algebra`, `logic`, `topology`, `geometry`, or `analysis` directory: each former bucket has moved to the point on the spine that generates the structure it holds.
Each exported subpath is a categorical surface that names its own domain and codomain; the root package is reserved for the callable script-morphism surface.
A symbol becomes public only through the surface that states its real domain, codomain, closure role, read role, or boundary role, and when a logic or geometry is generated inside a morphism's codomain its public path lives under that morphism rather than under a standalone topic bucket.

### `./articulating` - the admission base

The base carriers of the category: marks, the token/claim positional primitives, the utterance (the ordered `(token, claim)` pair that is the sole admission unit), and carrier coincidence (the only place mark identity is witnessed).
This is the floor of the descent and the one input boundary - evidence enters here as utterances and nowhere else.

### `./articulating/predicating` - the predication objects

Predicating opens the predication category over the admission base.
This surface owns the predication cell `Cell = E x Pi x E` (the value-free oriented relation slot), the bilattice-relation object, coherence, and specialization - the objects a value will later be assigned to, carrying no charge themselves.

### Generated logics

Logical surfaces are pure consequence structures.
They are exported under the morphism that generates the carrier they reason over:

- `./articulating/predicating/typed-theory`: inference rules, derivations, typing judgments, and predicate words over predication base objects.
- `./articulating/predicating/logic`: consequence structure over the predication objects.
- `./articulating/predicating/positing/logic`: the bilattice linear connectives over charge values - fusion (tensor), residuum (implication), par, negation - and their consistency/residuation judgments.

### `./articulating/predicating/positing` - where values appear

Positing is the first morphism that places a charge anywhere.
This surface owns the bilattice charge value object (the `(for, against)` twist-product point) and the predication fiber algebra `A_p = (L x L)^(E x E)` over which charges live, together with the positing morphism itself - the knowledge-order least extension of a valuation by a datum.
The predicating cells carry no value; positing values them.

### `./articulating/predicating/positing/settling` - the inductive carrier and the settling engine

The center of the package, and the former `topology` bucket.
`induce`/`extend` fold an utterance log through the whole descent - articulate, predicate, posit, settle - into a frozen carrier; the section reads render any of the four fixed-point sections.
This subpath owns the curated app surface for the whole settling story: admission normalization, construction (presheaf/sheaf from valuation), the closure and ordinal-stage machinery, the four fixed-point extrema and the fixed-point gap, the section layer, and the charge-value boundary.

Two further engine surfaces hang off it:

- `./articulating/predicating/positing/settling/analysis` - the reads over a settled carrier (described below; also surfaced at the top-level alias `./analysis`).
- `./articulating/predicating/positing/settling/dynamics/substitution` - substitution dynamics (substitution rules, orbits, abelianization, gauge labelings, induced permutations); exact arithmetic crosses through `./codecs/exact-number`.

The deepest engine internals - coincidence booleans, carrier-assembly constructors, closure-engine internals, and set-encoding internals - are deliberately not package exports.
Needing one of them from outside the package is the signal that a carrier or morphism should be promoted to a real public subpath, not reached through a back channel.

### Generated geometries

- `./articulating/predicating/geometry/spatial`: exact arithmetic in real quadratic fields and one-dimensional cut-and-project schemes over Z^2.
  Quadratic rationals are the minimal coordinate system in which irrational slopes are exactly decidable.
- `./articulating/predicating/positing/settling/geometry/temporal`: the causal order of a settling.
  Time is the settling itself; space is the predication base.
  The causal order proves - does not interpret - that a settling has Lorentzian-like causal structure.

### Analysis - reads over settled carriers

The analytic reads take a settled carrier as input and compute the combinatorial Laplacian on the relation graph of a section: terms are vertices weighted by cell multiplicity, yielding exact harmonic modes, component count, characteristic polynomial, and spanning-tree count (Matrix-Tree).
They are exported both under the settling morphism that produces their input (`./articulating/predicating/positing/settling/analysis`) and at the top-level alias `./analysis`, whose read surfaces are:

- `./analysis/evidence` - exact charge histograms, evidence coordinates, informational horizon, entropy/mixedness, independence, and screening-off judgments.
- `./analysis/laplacian` - relation graphs, Laplacians, harmonic judgments, component counts, spectrum polynomials, and tree counts.
- `./analysis/spectral` - exact polynomial and matrix spectral reads.
- `./analysis/conservation` - the boundary operator and conservation judgments over oriented relation flows.
- `./analysis/differential` - measuring a subject against a descriptive control catalog, reading each norm as a bilattice charge rather than as pass/fail.

### `./codecs` - representation boundaries

Standalone (uses `node:path` only).
It is the codec between an addressable term and a byte-safe filesystem address/path: `termKey`, `sanitizeSegment`/ `desanitizeSegment`, `address`/`termOf`, `logPath`, and the namespace/compose/decompose helpers.
Carrier-bearing subpaths build on it:

- `./codecs/exact-number` - exact carrier numbers crossing to and from native JavaScript numbers and decimal strings.
- `./codecs/html` - the Semantic Hypertext Packet (SHP) codec, a carrier<->HTML holography projector (`project` writes cells to HTML, `markup` reads HTML back to charged cells, `htmlProjector` binds both).
- `./codecs/path/object/attribute/file/flatfile/serialization/...
  ` - the Curry-Howard/Yoneda codec tree from address through external data formats, including JSON, JSON Schema, JSONL, EAVT, Datom, Markdown, TOML, and Turtle leaves.

### `./holography` - the projection kernel

The substrate the codecs specialize.
A `Projector<T>` reads a boundary `Resource` (a path plus its content) into carried items of type `T` and writes them back; a type is DEFINED by these morphisms (Yoneda), not by a folder.
`restrict` composes a child whose recognition entails the parent's (`recognize_child = recognize_parent and local`, Curry-Howard directionality); `classify` derives a resource's most specific type.
The kernel imports nothing and does not name the relational carrier - a relational carrier is the natural `T`, but the kernel stays generic.

## How the modules depend on each other

Relative imports only - within the package, a module never imports `@emsenn/relating/*`, only sibling `.mjs` paths.
The dependency direction is the descent spine itself:

```
articulating            admission base (marks, token/claim, utterance); depends on nothing
  predicating       ->  predication objects (Cell = E x Pi x E), generated logics/geometry
    positing        ->  bilattice charge value, fiber algebra, the positing morphism
      settling      ->  closure, ordinal stages, fixed points, cohomology, sections
        analysis    ->  reads over the settled carrier
        geometry    ->  the temporal (causal) order of the settled carrier
holography              imports nothing (generic kernel)
codecs                  standalone path/serialization tree; ./codecs/html and the
                        EAVT/Datom leaves build on holography as needed
```

The direction is the meaning: admission before relation slots before values before closure, and only then the geometry and analysis that read a settled carrier.
Structure precedes consequence precedes settling precedes the reads.

## Why "no I/O it was not handed"

The package performs no I/O it was not given. fetch, clock, and fs all enter as values.
A holography `Resource` is a path plus already-loaded content - the projector does not open files.
The codec computes a path string; it does not write to it.
This is what makes a settling a pure function of its utterance log, and it is why the model can promise that every legible read is a function of the frozen carrier.
