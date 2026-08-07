# Category of Relating: Module Allocation Map

This records the reallocation of the package around the category of `relating` — **a migration that is now complete**.
The realized source tree is the descent spine `articulating -> predicating -> positing -> settling` (with `codecs` and `holography` as standalone boundaries); the former `algebra`, `logic`, `topology`, `geometry`, and `analysis` top-level directories no longer exist.
What follows is the rationale for that structure and the design rules that keep it honest, not a list of pending moves.
Note that the interim proposal recorded below once named the post-`algebra` layers `topology/logic/geometry/analysis`; the implementation chose the verb-spine names (`articulating/predicating/positing/settling`) instead, and those verb names are the ones the export map now uses.

The package-design rules these specialize are the general category-theoretic Node-packaging rules: a public path must name an actual categorical object, morphism layer, generated structure, or representation boundary; arbitrary runtime data may live only inside a `Mark` or at a representation boundary; and every public morphism must normalize back to `Mark -> Utterance -> articulate`.

The package is no longer named `@emsenn/relationality`; its public package identity is `@emsenn/relating`.
That rename is not branding.
It reflects the mathematical object the package is trying to implement: the category whose base object is `Mark`, whose base admission carrier is `Utterance = (Token, Claim)`, and whose base morphism is `articulate`.

Every exported class or function should eventually answer three questions:

- What is its domain?
- What is its codomain?
- How does it normalize back to Mark/Utterance/articulate?

If a symbol cannot answer those questions, it is probably implementation furniture, a representation boundary, or in the wrong module.

The guide's free-data rules are especially strict here: arbitrary runtime data belongs only inside `Mark` or at a representation boundary before a codec has witnessed or rejected it.
Core relating modules must work over carriers and morphisms, and public morphisms must normalize back to `Mark -> Utterance -> articulate`.

## Research Chain

The current research corpus gives the generator chain in categorical language:

```text
potential-aperiodic-articulation-cell
  --predicating-->
potential-transfinite-predication-cell
  --positing-->
potential-scott-continuous-posit-cell
  --settling-->
finite-settlement-cell
```

The schema descriptions are important:

- `predicating` is a morphism from a potential articulation cell plus a decomposition into a potential transfinite predication cell.
  It generates the transfinite predication category.
- `positing` is a morphism from a potential transfinite predication cell plus a posit into a potential Scott-continuous posit cell.
  It raises value through a knowledge-order join with evidence.
- `settling` is a morphism from a potential Scott-continuous posit cell into a finite settlement cell.
  It is a finite-step algebraic outcome when there is something to settle.

That chain should be the spine of the source tree.

The first on-disk spine now exists as categorical barrels:

```text
src/articulating/index.mts
src/articulating/predicating/index.mts
src/articulating/predicating/positing/index.mts
src/articulating/predicating/positing/settling/index.mts
```

These files currently re-export existing implementations.
They are not the end state; they are the public surface that lets implementation files migrate symbol by symbol without lying about the package's containment structure.

## Current Implementation Buckets Are Not the Public Category

Several internal source directories are still implementation staging areas:

```text
algebra  -> foundational carriers, bilattice charge, predication, exact numbers
logic    -> bilattice linear logic and typed theory
topology -> admission, predication fiber, closure, settling, fixed points, reads
geometry -> spatial/temporal geometry of settled carriers
analysis -> spectral/evidence/differential/conservation reads
codecs   -> representation boundaries
scripts  -> callable boundary morphisms
```

That layout builds, but it is not the public category of relating.
Public paths must name actual categorical objects, morphism layers, generated structures, and representation boundaries.
Internal files may remain staging while public exports move to the paths that state their domain and codomain.

## Target Reallocation

An interim proposal renamed the post-`algebra` layers `topology/logic/geometry/analysis`; the implementation instead used the verb-spine names (`articulating/predicating/positing/settling`).
The enduring content is the allocation reasoning — which carrier belongs at which morphism, and why.
Read the "Target role" column below as that placement, expressed in the interim names:

