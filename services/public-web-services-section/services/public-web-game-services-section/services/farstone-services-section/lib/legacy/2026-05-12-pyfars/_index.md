---
title: "PyFARS"
description: "PyFARS as the pythonic realization of flatfile-agentic-resource-system theory: what PyFARS is, what it commits to as a substrate, runtime, and external surface, and how its realization stays coherent with the upstream lineage of predicated-computing and predication-category theory."
component-of: flatfile-agentic-resource-system
nix-package:
  input-name: pyfars
  flake-url: "git+ssh://git@github.com/emsenn/pyfars"
  follows-inputs: [nixpkgs, flake-utils]
  package-name: pyfars
derives-methods-from-theory: [flatfile-agentic-resource-system]
---


The self-theory of **PyFARS**, the pythonic realization of [flatfile-agentic-resource-system theory](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/).
PyFARS is not a free-standing system — it is a running instance of FARS, settled in Python, configured by a polity's substrate.
This theory says what that realization commits to: what its substrate is, how its operations move that substrate, what claims it makes about itself with respect to its upstream lineage.

## Position in the lineage

PyFARS sits at the bottom of a derivation chain whose intermediate theories are the load-bearing warrant for any claim PyFARS makes about itself.

- [Predication categories](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) — the categorical mathematics of bilattice- and quantale-valued predication structures.
  The math floor: bilattice values, predication fibrations, the closure 2-monad, the four-regime classification, network-sheaf consensus.
- [Predicated computing](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/) — the engineering theory of computers whose primary substrate is the predication cell, derived from predication categories.
  Sub-theories carve out sub-domains: [agential-orchestration-platform](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/), [database-platform](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/database-platform/), [distributed-coordination-platform](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/), [functional-runtime-platform](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/functional-runtime-platform/), [interactive-application-platform](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/interactive-application-platform/), [web-server-platform](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/web-server-platform/).
- [Flatfile-agentic-resource-system theory](../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/) — sub-sub-theory under agential-orchestration: agential predicated-computing systems whose primary substrate is a corpus of YAML-frontmatter markdown notes, with the predication graph derived from frontmatter relations.
- **PyFARS** — this theory's subject — the Python implementation of FARS.
  The realization that runs.

The lineage is the *warrant*.
When PyFARS commits to something — that markdown is a projection of substrate truth, that the substrate is pure with respect to runtime mutation, that dispatch reads from substrate state — the warrant for the commitment lives upstream.
PyFARS-self-theory states the commitment in PyFARS-shaped terms; the proof, in most cases, runs through the parent theory's machinery cited via `depends-on:`.

## What this theory does

This is **PyFARS's comprehensive self-theory**, atomic-by-entity in the form of [predication categories](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md) and [predicated-work](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/_index.md).
It carries:

- **Concepts** — the semantic anchors PyFARS commits to (substrate, projection, settling, harness, verb, …).
- **Objects** — the named structures of PyFARS as a running realization (the corpus, the predication graph, the verb registry, the harness manifest, the running web app, …).
- **Morphisms** — the operations PyFARS provides (validate, render, dispatch, serve, …) treated as maps between objects.
- **Theorems** — claims PyFARS makes about itself (markdown-as-projection, substrate-purity, dispatch-reads-substrate, …) with proofs grounded in upstream theory.
- **Questions** — open self-questions whose answers will shape the realization.
- **Examples** — concrete instances of the concepts, objects, and claims, drawn from running PyFARS deployments.
- **Prose** — narrative writing that walks paths through the material.
- **References** — citations into the upstream lineage and outside literature.

## Why this theory exists

A realization is not its theory.
PyFARS makes implementation choices — Python, YAML+Markdown, FastAPI, JSONL event logs, user-systemd services, OAuth via Google — that go beyond what FARS theory specifies.
Some of those choices encode *load-bearing commitments* (substrate-purity, markdown-as-projection, dispatch-reads-substrate); others are *contingent and could be otherwise* (Python rather than Rust, FastAPI rather than aiohttp, Google as the OIDC issuer).
The self-theory is where that distinction is made explicit:

- Load-bearing commitments are stated as claims (or conjectures), with `depends-on:` chains pointing upstream into the lineage where the warrant lives.
- Contingent choices are recorded as design decisions cited but not theorized — the theory says PyFARS *could* realize FARS differently, and explains what would change if it did.

The self-theory is also the surface against which **new work is derived**.
When a sub-domain of PyFARS comes into focus — its web app, its dispatch layer, its observability — practice is derived from claims in this theory rather than constructed alongside it.
This makes the theory↔practice tether a real fiber: changes settle through closure, gaps surface as questions, and the realization stays coherent with its upstream lineage.

## Convention

Frontmatter and relations follow the [predication-categories convention](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md#convention) without modification.
Every note is a Markdown file with YAML frontmatter; one entity per file; lower-kebab-case slugs.
Subdirectories correspond to note types declared by the `type:` field.
`grep` is the primary index for navigation.

When a self-theory note depends on a claim from upstream, cite the upstream slug in `depends-on:` directly.
The math floor and engineering parents are accessible by relative path; PyFARS-self-theory does not vendor its lineage.

## Layout

- `concepts/` — semantic anchors PyFARS commits to (substrate, projection, harness, verb, …).
  Roles, not realizations of those roles.
- `objects/` — definitions of named structures within PyFARS (the corpus-as-flatfile, the predication graph, the verb registry, …).
- `morphisms/` — operations on those structures (validate, render, dispatch, serve, …).
- `claims/` — assertions PyFARS makes about itself, with proofs, sketches, or stated-only status.
  One claim per file.
  (PyFARS's `claims/` is the Group's emerging standard for what other theories in the corpus call `theorems/` — see `claims/_index.md` for the rationale.)
- `questions/` — open questions about PyFARS-as-realization.
- `examples/` — worked instances drawn from running deployments.
- `prose/narratives/` — long-form writing that walks paths through the material.
- `prose/remarks/` — short essays attached to single atoms.
- `references/` — annotated citations.

## Relationship to PyFARS governance

PyFARS's [governance](../governance/) carries the polity-jural content of PyFARS-as-polity — offices, duties, powers, charter, decisions, the settled commitments under which the enterprise operates.
This self-theory carries the *theoretical ground* underneath those commitments — the concepts, objects, morphisms, and claims that warrant the governance choices.

The two integrate, not compete.
When a governance question can't be answered without theoretical work, it lives here as a [question](questions/); when the work resolves, the resolution typically becomes a claim here and a governance decision in [`../governance/decisions/`](../governance/decisions/).
Theoretical ground for governance is one important *use* of this self-theory, not its scope: the comprehensive self-theory of PyFARS-as-realization is the broader frame, and grounding governance commitments is a component within it.

## What this theory is *not*

- It is **not** the FARS theory.
  FARS theory specifies what *any* flatfile agentic resource system commits to.
  PyFARS-self-theory specifies what *this particular* realization commits to.
- It is **not** documentation of the PyFARS Python package.
  Public-facing documentation of the package's API and usage lives in [`docs/`](../docs/) and [`prose/`](../prose/).
  The self-theory is internal — it states what the package commits to, not how to use it.
- It is **not** comprehensive yet.
  The theory is being grown from the upstream lineage; current coverage is partial and will accrete as new sub-domains come into focus.
