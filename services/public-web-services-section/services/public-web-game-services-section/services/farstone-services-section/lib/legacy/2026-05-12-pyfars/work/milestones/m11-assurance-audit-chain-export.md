---
title: "M11 — Assurance Audit Chain Export"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m10-cost-and-energy-ledger-extension]
goals:
  - certification-artifact-projector-framework
  - nist-csf-2-mapping-projector
  - faa-bvlos-demonstration-package-projector
  - dod-3000-09-audit-package-projector
  - export-format-counit-law-verified
  - polyglot-source-projectors
theory-basis: [projector-framework-counit, first-class-provenance, charter-c2]
cites-objects:
  - pyfars/objects/jsonl-event-log.md
  - pyfars/objects/corpus-as-flatfile.md
cites-morphisms:
  - pyfars/morphisms/witnessing-completion.md
  - pyfars/morphisms/rendering.md
cites-claims:
  - pyfars/claims/jsonl-is-canonical-state.md
  - pyfars/claims/replay-determinism.md
backing-gaps:
  - pyfars/objects/certification-projector.md (NOT YET AUTHORED — projector-framework instantiation for assurance artifacts)
  - pyfars/objects/nist-csf-2-projector.md (NOT YET AUTHORED — NIST CSF 2.0 mapping)
  - pyfars/objects/faa-bvlos-projector.md (NOT YET AUTHORED — FAA BVLOS demonstration package)
  - pyfars/objects/dod-3000-09-projector.md (NOT YET AUTHORED — DoD 3000.09 audit package)
  - pyfars/claims/projector-counit-law.md (NOT YET AUTHORED — round-trip byte-equality of projector exports)
  - pyfars/objects/rust-source-projector.md (NOT YET AUTHORED — projects Rust functions/calls/structs/fields as cells; for polyglot-source-projectors)
  - pyfars/objects/toml-config-projector.md (NOT YET AUTHORED — projects TOML/cfg/ini configuration as cells)
  - pyfars/objects/python-source-projector.md (NOT YET AUTHORED — projects Python functions/classes/imports as cells; foundation for M19 source-as-substrate-cells)
  - pyfars/objects/compound-projector.md (NOT YET AUTHORED — orchestrates polyglot filesystem walk dispatching to per-format projectors)
acceptance: "From a captured event log of a deployment cycle, the assurance projectors produce framework-conformant certification artifacts: a NIST CSF 2.0 cybersecurity report, a FAA BVLOS demonstration package, a DoD 3000.09 audit package. Each export is reproducible (counit-law: reading the export and rendering back yields the same substrate cells); each carries the substrate's witness chain as the underlying evidence."
---


The substrate's witness chain becomes exportable as **certification artifacts**.
The export targets specific frameworks: NIST CSF 2.0, FAA BVLOS demonstration packages, DoD 3000.09 audit reports.
Exporters are projector-framework projectors per the counit law — substrate cells project to artifact format, satisfying replay-determinism.

This closes the [strategic-deployment-roadmap](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/strategic-deployment-raodmap-drone-swarms.md)'s assurance-stack axis: per the roadmap, **operational certification mandates a shift from "empirical-only" testing to "theorem-backed" assurance**.
M11 makes the substrate's evidence chain — already first-class provenance per [Charter](../../governance/charter.md) C2 — exportable in the formats certification authorities accept.

## Implementation status

**Research-actionable, implementation-blocked at the framework-conformance level.** The projector framework exists.
What's blocked is the precise mapping between substrate cells and each framework's required fields.
NIST CSF 2.0, FAA BVLOS, DoD 3000.09 each have specific structural requirements; the mappings are research work that requires reading the framework specs.
This is suitable work for a research-area task.