| Current surface | Target role | Reason |
| --- | --- | --- |
| `algebra/utterance` | base topology of relating | `Mark`, `Token`, `Claim`, `Utterance`, and `articulate` are the base object, carrier, and morphism. They are not merely algebraic utilities. |
| `algebra/predication` | topology of predication objects | `Cell = E x Pi x E`, predication carriers, specialization, and coherence are object/cell-set structure produced by predicating. |
| `algebra/bilattice-charge` | logic/value object over positing | FOUR is the charge/value carrier used when evidence is posited and settled. It should not be an admission primitive. |
| `algebra/bilattice-relation` | logic/Chu-style relation object | Four-valued relations and adjoint transforms are logical relation structure, not basic data. |
| `algebra/exact-number`, `algebra/graded` | settling/analysis/arithmetic boundary | Exact arithmetic supports ranks, spectra, grading, and quantitative reads of settled extrema. It should sit where those reads need it, not as the root object layer. |
| `logic/*` | logic of consequence | These are already closer to the target logic layer, but they should be checked against the predicating/positing/settling chain. |
| `topology/meme-topology` | logic of induction/settling | `induce` and `extend` fold utterances through articulate -> predicate -> posit -> settle. This is the logical engine over the base topology. |
| `topology/predication-fiber`, `predication-valuation-*` | logic and geometry boundary | Fibers, sheaves, fixed points, and valuation closure express the internal geometry of the logic. Some should remain logic; some may become geometry. |
| `topology/predication-cohomology`, `predication-settling`, `ordinal-closure` | geometry of closure | Ordinal stages, cohomology, fixed-point gaps, and settling traces are geometric structure over the logical carrier. |
| `geometry/*` | analysis substrate | Current geometry already reads spatial/temporal structure of settled carriers. It likely belongs under analysis once topology and logic are separated properly. |
| `analysis/*` | analysis reads | Spectral, Laplacian, evidence, differential, and conservation reads are downstream projections over the geometric/logical carrier. |
| `codecs/*` | representation boundaries | Codecs are not the category's object hierarchy. They witness that a Mark or derived read can cross JSON, EAVT, HTML, TOML, Turtle, paths, or files. |
| `scripts/*` | callable morphism boundary | Scripts are the shell/API/MCP/importer callable surface over JSON resources at the package boundary. |

## The realized shape

This is the realized source shape — the descent spine, with each former bucket placed at the morphism that generates it:

```text
src/
  articulating/                       mark, token, claim, utterance, carrier coincidence
    predicating/                      predication cell (E x Pi x E), bilattice-relation, coherence
      typed-theory/                   typing judgments over predication base objects
      logic/                          consequence over the predication objects
      geometry/spatial/               quadratic-field cut-and-project geometry
      positing/                       bilattice charge value, fiber algebra, the positing morphism
        logic/                        bilattice linear connectives over charge
        settling/                     closure, ordinal stages, fixed points, cohomology, sections
          analysis/                   spectral/evidence/differential/conservation reads (aliased at ./analysis)
          geometry/temporal/          the causal (Lorentzian-like) order of a settling
          dynamics/substitution/      substitution rules, orbits, abelianization, gauge labelings
  codecs/                             JSON/EAVT/Datom/HTML/TOML/Turtle/path boundaries, exact-number
  holography/                         the generic projection kernel the codecs specialize
```

The POSIX-pipeable callable morphisms over `articulate/predicate/posit/settle` and the unary `SettlementFiltration` reads are exposed as package binaries, not as a `./scripts` export.

The important part is not the folder names.
The important part is that every module boundary follows domain and codomain:

```text
Mark
  -> Utterance
    -> articulate
      -> predicating
        -> positing
          -> settling
            -> geometry of the settled carrier
              -> analysis reads
                -> representation boundaries
```

## Migration Rules

These are the package-specific form of the general category-theoretic Node packaging rules.

1. Do not move a symbol because its current file name feels old.
2. Move a symbol only after identifying its domain, codomain, and normalization path back to Mark/Utterance/articulate.
3. Keep `Mark` arbitrary.
  A move must not introduce Mark payload inspection into the core.
4. Keep admission as Utterance.
  Subject/predicate/object terms are derived readings or predication-cell positions, not primitive input declarations.
5. Keep scripts uniform: every callable boundary morphism reads one JSON boundary resource from stdin and emits one JSON boundary resource to stdout. Descent scripts may admit token/claim payloads at the shell boundary; settlement read scripts admit a `SettlementFiltration`.
6. Keep codecs as representation witnesses, not mathematical object layers.
7. Treat public exports as categorical surfaces.
  If a symbol is not a domain, codomain, apex/extremum carrier, morphism, or representation boundary, do not export it.

## How the migration proceeded

The migration ran as contract and surface moves first, before any file moves:

- The package identity was renamed to `@emsenn/relating`.
- Root import was kept script-only — the callable morphism surface — and the nested `articulating/predicating/positing/settling` barrels were made the public spine.
- Symbols were promoted to public paths only through categorical surfaces that state their domain, codomain, and normalization path back to `Mark -> Utterance -> articulate`; the deepest engine internals were kept package-local rather than exported.
- File moves followed only once tests proved the old and new import surfaces preserved the same carrier/morphism behavior.
