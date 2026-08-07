# @emsenn/relating — API reference

This reference is intentionally small until the package has an in-repo API reference generator again.
Do not paste stale generated signatures here: incorrect public-surface docs are worse than no generated reference.

## Public Surface

The package `exports` map is the contract.
Exported subpaths name categorical carriers, extrema/apex surfaces, morphisms, and representation boundaries.

- `@emsenn/relating`
- `@emsenn/relating/articulating`
- `@emsenn/relating/articulating/predicating`
- `@emsenn/relating/articulating/predicating/geometry`
- `@emsenn/relating/articulating/predicating/geometry/spatial`
- `@emsenn/relating/articulating/predicating/typed-theory`
- `@emsenn/relating/articulating/predicating/positing`
- `@emsenn/relating/articulating/predicating/positing/logic`
- `@emsenn/relating/articulating/predicating/positing/settling`
- `@emsenn/relating/articulating/predicating/positing/settling/analysis`
- `@emsenn/relating/articulating/predicating/positing/settling/analysis/arithmetic`
- `@emsenn/relating/articulating/predicating/positing/settling/geometry`
- `@emsenn/relating/articulating/predicating/positing/settling/geometry/temporal`
- `@emsenn/relating/analysis`
- `@emsenn/relating/analysis/conservation`
- `@emsenn/relating/analysis/differential`
- `@emsenn/relating/analysis/evidence`
- `@emsenn/relating/analysis/laplacian`
- `@emsenn/relating/analysis/spectral`
- `@emsenn/relating/codecs`
- `@emsenn/relating/codecs/exact-number`
- `@emsenn/relating/codecs/html`
- `@emsenn/relating/codecs/path`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/schema`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/triple`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/datom`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/text/markdown`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/toml`
- `@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/turtle`
- `@emsenn/relating/holography`

## Root

The root entry is the ordinary public package API.
It rolls up public carrier constructors, carrier types, readers, and morphisms from the categorical module indexes, and also exposes the callable script morphism registry:

```ts
export {
  mark,
  utterance,
  articulate,
  predicate,
  posit,
  settle,
} from "@emsenn/relating";
```

Use explicit subpaths only when you intentionally depend on a module boundary.
`@emsenn/relating/topology` is not a package export; settlement and closure APIs live under the settling module chain and roll up through root.

## Binaries

Package binaries are POSIX pipe wrappers over the public morphisms:

- `articulate-utterance`
- `predicate-articulation-cell`
- `posit-predication-site`
- `settle-posit-presheaf`
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

The importable library does not read stdin, open files, or consult the clock.

## Mark

`Mark` is the only package carrier whose payload is arbitrary:

```ts
export class Mark {
  readonly kind: "utterance.mark";
  readonly value: unknown;
  constructor(value: unknown);
}

export declare function mark(value: unknown): Mark;
```

Core relating code must not compare or inspect arbitrary Mark payloads.
Representation boundaries such as JSON, EAVT, HTML, TOML, or Turtle may inspect a payload only to prove it inhabits that boundary's carrier.

## Boundary Discipline

Generated API docs must preserve these invariants:

- no `unknown` outside `Mark`;
- no public helper names that bypass the declared carrier domain/codomain of a morphism;
- no claim that JSON is the Mark carrier;
- no subject/predicate/object declarations as primitive admissions;
- no I/O in importable modules unless the I/O handle is supplied as a value.
