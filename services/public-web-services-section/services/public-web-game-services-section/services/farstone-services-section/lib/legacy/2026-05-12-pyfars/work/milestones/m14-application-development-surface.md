---
title: "M14 — Application Development Surface (SDK for Substrate Apps)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m5-agential-self-generation]
goals:
  - capability-api-stable-and-documented
  - app-package-format-with-signing
  - doc-as-substrate-cells
  - third-party-app-install-flow
  - app-isolation-and-fuel-budgeting
  - skill-author-tooling
theory-basis: [agential-self-generation, four-layer-rule-architecture, projector-framework-counit, capability-as-jural-relation]
prior-art: [pypredcomp/docs/dev/milestones/v0.6-application-development.md, pypredcomp/docs/dev/specs/packaging/sdk.md, pypredcomp/docs/dev/specs/security/capability-api.md]
cites-objects:
  - pyfars/objects/skill-record.md
  - pyfars/objects/runbook-record.md
  - pyfars/objects/office-record.md
  - pyfars/objects/budget-record.md
  - pyfars/objects/dispatch-closure-rule-system.md
  - pyfars/objects/eligibility-by-charter-binding.md
  - pyfars/objects/corpus-as-flatfile.md
cites-morphisms:
  - pyfars/morphisms/dispatching.md
  - pyfars/morphisms/validating.md
cites-claims:
  - pyfars/claims/governance-frontmatter-is-substrate.md
  - pyfars/claims/dispatch-derives-from-governance.md
  - pyfars/claims/substrate-purity.md
backing-gaps:
  - pyfars/objects/capability-token.md (NOT YET AUTHORED — typed capability the SDK declares to request)
  - pyfars/objects/app-package-record.md (NOT YET AUTHORED — Nix-flake manifest as substrate record with signature)
  - pyfars/objects/app-fuel-budget.md (NOT YET AUTHORED — specializes budget-record for installed-app metering)
  - pyfars/morphisms/installing-app.md (NOT YET AUTHORED — verify-then-register install flow)
  - pyfars/morphisms/projecting-doc-as-substrate-cells.md (NOT YET AUTHORED — doc-as-substrate-cells goal)
acceptance: "A developer outside the 561 Group can read the SDK docs, write a non-trivial PyFARS application against the typed substrate API, package it as a signed Nix flake declaring the capabilities it requests and the records it contributes, and install it on a clean PyFARS instance. The instance verifies the signature, accepts only declared capabilities, registers the app's records, and runs the app under a fuel budget. Round-trip signing/verification is byte-identical."
---

# M14 — Application Development Surface

After [M5](m5-agential-self-generation.md) makes PyFARS's operative machinery (skills, runbooks, governance rules, agents) substrate-writable from inside, M14 turns substrate-writability into a *platform-grade SDK* third parties outside the 561 Group can build against.
The shift is from "substrate-resident polity tools" to "substrate-resident applications a non-561 developer can author, sign, distribute, install."

## What's built

### Typed substrate API

The SDK exposes a *typed* surface over the substrate algebra rather than raw cell access.
An app that needs to read the dispatch fiber declares a typed query against the dispatch-records type; an app that needs to write task cells declares a typed assertion against the task-cell-system type.
The typing surfaces from the existing PydanticAI/PyPredCalc stack — there is no separate "SDK runtime", apps run on the same store as the engine.

Language bindings prioritised: Python (primary, native — same Pydantic types as the engine), TypeScript (for browser-side app UIs against substrate over WebSocket), Rust (for performance-sensitive drivers).
Same capability semantics across all three; differences are only in language idioms.

### Capabilities-as-API

An app's authority to do anything is a *capability cell*: `(app:foo, holds-capability, write-substrate-cell, t)`.
The set of capabilities an app declares in its manifest IS the set the substrate enforces; there is no implicit access.
Capabilities are non-amplifying: holding `read-fiber:dispatch` does not let the app reach `write-fiber:dispatch` or `read-fiber:governance`.

The base capability vocabulary:

- `read-fiber:<fiber-name>` — read access to a named fiber (dispatch, governance, library, observations, etc.).
- `write-cell:<predicate-pattern>` — write access to cells matching a predicate pattern (`(workitem:*, status, *)`).
- `dispatch-workitem:<scope>` — emit dispatchable workitems within a declared scope.
- `bind-driver:<driver-id>` — claim ownership of a driver record (M15 ledger-tool binds `driver:hledger`, M16 sensor apps bind `driver:mqtt`).
- `emit-witness:<witness-class>` — emit witnesses of a declared class.
  Apps that ledger their own activity emit witnesses; the substrate's audit chain reads them.
- `request-budget:<resource>:<amount>` — declare a fuel budget request for a substrate resource (compute-tokens, dispatch-firings-per-tick, federation-bandwidth).

The capability set is stable across PyFARS patch releases; minor releases add capabilities without removing; major releases may break, with a one-major-version deprecation window.

### Package format

A PyFARS application package is a Nix flake — either a self-contained flake on disk or a Git URL.
The flake's `meta` block carries a PyFARS-specific manifest:

```nix
meta.pyfars = {
  slug = "app:my-tool";
  version = "0.3.0";
  capabilities-required = [
    "read-fiber:dispatch"
    "write-cell:(workitem:*, status, *)"
    "request-budget:compute-tokens:1000-per-tick"
  ];
  records-contributed = [
    "objects/my-tool/*.md"
    "governance/skills/my-tool-*.md"
  ];
  signing-key = "ed25519:abc...def";
  signature = "<ed25519-sig-of-source-tree>";
};
```