What M11 binds **now**: the projector-framework discipline applied to certification (each export is a projector with counit verification), the audit-chain substrate readiness (M2's `RuleFiring` and `rsv_hash`, M5's charter-binding violation cells, M8's bifurcated witness chains all already provide what the exports need).

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `certification-artifact-projector-framework` | A `runtime/projectors/certification/` module hosts framework-specific projectors; each takes substrate witnesses + a date range, produces an artifact | open |
| `nist-csf-2-mapping-projector` | A NIST CSF 2.0 mapping projector that produces a cybersecurity report covering Identify-Protect-Detect-Respond-Recover from substrate witnesses | open |
| `faa-bvlos-demonstration-package-projector` | A FAA BVLOS demonstration package projector that produces a flight-history-and-incident report from substrate witnesses + telemetry observations (M10) | open |
| `dod-3000-09-audit-package-projector` | A DoD 3000.09 audit package projector covering "predictability and explainability" requirements; binds to substrate audit cells | open |
| `export-format-counit-law-verified` | Each projector's counit law is verified as a property test: project → render → original-equivalent (modulo canonical form) | open |
| `polyglot-source-projectors` | Projector framework instantiated for non-markdown source: Python, Rust, TOML/cfg/ini configuration. A compound projector dispatches per-format on filesystem walk. Foundation for [M19](m19-self-developing-pyfars.md)'s source-as-substrate-cells goal at language-agnostic scope. | open |

## Theoretical shape

**1.
Counit-law-as-replay-verification** ([Charter](../../governance/charter.md) C2; projector framework).
An export that satisfies the counit law is *reproducible from the same substrate cells* — meaning the certification artifact is **regeneratable from the audit chain** rather than being a one-shot product.
This is the substrate's contribution to "predictability and explainability": every exported artifact is a function of substrate state, replayable, auditable.

**2.
Witness-chain-as-evidence** (extends [`every-dispatch-must-witness-rsv-hash`](../../governance/norms/every-dispatch-must-witness-rsv-hash.md) norm).
The substrate's witness discipline — every dispatch carries `RuleFiring` provenance, `rsv_hash`, signed actor, named via — produces the *atomic evidence units* certification frameworks require.
Each framework's projector aggregates these into framework-conformant shapes.

**3.
Framework-specific projection without framework-specific authority** (substrate-purity discipline).
The substrate doesn't *commit* to any one framework's authority structure.
NIST, FAA, DoD each define what's acceptable in their domain; the substrate provides the audit chain; the projector translates. **A polity adopting a different framework (ISO 27001, CCPA, sector-specific certification) authors a new projector against the same substrate cells.**

## Predication-categories grounding (cycle-1/2 bindings)

Three theorems sharpen M11's audit-export structure decisively:

**A.
Two cohomology exports, not one.** Per [truth-knowledge-cohomology-long-exact-sequence](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/truth-knowledge-cohomology-long-exact-sequence.md) + [two-internal-logics](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/two-internal-logics.md): every predication hyperdoctrine has both classical $T_t$ and paraconsistent $T_k$ theories.
The LES gives:

$$\cdots \to H^{n-1}(\mathcal{F}_U^{(\top)}) \to H^n_t(\mathcal{F}_U^{(t)}) \to H^n_k(\mathcal{F}_U^{(k)}) \to H^n(\mathcal{F}_U^{(\top)}) \to \cdots$$

For the polity:

- **External regulators (NIST, FAA, DoD, EU AI Act) operate in classical first-order logic** — their compliance reports require the $T_t$-projection ($\mathbf{t}$/$\mathbf{f}$ values, no $\top$).
- **Substrate-internal audit operates in paraconsistent logic** — the $T_k$-projection preserves $\top$-cells (multi-witness disagreement, paraconsistent inconsistencies).

The $T_t$-export is *lossless* iff $\mathcal{F}_U^{(\top)} = 0$ — i.e., the substrate has no $\top$-cells in the export window. **Lossy by exactly $H^n(\mathcal{F}_U^{(\top)})$ otherwise**.
M11 ships **two specialized exports**: a $T_t$ export per regulatory framework + a $T_k$ export for substrate-internal audit.
Their structural gap IS the polity's *published inconsistency-cohomology* — the quantitative honesty signal regulators receive when the substrate had real internal disagreement during the audit window.

This decisively answers the original Q31 framing ("audit-export schema for industrial vs polity-internal decisions"): one schema cannot satisfy both; two specialized exports are structurally correct.

**B.
Audit reports MLD-classes, not raw settlings.** Per [mutually-locally-derivable](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/mutually-locally-derivable.md): MLD-equivalence is the relation classified by $H^1$, including settling-shift and structure-preserving relabelings.
Two audit-export periods with MLD-equivalent settlings have *the same* cohomological state — settling-shift and structure-preserving relabelings are not material to the audit.

**The audit-projector quotients by MLD before reporting.** Span-cell denormalization for time-bounded incumbency (per the existing `accountability-chain-totality-as-m11-audit-invariant` question) is correct only *after* the MLD-quotient — otherwise the same conduct-pattern shifted in time gets reported as a separate accountability event.
M11's projectors emit MLD-classes per audit window; the underlying raw witnesses remain in the event log.

**C.
The audit's regime field requires a structural classifier.** The audit-projector must read rule-antecedent shape to classify regime structurally; using per-run step counts would corrupt the audit's regime claims.
M11 depends on a structural fragment classifier (a precondition shared with M5) being in place.

**D.
Equivariant cohomology decomposition: per-discipline curvature signature.** Per [equivariant-cohomology-decomposition](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md): $H^1$ splits into four isotypic sectors per $\widehat{K_4}$ characters.
The audit-export emits the **4-vector** $(|H^1_\mathrm{id}|, |H^1_{\chi_\sim}|, |H^1_{\chi_-}|, |H^1_{\chi_{\sim\circ-}}|)$ per discipline per audit window, not a scalar count.
The four sectors carry orthogonal structural information; collapsing to a scalar loses the diagnostic shape regulators can use to distinguish "many epistemic-frame disagreements" (legitimate, frame-dependent) from "many paraconsistent inconsistencies" (substrate-internal contradictions requiring resolution).

**Equivariant Gauss-Bonnet** gives four conservation laws — one per sector — summing to the total Euler characteristic $\chi(v) = |\mathrm{Apex}_v| - |L_\mathrm{ns}(\kappa_v)|$.
Per [tqft-structure](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tqft-structure.md), the partition function (sum) is computable in polynomial time; the per-sector decomposition is the same structural cost.

**E.
Settling cohomology vanishes above degree 1 — under hypothesis.** Per [settling-cohomology-vanishes-above-degree-1](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-cohomology-vanishes-above-degree-1.md): $H^n = 0$ for $n \geq 2$ holds under $\mathrm{cd}(\mathcal{C}^\mathrm{op}) \leq 1$ — automatic for finite $\mathcal{C}$ and the four-predicate-generator structure, *not* automatic for higher-arity predicates or modal operators.

The audit-export's "simplicity cap" is structural for the standard predicate-category, but **the polity must re-verify the cohomological-dimension hypothesis whenever charter amendments touch $\mathcal{C}$'s structure**.
Substrate-resident `verify-predicate-category-cd-bound` closure rule fires on charter amendments; M11 export refuses to claim $H^2 = 0$ in audit reports unless the verification has fired in the window.

## Imminent vagueness (researched in M11 cycle)

The "certification-artifact projector framework" goal currently names three frameworks (NIST, FAA, DoD) without specifying the projector's substrate input shape.
Per cycle research: each projector takes as input *the four cohomology exports* (sheaf-side $H^n_t$, sheaf-side $H^n_k$, cosheaf-side $H_n^t$, cosheaf-side $H_n^k$) plus the MLD-class quotient.
The projector's per-framework rendering layer is the only framework-specific content; the input is structurally uniform.

**Per goal `polyglot-source-projectors`:** projector counit-law verification (project → render → original-equivalent) is *byte-equivalent* iff the substrate carries the file's canonical form.
Per cycle research on Verdier duality, projectors are dual to extractors per the $\mathsf{Q}$-enriched derived equivalence; the counit law is one half of the unit-counit pair.
The current `kernel/projector/` framework's `(extract, create)` adjoint pair already realizes this; the M11 work is verifying the byte-equivalence at the per-format level.

## Related self-questions

- [`cech-cocycle-audit-as-m11-primitive`](../../questions/cech-cocycle-audit-as-m11-primitive.md) — whether M11's audit primitive should be Čech-1-cochain evaluation rather than witness-log export. **Bears directly on M11's framing**: the question argues that "verify the witness chain" is currently opaque, and that the audit-as-cocycle-evaluation framing makes the audit step a substrate-readable computation rather than a black-box step.
  A yes-answer adds an audit-primitive layer beneath the projection layer M11 already names; the projection remains, but its input becomes a settled-cocycle rather than a raw witness-log.
- [`accountability-chain-totality-as-m11-audit-invariant`](../../questions/accountability-chain-totality-as-m11-audit-invariant.md) — enforcing accountability-chain totality (one human principal per outcome) as an audit-export invariant.
  Bears on every projector M11 ships: NIST-CSF, FAA-BVLOS, DoD-3000.09 all require a clear chain of human responsibility for any audited outcome.
  A failed totality check should be substrate-visible *before* the projector runs.
- [`formation-control-rigidity-as-substrate-shape-invariant`](../../questions/formation-control-rigidity-as-substrate-shape-invariant.md) — rigidity-theory as the language for substrate-shape invariants.
  Bears on M11 if assurance includes "the polity's commitment graph is shape-invariant under reshaping" as a certifiable property.
- [`masft-failure-mode-taxonomy-as-substrate-anomaly-classes`](../../questions/masft-failure-mode-taxonomy-as-substrate-anomaly-classes.md) — encoding MASFT failure-mode taxonomy.
  Bears on M11 because audit categories must align with how anomalies are classified at runtime.
- [`consensus-as-h0-construction-as-substrate-primitive`](../../questions/consensus-as-h0-construction-as-substrate-primitive.md) — consensus-as-$H^0$ as unifying primitive.
  Bears on M11's audit chain: ratification is a consensus operation; if consensus has a uniform primitive, audit-chain projection is uniform across ratification kinds.

See [`questions/_themes.md`](../../questions/_themes.md) for the full theme map.

## Related

- [Roadmap](roadmap.md)
- [M9](m9-substrate-as-supervisor-of-layered-control.md), [M10](m10-cost-and-energy-ledger-extension.md)
- [Cyber-resilience framework (theory)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/cyber-resilience-frameowkr-for-decentralized-multi-agent-drone-swarms.md)
