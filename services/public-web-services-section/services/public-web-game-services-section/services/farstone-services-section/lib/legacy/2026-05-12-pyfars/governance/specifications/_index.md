---
title: "PyFARS specifications"
type: index
status: open
---

# PyFARS — specifications

Normative documents that define what a conformant pyfars implementation of a set of objects, morphisms, and concepts must satisfy.
A specification binds code, the substrate records it walks, and the lineage that hosts both.

Differs from [`../decisions/`](../decisions/): a decision is a *choice* the project commits to; a specification is a *protocol* a choice elaborates into.

Specifications are authored at stage 6 of the roadmap-enrichment cycle via [`authoring-a-specification`](../skills/authoring-a-specification.md) and serve as the primary input to the developer's implementation chain.

## Specification format

Every specification follows this structure:

**Frontmatter:**
```yaml
---
title: "<human-readable name>"
type: specification
status: draft | candidate | normative | retired
version: "YYYY.MM.DD.noun"
date: YYYY-MM-DD
authors: [<agent-slugs>]
derives-from: [<claim-slugs>, <object-slugs>, <morphism-slugs>, <concept-slugs>]
supersedes: []
---
```

The `version` field uses `YYYY.
MM.
DD.noun` format — date of authoring plus a compact noun matching the slug.

**Body sections (in order):** - §1 Abstract — non-normative; what this spec covers and why - §2 Status — what the current status means for implementors - §3 Conformance — RFC 2119 normative language declared; conformant-implementation definition - §4 Terminology — defined terms; cite `realizes: <concept-slug>` for pyfars concept realizations - §5 Requirements — normative core; numbered; MUST/SHOULD/MAY throughout; each requirement independently testable - §6 Acceptance criteria — checkable conditions for well-formedness; what tests assert - §7 Non-normative examples — pointers to math examples and code examples; explicitly non-normative - §8 What this specification does not decide — named silences, deferred decisions - §9 References — *Normative* and *Informative* subsections

## Available specifications

- [`directories.md`](directories.md) — canonical directory schema for the 561 lineage.
  The four facets (governance / work / src / prose), the operational entities, the knowledge entities, the migration map.
- [`wiring-protocols.md`](wiring-protocols.md) — protocol-per-wiring-kind discipline.
  Eight wiring-kinds across in-process / in-host / cross-host locality classes; per-wiring transport choice.
- [`engine-service-spec.md`](engine-service-spec.md) — schema for `type: service-spec` records.
  The host-OS-supervisor harness (systemd-user, launchd, container) projects these into unit files; substrate-derived service supervision per wiring-protocols §4.7.
- [`theory-encoding.md`](theory-encoding.md) — normative requirements for encoding a theory in the FARS substrate.
  Defines structure records (types), transformer records (predicates/morphisms), valid predication (Howard/Lambek type-checking of frontmatter), theory inheritance via `derives-methods-from-theory`, and the self-typing bootstrap.
  The foundational legibility spec: corpus frontmatter is only machine-readable when every key names a substrate-resident transformer.

## Planned

- *Record-kinds.md* — frontmatter schema per record kind (`type: office`, `type: skill`, `type: theorem`, `type: hook`, etc.).
  Anchors what fields are required and what they mean.
- *Reply-contract.md* — the two-block (yaml + markdown) reply contract every dispatched task expects from its endpoint.
- *EAVT-event-schema.md* — once the EAVT log architecture is stable, the spec for the JSONL line format.
- *Discovery.md* — the rules a walker (e.g., `pyfars install-harness`, `pyfars validate`) follows when traversing a container that conforms to the directory schema.