Signing is Ed25519 over the source-tree Merkle root.
Verification is byte-identical: a package signed by key K, retrieved from any source, verifies if and only if its Merkle root signature matches K.
The substrate maintains a `governance/trusted-keys/<key-fingerprint>.md` record per key the captain trusts; install of an unsigned or untrusted-key package is rejected.

There is no centralised registry.
Distribution rides the substrate's federation algebra ([M6](m6-federation.md)) and ordinary Nix flake mechanisms (Git, IPFS, local mirrors).
A PyFARS-app-store is downstream work, not in M14.

### Doc-as-substrate-cells

Every shipped app carries documentation as `doc:<topic>` substrate records.
The doc records are first-class — queryable by capability ("show me docs for apps holding `bind-driver:mqtt`"), composable into a `help <topic>` shell verb, renderable as man-page-equivalent plain text or as a web view via the existing UI surface.
The projector counit law applies: nothing in the rendered doc that doesn't trace to the doc cell.

Required doc records per app: `doc:<app-slug>:purpose`, `doc:<app-slug>:capabilities-used`, `doc:<app-slug>:records-contributed`, `doc:<app-slug>:contracts` (what consumers of this app's records can rely on).

### Install flow

```
pyfars app install <flake-uri>
```

1. Fetch flake; verify Ed25519 signature against trusted-keys store.
2. Parse manifest; check requested capabilities against polity policy (some capabilities require captain attestation cells).
3. Allocate fuel budget cells per `request-budget:*` declarations.
4. Register the app's `records-contributed` files into the substrate.
5. Emit `app-installed` witness with provenance: `(app:my-tool@0.3.0, installed-by, <captain-or-agent>, t, <signing-key-fingerprint>)`.
6. The app's records appear in subsequent ticks; the dispatch graph picks them up without code change.

### Fuel-budget isolation

Apps run inside fuel-budget cells.
An app that exceeds its budget is *suspended*, not crashed: its dispatchable cells are gated by a `(app:foo, fuel-exhausted, t)` cell that the eligibility-rule system reads.
The substrate continues; the app waits for budget refill.
This is *not* sandboxing against malicious bytecode — that requires OS-level isolation, out of scope here.
It IS protection against runaway resource consumption from honest-but-buggy apps, which is the practical concern.

Capability discipline is enforced at install AND at runtime: an app attempting to write a cell its declared capabilities don't cover produces a `(app:foo, capability-violation, ...)
` cell at $\top$ and the violating dispatch is refused.

### Skill author tooling

`pyfars lint-skills <path>` validates skill records against the manifest schema, capability-declaration syntax, doc-record completeness.
Pre-commit hook variant exits non-zero on errors.
Documented severity levels (error/warning/info) so authors can build their own gates.
This tooling exists already in scaffold form; M14 makes it part of the SDK shipped to third parties.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `capability-api-stable-and-documented` | Base capability vocabulary documented, version-stamped, stable across patch releases | open |
| `app-package-format-with-signing` | Nix flake + PyFARS-meta manifest + Ed25519 signing, byte-identical round-trip | open |
| `doc-as-substrate-cells` | `doc:<topic>` cells with required-coverage discipline, `help` shell verb, web overlay | open |
| `third-party-app-install-flow` | `pyfars app install <flake-uri>` end-to-end with verification, capability check, fuel-budget allocation, install witness | open |
| `app-isolation-and-fuel-budgeting` | Apps gated by fuel-budget cells; capability violations produce $\top$ and refuse the violating dispatch | open |
| `skill-author-tooling` | `lint-skills` validator with documented severity codes; pre-commit hook | open |

## Done when

A non-561-Group developer reads the SDK docs, builds a non-trivial example app (the canonical example: a substrate-aware todo list that integrates with [M17](m17-561-productivity-stack.md)'s tasks app), packages it as a signed flake, ships it to the captain.
The captain installs it on `vps-mini-cold-red-gate`.
The app runs, contributes records, respects its fuel budget, and emits witnesses.
Round-trip signing produces byte-identical artifacts.

## Theoretical shape

**Capability-as-jural-relation.** An app holding capability `write-cell:(workitem:*, status, *)` holds a Hohfeldian power; the substrate holds the correlative liability.
Capability composition follows the [predicated-governance](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/) jural-relation algebra; non-amplification is the no-elevation property of compounds.

**App-as-substrate-extension.** An installed app contributes substrate cells (its own records, its own closure rules, its own runbooks).
The app *is* substrate content; there is no separate "app runtime".
This is [M5](m5-agential-self-generation.md)'s agential-self-generation pattern at platform-extension scope rather than in-polity scope.
The capability discipline is what makes the platform-extension scope *safe* in a way M5's in-polity scope didn't need to address (the captain trusts in-polity agents by default; third parties require explicit signing-key trust).

**Doc-as-projection.** App documentation projects from the app's substrate cells.
The capabilities-used section IS the manifest's `capabilities-required` list rendered for humans; the records-contributed section IS the manifest's contributed-records list.
Projector counit law: nothing in the doc not traceable to a substrate cell.

## Related

- [Roadmap](roadmap.md)
- [M5 — Agential Self-Generation](m5-agential-self-generation.md) — prerequisite (substrate-writability from inside)
- [M15 — Bundled Userland](m15-bundled-userland.md) — first wave of apps using this SDK
- [M17 — 561 Productivity Stack](m17-561-productivity-stack.md) — the polity's own apps using this SDK
