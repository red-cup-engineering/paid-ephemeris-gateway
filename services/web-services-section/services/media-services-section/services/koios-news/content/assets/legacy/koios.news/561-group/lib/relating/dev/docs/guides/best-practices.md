# Best practices: consuming @emsenn/relating

The package `exports` map is categorical: exported modules should name the classes that serve as domains and codomains of the apex and extrema in the category of relating, plus the representation boundaries that carry them.
Consumers should see the same morphism surface whether they are shell users, API users, MCP users, or TypeScript importers.

## Import the Public API

Use the package root for the ordinary public API:

```ts
import { mark, utterance, cell, chargeValue, induce, sectionOf } from "@emsenn/relating";
```

The root is the package apex in the normal Node sense: it collects public carrier constructors, carrier types, readers, and morphisms from the module indexes below it.
Consumers should not need to know where a carrier or morphism is implemented inside the source tree.

Use explicit subpaths when you are intentionally depending on a module boundary:

```ts
import { articulate } from "@emsenn/relating/articulating";
import { predicate } from "@emsenn/relating/articulating/predicating";
import { posit } from "@emsenn/relating/articulating/predicating/positing";
```

## Import Morphisms, Run Scripts

Use package imports for pure morphisms.
Use the package-root `scripts/` directory for executable POSIX pipe wrappers around those morphisms.

Use the EAVT/Datom path codecs when building a transport adapter:

```ts
import { parseLines, toEavt, serialize, type EAVT } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt";
```

Do not import from `dist` directly or from implementation subpaths that are not listed in `package.json` `exports`.

## Public Subpaths

The export map is the public categorical surface:

- `@emsenn/relating`

The transport boundary is:

- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/datom`

The generated-logic, generated-geometry, settling analysis, codec, and holography exports are not a separate "research" contract.
They are exported when they name domain/codomain classes, extrema/apex carriers, generated structures, morphism families, or representation boundaries used by the category of relating.
They are not automatically callable script actions; to become shell/API/MCP-callable, a function must be registered as a POSIX boundary morphism with a declared JSON-resource domain and codomain.
`@emsenn/relating/topology` is not a package export; settlement and closure implementation lives under the settling module chain and rolls up through root.

Prefer the root package for ordinary consumer imports.
Prefer nested relating surfaces only for deliberate categorical imports:

```ts
import { articulate, mark, utterance } from "@emsenn/relating/articulating";
import { predicate } from "@emsenn/relating/articulating/predicating";
import { posit } from "@emsenn/relating/articulating/predicating/positing";
import { informationDistribution } from "@emsenn/relating/analysis/evidence";
import { closureProcess, closeOrdinalProcess } from "@emsenn/relating";
```

## Executable Wrappers

The bins are package-root `scripts/` wrappers around public relating morphisms.
The descent bins are:

- `articulate-utterance`
- `predicate-articulation-cell`
- `posit-predication-site`
- `settle-posit-presheaf`

The settlement-filtration read bins are:

- `read-increments-of-settlement-filtration`
- `read-firings-of-settlement-filtration`
- `read-limit-stages-of-settlement-filtration`
- `read-non-scott-firings-of-settlement-filtration`
- `read-first-cohomology-of-settlement-filtration`
- `read-closure-invariant-of-settlement-filtration`
- `read-graded-gap-of-settlement-filtration`
- `read-graded-gap-first-cohomology-rank-identity-of-settlement-filtration`
- `read-classification-of-settlement-filtration`
- `read-depth-of-settlement-filtration`
- `read-depth-finite-stage-judgment-of-settlement-filtration`
- `read-firing-events-of-settlement-filtration`
- `read-causal-order-of-settlement-filtration`

The wrappers own stdin/stdout.
The pure callable morphisms are the package functions they invoke, not a second script registry.

## Standalone Package Boundary

`@emsenn/relating` must build from its own directory, without assuming it lives inside the larger workspace.
The local `tsconfig.json` carries the package's strict compiler options directly.

The build emits `.mjs` and `.d.mts` because the sources are `.mts`, and the public `exports` map advertises those native NodeNext declaration paths directly.
If you add, rename, or remove an export, verify that the built `dist` implementation file and `.d.mts` declaration path both exist.
Do not add a declaration-copy shim or advertise `.d.ts` for an `.mts` package.

Use the normal handoff gates from the package root:

```sh
pnpm run verify
pnpm pack --pack-destination /tmp
```

## The I/O-as-Values Discipline

The library performs no I/O it was not handed.
Fetch, clock, and filesystem effects belong at the caller or executable boundary.

- A bin may read stdin and may stamp output time.
- Importable morphisms receive already-constructed carriers; the package bins are the POSIX byte-stream wrappers over those morphisms.
- Resource codecs parse or serialize bytes they were handed; they do not open paths.

This is what lets a log replay deterministically and what makes every read a function of the supplied carrier.

## Tests Are Theorem-Shaped

A test name is a falsifiable claim the test proves.
When extending usage or reporting a bug, phrase it the same way: a single falsifiable claim.

Run before handing off:

```sh
pnpm run verify
pnpm run test
```

## Common Pitfalls

- Treating implementation modules or transport formats as the categorical contract.
  The export map is the categorical surface; EAVT/Datom is a representation boundary.
- Trying to admit a charge directly.
  Evidence enters as an utterance; charges are derived by the descent and emitted as readings.
- Treating contradiction as an error.
  A both-affirmed-and-denied cell is a representable reading, not an exception.
